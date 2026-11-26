import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {START, ZONES, BOOTHS, canStand, findPath, moveWithCollisions, nearestZone, pathLength} from '../apps/web/app/world3d.mjs';

test('le modèle 3D du personnage et ses crédits sont publiés', () => {
  for (const f of ['characters/worker.glb', 'CREDITS.md']) assert.ok(existsSync(new URL(`../apps/web/public/game3d/${f}`, import.meta.url)), f);
});

test('départ et zones de réponse praticables', () => {
  assert.ok(canStand(START.x, START.z));
  for (const z of ZONES) assert.ok(canStand(z.x, z.z), z.label);
});

test('le mobilier bloque le joueur', () => {
  for (const b of BOOTHS) assert.equal(canStand(b.x, b.deskZ), false, `bureau ${b.num}`);
  assert.equal(canStand(-11.5, 3.4), false, 'accueil');
  assert.equal(canStand(7, 2.4), false, 'chaises');
  assert.equal(canStand(-4.5, 1.2), false, 'guide-file');
  assert.equal(canStand(0, -8.95), false, 'mur du fond');
});

test('chaque zone est atteignable par un chemin sans collision', () => {
  for (const z of ZONES) {
    const path = findPath(START, z);
    assert.ok(path.length, z.label);
    let p = START;
    for (const w of path) {
      for (let t = 1; t <= 20; t++) assert.ok(canStand(p.x + (w.x - p.x) * t / 20, p.z + (w.z - p.z) * t / 20), z.label);
      p = w;
    }
    assert.ok(nearestZone(p, ZONES.length) === ZONES.indexOf(z), z.label);
    assert.ok(pathLength(START, path) > 10);
  }
});

test('glissement contre un obstacle', () => {
  const p = moveWithCollisions({x: -4.5, z: 1.8}, 0.2, -0.3);
  assert.ok(p.x > -4.5 && p.z >= 1.6);
});
