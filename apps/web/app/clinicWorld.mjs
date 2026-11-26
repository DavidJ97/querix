// Géométrie de la clinique 2,5D, en pixels de l'image clinic.webp (1276 × 490).
// Toutes les positions désignent le point des pieds au sol.
// Module sans dépendance au DOM : il est testé avec `node --test`.

export const WORLD = {width: 1276, height: 490};
export const START = {x: 640, y: 462};

// Hauteur apparente du personnage selon la profondeur (y), calée sur le mobilier :
// ~100 px au fond (bureaux, y = 280), ~215 px au premier plan (y = 490).
export const charHeight = y => 100 + 0.55 * (y - 280);

// Sol praticable : entre la réception (gauche), le fond de la salle et le bloc de chaises (droite).
export const WALKABLE = [
  [292, 486], [292, 312], [470, 304], [540, 286], [925, 284], [925, 300],
  [928, 365], [975, 390], [1018, 415], [1060, 452], [1100, 478], [1110, 486],
];

// Obstacles au sol : ellipses (pots, pieds de poteaux) et segments (cordons du guide-file).
export const OBSTACLES = [
  {type: 'ellipse', x: 383, y: 322, rx: 26, ry: 10},   // grande plante en pot
  {type: 'ellipse', x: 505, y: 294, rx: 20, ry: 8},    // plante du fond
  {type: 'ellipse', x: 314, y: 417, rx: 15, ry: 6},    // poteau A
  {type: 'ellipse', x: 340, y: 410, rx: 15, ry: 6},    // poteau B
  {type: 'ellipse', x: 452, y: 367, rx: 15, ry: 6},    // poteau C
  {type: 'segment', a: [262, 340], b: [314, 417], r: 7}, // cordon D-A
  {type: 'segment', a: [314, 417], b: [340, 410], r: 7}, // cordon A-B
  {type: 'segment', a: [340, 410], b: [452, 367], r: 7}, // cordon B-C
];

// Zones de réponse devant les postes 3 et 7 (une par option du moteur décisionnel).
export const ZONES = [
  {x: 612, y: 300, label: 'Poste 3'},
  {x: 872, y: 298, label: 'Poste 7'},
  {x: 760, y: 296, label: 'Poste 4'},
  {x: 520, y: 330, label: 'Accueil'},
];
export const ZONE_RADIUS = 46;

// Éléments du décor qui passent devant le personnage quand il est derrière eux.
// `base` = ligne de sol de l'objet (tri du peintre). `key` limite le masque aux pixels de l'objet.
export const OCCLUDERS = [
  {name: 'reception', base: 10000, key: null, poly: [[0, 316], [281, 316], [283, 490], [0, 490]]},
  {name: 'plante-pot', base: 325, key: null, poly: [[360, 272], [406, 272], [400, 330], [368, 330]]},
  {name: 'plante-feuilles', base: 325, key: 'green', poly: [[330, 215], [440, 215], [440, 285], [330, 285]]},
  {name: 'plante2-pot', base: 296, key: null, poly: [[490, 262], [522, 262], [518, 298], [494, 298]]},
  {name: 'plante2-feuilles', base: 296, key: 'green', poly: [[465, 170], [560, 170], [560, 268], [465, 268]]},
  {name: 'poteau-a', base: 417, key: 'dark', poly: [[296, 294], [336, 294], [336, 424], [296, 424]]},
  {name: 'poteau-b', base: 410, key: 'dark', poly: [[322, 290], [360, 290], [360, 416], [322, 416]]},
  {name: 'poteau-c', base: 367, key: 'dark', poly: [[436, 180], [470, 180], [470, 374], [436, 374]]},
  ...ropeStrips('cordon-da', [262, 296, 340], [314, 300, 417], 3),
  ...ropeStrips('cordon-ab', [314, 296, 417], [340, 293, 410], 1),
  ...ropeStrips('cordon-bc', [340, 292, 410], [452, 276, 367], 5),
];

// Découpe un cordon en bandes verticales ayant chacune sa propre ligne de sol :
// le tri par colonnes (comme les raycasters à la Wolfenstein) rend l'occultation correcte
// même si le cordon est en biais par rapport à la caméra.
function ropeStrips(name, [ax, ayTop, aBase], [bx, byTop, bBase], n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, lerp = (p, q, t) => p + (q - p) * t;
    const x0 = lerp(ax, bx, t0), x1 = lerp(ax, bx, t1), y0 = lerp(ayTop, byTop, t0), y1 = lerp(ayTop, byTop, t1);
    out.push({name: `${name}-${i}`, base: lerp(aBase, bBase, (t0 + t1) / 2), key: 'rope',
      poly: [[x0, y0 - 7], [x1, y1 - 7], [x1, y1 + 8], [x0, y0 + 8]]});
  }
  return out;
}

export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function hitsObstacle(x, y, o) {
  if (o.type === 'ellipse') return ((x - o.x) / o.rx) ** 2 + ((y - o.y) / o.ry) ** 2 < 1;
  const [ax, ay] = o.a, [bx, by] = o.b, dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) < o.r;
}

// L'empreinte des pieds est une petite ellipse dont la taille suit la profondeur.
export function canStand(x, y) {
  const r = charHeight(y) * 0.08, probes = [[0, 0], [r, 0], [-r, 0], [0, r * 0.35], [0, -r * 0.35]];
  return probes.every(([px, py]) => pointInPolygon(x + px, y + py, WALKABLE) && !OBSTACLES.some(o => hitsObstacle(x + px, y + py, o)));
}

// Déplacement avec glissement le long des obstacles (essai complet, puis axe par axe).
export function moveWithCollisions(pos, dx, dy) {
  if (canStand(pos.x + dx, pos.y + dy)) return {x: pos.x + dx, y: pos.y + dy};
  if (dx && canStand(pos.x + dx, pos.y)) return {x: pos.x + dx, y: pos.y};
  if (dy && canStand(pos.x, pos.y + dy)) return {x: pos.x, y: pos.y + dy};
  return pos;
}

export function nearestZone(pos, count) {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < Math.min(count, ZONES.length); i++) {
    const z = ZONES[i], d = Math.hypot(pos.x - z.x, (pos.y - z.y) * 1.6);
    if (d < ZONE_RADIUS && d < bestD) { best = i; bestD = d; }
  }
  return best;
}

// Recherche de chemin pour le déplacement tactile : parcours en largeur sur une grille de 8 px,
// puis lissage en ligne droite (on saute les points intermédiaires visibles).
const CELL = 8;
function clearLine(a, b) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4);
  for (let i = 1; i <= n; i++) if (!canStand(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
  return true;
}
function nearestStandable(p) {
  for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = Math.round(p.x / CELL + dx) * CELL, y = Math.round(p.y / CELL + dy) * CELL;
    if (canStand(x, y)) return {x, y};
  }
  return null;
}
export function findPath(from, to) {
  const goal = nearestStandable(to);
  if (!goal) return [];
  if (clearLine(from, goal)) return [goal];
  const start = nearestStandable(from);
  if (!start) return [];
  const key = p => p.x * 10000 + p.y, prev = new Map([[key(start), null]]), queue = [start];
  let found = null;
  while (queue.length && !found) {
    const c = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const n = {x: c.x + dx * CELL, y: c.y + dy * CELL}, k = key(n);
      if (prev.has(k) || !canStand(n.x, n.y) || !canStand((c.x + n.x) / 2, (c.y + n.y) / 2)) continue;
      prev.set(k, c); queue.push(n);
      if (n.x === goal.x && n.y === goal.y) { found = n; break; }
    }
  }
  if (!found) return [];
  const raw = [];
  for (let p = found; p; p = prev.get(key(p))) raw.unshift(p);
  const path = [];
  let anchor = from, i = 0;
  while (i < raw.length) {
    let j = raw.length - 1;
    while (j > i && !clearLine(anchor, raw[j])) j--;
    path.push(raw[j]); anchor = raw[j]; i = j + 1;
  }
  return path;
}
