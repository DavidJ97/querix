'use client';
import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {EXRLoader} from 'three/examples/jsm/loaders/EXRLoader.js';

// Démo « réaliste » : décor modélisé dans Blender et éclairé par Cycles (éclairage précalculé dans une
// lightmap), personnages Rocketbox éclairés par un panorama rendu dans la même scène. Rien n'est calculé
// en direct à part l'affichage : pas d'ombres temps réel, pas de post-traitement → fluide sur téléphone.

type V2 = {x: number; z: number};
type Box = {x0: number; x1: number; z0: number; z1: number};
const ROOM = {x0: -4.75, x1: 4.75, z0: -3.8, z1: 3.75};
// Obstacles (repère Three.js : x à droite, z vers le joueur ; le fond des postes est à z = -4).
const BOXES: Box[] = [
  {x0: -2.7, x1: -0.7, z0: -3.4, z1: -2.5}, {x0: 0.7, x1: 2.7, z0: -3.4, z1: -2.5},           // bureaux
  {x0: -2.0, x1: -1.3, z0: -4, z1: -3.2}, {x0: 1.4, x1: 2.1, z0: -4, z1: -3.2},             // chaises du personnel
  ...[-3.4, 0, 3.4].map(x => ({x0: x - 0.1, x1: x + 0.1, z0: -4, z1: -2.2})),              // rideaux
  {x0: 1.3, x1: 4.4, z0: 1.25, z1: 1.95}, {x0: 1.3, x1: 4.4, z0: 2.65, z1: 3.35},           // chaises d'attente
  {x0: -4.35, x1: -0.85, z0: -1.05, z1: -0.75}, {x0: -1.15, x1: -0.85, z0: -1.0, z1: 0.75}, // guide-file
  {x0: -4.85, x1: -3.75, z0: -3.85, z1: -2.75}, {x0: 3.85, x1: 4.95, z0: 2.85, z1: 3.95},   // plantes
  {x0: -2.5, x1: -1.9, z0: 1.7, z1: 2.3},                                                    // panneau sol mouillé
];
const R = 0.3;
const free = (x: number, z: number) => x - R > ROOM.x0 && x + R < ROOM.x1 && z - R > ROOM.z0 && z + R < ROOM.z1 &&
  !BOXES.some(b => x + R > b.x0 && x - R < b.x1 && z + R > b.z0 && z - R < b.z1);
const move = (p: V2, dx: number, dz: number): V2 =>
  free(p.x + dx, p.z + dz) ? {x: p.x + dx, z: p.z + dz} : free(p.x + dx, p.z) ? {x: p.x + dx, z: p.z} : free(p.x, p.z + dz) ? {x: p.x, z: p.z + dz} : p;

const LIGHTS_SPECULAR_ONLY = THREE.ShaderChunk.lights_fragment_maps.replace(/iblIrradiance \+= getIBLIrradiance\( geometryNormal \);/, '');

export default function DemoScene() {
  const stageRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const input = useRef({joy: {x: 0, y: 0}, keys: new Set<string>(), run: false});
  const [status, setStatus] = useState('Chargement de la clinique…');
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/game3d/';

  useEffect(() => {
    const stage = stageRef.current!;
    const touch = matchMedia('(pointer: coarse)').matches;
    let disposed = false, raf = 0;
    const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Rendu tonal : « neutral » (Khronos PBR Neutral, couleurs fidèles) par défaut ; ?tm=agx&exp=0.8 pour comparer.
    const q = new URLSearchParams(location.search);
    renderer.toneMapping = q.get('tm') === 'agx' ? THREE.AgXToneMapping : THREE.NeutralToneMapping;
    renderer.toneMappingExposure = Number(q.get('exp')) || 0.3;
    renderer.domElement.className = 'demo-canvas';
    stage.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#b9cfe8');
    // Profil qualité optionnel : ajustements des matériaux des avatars.
    const cinematic = q.get('quality') === 'high';
    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 40);
    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 70 : 58; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(stage);

    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = (u: string) => new Promise<GLTF>((ok, ko) => loader.load(u, ok, undefined, ko));
    const pmrem = new THREE.PMREMGenerator(renderer);

    // Panorama Cycles de la pièce : reflets du sol et éclairage cohérent des personnages.
    new EXRLoader().load(base + 'demo/env.exr', t => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = pmrem.fromEquirectangular(t).texture; t.dispose();
    });
    // Décor + lightmap (éclairage Cycles précalculé, encodé /4 en sRGB 8 bits).
    const lightmap = new THREE.TextureLoader().load(base + 'demo/lightmap.webp');
    lightmap.channel = 1; lightmap.flipY = false; lightmap.colorSpace = THREE.SRGBColorSpace;
    gltf(base + 'demo/clinic_booth.glb').then(g => {
      g.scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
          mat.lightMap = lightmap; mat.lightMapIntensity = 4 * Math.PI; mat.envMapIntensity = Number(q.get('env') ?? 1);
          // Le panorama ne sert qu'aux reflets : la lumière diffuse vient déjà de la lightmap (pas de double éclairage).
          mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_maps>', LIGHTS_SPECULAR_ONLY); };
          mat.customProgramCacheKey = () => 'lightmapped';
          if (mat.map) mat.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
      });
      if (!disposed) scene.add(g.scene);
    }).catch(() => setStatus('Le décor n’a pas pu être chargé.'));
    // Props Poly Haven (non cuits) : plantes, panneau, horloge, porte-blocs.
    const prop = (name: string, x: number, y: number, z: number, ry = 0, k = 1) => gltf(`${base}props/${name}.glb`).then(g => {
      g.scene.position.set(x, y, z); g.scene.rotation.y = ry; g.scene.scale.setScalar(k);
      g.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) (m.material as THREE.MeshStandardMaterial).envMapIntensity = 0.9; });
      if (!disposed) scene.add(g.scene);
    }).catch(() => {});
    prop('potted_plant_02', -4.3, 0, -3.3, 0.5, 1.45); prop('potted_plant_02', 4.4, 0, 3.4, 2.0, 1.3);
    prop('WetFloorSign_01', -2.2, 0, 2.0, 0.7); prop('wall_clock', 4.98, 2.5, 1.6, -Math.PI / 2, 1.3);
    prop('clipboard', -2.35, 0.755, -2.9, 0.3); prop('clipboard', 1.05, 0.755, -2.9, -0.2);

    // Lumière d'appoint douce pour les personnages (sans ombre portée), ombre de contact en texture.
    // Pas de lampe en direct : le décor est déjà éclairé par la lightmap ; les personnages par le panorama Cycles.
    const blob = new THREE.CanvasTexture((() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
    })());
    const shadowOf = (o: THREE.Object3D, size: number) => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({map: blob, transparent: true, depthWrite: false}));
      s.rotation.x = -Math.PI / 2; s.position.y = 0.006; s.renderOrder = 1; o.add(s); return s;
    };

    const mixers: THREE.AnimationMixer[] = [];
    const clips = new Map<string, Promise<THREE.AnimationClip>>();
    const anim = (g: string, k: string) => {
      const id = `${g}_${k}`;
      if (!clips.has(id)) clips.set(id, gltf(`${base}anims/${id}.glb`).then(x => { const c = x.animations[0]; c.tracks = c.tracks.filter(t => !/Footsteps|MotionExtraction/.test(t.name)); return c; }));
      return clips.get(id)!;
    };
    const avatar = async (id: string, g: string, x: number, z: number, ry: number, k: string, shadow = 0.9) => {
      const [a, clip] = await Promise.all([gltf(`${base}avatars/${id}.glb`), anim(g, k)]);
      const o = a.scene; o.position.set(x, 0, z); o.rotation.y = ry;
      o.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) { m.frustumCulled = false; for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) { mat.envMapIntensity = cinematic ? 1.2 : 1.6; if (mat.map) mat.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); } } });
      if (shadow) shadowOf(o, shadow);
      if (!disposed) scene.add(o);
      const mx = new THREE.AnimationMixer(o); mixers.push(mx);
      const act = mx.clipAction(clip); act.play(); act.time = Math.random() * clip.duration;
      return {o, mx, act};
    };

    const player = {pos: {x: -0.4, z: 2.4} as V2, yaw: Math.PI, obj: null as THREE.Object3D | null, act: {} as Record<string, THREE.AnimationAction>, cur: 'idle'};
    let camYaw = Math.PI, drag: {x: number; id: number} | null = null, manual = 0;
    (async () => {
      try {
        const p = await avatar('player', 'm', player.pos.x, player.pos.z, player.yaw, 'idle', 1.0);
        p.act.time = 0;
        const [w, r] = await Promise.all([anim('m', 'walk'), anim('m', 'run')]);
        player.obj = p.o; player.act = {idle: p.act, walk: p.mx.clipAction(w), run: p.mx.clipAction(r)};
        setStatus('');
        avatar('staff_f1', 'f', -1.65, -3.55, 0, 'sit_desk', 0);
        avatar('staff_m1', 'm', 1.75, -3.55, 0, 'sit_desk', 0);
        avatar('patient_f1', 'f', 2.84, 1.58, 0, 'sit_wait', 0);
      } catch { setStatus('Les personnages n’ont pas pu être chargés.'); }
    })();

    const keyDir: Record<string, [number, number]> = {arrowup: [0, 1], w: [0, 1], z: [0, 1], arrowdown: [0, -1], s: [0, -1], arrowleft: [-1, 0], a: [-1, 0], q: [-1, 0], arrowright: [1, 0], d: [1, 0]};
    const kd = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (k in keyDir || k === 'shift') { e.preventDefault(); input.current.keys.add(k); } };
    const ku = (e: KeyboardEvent) => input.current.keys.delete(e.key.toLowerCase());
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    const canvas = renderer.domElement;
    const pd = (e: PointerEvent) => { drag = {x: e.clientX, id: e.pointerId}; };
    const pm = (e: PointerEvent) => { if (drag && drag.id === e.pointerId) { camYaw -= (e.clientX - drag.x) * 0.006; drag.x = e.clientX; manual = 1.5; } };
    const pu = () => { drag = null; };
    canvas.addEventListener('pointerdown', pd); canvas.addEventListener('pointermove', pm); addEventListener('pointerup', pu);

    const play = (n: string) => {
      if (player.cur === n || !player.act[n]) return;
      player.act[n].reset().play().crossFadeFrom(player.act[player.cur], 0.25, true); player.cur = n;
    };
    const clock = new THREE.Clock(), look = new THREE.Vector3(), camPos = new THREE.Vector3();
    // Camera boom: prevent the camera from crossing furniture footprints.
    const cameraClear = (x: number, z: number) => !BOXES.some(b => x > b.x0 - .12 && x < b.x1 + .12 && z > b.z0 - .12 && z < b.z1 + .12);
    const clearInput = () => { input.current.keys.clear(); input.current.run = false; input.current.joy = {x:0,y:0}; };
    window.addEventListener('blur', clearInput);
    let avg = 1 / 60, first = true, tFps = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const raw = clock.getDelta(), dt = Math.min(raw, 1 / 30);
      avg += (raw - avg) * 0.05;
      const inp = input.current;
      let fx = inp.joy.x, fy = inp.joy.y;
      inp.keys.forEach(k => { const d = keyDir[k]; if (d) { fx += d[0]; fy += d[1]; } });
      const len = Math.hypot(fx, fy);
      let speed = 0;
      if (len > 0.05) {
        const n = Math.min(1, len), ux = fx / len, uy = fy / len;
        const mx = (Math.sin(camYaw) * uy - Math.cos(camYaw) * ux) * n, mz = (Math.cos(camYaw) * uy + Math.sin(camYaw) * ux) * n;
        const run = inp.run || inp.keys.has('shift');
        const sp = (run ? 3.4 : 1.4) * dt;
        const next = move(player.pos, mx * sp, mz * sp);
        speed = Math.hypot(next.x - player.pos.x, next.z - player.pos.z) / Math.max(dt, 0.0001);
        player.pos = next;
        let d = Math.atan2(mx, mz) - player.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); player.yaw += d * Math.min(1, dt * 10);
        if (manual <= 0 && uy > -0.3) { let c = player.yaw - camYaw; c = Math.atan2(Math.sin(c), Math.cos(c)); camYaw += c * Math.min(1, dt * 1.5); }
      }
      manual = Math.max(0, manual - dt);
      play(speed > 2.4 ? 'run' : speed > 0.15 ? 'walk' : 'idle');
      if (player.act.walk) player.act.walk.timeScale = Math.max(0.6, speed / 1.4);
      if (player.act.run) player.act.run.timeScale = Math.max(0.7, speed / 3.4);
      if (player.obj) { player.obj.position.set(player.pos.x, 0, player.pos.z); player.obj.rotation.y = player.yaw; }
      for (const m of mixers) m.update(dt);
      const dist = camera.aspect < 1 ? 3.6 : 2.9;
      let boom = dist;
      for (let d = .35; d <= dist; d += .12) {
        if (!cameraClear(player.pos.x - Math.sin(camYaw)*d, player.pos.z - Math.cos(camYaw)*d)) { boom = Math.max(.35,d-.18); break; }
      }
      camPos.set(player.pos.x - Math.sin(camYaw) * boom, 1.85, player.pos.z - Math.cos(camYaw) * boom);
      camPos.x = Math.max(ROOM.x0 + 0.1, Math.min(ROOM.x1 - 0.1, camPos.x)); camPos.z = Math.max(ROOM.z0 + 0.1, Math.min(ROOM.z1 + 0.15, camPos.z));
      if (first) { camera.position.copy(camPos); first = false; } else camera.position.lerp(camPos, Math.min(1, dt * 8));
      look.set(player.pos.x + Math.sin(camYaw) * 3, 1.2, player.pos.z + Math.cos(camYaw) * 3);
      camera.lookAt(look);
      renderer.render(scene, camera);
      if (fpsRef.current && (tFps += raw) > 1) { tFps = 0; fpsRef.current.textContent = `${Math.round(1 / avg)} i/s · ${renderer.info.render.calls} appels`; }
    };
    tick();
    return () => {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('pointerup', pu);
      window.removeEventListener('blur', clearInput); pmrem.dispose(); renderer.dispose(); canvas.remove();
    };
  }, [base]);

  const joyStart = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget; el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, Rr = r.width / 2;
    const upd = (ev: PointerEvent | React.PointerEvent) => {
      let dx = (ev.clientX - cx) / Rr, dy = (ev.clientY - cy) / Rr; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      input.current.joy = {x: dx, y: -dy};
      if (knobRef.current) knobRef.current.style.transform = `translate(${dx * Rr * 0.55}px, ${dy * Rr * 0.55}px)`;
    };
    upd(e);
    const mv = (ev: PointerEvent) => upd(ev);
    const end = () => { input.current.joy = {x: 0, y: 0}; if (knobRef.current) knobRef.current.style.transform = ''; el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  };

  return <div ref={stageRef} className="demo-stage">
    <div className="demo-top"><a href={(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/'}>← Quérix</a><b>Démo réaliste · postes 3 et 4</b><span ref={fpsRef} className="demo-fps"/></div>
    <div className="demo-joy" onPointerDown={joyStart} aria-label="Joystick"><div ref={knobRef}/></div>
    <button className="demo-run" aria-label="Courir (maintenir)" onPointerDown={() => { input.current.run = true; }} onPointerUp={() => { input.current.run = false; }} onPointerCancel={() => { input.current.run = false; }}>Courir</button>
    {status && <div className="demo-loading">{status}</div>}
  </div>;
}
