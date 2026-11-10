import test from 'node:test';
import assert from 'node:assert/strict';
import { compare } from '../dist/compare.js';
import { spawnSync } from 'node:child_process';

const oldDoc = () => ({openapi:'3.0.0', paths:{'/items':{get:{responses:{'200':{}, '404':{}}}}}});
test('same API yields no findings', () => assert.deepEqual(compare(oldDoc(), oldDoc()), []));
test('removed method and removed path are breaking', () => {
  const removed = {paths:{'/other':{get:{responses:{}}}}};
  assert.deepEqual(compare(oldDoc(), removed).map(x=>x.message), ['Operation removed']);
});
test('new required and optional-to-required parameter are detected', () => {
  const a=oldDoc(), b=oldDoc();
  a.paths['/items'].get.parameters=[{in:'query',name:'limit',required:false}];
  b.paths['/items'].get.parameters=[{in:'query',name:'limit',required:true}, {in:'header',name:'x-key',required:true}];
  assert.equal(compare(a,b).filter(x=>x.message.startsWith('Required parameter')).length, 2);
});
test('operation-level parameters override path-level parameters', () => {
  const a=oldDoc(), b=oldDoc();
  a.paths['/items'].parameters=[{in:'query', name:'q',required:true}];
  b.paths['/items'].parameters=[{in:'query', name:'q',required:true}];
  b.paths['/items'].get.parameters=[{in:'query',name:'q',required:false}];
  assert.deepEqual(compare(a,b), []);
});
test('removed response and required request body are detected', () => {
  const a=oldDoc(), b=oldDoc();
  delete b.paths['/items'].get.responses['404'];
  b.paths['/items'].get.requestBody={required:true};
  const messages=compare(a,b).map(x=>x.message);
  assert.ok(messages.includes('Response removed: 404'));
  assert.ok(messages.includes('Request body became required'));
});
test('references produce a limitation warning', () => {
  const b=oldDoc(); b.paths['/items'].get.parameters=[{$ref:'#/components/parameters/q'}];
  assert.equal(compare(oldDoc(),b)[0].severity,'warning');
});
test('invalid document and CLI exit codes', () => {
  assert.throws(()=>compare({}, oldDoc()), /non-empty paths/);
  assert.equal(spawnSync(process.execPath,['dist/cli.js','examples/old.json','examples/new.json']).status,1);
  assert.equal(spawnSync(process.execPath,['dist/cli.js']).status,2);
  assert.equal(spawnSync(process.execPath,['dist/cli.js','examples/old.json','examples/old.json']).status,0);
});
