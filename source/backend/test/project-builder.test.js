import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProjectPlan,proposeVisualEdit} from '../src/project-builder.js';
test('project plan contains sector modules and explicit review gate',()=>{
 const p=buildProjectPlan({slug:'new-pharmacy',sector:'pharmacy',description:'Pharmacy stock and point of sale'});
 assert.ok(p.modules.includes('pos'));assert.equal(p.automatedExecution,false);assert.equal(p.requiresHumanApproval,true);
});
test('rejects unknown sectors and unsafe slugs',()=>{
 assert.throws(()=>buildProjectPlan({slug:'../oops',sector:'store',description:'A sufficiently long description'}));
 assert.throws(()=>buildProjectPlan({slug:'good-project',sector:'unknown',description:'A sufficiently long description'}));
});
test('validates visual edit allowlist',()=>{
 const e=proposeVisualEdit({projectSlug:'new-pharmacy',page:'/',elementId:'hero',operation:'set-color',value:'#AABBCC'});
 assert.equal(e.applied,false);assert.equal(e.status,'proposed');
 assert.throws(()=>proposeVisualEdit({projectSlug:'new-pharmacy',page:'/',elementId:'hero',operation:'run-command',value:'rm -rf /'}));
 assert.throws(()=>proposeVisualEdit({projectSlug:'new-pharmacy',page:'/',elementId:'hero',operation:'set-color',value:'javascript:alert(1)'}));
});
