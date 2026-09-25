/**
 * The landing page's GPU layer: one WebGL2 canvas behind all page content.
 *
 * 1. The sculpture pass redraws the authored artwork with image-based light.
 *    A precomputed matte/inflation-height/loop-path map (scripts/sculpture-maps.mjs)
 *    gives the flat raster enough shape to be relit relative to its baked studio
 *    light, catch specular and iridescent glints, bend under ripples, a droplet
 *    lens and "gather" rings, cast floor caustics and let light run along the
 *    loop. With the light at rest it reproduces the original image.
 * 2. The swarm pass advances every "small brain" mote on the GPU with transform
 *    feedback (no per-mote JavaScript), then draws them as instanced,
 *    velocity-stretched glints. Motes are only visible while stirred, so the
 *    settled page is the calm selected design.
 *
 * The orchestrator (artwork.ts) owns input, time, settling and quality; this
 * module only turns the mutable FieldState into pixels. Capability is detected
 * by creating a WebGL2 context; no GPU vendor or renderer strings are read.
 */

export type LoopPoint = readonly [number, number, number];
export type Rect = { x: number; y: number; w: number; h: number };

/** Mutable per-frame parameters, reused to avoid per-frame allocation. */
export type FieldState = {
  step: Float32Array; // dt, time, calm (0..1 while settling), unused
  pointer: Float32Array; // current xy, previous xy (page px)
  motion: Float32Array; // velocity xy (px/s), presence 0..1, lead (s)
  field: Float32Array; // flow, invite, orbit, form
  charge: Float32Array; // xy (page px), gather 0..1, burst impulse (one frame)
  emit: Float32Array; // chance per mote this frame, launch speed px/s, seed, unused
  shake: Float32Array; // impulse xy (px/s, one frame), strength, seed
  light: Float32Array; // offset xy (-1..1, y down), activity 0..1, glint gain
  view: Float32Array; // mote visibility, tilt parallax xy (-1..1), unused
  lens: Float32Array; // xy (page px), strength, radius px
  ripples: Float32Array; // 4 x (xy page px, age s, strength)
  glow: Float32Array; // loop-run position, run strength, upgraded 0..1, sweep (<0 off)
  flash: Float32Array; // release glow on the sculpture, unused x3
  count: number;
};

export type LightField = {
  capacity: number;
  resize(width: number, height: number, ratio: number): void;
  place(art: Rect): void;
  frame(state: FieldState, simulate: boolean): void;
  dispose(): void;
};

export function createFieldState(): FieldState {
  const vec = (size: number) => new Float32Array(size);
  return {
    step: vec(4),
    pointer: vec(4),
    motion: vec(4),
    field: vec(4),
    charge: vec(4),
    emit: vec(4),
    shake: vec(4),
    light: vec(4),
    view: vec(4),
    lens: vec(4),
    ripples: vec(16),
    glow: new Float32Array([0, 0, 0, -1]),
    flash: vec(4),
    count: 0,
  };
}

/** Uniform closed Catmull-Rom, matching scripts/sculpture-maps.mjs so that the
 * loop-path parameter baked into the maps agrees with these samples. */
export function sampleLoop(points: readonly LoopPoint[], count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const n = points.length;
  for (let k = 0; k < count; k++) {
    const s = (k / count) * n;
    const i = Math.floor(s);
    const t = s - i;
    const [p0, p1, p2, p3] = [-1, 0, 1, 2].map((d) => points[(i + d + n) % n]);
    for (let c = 0; c < 3; c++)
      out[k * 3 + c] =
        0.5 *
        (2 * p1[c] +
          (p2[c] - p0[c]) * t +
          (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t +
          (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t * t * t);
  }
  return out;
}

const CAPACITY = 49152;
const PATH_SAMPLES = 64;
const FLOAT_BYTES = 4;
const STRIDE = 8 * FLOAT_BYTES; // position xy, velocity xy, depth, seed, energy, mode

// Shader rule: GLSL leaves pow() of a negative base and smoothstep() with
// edge0 >= edge1 undefined (some GPUs return NaN), so use squares and
// 1 - smoothstep(a, b, x) instead.
// Integer hashing and derivative value noise (after Inigo Quilez). The curl of
// the noise is divergence-free, so stirred motes swirl into ribbons instead of
// clumping or draining away.
const NOISE = `
uint mix32(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return x;}
float lattice(vec2 p){uvec2 q=uvec2(ivec2(p)+32768);return float(mix32(q.x^mix32(q.y)))*2.3283064e-10;}
float rand(float a,float b){return float(mix32(floatBitsToUint(a)^mix32(floatBitsToUint(b)+0x9e3779b9u)))*2.3283064e-10;}
vec3 noised(vec2 x){
  vec2 i=floor(x),f=fract(x);
  vec2 u=f*f*f*(f*(f*6.-15.)+10.),du=30.*f*f*(f*(f-2.)+1.);
  float a=lattice(i),b=lattice(i+vec2(1,0)),c=lattice(i+vec2(0,1)),d=lattice(i+vec2(1,1)),k=a-b-c+d;
  return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y,du*(vec2(b-a,c-a)+k*u.yx));
}
vec2 curl(vec2 p,float t){
  vec3 n=noised(p+vec2(t*.07,-t*.05)),m=noised(p*2.1+vec2(19.7-t*.11,t*.09));
  vec2 g=n.yz+m.yz*.9;
  return vec2(g.y,-g.x);
}`;

const SIM_VS = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec2 a_pos;
layout(location=1) in vec2 a_vel;
layout(location=2) in vec4 a_data;
out vec2 v_pos;
out vec2 v_vel;
out vec4 v_data;
uniform vec2 u_size;
uniform vec4 u_step,u_pointer,u_motion,u_art,u_field,u_charge,u_emit,u_shake;
uniform sampler2D u_maps;
uniform vec3 u_path[${PATH_SAMPLES}];
${NOISE}
void main(){
  float dt=u_step.x,t=u_step.y,calm=u_step.z,unit=min(u_size.x,u_size.y);
  vec2 p=a_pos*u_size,v=a_vel;
  float z=a_data.x,seed=a_data.y,e=a_data.z,mode=a_data.w;
  // The loop exhales: on arrival and level-ups a few motes at a time are
  // reborn on the sculpture's centreline and thrown out along its normals.
  if(u_emit.x>0.&&rand(seed,u_emit.z)<u_emit.x){
    float k=rand(seed,u_emit.z+1.)*${PATH_SAMPLES}.;
    int i0=int(k)&${PATH_SAMPLES - 1},i1=(i0+1)&${PATH_SAMPLES - 1};
    vec2 tang=normalize(u_path[i1].xy-u_path[(i0+${PATH_SAMPLES - 1})&${PATH_SAMPLES - 1}].xy+1e-4),nrm=vec2(-tang.y,tang.x);
    float side=rand(seed,u_emit.z+2.)<.5?-1.:1.;
    p=mix(u_path[i0].xy,u_path[i1].xy,fract(k))+nrm*side*u_art.z*.05*rand(seed,u_emit.z+3.);
    v=(nrm*side*(.45+.9*rand(seed,u_emit.z+4.))+tang*.35)*u_emit.y;
    e=.6+.4*rand(seed,u_emit.z+5.);
    mode=0.;
  }
  // Ambient current: barely drifting at rest, carrying stirred motes in ribbons.
  v+=curl(p/max(240.,unit*.42)*(.8+z*.4),t+seed*.3)*u_field.x*(14.+560.*e)*dt;
  // Pointer wake along the swept segment. With practice the swarm anticipates:
  // the segment is extended ahead of the pointer by u_motion.w seconds.
  vec2 a=u_pointer.zw,ba=u_pointer.xy+u_motion.xy*u_motion.w-a,pa=p-a;
  vec2 dv=pa-ba*clamp(dot(pa,ba)/max(dot(ba,ba),1.),0.,1.);
  float R=clamp(unit*.085,46.,130.)*(.7+z*.6);
  float w=exp(-dot(dv,dv)/(R*R))*u_motion.z,ps=length(u_motion.xy);
  vec2 swirl=vec2(-dv.y,dv.x)/(length(dv)+14.)*min(ps,1400.)*(seed-.5)*1.6;
  v=mix(v,u_motion.xy*(.45+.6*seed)+swirl,clamp(w*dt*8.,0.,1.));
  e=max(e,w*(.3+.7*clamp(ps/520.,0.,1.))*(.55+.45*seed));
  // Invitation: stirred motes are drawn toward the sculpture until it is found.
  vec2 home=u_art.xy+u_art.zw*.5-p;
  v+=home/(length(home)+1.)*u_field.y*e*(900.+700.*seed)*dt;
  // Hold to gather into a vortex; release bursts outward.
  vec2 cc=u_charge.xy-p;
  float cd=length(cc)+1.,pull=u_charge.z*(1.-smoothstep(0.,unit*1.1,cd))*smoothstep(8.,60.,cd);
  v+=(cc/cd*1300.+vec2(-cc.y,cc.x)/cd*(900.+600.*seed))*pull*dt;
  e=max(e,u_charge.z*(1.-smoothstep(0.,unit*.9,cd))*.95);
  v-=cc/cd*u_charge.w*(600.+1100.*seed)*exp(-cd/(unit*.55));
  e=max(e,u_charge.w*exp(-cd/(unit*.7)));
  // Shake: a snow-globe scatter.
  v+=(u_shake.xy+(vec2(rand(seed,u_shake.w),rand(u_shake.w,seed))-.5)*1100.)*u_shake.z;
  e=max(e,u_shake.z*(.4+.6*seed));
  // Motes that reach the sculpture learn to flow along its figure-8; during an
  // upgrade most of the swarm forms the loop itself.
  vec2 uv=(p-u_art.xy)/u_art.zw;
  float body=0.;
  if(all(greaterThan(uv,vec2(-.02)))&&all(lessThan(uv,vec2(1.02))))body=textureLod(u_maps,clamp(uv,0.,1.),0.).r;
  // mode: 0 free, 1 flowing along the loop, 2 forming it; the fraction
  // records how far behind the glass the nearest strand runs.
  // Only unhurried motes are captured, so bursts still fly free; a finished
  // formation releases its motes.
  float form=u_field.w*step(.18,seed);
  if(u_field.z>0.&&body>.3&&e>.08&&mode<.5&&length(v)<420.)mode=1.;
  if(e<.02||(mode>=2.&&form<.001))mode=0.;
  if(mode>.5||form>.001){
    float k=0.;
    if(form>.001)k=fract(rand(seed,1.)+t*.09)*${PATH_SAMPLES}.;
    else{
      float best=1e12;
      for(int i=0;i<${PATH_SAMPLES};i++){vec2 d=u_path[i].xy-p;float q=dot(d,d);if(q<best){best=q;k=float(i);}}
    }
    int i0=int(k)&${PATH_SAMPLES - 1},i1=(i0+1)&${PATH_SAMPLES - 1};
    vec2 tang=normalize(u_path[i1].xy-u_path[(i0+${PATH_SAMPLES - 1})&${PATH_SAMPLES - 1}].xy+1e-4);
    vec3 P=mix(u_path[i0],u_path[i1],fract(k));
    vec2 target=P.xy+vec2(-tang.y,tang.x)*(rand(seed,2.)-.5)*u_art.z*.13;
    // Formation grip eases with the formation itself, so its release loosens.
    float grip=form>.001?form:step(.5,mode)*u_field.z;
    mode=(form>.001?2.:1.)+clamp(-P.z,0.,1.)*.5;
    v=mix(v,tang*(150.+200.*seed)*u_step.w+(target-p)*mix(3.,7.,form),clamp(grip*dt*mix(3.,6.,form),0.,1.));
    e=max(e,form*.9);
  }
  v*=exp(-dt*(1.1+calm*9.+step(.5,mode)*.4));
  // Invited motes glow a little longer, so the stream visibly reaches the sculpture.
  e*=exp(-dt*(.85-.2*u_field.y+calm*6.+step(.5,mode)*.35));
  float sp=length(v);
  if(sp>2400.)v*=2400./sp;
  p+=v*dt;
  if(p.x<-60.||p.y<-60.||p.x>u_size.x+60.||p.y>u_size.y+60.){
    p=vec2(rand(seed,t),rand(t,seed))*u_size;v=vec2(0);e=0.;mode=0.;
  }
  v_pos=p/u_size;v_vel=v;v_data=vec4(z,seed,e,mode);
}`;

const SIM_FS = `#version 300 es
precision highp float;
out vec4 o;
void main(){o=vec4(0);}`;

const MOTE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
layout(location=1) in vec2 a_vel;
layout(location=2) in vec4 a_data;
layout(location=3) in vec2 a_corner;
uniform vec2 u_size;
uniform vec4 u_art,u_light,u_view;
uniform float u_time;
uniform sampler2D u_maps;
out vec2 v_q;
out vec4 v_color;
out float v_glint;
// Deep chromatic cores stay legible on warm paper; glints flash saturated hues.
const vec3 CORE[6]=vec3[6](vec3(.66,.26,.1),vec3(.41,.27,.53),vec3(.2,.42,.49),vec3(.54,.38,.07),vec3(.78,.24,.09),vec3(.36,.31,.43));
const vec3 GLINT[5]=vec3[5](vec3(.95,.42,.12),vec3(.86,.2,.5),vec3(.5,.3,.9),vec3(.18,.42,.95),vec3(.06,.6,.66));
void main(){
  float z=a_data.x,seed=a_data.y,e=a_data.z,kind=floor(a_data.w),behind=fract(a_data.w)*2.;
  vec2 p=a_pos*u_size+u_view.zw*(z-.5)*28.;
  float speed=length(a_vel);
  vec2 dir=speed>1.?a_vel/speed:vec2(.8,.6);
  // Tumbling facets flash when they face the moving light, like glitter.
  float facet=seed*61.3+u_time*(.3+seed*.9);
  vec2 L=normalize(u_light.xy+vec2(.3,-.5));
  float g=pow(max(dot(vec2(cos(facet),sin(facet)),L),0.),36.)*u_light.w*step(.4,fract(seed*13.7));
  float a=(smoothstep(.06,.42,e)*mix(.62,1.,z)+g)*u_view.x;
  vec2 uv=(p-u_art.xy)/u_art.zw;
  float over=all(greaterThan(uv,vec2(0)))&&all(lessThan(uv,vec2(1)))?textureLod(u_maps,uv,0.).r:0.;
  // Far motes pass behind the sculpture; loop motes hide where their strand
  // runs behind the glass.
  if(kind>.5)a*=1.-.75*behind*over;
  else if(z<.42)a*=1.-.92*over;
  if(a<.01){gl_Position=vec4(2,2,2,1);return;}
  // Over the artwork and along the loop, motes are light, not dust.
  float lit=max(clamp(g*1.6,0.,1.),max(over*.85,step(.5,kind)));
  float px=1./u_view.y,w=mix(1.1,2.4,z)*(.8+.4*min(e,1.))*(1.+g*.8+lit*.25)*mix(1.,.7,smoothstep(200.,1200.,speed)),len=w+min(speed*.011,22.);
  float W=max(w,1.5*px),Lq=max(len,1.5*px);
  a*=min(1.,w*len/(W*Lq)); // sub-pixel motes fade instead of shimmering
  float glow=max(g,lit*.55),pad=1.+glow*2.2;
  vec2 q=p+(dir*a_corner.x*Lq+vec2(-dir.y,dir.x)*a_corner.y*W)*.5*pad;
  gl_Position=vec4(q/u_size*2.-1.,0,1);
  gl_Position.y=-gl_Position.y;
  v_q=a_corner*pad;
  // Loop motes wear a spectrum that turns around the sculpture.
  vec2 fromArt=p-u_art.xy-u_art.zw*.5;
  float h=fract(mix(seed*3.,atan(fromArt.y,fromArt.x)*.159+u_time*.12,step(.5,kind))+u_time*.04)*5.;
  int i=int(h);
  vec3 flash=mix(GLINT[i],GLINT[(i+1)%5],fract(h));
  v_color=vec4(mix(CORE[int(seed*6.)%6],flash,lit),clamp(a,0.,1.));
  v_glint=clamp(glow,0.,1.);
}`;

const MOTE_FS = `#version 300 es
precision highp float;
in vec2 v_q;
in vec4 v_color;
in float v_glint;
out vec4 o;
void main(){
  // A soft core; glints add a four-ray sparkle and a warm halo.
  float r=dot(v_q,v_q),core=1.-smoothstep(.2,1.,r*(1.+v_glint*1.5));
  float halo=exp(-r*2.2)*v_glint*.35;
  float star=v_glint*(exp(-abs(v_q.x)*9.-v_q.y*v_q.y*1.1)+exp(-abs(v_q.y)*9.-v_q.x*v_q.x*1.1));
  float a=min(core+halo+star,1.)*v_color.a;
  vec3 c=mix(v_color.rgb,vec3(.93,.72,.38),clamp(halo/(core+halo+1e-3),0.,1.)*.55);
  o=vec4(c*a,a);
}`;

const ART_VS = `#version 300 es
precision highp float;
layout(location=3) in vec2 a_corner;
uniform vec2 u_size;
uniform vec4 u_art;
out vec2 v_uv;
void main(){
  v_uv=a_corner*.5+.5;
  vec2 p=u_art.xy+v_uv*u_art.zw;
  gl_Position=vec4(p/u_size*2.-1.,0,1);
  gl_Position.y=-gl_Position.y;
}`;

const ART_FS = `#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_image,u_maps;
uniform vec4 u_art,u_light,u_lens,u_charge,u_glow,u_floor;
uniform vec4 u_ripples[4];
uniform vec3 u_paper;
uniform float u_time;
${NOISE}
// The artwork's baked key light comes from the upper left (y points down).
const vec3 L0=vec3(-.36,-.52,.77);
vec3 hue(vec3 c,float a){
  const mat3 Y=mat3(.299,.596,.211,.587,-.274,-.523,.114,-.322,.312);
  const mat3 R=mat3(1.,1.,1.,.956,-.272,-1.106,.621,-.647,1.703);
  vec3 q=Y*c;
  float s=sin(a),k=cos(a);
  q.yz=mat2(k,s,-s,k)*q.yz;
  return R*q;
}
vec3 spectrum(float h){return clamp(abs(fract(h+vec3(0.,.6667,.3333))*6.-3.)-1.,0.,1.);}
void main(){
  vec2 uv=v_uv,k=vec2(u_art.z/u_art.w,1.);
  // Feather the studio backdrop into the page paper, as the image fallback does.
  float edge=smoothstep(0.,.065,uv.x)*smoothstep(0.,.065,1.-uv.x)*smoothstep(0.,.055,uv.y)*smoothstep(0.,.055,1.-uv.y);
  if(edge<.002){o=vec4(0);return;}
  vec2 size=vec2(textureSize(u_maps,0));
  vec3 m=texture(u_maps,uv).rgb;
  float body=m.r,act=u_light.z;
  float depth=clamp((1.-dot(texture(u_image,uv).rgb,vec3(.2126,.7152,.0722)))*2.4,0.,1.);
  // The rounded front of the loop drifts with the light; glass shimmers.
  vec2 s=uv+u_light.xy*vec2(.011,.009)*m.g;
  s+=vec2(sin(uv.y*5.+u_time*.32),cos(uv.x*6.+u_time*.28))*.0022*depth*act;
  vec2 ld=(uv-u_lens.xy)*k;
  float lr=length(ld)/max(u_lens.w,1e-4),lens=u_lens.z*(1.-smoothstep(.7,1.,lr));
  s-=(uv-u_lens.xy)*lens*.2*(1.-lr*lr*.6);
  float wave=0.;
  for(int i=0;i<4;i++){
    vec4 r=u_ripples[i];
    if(r.w<=0.)continue;
    vec2 q=(uv-r.xy)*k;
    float dist=length(q),band=(dist-r.z*.3)*8.,w=sin(dist*44.-r.z*7.)*exp(-band*band)*(1.-smoothstep(1.,2.4,r.z))*r.w;
    s+=q/(dist+1e-4)/k*w*.013*(.4+depth);
    wave+=abs(w);
  }
  vec2 cq=(uv-u_charge.xy)*k;
  float cl=length(cq);
  if(u_charge.z>0.)s+=cq/(cl+1e-4)/k*sin(cl*70.+u_time*16.)*exp(-cl*6.)*u_charge.z*.004;
  s=clamp(s,vec2(.001),vec2(.999));
  float disp=(.0009*act+lens*.003+wave*.004+u_charge.z*.003)*(.35+body);
  vec3 col=texture(u_image,s).rgb;
  if(disp>1e-5)col.rb=vec2(texture(u_image,s+vec2(disp,0)).r,texture(u_image,s-vec2(disp,0)).b);
  if(body>.004){
    // 8-bit height needs a +/-2.5 texel spread to avoid contour banding.
    vec2 d=2.5/size;
    vec3 n=normalize(vec3(texture(u_maps,uv-vec2(d.x,0)).g-texture(u_maps,uv+vec2(d.x,0)).g,texture(u_maps,uv-vec2(0,d.y)).g-texture(u_maps,uv+vec2(0,d.y)).g,.16));
    // Prismatic glass, not the warm ceramic: vivid saturation, or any clear
    // colour that is not the ceramic's orange-cream hue.
    float hi=max(col.r,max(col.g,col.b)),chroma=hi-min(col.r,min(col.g,col.b));
    float warm=(col.r-col.b)/(chroma+1e-3);
    float glass=clamp(smoothstep(.22,.36,chroma/(hi+1e-3))+smoothstep(.07,.15,chroma)*(1.-smoothstep(.3,.75,warm)),0.,1.)*body;
    // Relight relative to the baked light, so the resting light is the original.
    vec3 L=normalize(L0+vec3(u_light.xy*1.2,0.));
    // Shade more than it brightens, so the warm ceramic never washes out.
    col*=1.+clamp((max(dot(n,L),0.)-max(dot(n,L0),0.))*.24,-.2,.1)*body;
    float nh=max(dot(n,normalize(L+vec3(0,0,1))),0.);
    col+=(pow(nh,30.)*.08*(1.-glass)+pow(nh,110.)*.5*glass)*body*act*vec3(1.,.96,.9);
    // Prismatic glass shifts hue as the light travels; stays richer once upgraded.
    float irid=glass*act*.3;
    if(irid>0.)col=mix(col,hue(col,dot(n.xy,u_light.xy)*1.8+u_light.x*.9+sin(u_time*.4)*.25),irid);
    float grey=dot(col,vec3(.2126,.7152,.0722));
    col=mix(vec3(grey),col,1.+u_glow.z*.14*glass);
    // Upgrade: a band of light runs along the loop and passes behind the glass
    // at the crossing, because the baked path parameter follows the front strand.
    if(u_glow.y>0.){
      float lp=texelFetch(u_maps,ivec2(clamp(uv,0.,.9999)*size),0).b;
      float ds=abs(fract(lp-u_glow.x+.5)-.5);
      col+=exp(-ds*ds/.0016)*u_glow.y*body*(spectrum(lp*1.5+u_time*.2)*.45+.18)*(.4+glass);
    }
    if(u_glow.w>=0.){
      float sw=uv.x*.75+uv.y*.65-(u_glow.w*2.3-.45);
      col+=exp(-sw*sw/.005)*body*(glass*spectrum(uv.x+uv.y*.5)*.5+.1);
    }
    col+=u_charge.w*exp(-cl*4.5)*vec3(1.,.86,.62)*.4*body;
  }else{
    // Warm light pools on the floor restore the selected reference's ground
    // caustics; they slide away from the light as it moves.
    vec2 fd=(uv-u_floor.xy)/(u_floor.zw*vec2(1.4,2.3));
    float fl=length(fd);
    if(fl<1.){
      float n1=noised(vec2(fd.x*2.6-u_light.x*.9,fd.y*1.1+u_time*.04)).x;
      float n2=noised(vec2(fd.x*6.3+u_light.x*1.3,fd.y*2.2-u_time*.07)+7.).x;
      float pool=smoothstep(.42,.86,n1*.62+n2*.38)*(1.-smoothstep(.2,1.,fl));
      col=mix(col,col*mix(vec3(1.,.8,.52),vec3(.84,.78,1.),smoothstep(.35,.8,n2)),pool*(.26+.3*act));
    }
  }
  col+=u_charge.z*exp(-cl*10.)*vec3(1.,.9,.75)*.18;
  float rim=(lr-.95)*14.;
  col+=exp(-rim*rim)*u_lens.z*.05;
  col+=u_paper;
  o=vec4(clamp(col,0.,1.)*edge,edge);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || 'Shader compilation failed');
  }
  return shader;
}

function build(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string,
  names: string[],
  varyings?: string[],
) {
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create program');
  const shaders = [
    compile(gl, gl.VERTEX_SHADER, vertex),
    compile(gl, gl.FRAGMENT_SHADER, fragment),
  ];
  for (const shader of shaders) gl.attachShader(program, shader);
  if (varyings) gl.transformFeedbackVaryings(program, varyings, gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(program);
  for (const shader of shaders) {
    gl.detachShader(program, shader);
    gl.deleteShader(shader);
  }
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(log || 'Program link failed');
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  for (const name of names) uniforms[name] = gl.getUniformLocation(program, name);
  return { program, uniforms };
}

function texture(gl: WebGL2RenderingContext, source: HTMLImageElement, data: boolean) {
  const handle = gl.createTexture();
  if (!handle) throw new Error('Unable to create texture');
  gl.bindTexture(gl.TEXTURE_2D, handle);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  // Data maps must arrive exactly as encoded; the artwork keeps browser color handling.
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, data ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (data) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  else {
    // Phones show the 1122px artwork at a third of its size; mipmaps keep the
    // downscaled glass and ceramic grain from shimmering.
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  }
  return handle;
}

export function createLightField(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  maps: HTMLImageElement,
  path: readonly LoopPoint[],
  options: { paper: [number, number, number]; floor: [number, number, number, number] },
): LightField | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;
  const owned: {
    programs: WebGLProgram[];
    buffers: WebGLBuffer[];
    arrays: WebGLVertexArrayObject[];
    textures: WebGLTexture[];
    feedback?: WebGLTransformFeedback;
  } = { programs: [], buffers: [], arrays: [], textures: [] };
  function release() {
    if (gl!.isContextLost()) return;
    for (const program of owned.programs) gl!.deleteProgram(program);
    for (const buffer of owned.buffers) gl!.deleteBuffer(buffer);
    for (const array of owned.arrays) gl!.deleteVertexArray(array);
    for (const handle of owned.textures) gl!.deleteTexture(handle);
    if (owned.feedback) gl!.deleteTransformFeedback(owned.feedback);
  }
  try {
    const sim = build(
      gl,
      SIM_VS,
      SIM_FS,
      [
        'u_size',
        'u_step',
        'u_pointer',
        'u_motion',
        'u_art',
        'u_field',
        'u_charge',
        'u_emit',
        'u_shake',
        'u_maps',
        'u_path',
      ],
      ['v_pos', 'v_vel', 'v_data'],
    );
    const motes = build(gl, MOTE_VS, MOTE_FS, [
      'u_size',
      'u_art',
      'u_light',
      'u_view',
      'u_time',
      'u_maps',
    ]);
    const art = build(gl, ART_VS, ART_FS, [
      'u_size',
      'u_art',
      'u_image',
      'u_maps',
      'u_light',
      'u_lens',
      'u_charge',
      'u_glow',
      'u_floor',
      'u_ripples',
      'u_paper',
      'u_time',
    ]);
    owned.programs.push(sim.program, motes.program, art.program);
    const imageTexture = texture(gl, image, false);
    const mapsTexture = texture(gl, maps, true);
    owned.textures.push(imageTexture, mapsTexture);

    const buffer = (data: BufferSource, usage: number) => {
      const handle = gl.createBuffer();
      if (!handle) throw new Error('Unable to create buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, handle);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      owned.buffers.push(handle);
      return handle;
    };
    const quad = buffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    // Motes start scattered and invisible; most are distant, a few are close.
    const initial = new Float32Array(CAPACITY * 8);
    for (let i = 0; i < CAPACITY; i++) {
      initial[i * 8] = Math.random();
      initial[i * 8 + 1] = Math.random();
      initial[i * 8 + 4] = Math.random() ** 1.5;
      initial[i * 8 + 5] = Math.random();
    }
    const states = [buffer(initial, gl.DYNAMIC_COPY), buffer(initial, gl.DYNAMIC_COPY)];

    const vertexArray = (state: WebGLBuffer | null, instanced: boolean) => {
      const handle = gl.createVertexArray();
      if (!handle) throw new Error('Unable to create vertex array');
      owned.arrays.push(handle);
      gl.bindVertexArray(handle);
      if (state) {
        gl.bindBuffer(gl.ARRAY_BUFFER, state);
        const layout: [number, number][] = [
          [2, 0],
          [2, 8],
          [4, 16],
        ];
        layout.forEach(([size, offset], location) => {
          gl.enableVertexAttribArray(location);
          gl.vertexAttribPointer(location, size, gl.FLOAT, false, STRIDE, offset);
          if (instanced) gl.vertexAttribDivisor(location, 1);
        });
      }
      if (instanced || !state) {
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);
      }
      gl.bindVertexArray(null);
      return handle;
    };
    const simArrays = states.map((state) => vertexArray(state, false));
    const drawArrays = states.map((state) => vertexArray(state, true));
    const artArray = vertexArray(null, false);
    const feedback = gl.createTransformFeedback();
    if (!feedback) throw new Error('Unable to create transform feedback');
    owned.feedback = feedback;

    gl.useProgram(sim.program);
    gl.uniform1i(sim.uniforms.u_maps, 1);
    gl.useProgram(motes.program);
    gl.uniform1i(motes.uniforms.u_maps, 1);
    gl.useProgram(art.program);
    gl.uniform1i(art.uniforms.u_image, 0);
    gl.uniform1i(art.uniforms.u_maps, 1);
    gl.uniform3fv(art.uniforms.u_paper, options.paper);
    gl.uniform4fv(art.uniforms.u_floor, options.floor);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, mapsTexture);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL setup failed');

    const loop = sampleLoop(path, PATH_SAMPLES);
    const pathPixels = new Float32Array(PATH_SAMPLES * 3);
    const artRect = new Float32Array(4);
    const ripplesUv = new Float32Array(16);
    const orbit = new Float32Array(4);
    const maxSize = Math.min(
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
      ...(gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array),
    );
    let width = 1;
    let height = 1;
    let ratio = 1;
    let current = 0;

    return {
      capacity: CAPACITY,
      resize(cssWidth, cssHeight, pixelRatio) {
        width = Math.max(1, cssWidth);
        height = Math.max(1, cssHeight);
        canvas.width = Math.max(1, Math.min(maxSize, Math.round(width * pixelRatio)));
        canvas.height = Math.max(1, Math.min(maxSize, Math.round(height * pixelRatio)));
        ratio = canvas.width / width;
      },
      place(rect) {
        artRect.set([rect.x, rect.y, rect.w, rect.h]);
        for (let i = 0; i < PATH_SAMPLES; i++) {
          pathPixels[i * 3] = rect.x + loop[i * 3] * rect.w;
          pathPixels[i * 3 + 1] = rect.y + loop[i * 3 + 1] * rect.h;
          pathPixels[i * 3 + 2] = loop[i * 3 + 2];
        }
      },
      frame(state, simulate) {
        const [ax, ay, aw, ah] = artRect;
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (simulate && state.count > 0) {
          const u = sim.uniforms;
          gl.useProgram(sim.program);
          gl.uniform2f(u.u_size, width, height);
          orbit.set(state.step);
          orbit[3] = aw / 700; // flow speed scales with the sculpture
          gl.uniform4fv(u.u_step, orbit);
          gl.uniform4fv(u.u_pointer, state.pointer);
          gl.uniform4fv(u.u_motion, state.motion);
          gl.uniform4fv(u.u_art, artRect);
          gl.uniform4fv(u.u_field, state.field);
          gl.uniform4fv(u.u_charge, state.charge);
          gl.uniform4fv(u.u_emit, state.emit);
          gl.uniform4fv(u.u_shake, state.shake);
          gl.uniform3fv(u.u_path, pathPixels);
          gl.bindVertexArray(simArrays[current]);
          gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback);
          gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, states[current ^ 1]);
          gl.enable(gl.RASTERIZER_DISCARD);
          gl.beginTransformFeedback(gl.POINTS);
          gl.drawArrays(gl.POINTS, 0, Math.min(state.count, CAPACITY));
          gl.endTransformFeedback();
          gl.disable(gl.RASTERIZER_DISCARD);
          gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
          gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
          current ^= 1;
        }
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        const time = state.step[1];
        const u = art.uniforms;
        gl.useProgram(art.program);
        gl.uniform2f(u.u_size, width, height);
        gl.uniform4fv(u.u_art, artRect);
        gl.uniform4fv(u.u_light, state.light);
        gl.uniform1f(u.u_time, time);
        // Page-pixel effects become image UV; the lens radius is in image heights.
        gl.uniform4f(
          u.u_lens,
          (state.lens[0] - ax) / aw,
          (state.lens[1] - ay) / ah,
          state.lens[2],
          state.lens[3] / ah,
        );
        gl.uniform4f(
          u.u_charge,
          (state.charge[0] - ax) / aw,
          (state.charge[1] - ay) / ah,
          state.charge[2],
          state.flash[0],
        );
        for (let i = 0; i < 4; i++) {
          ripplesUv[i * 4] = (state.ripples[i * 4] - ax) / aw;
          ripplesUv[i * 4 + 1] = (state.ripples[i * 4 + 1] - ay) / ah;
          ripplesUv[i * 4 + 2] = state.ripples[i * 4 + 2];
          ripplesUv[i * 4 + 3] = state.ripples[i * 4 + 3];
        }
        gl.uniform4fv(u.u_ripples, ripplesUv);
        gl.uniform4fv(u.u_glow, state.glow);
        gl.bindVertexArray(artArray);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (state.view[0] > 0 && state.count > 0) {
          const v = motes.uniforms;
          gl.useProgram(motes.program);
          gl.uniform2f(v.u_size, width, height);
          gl.uniform4fv(v.u_art, artRect);
          gl.uniform4fv(v.u_light, state.light);
          gl.uniform4f(v.u_view, state.view[0], ratio, state.view[1], state.view[2]);
          gl.uniform1f(v.u_time, time);
          gl.bindVertexArray(drawArrays[current]);
          gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, Math.min(state.count, CAPACITY));
        }
        gl.bindVertexArray(null);
      },
      dispose: release,
    };
  } catch (error) {
    if (import.meta.env.DEV) console.info('Using the image artwork fallback.', error);
    release();
    return null;
  }
}
