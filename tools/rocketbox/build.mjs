// FBX Rocketbox -> GLB compressés pour le web. Usage : node build.mjs <Assets> <tex> <public/game3d> <avatars.json> <FBX2glTF>
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune, dedup, resample, meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder} from 'meshoptimizer';
import {execFileSync} from 'node:child_process';
import {readFileSync, existsSync, mkdirSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
const [assets, texDir, out, manifestPath, fbx2gltf] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder': MeshoptEncoder});
const tmp = '/tmp/rbx'; mkdirSync(tmp, {recursive: true});
mkdirSync(join(out, 'avatars'), {recursive: true}); mkdirSync(join(out, 'anims'), {recursive: true});
const convert = (fbx, name) => { execFileSync(fbx2gltf, ['--binary', '--input', fbx, '--output', join(tmp, name)], {stdio: 'ignore'}); return join(tmp, name + '.glb'); };
const finish = async (doc, file) => {
  await doc.transform(dedup(), prune(), meshopt({encoder: MeshoptEncoder, level: 'medium'}));
  await io.write(file, doc);
};

for (const a of manifest.avatars) {
  const dir = join(assets, 'Avatars', a.src, 'Export');
  const fbx = readdirSync(dir).find(f => f.endsWith('.fbx') && !f.includes('facial'));
  const doc = await io.read(convert(join(dir, fbx), a.id));
  const root = doc.getRoot();
  root.listAnimations().forEach(x => x.dispose());
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) p.setAttribute('COLOR_0', null);
  for (const m of root.listMaterials()) {
    const name = m.getName();
    const tex = kind => { const f = join(texDir, a.id, `${name}_${kind}.webp`); return existsSync(f) ? doc.createTexture(`${name}_${kind}`).setImage(readFileSync(f)).setMimeType('image/webp') : null; };
    const color = tex('color'), normal = tex('normal');
    m.setBaseColorTexture(color).setNormalTexture(normal).setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(0.78);
    if (name.endsWith('_opacity')) m.setAlphaMode('MASK').setAlphaCutoff(0.4).setDoubleSided(true);
  }
  doc.createExtension(ALL_EXTENSIONS.find(e => e.EXTENSION_NAME === 'EXT_texture_webp')).setRequired(true);
  await finish(doc, join(out, 'avatars', a.id + '.glb'));
  console.log('avatar', a.id);
}

for (const g of ['f', 'm']) for (const [key, path] of Object.entries(manifest.animations)) {
  const doc = await io.read(convert(join(assets, 'Animations', path.replace('{g}', g) + '.max.fbx'), `${g}_${key}`));
  const root = doc.getRoot();
  root.listMeshes().forEach(x => x.dispose()); root.listSkins().forEach(x => x.dispose());
  root.listNodes().forEach(n => n.setMesh(null).setSkin(null));
  root.listAnimations().forEach((x, i) => (i ? x.dispose() : x.setName(key)));
  await doc.transform(resample({tolerance: 0.0005}));
  await finish(doc, join(out, 'anims', `${g}_${key}.glb`));
  console.log('anim', g, key);
}
