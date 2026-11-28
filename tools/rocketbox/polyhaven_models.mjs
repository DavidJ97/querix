// Modèles Poly Haven (CC0) glTF 1K -> GLB légers : textures WebP 512 px, simplification, meshopt.
// Usage : node polyhaven_models.mjs <dossier téléchargé> <public/game3d/props> nom[:ratio] ...
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune, dedup, weld, simplify, textureCompress, meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {readdirSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
const [src, out, ...items] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder': MeshoptEncoder});
mkdirSync(out, {recursive: true});
for (const item of items) {
  const [name, ratio] = item.split(':');
  const dir = join(src, name), file = readdirSync(dir).find(f => f.endsWith('.gltf'));
  const doc = await io.read(join(dir, file));
  const tris = () => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);
  const before = tris();
  const steps = [dedup(), weld()];
  if (ratio) steps.push(simplify({simplifier: MeshoptSimplifier, ratio: +ratio, error: 0.01}));
  steps.push(textureCompress({encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 82}), prune(), meshopt({encoder: MeshoptEncoder, level: 'medium'}));
  await doc.transform(...steps);
  await io.write(join(out, name + '.glb'), doc);
  console.log(name, Math.round(before), '->', Math.round(tris()), 'tris');
}
