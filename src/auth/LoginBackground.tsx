/**
 * Fundo animado da tela de login (Three.js). Campo de partículas em onda —
 * água/granéis do terminal Cattalini em Paranaguá — nas cores da marca
 * (navy #14204A → gold #F5C400). Puramente decorativo, não é conteúdo de slide.
 *
 * Robustez: se o WebGL não estiver disponível, não renderiza nada (o CSS já
 * deixa um fundo navy). Respeita prefers-reduced-motion. Limpa tudo no unmount.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  attribute float aScale;
  varying float vHeight;
  void main() {
    vec3 p = position;
    float w = sin(p.x * 0.35 + uTime) * 0.6
            + sin(p.z * 0.50 + uTime * 0.8) * 0.5
            + sin((p.x + p.z) * 0.20 + uTime * 0.5) * 0.4;
    p.y += w;
    vHeight = w;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * (1.0 / -mv.z);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uNavy;
  uniform vec3 uGold;
  varying float vHeight;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.08, d);
    float t = clamp((vHeight + 1.5) / 3.0, 0.0, 1.0);
    vec3 col = mix(uNavy, uGold, pow(t, 2.2));
    gl_FragColor = vec4(col, alpha * (0.35 + 0.55 * t));
  }
`;

export function LoginBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    } catch {
      return; // sem WebGL → fundo navy do CSS assume
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0b1428, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1428, 0.03);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 6.5, 15);
    camera.lookAt(0, 0, 0);

    // grade de pontos no plano XZ
    const COLS = 140, ROWS = 140, GAP = 0.55;
    const count = COLS * ROWS;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    let i = 0;
    for (let x = 0; x < COLS; x++) {
      for (let z = 0; z < ROWS; z++) {
        positions[i * 3] = (x - COLS / 2) * GAP;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (z - ROWS / 2) * GAP;
        scales[i] = 6 + Math.sin(x * 12.9898 + z * 78.233) * 3; // pseudo-aleatório determinístico
        i++;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 26 },
        uNavy: { value: new THREE.Color(0x14204a) },
        uGold: { value: new THREE.Color(0xf5c400) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      mat.uniforms.uTime.value = t;
      points.rotation.y = Math.sin(t * 0.05) * 0.15; // deriva suave
      renderer.render(scene, camera);
      if (!reduced) raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className="login-bg" aria-hidden="true" />;
}
