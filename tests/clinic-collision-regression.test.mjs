import test from 'node:test';
import assert from 'node:assert/strict';
import {START,ROOM,OBSTACLES,canStand,moveWithCollisions} from '../apps/web/app/world3d.mjs';
test('large displacement cannot tunnel through room boundary',()=>{const p=moveWithCollisions(START,40,0);assert.ok(canStand(p.x,p.z));assert.ok(p.x<ROOM.maxX);});
test('large displacement cannot tunnel through reception',()=>{const p=moveWithCollisions({x:-11,z:5.5},0,-4);assert.ok(p.z>4.4);assert.ok(canStand(p.x,p.z));});
test('patient footprints are present',()=>assert.equal(OBSTACLES.filter(o=>o.tag==='patient').length,6));
test('diagonal movement slides along reception',()=>{const p=moveWithCollisions({x:-11,z:5.5},1,-2);assert.ok(canStand(p.x,p.z));assert.ok(p.x>-11);});
