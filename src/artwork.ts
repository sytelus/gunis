/**
 * A small, progressive WebGL artwork renderer.
 *
 * The authored raster remains the source of truth: this is image-based
 * refraction and parallax, not a claim of a fully rotatable 3D mesh. A single
 * triangle strip, one texture and one draw call keep it practical on phones.
 * GPU capability is detected directly; no vendor fingerprinting is needed for
 * Apple/Metal-backed WebGL. A normal <img> remains the fallback at every stage.
 */
import { createCuriosityTrail } from './curiosity-trail';

const VERTEX = `attribute vec2 a_position;
varying vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;

const FRAGMENT = `precision mediump float;
uniform sampler2D u_image;
uniform vec2 u_fit;
uniform vec2 u_pointer;
uniform vec2 u_ripple;
uniform float u_time;
uniform float u_age;
varying vec2 v_uv;
float luminance(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){
  vec2 uv=(v_uv-.5)*u_fit+.5;
  // The studio backdrop fades to page paper at the outer border.
  float edge=smoothstep(0.,.065,uv.x)*smoothstep(0.,.065,1.-uv.x)
    *smoothstep(0.,.055,uv.y)*smoothstep(0.,.055,1.-uv.y);
  if(edge<.001){gl_FragColor=vec4(0.);return;}
  vec3 original=texture2D(u_image,uv).rgb;
  float depth=clamp((1.-luminance(original))*2.4,0.,1.);
  float chroma=max(original.r,max(original.g,original.b))-min(original.r,min(original.g,original.b));
  vec2 offset=u_pointer*.016*depth;
  offset+=vec2(sin(uv.y*5.+u_time*.32),cos(uv.x*6.+u_time*.28))*.0025*depth;
  vec2 delta=uv-u_ripple;
  float distanceToRipple=length(delta);
  float wave=sin(distanceToRipple*37.-u_age*6.)*exp(-pow((distanceToRipple-u_age*.25)*7.,2.));
  float envelope=(1.-smoothstep(1.5,3.,u_age))*step(0.,u_age);
  offset+=normalize(delta+vec2(.0001))*wave*envelope*.022*depth;
  vec2 sampleUv=clamp(uv+offset,vec2(.001),vec2(.999));
  vec3 color=texture2D(u_image,sampleUv).rgb;
  float dispersion=(.0009+length(u_pointer)*.0016+abs(wave*envelope)*.003)*depth;
  color.r=texture2D(u_image,sampleUv+vec2(dispersion,0.)).r;
  color.b=texture2D(u_image,sampleUv-vec2(dispersion,0.)).b;
  // Optical highlights drift only over existing prismatic material.
  float light=sin(uv.x*9.+uv.y*5.+u_time*.5+u_pointer.x*2.)*.015;
  color+=light*chroma*vec3(1.,.68,.32);
  gl_FragColor=vec4(clamp(color,0.,1.),edge);
}`;

type Graphics = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  texture: WebGLTexture;
};

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error('Artwork shader is not supported');
  }
  return shader;
}

function createGraphics(canvas: HTMLCanvasElement, image: HTMLImageElement): Graphics | null {
  // Request the browser's efficient adapter, including Apple GPUs where present.
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
    premultipliedAlpha: false,
  });
  if (!gl) return null;
  let vertex: WebGLShader | undefined;
  let fragment: WebGLShader | undefined;
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  try {
    if (!program || !buffer || !texture) throw new Error('Unable to allocate artwork');
    vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Unable to link artwork');
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    return { gl, program, buffer, texture };
  } catch (error) {
    if (import.meta.env.DEV) console.info('Using the image artwork fallback.', error);
    if (program) gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
    return null;
  } finally {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

export async function mountArtwork(root: HTMLElement): Promise<() => void> {
  const image = root.querySelector<HTMLImageElement>('.artwork-image')!;
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const surface = root.querySelector<HTMLButtonElement>('.artwork-touch')!;
  const host = root.closest<HTMLElement>('.home-shell')!;
  const hint = document.querySelector<HTMLElement>('.artwork-hint')!;
  const announcement = document.querySelector<HTMLElement>('[data-artwork-announcement]')!;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const options = { signal: events.signal };
  try {
    await image.decode();
  } catch {
    return () => {};
  }
  let graphics = createGraphics(canvas, image);
  let frame = 0;
  let paused = media.matches;
  let visible = !document.hidden;
  let onScreen = true;
  let elapsed = 0;
  let previous = 0;
  let rippleAt = -10;
  let ripple = { x: 0.5, y: 0.5 };
  let target = { x: 0, y: 0 };
  let pointer = { x: 0, y: 0 };
  // With no pause UI, ambient motion runs for at most 4.5 seconds. Every
  // deliberate interaction starts a fresh 3.2-second response, then settles.
  let activeUntil = 4.5;
  let lastHoverRipple = -10;
  let exploration: {
    x: number;
    y: number;
    time: number;
    started: number;
    distance: number;
  } | null = null;
  const trail = createCuriosityTrail(host);
  let pixelRatio = Math.min(
    devicePixelRatio || 1,
    matchMedia('(pointer: coarse)').matches ? 1.3 : 1.75,
  );
  let slowFrames = 0;
  let lastPointer = { x: 0.5, y: 0.5 };
  let box = root.getBoundingClientRect();
  let locations: Record<string, WebGLUniformLocation | null> = {};

  function uniforms() {
    if (!graphics) return;
    locations = Object.fromEntries(
      ['image', 'fit', 'pointer', 'ripple', 'time', 'age'].map((name) => [
        name,
        graphics!.gl.getUniformLocation(graphics!.program, 'u_' + name),
      ]),
    );
  }
  function resize() {
    box = root.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(box.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(box.height * pixelRatio));
    draw();
  }
  function draw() {
    trail.draw(elapsed);
    if (!graphics) {
      // Keep exploration available on devices without WebGL. Transform the
      // original asset subtly; no replacement illustration is synthesized.
      const pulse = Math.max(0, 1 - (elapsed - rippleAt) / 2);
      image.style.transform = `perspective(1000px) rotateY(${pointer.x * 4}deg) rotateX(${-pointer.y * 3}deg) translateY(${Math.sin(elapsed * 0.45) * 2}px)`;
      image.style.filter = `saturate(${1 + pulse * 0.22})`;
      return;
    }
    const { gl } = graphics;
    const aspect = canvas.width / canvas.height;
    const imageAspect = image.naturalWidth / image.naturalHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(
      locations.fit,
      Math.max(1, aspect / imageAspect),
      Math.max(1, imageAspect / aspect),
    );
    gl.uniform2f(locations.pointer, pointer.x, pointer.y);
    gl.uniform2f(locations.ripple, ripple.x, ripple.y);
    gl.uniform1f(locations.time, elapsed);
    gl.uniform1f(locations.age, elapsed - rippleAt);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function animate(now: number) {
    frame = 0;
    if (paused || !visible || !onScreen) return;
    const delta = previous ? (now - previous) / 1000 : 0;
    previous = now;
    elapsed += Math.min(delta, 0.05);
    // Lower resolution after sustained slow frames instead of identifying GPUs.
    slowFrames = delta > 0.037 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 80 && pixelRatio > 1) {
      pixelRatio = 1;
      slowFrames = 0;
      resize();
    }
    const easing = 1 - Math.exp(-Math.min(delta, 0.05) * 6);
    pointer.x += (target.x - pointer.x) * easing;
    pointer.y += (target.y - pointer.y) * easing;
    draw();
    if (elapsed < activeUntil) frame = requestAnimationFrame(animate);
    else {
      previous = 0;
      root.dataset.motion = 'settled';
    }
  }
  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (!paused && visible && onScreen && elapsed < activeUntil) {
      root.dataset.motion = 'active';
      frame = requestAnimationFrame(animate);
    }
  }
  function wake() {
    if (paused) return;
    activeUntil = elapsed + 3.2;
    if (!frame) schedule();
  }
  function setPaused(value: boolean) {
    paused = value;
    surface.disabled = paused;
    hint.hidden = paused;
    trail.hide();
    exploration = null;
    target = pointer = { x: 0, y: 0 };
    rippleAt = -10;
    lastHoverRipple = -10;
    elapsed = 0;
    activeUntil = paused ? 0 : 4.5;
    root.dataset.motion = paused ? 'reduced' : 'active';
    draw();
    schedule();
  }
  function point(event: PointerEvent) {
    // Refresh client coordinates on interaction, since the user may have scrolled.
    box = root.getBoundingClientRect();
    lastPointer = {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, 1 - (event.clientY - box.top) / box.height)),
    };
    target = { x: (lastPointer.x - 0.5) * 2, y: (lastPointer.y - 0.5) * 2 };
  }
  function sendRipple(announce = false) {
    if (paused) return;
    wake();
    const aspect = canvas.width / canvas.height;
    const imageAspect = image.naturalWidth / image.naturalHeight;
    ripple = {
      x: (lastPointer.x - 0.5) * Math.max(1, aspect / imageAspect) + 0.5,
      y: (lastPointer.y - 0.5) * Math.max(1, imageAspect / aspect) + 0.5,
    };
    rippleAt = elapsed;
    if (announce)
      announcement.textContent = 'A new perspective. The light responds to your curiosity.';
  }
  function hasExplored(event: PointerEvent, distance: number): boolean {
    if (event.type === 'pointerdown') return true;
    // A broad ellipse is useful for responsive light, but includes whitespace.
    // Do not permanently dismiss the invitation on a casual crossing. Require
    // 1.2s of continuous movement, covering 24px, in the inner 82% of that area.
    if (distance > 0.82) {
      exploration = null;
      return false;
    }
    const now = event.timeStamp;
    const previous = exploration;
    const continuous = previous !== null && now - previous.time <= 300;
    exploration = {
      x: event.clientX,
      y: event.clientY,
      time: now,
      started: continuous ? previous.started : now,
      distance: continuous
        ? previous.distance + Math.hypot(event.clientX - previous.x, event.clientY - previous.y)
        : 0,
    };
    return now - exploration.started >= 1200 && exploration.distance >= 24;
  }
  function explore(event: PointerEvent) {
    if (paused || !visible || !onScreen || !event.isPrimary) return;
    // Do not paint invitations over navigation. Pointer Events also support
    // hovering pens; ordinary touch screens can only report actual contact.
    if ((event.target as Element).closest('a, button:not(.artwork-touch)')) {
      trail.hide();
      exploration = null;
      return;
    }
    point(event);
    wake();
    const cx = box.left + box.width * 0.5;
    const cy = box.top + box.height * 0.5;
    const dx = (event.clientX - cx) / (box.width * 0.38);
    const dy = (event.clientY - cy) / (box.height * 0.43);
    const distance = Math.hypot(dx, dy);
    if (distance <= 1) {
      trail.hide();
      if (hasExplored(event, distance)) trail.dismiss();
      if (elapsed - lastHoverRipple > 0.45) {
        sendRipple();
        lastHoverRipple = elapsed;
      }
    } else {
      exploration = null;
      // End at the silhouette's approximate elliptical edge, not its center.
      trail.point(
        event.clientX,
        event.clientY,
        {
          x: cx + (event.clientX - cx) / distance,
          y: cy + (event.clientY - cy) / distance,
        },
        elapsed,
      );
      target.x *= 0.25;
      target.y *= 0.25;
    }
  }
  host.addEventListener('pointermove', explore, { ...options, passive: true });
  host.addEventListener('pointerdown', explore, { ...options, passive: true });
  function release() {
    target = { x: 0, y: 0 };
    exploration = null;
    trail.hide();
  }
  for (const name of ['pointerleave', 'pointercancel', 'pointerup'])
    host.addEventListener(name, release, options);
  window.addEventListener('scroll', release, { ...options, passive: true });
  surface.addEventListener('blur', release, options);
  surface.addEventListener(
    'keydown',
    (event) => {
      if (paused) return;
      if (event.key === 'Escape') {
        activeUntil = elapsed;
        trail.hide();
        root.dataset.motion = 'settled';
        schedule();
        return;
      }
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-0.3, 0],
        ArrowRight: [0.3, 0],
        ArrowUp: [0, 0.3],
        ArrowDown: [0, -0.3],
      };
      if (directions[event.key]) {
        event.preventDefault();
        trail.dismiss();
        const [x, y] = directions[event.key];
        target = {
          x: Math.max(-1, Math.min(1, target.x + x)),
          y: Math.max(-1, Math.min(1, target.y + y)),
        };
        wake();
      }
    },
    options,
  );
  // Native keyboard activation and assistive technology dispatch a detail=0 click.
  surface.addEventListener(
    'click',
    (event) => {
      if (event.detail === 0) {
        trail.dismiss();
        lastPointer = { x: 0.5, y: 0.5 };
        sendRipple(true);
      }
    },
    options,
  );
  media.addEventListener(
    'change',
    () => {
      setPaused(media.matches);
    },
    options,
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      visible = !document.hidden;
      release();
      schedule();
    },
    options,
  );
  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (!onScreen) release();
    schedule();
  });
  const sizeObserver = new ResizeObserver(resize);
  observer.observe(root);
  sizeObserver.observe(root);
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      graphics = null;
      root.dataset.renderer = 'image';
      schedule();
    },
    options,
  );
  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      graphics = createGraphics(canvas, image);
      if (graphics) {
        uniforms();
        resize();
        root.dataset.renderer = 'webgl';
        surface.hidden = false;
        setPaused(paused);
      }
    },
    options,
  );
  uniforms();
  resize();
  root.dataset.renderer = graphics ? 'webgl' : 'image';
  surface.hidden = false;
  release();
  setPaused(paused);
  return () => {
    events.abort();
    observer.disconnect();
    sizeObserver.disconnect();
    cancelAnimationFrame(frame);
    trail.destroy();
    if (graphics) {
      graphics.gl.deleteTexture(graphics.texture);
      graphics.gl.deleteBuffer(graphics.buffer);
      graphics.gl.deleteProgram(graphics.program);
    }
  };
}
