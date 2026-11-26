// Plan de la clinique 3D, en mètres. Repère : x vers la droite, z vers l'avant (vers la caméra au départ).
// Module sans DOM : le rendu (Clinic3D.tsx) et les tests node lisent les mêmes données.

export const ROOM = {minX: -14, maxX: 14, minZ: -9, maxZ: 9, height: 4.2};
export const START = {x: 0, z: 7, yaw: Math.PI}; // yaw = PI : regarde vers le fond (z négatif)
export const PLAYER_RADIUS = 0.32;

// Postes de vaccination le long du mur du fond.
export const BOOTHS = [
  {num: 3, x: -9.5}, {num: 4, x: -4.5}, {num: 7, x: 1.5}, {num: 8, x: 6.5},
].map(b => ({...b, deskZ: -6.4, chairZ: -7.3, zoneZ: -5.1}));

// Zones de réponse : une par option du moteur décisionnel (ordre des options).
export const ZONES = [
  {booth: 3, x: -9.5, z: -5.1, label: 'Poste 3'},
  {booth: 7, x: 1.5, z: -5.1, label: 'Poste 7'},
  {booth: 4, x: -4.5, z: -5.1, label: 'Poste 4'},
  {booth: 8, x: 6.5, z: -5.1, label: 'Poste 8'},
];
export const ZONE_RADIUS = 1.1;

// Salle d'attente : rangées de chaises (x de départ, z, nombre).
export const CHAIR_ROWS = [
  {x0: 5.5, z: 0.6, n: 7}, {x0: 5.5, z: 2.4, n: 7}, {x0: 5.5, z: 4.2, n: 7},
];
export const CHAIR_STEP = 0.75;

// Guide-file : suite de poteaux reliés par des sangles.
export const STANCHIONS = [
  [-7.5, 1.2], [-5.5, 1.2], [-3.5, 1.2], [-1.5, 1.2], [-1.5, -1.0], [-3.5, -1.0], [-5.5, -1.0],
];

export const PILLARS = [[-6.8, -2.8], [4.0, -2.8], [-6.8, 5.6]];

export const RECEPTION = {minX: -13.6, maxX: -9.6, minZ: 2.4, maxZ: 4.4};

// Obstacles au sol (boîtes alignées sur les axes, marge comprise).
export function buildObstacles() {
  const boxes = [];
  const box = (minX, maxX, minZ, maxZ, tag) => boxes.push({minX, maxX, minZ, maxZ, tag});
  for (const b of BOOTHS) {
    box(b.x - 1.25, b.x + 1.25, b.deskZ - 0.45, b.deskZ + 0.45, `bureau-${b.num}`);
    box(b.x - 0.4, b.x + 0.4, b.chairZ - 0.4, b.chairZ + 0.35, `chaise-${b.num}`);
  }
  // Cloisons-rideaux entre les postes (du mur jusqu'à l'avant des bureaux).
  for (const x of [-12, -7, -2, 4, 9]) box(x - 0.06, x + 0.06, ROOM.minZ, -5.7, 'cloison');
  for (const r of CHAIR_ROWS) box(r.x0 - 0.4, r.x0 + (r.n - 1) * CHAIR_STEP + 0.4, r.z - 0.35, r.z + 0.4, 'chaises');
  for (let i = 0; i < STANCHIONS.length - 1; i++) {
    const [ax, az] = STANCHIONS[i], [bx, bz] = STANCHIONS[i + 1];
    box(Math.min(ax, bx) - 0.12, Math.max(ax, bx) + 0.12, Math.min(az, bz) - 0.12, Math.max(az, bz) + 0.12, 'guide-file');
  }
  for (const [x, z] of PILLARS) box(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 'pilier');
  box(RECEPTION.minX, RECEPTION.maxX, RECEPTION.minZ, RECEPTION.maxZ, 'accueil');
  box(-13.6, -12.6, -2.2, -1.2, 'plante'); box(12.6, 13.6, -4.4, -3.4, 'plante'); box(12.6, 13.6, 6.6, 7.6, 'plante');
  return boxes;
}
export const OBSTACLES = buildObstacles();

export function canStand(x, z, r = PLAYER_RADIUS) {
  if (x - r < ROOM.minX + 0.15 || x + r > ROOM.maxX - 0.15 || z - r < ROOM.minZ + 0.15 || z + r > ROOM.maxZ - 0.15) return false;
  return !OBSTACLES.some(o => x + r > o.minX && x - r < o.maxX && z + r > o.minZ && z - r < o.maxZ);
}

// Glissement le long des obstacles : déplacement complet, puis axe par axe.
export function moveWithCollisions(p, dx, dz) {
  if (canStand(p.x + dx, p.z + dz)) return {x: p.x + dx, z: p.z + dz};
  if (dx && canStand(p.x + dx, p.z)) return {x: p.x + dx, z: p.z};
  if (dz && canStand(p.x, p.z + dz)) return {x: p.x, z: p.z + dz};
  return {x: p.x, z: p.z};
}

export function nearestZone(p, count) {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < Math.min(count, ZONES.length); i++) {
    const d = Math.hypot(p.x - ZONES[i].x, p.z - ZONES[i].z);
    if (d < ZONE_RADIUS && d < bestD) { best = i; bestD = d; }
  }
  return best;
}

// Recherche de chemin : parcours en largeur sur une grille de 0,25 m, puis lissage en ligne droite.
const CELL = 0.25;
const snap = v => Math.round(v / CELL) * CELL;
function clearLine(a, b) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1);
  for (let i = 1; i <= n; i++) if (!canStand(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n)) return false;
  return true;
}
function nearestStandable(p) {
  for (let r = 0; r < 24; r++) for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
    if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
    const q = {x: snap(p.x) + i * CELL, z: snap(p.z) + j * CELL};
    if (canStand(q.x, q.z)) return q;
  }
  return null;
}
export function findPath(from, to) {
  const goal = nearestStandable(to);
  if (!goal) return [];
  if (clearLine(from, goal)) return [goal];
  const start = nearestStandable(from);
  if (!start) return [];
  const key = q => `${Math.round(q.x / CELL)},${Math.round(q.z / CELL)}`;
  const prev = new Map([[key(start), null]]), queue = [start];
  let found = null;
  for (let h = 0; h < queue.length && !found; h++) {
    const c = queue[h];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const n = {x: c.x + dx * CELL, z: c.z + dz * CELL}, k = key(n);
      if (prev.has(k) || !canStand(n.x, n.z) || !canStand((c.x + n.x) / 2, (c.z + n.z) / 2)) continue;
      prev.set(k, c); queue.push(n);
      if (k === key(goal)) { found = n; break; }
    }
  }
  if (!found) return [];
  const raw = [];
  for (let q = found; q; q = prev.get(key(q))) raw.unshift(q);
  const path = [];
  let anchor = from, i = 0;
  while (i < raw.length) {
    let j = raw.length - 1;
    while (j > i && !clearLine(anchor, raw[j])) j--;
    path.push(raw[j]); anchor = raw[j]; i = j + 1;
  }
  return path;
}

export const pathLength = (from, path) => path.reduce((s, q, i) => s + Math.hypot(q.x - (i ? path[i - 1].x : from.x), q.z - (i ? path[i - 1].z : from.z)), 0);
