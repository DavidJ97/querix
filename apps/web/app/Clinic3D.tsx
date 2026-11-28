'use client';
import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {EXRLoader} from 'three/examples/jsm/loaders/EXRLoader.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/examples/jsm/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {ROOM, START, BOOTHS, ZONES, CHAIR_ROWS, CHAIR_STEP, STANCHIONS, PILLARS, RECEPTION, PLANTS, WET_SIGN, moveWithCollisions, nearestZone, findPath, distanceField, fieldDistance} from './world3d.mjs';

// Clinique 3D temps réel (Three.js / WebGL) : caméra à la 3e personne, personnage animé,
// personnel et patients, collisions, guidage au sol, joystick tactile et clavier.

type V2 = {x: number; z: number};
const WALK = 1.45, RUN = 3.6, CAM_DIST = 3.3, CAM_PITCH = 0.2, EYE = 1.55;
const BLUE = '#0b4fa8', QUERIX = '#0a3f8c';

// ---------- Textures générées (canvas) ----------
function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// Textures PBR ambientCG (CC0) : couleur, relief (normal map) et rugosité, répétées à l'échelle réelle.
type TexSet = {load: (file: string, srgb: boolean, rx: number, ry: number) => THREE.Texture; fabric: (name: string) => Fabric};
type Fabric = {color: THREE.Texture; rough: THREE.Texture};
function textureSet(base: string, aniso: number): TexSet {
  const loader = new THREE.TextureLoader(), cache = new Map<string, THREE.Texture>();
  const fabrics = new Map<string, Fabric>();
  const raw = (file: string, srgb: boolean) => {
    const t = loader.load(base + 'textures/' + file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  };
  return {fabric(name) {
    let f = fabrics.get(name);
    if (!f) { f = {color: raw(name + '_color.jpg', true), rough: raw(name + '_rough.jpg', false)}; fabrics.set(name, f); }
    return f;
  }, load(file, srgb, rx, ry) {
    let src = cache.get(file);
    if (!src) { src = loader.load(base + 'textures/' + file); cache.set(file, src); }
    // Le clone partage la même source d'image (chargée une seule fois), avec sa propre répétition.
    const t = src.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = aniso;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  }};
}
function textPanel(lines: {text: string; size: number; weight?: number; color?: string}[], w: number, h: number, bg: string, radius = 28) {
  return canvasTexture(w, h, g => {
    g.fillStyle = bg;
    g.beginPath(); g.roundRect(0, 0, w, h, radius); g.fill();
    const total = lines.reduce((s, l) => s + l.size * 1.2, 0);
    let y = (h - total) / 2;
    for (const l of lines) {
      g.font = `${l.weight || 700} ${l.size}px Arial, system-ui, sans-serif`;
      g.fillStyle = l.color || '#fff'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText(l.text, w / 2, y + l.size * 0.1); y += l.size * 1.2;
    }
  });
}
function screenTexture(num: number) {
  return canvasTexture(256, 160, g => {
    const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#1d5fc4'); gr.addColorStop(1, '#0b2f6e');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(14, 14, 120, 12);
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 5; i++) g.fillRect(14, 40 + i * 20, 160 + ((i * 37 + num * 11) % 60), 9);
    g.fillStyle = '#3cc8ff'; g.fillRect(190, 40, 50, 50);
  });
}

// ---------- Textures plaquées par projection triplanaire ----------
// Les personnages n'ont pas de coordonnées UV : la texture est projetée selon les trois axes, dans l'espace
// de l'objet (pose de repos), donc elle reste collée au corps pendant l'animation. Le même shader habille
// le mobilier fusionné (espace monde, en mètres) : échelle réelle et constante quelle que soit la taille.
// Le relief vient de la carte de rugosité (bump calculé en espace écran), la rugosité module le reflet.
function triplanar(mat: THREE.MeshStandardMaterial, f: Fabric, metersPerRepeat: number, metersPerUnit = 1, bump = 1) {
  const uniforms = {tColor: {value: f.color}, tRough: {value: f.rough}, tScale: {value: metersPerUnit / metersPerRepeat}, tBump: {value: bump}};
  mat.userData.tri = `${f.color.uuid}|${metersPerRepeat}|${metersPerUnit}|${bump}`;
  mat.customProgramCacheKey = () => 'triplanar';
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTriPos = position;\nvTriNrm = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D tColor; uniform sampler2D tRough; uniform float tScale; uniform float tBump;
varying vec3 vTriPos; varying vec3 vTriNrm;
vec4 triSample(sampler2D t) {
  vec3 w = pow(abs(normalize(vTriNrm)), vec3(4.0)); w /= (w.x + w.y + w.z);
  vec3 p = vTriPos * tScale;
  return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z;
}`)
      .replace('#include <map_fragment>', '#include <map_fragment>\nvec4 triC = triSample(tColor);\ndiffuseColor.rgb *= triC.rgb;\nfloat triR = triSample(tRough).r;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * (0.45 + triR * 0.75), 0.04, 1.0);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
  vec2 dh = vec2(dFdx(triR), dFdy(triR)) * tBump;
  vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
  float det = dot(dpx, r1) * faceDirection;
  normal = normalize(abs(det) * normal - sign(det) * (dh.x * r1 + dh.y * r2));
}`);
  };
  return mat;
}

// ---------- Construction de la clinique ----------
function buildClinic(scene: THREE.Scene, shadows: boolean, tex: TexSet) {
  const statics = new THREE.Group(); scene.add(statics);
  const W = ROOM.maxX - ROOM.minX, D = ROOM.maxZ - ROOM.minZ, H = ROOM.height;
  const mat = (color: string, roughness = 0.6, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({color, roughness, metalness, ...extra});
  const white = mat('#f3f5f7', 0.55), wall = mat('#dfe5ec', 0.9), metal = mat('#b9c1cb', 0.3, 0.85), dark = mat('#2a3340', 0.5, 0.2);
  const blueMat = mat(BLUE, 0.45);
  // Matières textiles et bois (Poly Haven, CC0) plaquées en triplanaire, à l'échelle réelle.
  const seatMat = triplanar(mat('#6a7a90', 0.7), tex.fabric('leather'), 0.3, 1, 0.25);
  const wood = triplanar(mat('#ffffff', 0.55), tex.fabric('veneer'), 1.0, 1, 0);
  const staffSeat = triplanar(mat('#2b3d5c', 0.7), tex.fabric('leather'), 0.3, 1, 0.25);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, cast = true, ry = 0) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry;
    o.castShadow = cast && shadows; o.receiveShadow = shadows; statics.add(o); return o;
  };
  const rbox = (w: number, h: number, d: number, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, r);

  // Sol ciré, murs, plafond technique.
  // Sol : carrelage 60 cm ciré (8 carreaux par texture = 4,8 m), joints en relief, reflets de l'HDRI.
  const fr = [W / 4.8, D / 4.8] as const;
  const floorMat = new THREE.MeshStandardMaterial({color: '#d9dde2', map: tex.load('tile_color.jpg', true, ...fr),
    normalMap: tex.load('tile_normal.jpg', false, ...fr), normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: tex.load('tile_rough.jpg', false, ...fr), roughness: 6.5, metalness: 0, envMapIntensity: 0.85});
  const floor = add(new THREE.PlaneGeometry(W, D), floorMat, 0, 0, 0, false);
  floor.rotation.x = -Math.PI / 2; floor.name = 'floor';
  // Murs : peinture mate sur plâtre (relief subtil), soubassement en mosaïque dans la zone des postes.
  const wallMat = (w: number) => new THREE.MeshStandardMaterial({color: '#e2e7ed', roughness: 0.92,
    normalMap: tex.load('plaster_normal.jpg', false, w / 3, H / 3), normalScale: new THREE.Vector2(0.35, 0.35)});
  const wallG = (w: number) => new THREE.PlaneGeometry(w, H);
  add(wallG(W), wallMat(W), 0, H / 2, ROOM.minZ, false);
  add(wallG(W), wallMat(W), 0, H / 2, ROOM.maxZ, false, Math.PI);
  add(wallG(D), wallMat(D), ROOM.minX, H / 2, 0, false, Math.PI / 2);
  add(wallG(D), wallMat(D), ROOM.maxX, H / 2, 0, false, -Math.PI / 2);
  const mr = [W / 0.6, 1.3 / 0.6] as const;
  add(new THREE.PlaneGeometry(W, 1.3), new THREE.MeshStandardMaterial({color: '#ffffff', map: tex.load('mosaic_color.jpg', true, ...mr),
    normalMap: tex.load('mosaic_normal.jpg', false, ...mr), roughnessMap: tex.load('mosaic_rough.jpg', false, ...mr), roughness: 1.2}),
    0, 0.65, ROOM.minZ + 0.012, false);
  add(new THREE.BoxGeometry(W, 0.04, 0.03), mat('#c7d0da', 0.4, 0.6), 0, 1.31, ROOM.minZ + 0.02, false);
  // Bandeau bleu Quérix en bas des murs.
  add(new THREE.BoxGeometry(W, 0.12, 0.04), blueMat, 0, 0.06, ROOM.minZ + 0.02, false);
  add(new THREE.BoxGeometry(W, 0.12, 0.04), blueMat, 0, 0.06, ROOM.maxZ - 0.02, false);
  add(new THREE.BoxGeometry(0.04, 0.12, D), blueMat, ROOM.minX + 0.02, 0.06, 0, false);
  add(new THREE.BoxGeometry(0.04, 0.12, D), blueMat, ROOM.maxX - 0.02, 0.06, 0, false);
  // Faux plafond en dalles de 60 cm.
  const cr = [W / 4.8, D / 4.8] as const;
  const ceil = add(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({color: '#dfe4ea', emissive: '#aab3bf', emissiveIntensity: 0.55,
    normalMap: tex.load('tile_normal.jpg', false, ...cr), normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.95, envMapIntensity: 0.25}), 0, H, 0, false);
  ceil.rotation.x = Math.PI / 2;
  const lightMat = new THREE.MeshStandardMaterial({color: '#ffffff', emissive: '#fff6e8', emissiveIntensity: 1.6});
  for (let x = -12; x <= 12; x += 3) for (let z = -7.5; z <= 7.5; z += 3)
    add(new THREE.BoxGeometry(1.3, 0.05, 0.6), lightMat, x, H - 0.03, z, false);
  for (const z of [-4, 1.5, 6]) {
    const duct = add(new THREE.CylinderGeometry(0.28, 0.28, W - 0.4, 20), metal, 0, H - 0.55, z, false);
    duct.rotation.z = Math.PI / 2;
  }
  // Fenêtres sur le mur de gauche.
  const glass = new THREE.MeshStandardMaterial({color: '#bcd8f0', emissive: '#9cc7ef', emissiveIntensity: 0.55, roughness: 0.1});
  for (let z = -4.6; z <= 1.2; z += 1.45) {
    add(new THREE.PlaneGeometry(1.35, 2.3), glass, ROOM.minX + 0.03, 2.05, z, false, Math.PI / 2);
    add(new THREE.BoxGeometry(0.06, 2.5, 0.08), dark, ROOM.minX + 0.05, 2.05, z + 0.72, false);
  }

  // Postes de vaccination : bureau, écran, chaise, rideaux, numéro suspendu.
  const curtainMat = triplanar(mat('#dbe8ff', 0.9, 0, {side: THREE.DoubleSide}), tex.fabric('linen'), 0.5, 1, 0.12);
  const curtainGeo = (() => {
    const g = new THREE.PlaneGeometry(3.3, 2.1, 60, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * 0.05);
    g.computeVertexNormals(); return g;
  })();
  for (const x of [-12, -7, -2, 4, 9]) {
    add(curtainGeo, curtainMat, x, 1.15, -7.35, true, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.02, 0.02, 3.4, 8), metal, x, 2.22, -7.35, false).rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), metal, x, 1.1, -5.7, true);
  }
  for (const b of BOOTHS) {
    add(rbox(2.5, 0.05, 0.9, 0.02), white, b.x, 0.75, b.deskZ);
    add(rbox(2.45, 0.68, 0.04, 0.01), wood, b.x, 0.38, b.deskZ + 0.4);
    for (const dx of [-1.15, 1.15]) add(new THREE.BoxGeometry(0.05, 0.72, 0.8), white, b.x + dx, 0.37, b.deskZ);
    add(new THREE.BoxGeometry(0.6, 0.38, 0.03), dark, b.x + 0.2, 1.05, b.deskZ - 0.25);
    add(new THREE.PlaneGeometry(0.56, 0.34), new THREE.MeshBasicMaterial({map: screenTexture(b.num), toneMapped: false}), b.x + 0.2, 1.05, b.deskZ - 0.233, false);
    add(new THREE.BoxGeometry(0.06, 0.25, 0.06), dark, b.x + 0.2, 0.86, b.deskZ - 0.27);
    add(new THREE.BoxGeometry(0.42, 0.02, 0.14), dark, b.x + 0.2, 0.785, b.deskZ + 0.05);
    add(rbox(0.25, 0.04, 0.3, 0.01), mat('#e7eef8'), b.x - 0.6, 0.79, b.deskZ + 0.05);
    // chaise du personnel
    add(rbox(0.5, 0.08, 0.48), staffSeat, b.x, 0.48, b.chairZ);
    add(rbox(0.48, 0.55, 0.06), staffSeat, b.x, 0.85, b.chairZ - 0.24);
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), metal, b.x, 0.23, b.chairZ);
    // numéro suspendu
    const sign = textPanel([{text: String(b.num), size: 190, weight: 800, color: '#ffffff'}], 256, 256, '#d9a51c', 22);
    const sm = new THREE.MeshStandardMaterial({map: sign, roughness: 0.5});
    const s = add(new THREE.BoxGeometry(0.62, 0.62, 0.05), [mat('#b88a14'), mat('#b88a14'), mat('#b88a14'), mat('#b88a14'), sm, sm] as unknown as THREE.Material, b.x - 0.9, 2.85, -5.8, false);
    s.castShadow = false;
    add(new THREE.CylinderGeometry(0.006, 0.006, 1.0, 4), dark, b.x - 1.1, 3.66, -5.8, false);
    add(new THREE.CylinderGeometry(0.006, 0.006, 1.0, 4), dark, b.x - 0.7, 3.66, -5.8, false);
  }

  // Accueil Quérix.
  const r = RECEPTION, rx = (r.minX + r.maxX) / 2, rz = (r.minZ + r.maxZ) / 2;
  add(rbox(r.maxX - r.minX, 1.05, r.maxZ - r.minZ, 0.04), white, rx, 0.525, rz);
  add(rbox(r.maxX - r.minX + 0.1, 0.05, r.maxZ - r.minZ + 0.1, 0.02), mat('#dfe5ec', 0.35), rx, 1.07, rz);
  const logo = textPanel([{text: 'Quérix', size: 120, weight: 800}, {text: 'Accueil · formation', size: 44, weight: 500, color: '#cfe4ff'}], 1024, 300, QUERIX, 0);
  add(new THREE.PlaneGeometry(3.6, 0.95), new THREE.MeshStandardMaterial({map: logo, roughness: 0.4}), rx, 0.52, r.maxZ + 0.006, false);
  add(new THREE.BoxGeometry(0.6, 0.38, 0.03), dark, rx + 0.8, 1.35, rz - 0.3, true, Math.PI);

  // Salle d'attente : chaises en rangées (instanciées).
  const seats = CHAIR_ROWS.flatMap(row => Array.from({length: row.n}, (_, i) => ({x: row.x0 + i * CHAIR_STEP, z: row.z})));
  const inst = (geo: THREE.BufferGeometry, m: THREE.Material, dy: number, dz: number) => {
    const im = new THREE.InstancedMesh(geo, m, seats.length), o = new THREE.Object3D();
    seats.forEach((s, i) => { o.position.set(s.x, dy, s.z + dz); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.castShadow = shadows; im.receiveShadow = shadows; scene.add(im);
  };
  inst(rbox(0.56, 0.08, 0.5), seatMat, 0.46, 0);
  inst(rbox(0.56, 0.5, 0.07), seatMat, 0.78, 0.26);
  inst(new THREE.BoxGeometry(0.04, 0.46, 0.04), metal, 0.23, -0.18);
  inst(new THREE.BoxGeometry(0.04, 0.46, 0.04), metal, 0.23, 0.2);
  for (const row of CHAIR_ROWS) {
    const len = (row.n - 1) * CHAIR_STEP + 0.6;
    add(new THREE.BoxGeometry(len, 0.05, 0.06), metal, row.x0 + (row.n - 1) * CHAIR_STEP / 2, 0.4, row.z, true);
  }

  // Guide-file : poteaux et sangles bleues.
  STANCHIONS.forEach(([x, z], i) => {
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 12), dark, x, 0.475, z);
    add(new THREE.CylinderGeometry(0.17, 0.19, 0.03, 20), dark, x, 0.015, z);
    if (i < STANCHIONS.length - 1) {
      const [bx, bz] = STANCHIONS[i + 1], len = Math.hypot(bx - x, bz - z);
      add(new THREE.BoxGeometry(len, 0.05, 0.01), mat('#1c4fd1', 0.5), (x + bx) / 2, 0.9, (z + bz) / 2, true, -Math.atan2(bz - z, bx - x));
    }
  });

  // Piliers, plantes, signalétique.
  for (const [x, z] of PILLARS) add(new THREE.BoxGeometry(0.8, H, 0.8), white, x, H / 2, z);
  const vac = textPanel([{text: 'Vaccination', size: 96}, {text: 'Postes 3 – 8  →', size: 72, weight: 500}], 1024, 400, BLUE, 30);
  add(new THREE.PlaneGeometry(1.9, 0.75), new THREE.MeshStandardMaterial({map: vac, roughness: 0.4}), -6.8, 2.5, -2.39, false);
  const obs = textPanel([{text: 'Salle d’observation', size: 84}, {text: '15 minutes', size: 64, weight: 500, color: '#cfe4ff'}], 1024, 380, BLUE, 30);
  add(new THREE.PlaneGeometry(2.6, 0.96), new THREE.MeshStandardMaterial({map: obs, roughness: 0.4}), ROOM.maxX - 0.03, 2.6, 2.4, false, -Math.PI / 2);
  const fict = textPanel([{text: 'Clinique de formation — scénario fictif', size: 56, weight: 600, color: '#0a3f8c'}], 1400, 140, 'rgba(255,255,255,0.9)', 18);
  add(new THREE.PlaneGeometry(5, 0.5), new THREE.MeshStandardMaterial({map: fict, transparent: true}), -1.5, 3.55, ROOM.minZ + 0.02, false);
  mergeStatics(statics);
}

// Fusion du décor fixe : un seul maillage (donc un seul appel de dessin) par matériau identique.
function mergeStatics(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const key = (m: THREE.MeshStandardMaterial) => [m.type, m.color?.getHexString(), m.emissive?.getHexString(), m.emissiveIntensity, m.roughness, m.metalness,
    m.map?.uuid, m.normalMap?.uuid, m.roughnessMap?.uuid, m.side, m.transparent, m.opacity, m.flatShading, m.envMapIntensity, m.userData.tri].join('|');
  const buckets = new Map<string, {mat: THREE.Material; cast: boolean; geos: THREE.BufferGeometry[]}>();
  for (const o of [...group.children]) {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material) || m.material.type !== 'MeshStandardMaterial') continue;
    const k = key(m.material as THREE.MeshStandardMaterial) + '|' + m.castShadow;
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const b = buckets.get(k) ?? {mat: m.material, cast: m.castShadow, geos: []};
    b.geos.push(g); buckets.set(k, b);
    group.remove(m); m.geometry.dispose();
  }
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos);
    b.geos.forEach(g => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = true;
    group.add(mesh);
  }
}

export default function Clinic3D({options, onAnswer}: {options: string[]; onAnswer: (s: string) => void}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const distRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const optionsRef = useRef(options);
  const nearRef = useRef(-1);
  const input = useRef({joy: {x: 0, y: 0}, run: false, keys: new Set<string>()});
  const routeTo = useRef<(i: number) => void>(() => {});
  const resetRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [near, setNear] = useState(-1);
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/game3d/';
  const joyRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLSpanElement>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const onQuality = useRef((q: number) => setQuality(q));
  const [flash, setFlash] = useState(0);
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('querix.sound') === 'off'; } catch { return false; } });
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; try { localStorage.setItem('querix.sound', muted ? 'off' : 'on'); } catch { /* stockage indisponible */ } }, [muted]);

  // Sons (Kenney, CC0) via Web Audio : débloqués au premier contact, comme l'exigent les navigateurs mobiles.
  const audio = useRef<{ctx: AudioContext | null; buf: Record<string, AudioBuffer>}>({ctx: null, buf: {}});
  const unlockAudio = () => {
    const a = audio.current;
    if (a.ctx) { if (a.ctx.state === 'suspended') a.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
    if (!AC) return;
    a.ctx = new AC();
    for (const n of ['step', 'ui', 'confirm', 'level_up'])
      fetch(base + 'audio/' + n + '.mp3').then(r => r.arrayBuffer()).then(b => a.ctx!.decodeAudioData(b)).then(d => { a.buf[n] = d; }).catch(() => {});
  };
  const sfx = (name: string, vol = 0.6, rate = 1) => {
    const a = audio.current, b = a.buf[name];
    if (mutedRef.current || !a.ctx || !b) return;
    const src = a.ctx.createBufferSource(), g = a.ctx.createGain();
    src.buffer = b; src.playbackRate.value = rate; g.gain.value = vol;
    src.connect(g).connect(a.ctx.destination); src.start();
  };
  const sfxRef = useRef(sfx); sfxRef.current = sfx;
  const buzz = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* pas de vibreur */ } };

  useEffect(() => { optionsRef.current = options; }, [options]);

  useEffect(() => {
    const stage = stageRef.current!;
    let disposed = false;
    const touch = matchMedia('(pointer: coarse)').matches;
    const shadows = true;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'}); }
    catch { setStatus('error'); return; }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.info.autoReset = false; // compteurs cumulés sur toute l'image (rendu + post-traitement)
    renderer.domElement.className = 'c3d-canvas';
    stage.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#b9c4d2');
    scene.fog = new THREE.Fog('#b9c4d2', 20, 38);
    const pmrem = new THREE.PMREMGenerator(renderer);
    // Éclairage d'ambiance : environnement neutre immédiat, puis HDRI « lobby » (Poly Haven, CC0) dès qu'il est chargé.
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
    new EXRLoader().load(base + 'env/lobby.exr', hdr => {
      if (disposed) return;
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const env = pmrem.fromEquirectangular(hdr).texture; hdr.dispose();
      scene.environment?.dispose(); scene.environment = env; scene.environmentIntensity = 0.8;
    });
    scene.add(new THREE.HemisphereLight('#eef4ff', '#6f788a', 0.45));
    const sun = new THREE.DirectionalLight('#fff1de', 1.7);
    sun.position.set(5, 12, 6);
    sun.castShadow = shadows;
    sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
    sun.shadow.radius = 3;
    Object.assign(sun.shadow.camera, {left: -15, right: 15, top: 10, bottom: -10, near: 1, far: 30});
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const texSet = textureSet(base, renderer.capabilities.getMaxAnisotropy());
    buildClinic(scene, shadows, texSet);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
    // Post-traitement : occlusion ambiante (GTAO), halo des lumières (bloom), tonemapping final.
    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, samples: 4}));
    composer.addPass(new RenderPass(scene, camera));
    const gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 12});
    composer.addPass(gtao);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.5, 0.92);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // Paliers de qualité : 2 = haut (ordinateur), 1 = moyen (téléphone), 0 = bas.
    // Ajustement automatique : si l'appareil tombe sous ~28 i/s, on descend d'un palier.
    let tier = touch ? 1 : 2;
    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      const pr = Math.min(devicePixelRatio || 1, [1, 1.35, 2][tier]);
      renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
      composer.setPixelRatio(pr); composer.setSize(w, h);
      camera.aspect = w / h; camera.fov = w / h < 1 ? 62 : 52; camera.updateProjectionMatrix();
    };
    const applyTier = () => {
      gtao.enabled = tier === 2; bloom.enabled = tier >= 1;
      renderer.shadowMap.type = tier === 0 ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
      resize();
    };
    applyTier();
    onQuality.current(tier);
    const ro = new ResizeObserver(resize); ro.observe(stage);

    // Zones : anneau au sol + étiquette flottante.
    const zoneObjs = ZONES.map(z => {
      const g = new THREE.Group(); g.position.set(z.x, 0, z.z); scene.add(g);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.9, 48), new THREE.MeshBasicMaterial({color: '#3cc8ff', transparent: true, opacity: 0.8, toneMapped: false}));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; g.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.75, 48), new THREE.MeshBasicMaterial({color: '#3cc8ff', transparent: true, opacity: 0.12, toneMapped: false}));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.01; g.add(disc);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({transparent: true, depthTest: false}));
      label.position.y = 2.25; label.scale.set(1.35, 0.6, 1); label.renderOrder = 10; g.add(label);
      return {g, ring, disc, label, text: ''};
    });
    const setZoneLabels = () => zoneObjs.forEach((o, i) => {
      const opt = optionsRef.current[i];
      o.g.visible = !!opt;
      if (opt && o.text !== opt) {
        o.text = opt;
        o.label.material.map?.dispose();
        o.label.material.map = textPanel([{text: ZONES[i].label, size: 54, weight: 600, color: '#cfe4ff'}, {text: opt.toUpperCase(), size: 92, weight: 800}], 512, 230, 'rgba(10,63,140,0.88)', 40);
        o.label.material.needsUpdate = true;
      }
    });

    // Guidage : chevrons lumineux le long du chemin choisi.
    const chevShape = new THREE.Shape();
    chevShape.moveTo(-0.32, -0.12); chevShape.lineTo(0, 0.16); chevShape.lineTo(0.32, -0.12); chevShape.lineTo(0.32, -0.26); chevShape.lineTo(0, 0.02); chevShape.lineTo(-0.32, -0.26);
    const MAXC = 40;
    const chevrons = new THREE.InstancedMesh(new THREE.ShapeGeometry(chevShape), new THREE.MeshBasicMaterial({color: '#6fe3ff', transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false}), MAXC);
    chevrons.count = 0; chevrons.renderOrder = 5; scene.add(chevrons);

    // Personnages.
    const mixers: THREE.AnimationMixer[] = [];
    const player = {pos: {x: START.x, z: START.z} as V2, yaw: START.yaw, speed: 0, obj: null as THREE.Object3D | null,
      actions: {} as Record<string, THREE.AnimationAction>, current: '', route: [] as V2[], routeZone: -1};
    let camYaw = START.yaw, camYawManual = 0;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    // Avatars Microsoft Rocketbox (MIT) : maillages et textures réalistes, animations partagées par sexe
    // (squelette Biped commun). Le joueur se charge en premier ; le reste de la clinique se peuple ensuite.
    const gltf = (u: string) => new Promise<GLTF>((ok, ko) => loader.load(u, ok, undefined, ko));
    const clips = new Map<string, Promise<THREE.AnimationClip>>();
    const anim = (g: 'f' | 'm', key: string) => {
      const k = g + '_' + key;
      if (!clips.has(k)) clips.set(k, gltf(`${base}anims/${k}.glb`).then(x => {
        const c = x.animations[0];
        c.tracks = c.tracks.filter(t => !/Footsteps|MotionExtraction/.test(t.name)); // os techniques absents des avatars
        return c;
      }));
      return clips.get(k)!;
    };
    const avatar = async (id: string, g: 'f' | 'm', x: number, z: number, ry: number, key: string) => {
      const [a, clip] = await Promise.all([gltf(`${base}avatars/${id}.glb`), anim(g, key)]);
      const o = a.scene;
      o.position.set(x, 0, z); o.rotation.y = ry;
      o.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) { m.castShadow = shadows; m.receiveShadow = false; m.frustumCulled = false; } });
      if (!disposed) scene.add(o);
      const m = new THREE.AnimationMixer(o); mixers.push(m);
      const act = m.clipAction(clip); act.play(); act.time = Math.random() * clip.duration;
      return {o, m, act};
    };
    // Accessoires photoréalistes Poly Haven (CC0) : plantes, panneau « sol mouillé », horloge, porte-blocs.
    const prop = (name: string, x: number, y: number, z: number, ry = 0, k = 1) => gltf(`${base}props/${name}.glb`).then(g => {
      if (disposed) return;
      const o = g.scene; o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(k);
      o.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) { m.castShadow = shadows; m.receiveShadow = shadows; } });
      scene.add(o);
    }).catch(() => {});
    for (const [x, z, ry] of PLANTS) prop('potted_plant_02', x, 0, z, ry, 1.45);
    prop('WetFloorSign_01', WET_SIGN[0], 0, WET_SIGN[1], 0.6);
    prop('wall_clock', ROOM.maxX - 0.03, 2.85, -6, -Math.PI / 2, 1.3);
    BOOTHS.forEach((b, i) => prop('clipboard', b.x - 0.75, 0.778, b.deskZ + 0.12, 0.3 - i * 0.2));
    prop('office_notepads', (RECEPTION.minX + RECEPTION.maxX) / 2 + 0.6, 1.098, (RECEPTION.minZ + RECEPTION.maxZ) / 2, Math.PI / 2, 0.6);

    (async () => {
      try {
        const p = await avatar('player', 'm', START.x, START.z, START.yaw, 'idle');
        if (disposed) return;
        player.obj = p.o;
        p.act.time = 0;
        const [walk, run] = await Promise.all([anim('m', 'walk'), anim('m', 'run')]);
        player.actions = {Man_Idle: p.act, Man_Walk: p.m.clipAction(walk), Man_Run: p.m.clipAction(run)};
        player.current = 'Man_Idle';
        setStatus('ready');
        // Personnel médical assis aux postes, face aux patients.
        const staff: [string, 'f' | 'm'][] = [['staff_f1', 'f'], ['staff_m1', 'm'], ['staff_f2', 'f'], ['staff_m4', 'm']];
        BOOTHS.forEach((b, i) => { avatar(staff[i][0], staff[i][1], b.x, b.chairZ + 0.06, 0, 'sit_desk').catch(() => {}); });
        // Patients en salle d'attente, tournés vers les postes.
        const patients: [string, 'f' | 'm', number, number][] = [['patient_f1', 'f', 0, 1], ['patient_m6', 'm', 0, 4], ['patient_f12', 'f', 1, 0], ['patient_m8', 'm', 1, 3], ['patient_f4', 'f', 2, 2], ['patient_m2', 'm', 2, 5]];
        for (const [id, g, r, i] of patients) {
          const row = CHAIR_ROWS[r];
          avatar(id, g, row.x0 + i * CHAIR_STEP, row.z - 0.04, Math.PI, 'sit_wait').catch(() => {});
        }
        // Agente d'accueil debout derrière le comptoir.
        avatar('reception', 'f', (RECEPTION.minX + RECEPTION.maxX) / 2, RECEPTION.minZ - 0.6, 0, 'idle').catch(() => {});
      } catch { if (!disposed) setStatus('error'); }
    })();

    const play = (name: string) => {
      if (player.current === name || !player.actions[name]) return;
      const prev = player.actions[player.current], next = player.actions[name];
      next.reset().play(); if (prev) next.crossFadeFrom(prev, 0.25, true);
      player.current = name;
    };

    const setRoute = (i: number) => {
      const z = ZONES[i];
      player.route = findPath(player.pos, z) as V2[];
      player.routeZone = player.route.length ? i : -1;
    };
    routeTo.current = setRoute;
    resetRef.current = () => {
      player.pos = {x: START.x, z: START.z}; player.yaw = START.yaw; camYaw = START.yaw; player.route = []; player.routeZone = -1;
    };

    // Clavier.
    const keyDir: Record<string, [number, number]> = {
      ArrowUp: [0, 1], w: [0, 1], z: [0, 1], ArrowDown: [0, -1], s: [0, -1],
      ArrowLeft: [-1, 0], a: [-1, 0], q: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
    };
    const kd = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k in keyDir || k === 'Shift') { e.preventDefault(); input.current.keys.add(k); }
      if ((k === 'e' || k === 'Enter') && nearRef.current >= 0 && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); interactRef.current(); }
    };
    const ku = (e: KeyboardEvent) => input.current.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const blur = () => input.current.keys.clear();
    addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('blur', blur);

    // Glisser sur la scène : orbite de la caméra. Toucher bref sur le sol : aller à ce point.
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    let drag: {id: number; x: number; moved: number; t: number} | null = null;
    const canvas = renderer.domElement;
    const pd = (e: PointerEvent) => { drag = {id: e.pointerId, x: e.clientX, moved: 0, t: performance.now()}; canvas.setPointerCapture(e.pointerId); };
    const pm = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x; drag.x = e.clientX; drag.moved += Math.abs(dx);
      if (drag.moved > 6) { camYaw -= dx * 0.006; camYawManual = 1.5; }
    };
    const pu = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      if (drag.moved <= 6 && performance.now() - drag.t < 400) {
        const r = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        if (ray.ray.intersectPlane(floorPlane, hit)) {
          player.route = findPath(player.pos, {x: hit.x, z: hit.z}) as V2[];
          player.routeZone = -1;
        }
      }
      drag = null;
    };
    canvas.addEventListener('pointerdown', pd); canvas.addEventListener('pointermove', pm); canvas.addEventListener('pointerup', pu); canvas.addEventListener('pointercancel', pu);

    // Boucle de jeu.
    const clock = new THREE.Clock(), dummy = new THREE.Object3D(), camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
    let raf = 0, distTimer = 0, first = true, frameAvg = 1 / 60, tierClock = 0, stepPhase = -1;
    // Cartes de distance calculées une fois par poste, en tâche de fond après le premier rendu.
    const fields: (Map<string, number> | null)[] = ZONES.map(() => null);
    ZONES.forEach((z, i) => setTimeout(() => { if (!disposed) fields[i] = distanceField(z); }, 300 + i * 150));
    const tick = () => {
      raf = requestAnimationFrame(tick);
      renderer.info.reset();
      const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.05), t = clock.elapsedTime;
      frameAvg += (rawDt - frameAvg) * 0.05;
      if ((tierClock += rawDt) > 2.5 && t > 4) {
        tierClock = 0;
        if (frameAvg > 1 / 28 && tier > 0) { tier--; applyTier(); onQuality.current(tier); }
      }
      setZoneLabels();
      const inp = input.current;
      // Intention de déplacement (repère caméra) : joystick, puis clavier, puis chemin.
      let fx = inp.joy.x, fy = inp.joy.y;
      inp.keys.forEach(k => { const d = keyDir[k]; if (d) { fx += d[0]; fy += d[1]; } });
      const len = Math.hypot(fx, fy);
      let mvx = 0, mvz = 0, running = inp.run || inp.keys.has('Shift') || Math.hypot(inp.joy.x, inp.joy.y) > 0.92;
      if (len > 0.05) {
        player.route = []; player.routeZone = -1;
        const n = Math.min(1, len), ux = fx / len, uy = fy / len;
        const fwd = {x: Math.sin(camYaw), z: Math.cos(camYaw)}, right = {x: -Math.cos(camYaw), z: Math.sin(camYaw)};
        mvx = (fwd.x * uy + right.x * ux) * n; mvz = (fwd.z * uy + right.z * ux) * n;
      } else if (player.route.length) {
        const w = player.route[0], dx = w.x - player.pos.x, dz = w.z - player.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.12) player.route.shift(); else { mvx = dx / d; mvz = dz / d; running = running || d > 4; }
      }
      const mlen = Math.hypot(mvx, mvz);
      let moved = 0;
      if (mlen > 0.01) {
        const sp = (running ? RUN : WALK) * Math.min(1, mlen) * dt;
        const next = moveWithCollisions(player.pos, (mvx / mlen) * sp, (mvz / mlen) * sp);
        moved = Math.hypot(next.x - player.pos.x, next.z - player.pos.z);
        player.pos = next;
        const targetYaw = Math.atan2(mvx, mvz);
        let dy = targetYaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        player.yaw += dy * Math.min(1, dt * 10);
        if (camYawManual <= 0 && len > 0.05 && fy > -0.3) {
          let cy = player.yaw - camYaw; cy = Math.atan2(Math.sin(cy), Math.cos(cy));
          camYaw += cy * Math.min(1, dt * 1.6);
        }
      }
      camYawManual = Math.max(0, camYawManual - dt);
      const v = moved / Math.max(dt, 1e-4);
      play(v > 2.6 ? 'Man_Run' : v > 0.2 ? 'Man_Walk' : 'Man_Idle');
      if (player.actions.Man_Walk) player.actions.Man_Walk.timeScale = Math.max(0.6, v / WALK);
      if (player.actions.Man_Run) player.actions.Man_Run.timeScale = Math.max(0.7, v / RUN);
      if (player.obj) { player.obj.position.set(player.pos.x, 0, player.pos.z); player.obj.rotation.y = player.yaw; }
      for (const m of mixers) m.update(dt);
      // Bruits de pas calés sur le cycle de marche (deux appuis par cycle).
      const act = player.actions[player.current];
      if (act && player.current !== 'Man_Idle') {
        const ph = (act.time % act.getClip().duration) / act.getClip().duration;
        if (stepPhase >= 0 && ((stepPhase < 0.1 && ph >= 0.1) || (stepPhase < 0.6 && ph >= 0.6)))
          sfxRef.current('step', player.current === 'Man_Run' ? 0.38 : 0.26, 0.9 + Math.random() * 0.2);
        stepPhase = ph;
      } else stepPhase = -1;

      // Zones, proximité, distances.
      const ni = nearestZone(player.pos, optionsRef.current.length);
      if (ni !== nearRef.current) {
        if (ni >= 0) { sfxRef.current('ui', 0.5, 1.1); try { navigator.vibrate?.(12); } catch { /* */ } }
        nearRef.current = ni; setNear(ni);
      }
      zoneObjs.forEach((o, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
        (o.ring.material as THREE.MeshBasicMaterial).opacity = i === ni ? 1 : 0.55 + 0.3 * pulse;
        o.ring.scale.setScalar(i === ni ? 1.08 : 1);
        o.label.position.y = 2.25 + Math.sin(t * 2 + i) * 0.05;
      });
      if ((distTimer -= dt) <= 0) {
        distTimer = 0.4;
        optionsRef.current.forEach((_, i) => {
          const el = distRefs.current[i]; if (!el || !ZONES[i]) return;
          const f = fields[i], d = f ? fieldDistance(f, player.pos) : null;
          el.textContent = d === null ? `${Math.round(Math.hypot(player.pos.x - ZONES[i].x, player.pos.z - ZONES[i].z))} m` : `${Math.round(d)} m`;
        });
      }
      // Chevrons le long du chemin actif, qui défilent vers l'objectif.
      if (player.route.length) {
        const pts = [player.pos, ...player.route];
        let c = 0, offset = (t * 1.2) % 0.8;
        for (let s = 0; s < pts.length - 1 && c < MAXC; s++) {
          const a = pts[s], b = pts[s + 1], L = Math.hypot(b.x - a.x, b.z - a.z), yaw = Math.atan2(b.x - a.x, b.z - a.z);
          for (let d = s === 0 ? 0.9 + offset : offset; d < L && c < MAXC; d += 0.8) {
            dummy.position.set(a.x + ((b.x - a.x) * d) / L, 0.02, a.z + ((b.z - a.z) * d) / L);
            dummy.rotation.set(-Math.PI / 2, yaw + Math.PI, 0, 'YXZ');
            dummy.updateMatrix(); chevrons.setMatrixAt(c++, dummy.matrix);
          }
          offset = 0;
        }
        chevrons.count = c; chevrons.instanceMatrix.needsUpdate = true;
      } else chevrons.count = 0;

      // Caméra à la 3e personne, gardée à l'intérieur de la salle.
      camTarget.set(player.pos.x, EYE, player.pos.z);
      const back = (camera.aspect < 1 ? 4.4 : CAM_DIST) * Math.cos(CAM_PITCH);
      camPos.set(player.pos.x - Math.sin(camYaw) * back, EYE + (camera.aspect < 1 ? 4.4 : CAM_DIST) * Math.sin(CAM_PITCH), player.pos.z - Math.cos(camYaw) * back);
      camPos.x = Math.max(ROOM.minX + 0.4, Math.min(ROOM.maxX - 0.4, camPos.x));
      camPos.z = Math.max(ROOM.minZ + 0.4, Math.min(ROOM.maxZ - 0.4, camPos.z));
      if (first) { camera.position.copy(camPos); first = false; } else camera.position.lerp(camPos, Math.min(1, dt * 8));
      camera.lookAt(camTarget.x + Math.sin(camYaw) * 4, 1.15, camTarget.z + Math.cos(camYaw) * 4);
      composer.render(dt);
      if (debugRef.current && Math.floor(t) !== Math.floor(t - rawDt)) {
        const i = renderer.info.render;
        debugRef.current.textContent = `${Math.round(1 / frameAvg)} i/s · ${i.calls} appels · ${(i.triangles / 1000).toFixed(0)}k tri · palier ${tier}`;
      }
    };
    tick();

    return () => {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('blur', blur);
      scene.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
      composer.dispose(); pmrem.dispose(); renderer.dispose(); canvas.remove();
    };
  }, [base]);

  const interact = () => {
    const i = nearRef.current, opts = optionsRef.current;
    if (i < 0 || i >= opts.length) return;
    sfx('confirm', 0.7); buzz(25); setFlash(f => f + 1);
    onAnswer(opts[i]);
    resetRef.current();
  };
  const interactRef = useRef(interact);
  interactRef.current = interact;

  // Joystick flottant : il apparaît sous le pouce, n'importe où dans la moitié gauche basse de la scène.
  const joyStart = (e: React.PointerEvent<HTMLDivElement>) => {
    unlockAudio();
    const zone = e.currentTarget, joy = joyRef.current, stage = stageRef.current;
    if (!joy || !stage) return;
    zone.setPointerCapture(e.pointerId);
    const sr = stage.getBoundingClientRect(), R = joy.offsetWidth / 2;
    const cx = Math.max(sr.left + R + 6, Math.min(e.clientX, sr.left + sr.width / 2)), cy = Math.max(sr.top + R + 60, Math.min(e.clientY, sr.bottom - R - 6));
    joy.style.left = `${cx - sr.left - R}px`; joy.style.top = `${cy - sr.top - R}px`; joy.style.bottom = 'auto';
    joy.classList.add('active');
    const upd = (ev: PointerEvent | React.PointerEvent) => {
      let dx = (ev.clientX - cx) / R, dy = (ev.clientY - cy) / R;
      const l = Math.hypot(dx, dy);
      if (l > 1) { dx /= l; dy /= l; }
      // Zone morte de 12 % puis courbe progressive : précis près du centre, pleine vitesse au bord.
      const m = Math.min(1, l), k = m < 0.12 ? 0 : ((m - 0.12) / 0.88) ** 1.3 / Math.max(m, 1e-3);
      input.current.joy = {x: dx * k, y: -dy * k};
      if (knobRef.current) knobRef.current.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
    };
    upd(e);
    const move = (ev: PointerEvent) => upd(ev);
    const end = () => {
      input.current.joy = {x: 0, y: 0};
      if (knobRef.current) knobRef.current.style.transform = '';
      joy.classList.remove('active'); joy.style.left = ''; joy.style.top = ''; joy.style.bottom = '';
      zone.removeEventListener('pointermove', move); zone.removeEventListener('pointerup', end); zone.removeEventListener('pointercancel', end);
    };
    zone.addEventListener('pointermove', move); zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  };

  return <section className="c3d">
    <div ref={stageRef} className="c3d-stage" onPointerDownCapture={unlockAudio} aria-label="Clinique 3D — déplace-toi jusqu'au poste qui correspond à ta réponse">
      <div className="c3d-chips">
        {options.slice(0, ZONES.length).map((o, i) =>
          <button key={o} className={'c3d-chip' + (near === i ? ' active' : '')} onClick={() => { sfx('ui', 0.5); buzz(8); routeTo.current(i); }}>
            <span className="pin" aria-hidden>⌖</span><b>{ZONES[i].label} · {o.toUpperCase()}</b><span ref={el => { distRefs.current[i] = el; }} className="dist">…</span>
          </button>)}
      </div>
      <div className="c3d-tools">
        {typeof location !== 'undefined' && location.search.includes('debug') && <span ref={debugRef} className="c3d-q">mesure…</span>}
        {quality !== null && <span className="c3d-q" title="Qualité graphique ajustée automatiquement">{['Qualité basse', 'Qualité moyenne', 'Qualité haute'][quality]}</span>}
        <button className="c3d-mute" aria-pressed={muted} aria-label={muted ? 'Activer le son' : 'Couper le son'} onClick={() => setMuted(m => !m)}>{muted ? '🔇' : '🔊'}</button>
      </div>
      <div className="c3d-joyzone" onPointerDown={joyStart} aria-hidden/>
      <div ref={joyRef} className="c3d-joy" aria-label="Joystick de déplacement"><div ref={knobRef} className="knob"/></div>
      {flash > 0 && <div key={flash} className="c3d-flash" aria-hidden/>}
      <div className="c3d-actions">
        {near >= 0 && <button className="c3d-act" onClick={interact}>Interagir<small>{ZONES[near].label} · {options[near]?.toUpperCase()}</small></button>}
        <button className="c3d-run" aria-label="Courir (maintenir)"
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); input.current.run = true; }}
          onPointerUp={() => { input.current.run = false; }} onPointerCancel={() => { input.current.run = false; }}>
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="14" cy="4" r="2"/><path d="M8 21l3-6 3 3v3M6 12l3-4 4 1 3 4 3 1M11 15l1-5"/></svg>
        </button>
      </div>
      {status !== 'ready' && <div className="c3d-loading" role="status">{status === 'loading' ? 'Chargement de la clinique 3D…' : 'La 3D n’a pas pu démarrer sur cet appareil. Utilise le mode 2,5D ou les boutons de réponse.'}</div>}
    </div>
    <p className="c3d-hint">{near >= 0 ? `Tu es au ${ZONES[near].label} : appuie sur Interagir (ou E) pour répondre « ${options[near]} ».` : 'Joystick ou flèches/ZQSD pour marcher, glisse pour tourner la caméra, touche le sol ou une destination pour y aller.'}</p>
  </section>;
}
