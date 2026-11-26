import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../training/scenario-catalog.json',import.meta.url),'utf8'));
const chapters=['rg','dc','ve','va','tc','cm','vb','zo','pr','sa','cv','cr','vp','ch','tp'];
test('225 unique scenario identifiers',()=>{assert.equal(catalog.count,225);assert.equal(catalog.scenarios.length,225);assert.equal(new Set(catalog.scenarios.map(s=>s.id)).size,225)});
test('15 scenarios per chapter',()=>{assert.deepEqual([...new Set(catalog.scenarios.map(s=>s.chapter))].sort(),[...chapters].sort());for(const ch of chapters)assert.equal(catalog.scenarios.filter(s=>s.chapter===ch).length,15)});
test('drafts cannot masquerade as validated scenarios',()=>{for(const s of catalog.scenarios){if(s.status==='draft'){assert.equal(s.expectedVerdict,null);assert.equal(s.source,null)}else if(s.status==='approved'){assert.ok(['GO','HOLD','STOP','DONE'].includes(s.expectedVerdict));assert.ok(s.source)}else assert.fail('Unknown scenario status: '+s.status)}});
