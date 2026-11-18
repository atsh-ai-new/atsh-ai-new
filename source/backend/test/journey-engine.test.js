import test from "node:test";
import assert from "node:assert/strict";
import {buildJourneyInstructions,extractAssistantText} from "../src/journey-engine.js";
for(const audience of ["staff","customer"]){
 test(`${audience} policy includes authoritative status and server pricing boundary`,()=>{
  const instructions=buildJourneyInstructions({audience,project:{status:"discovery",template_id:"clinic"},packages:[{name:"أساسي",price:100,currency:"EGP"}]});
  assert.match(instructions,/discovery/);assert.match(instructions,/clinic/);
  assert.match(instructions,/100/);assert.match(instructions,/محرك تسعير الخادم/);
  assert.match(instructions,/لا تنفذ دفعًا/);
 });
}
test("reject unknown audience",()=>assert.throws(()=>buildJourneyInstructions({audience:"public",project:{status:"new"}})));
test("parse multiple OpenAI output text blocks",()=>assert.equal(extractAssistantText({output:[{content:[{type:"output_text",text:"أهلاً"},{type:"refusal",text:"ignore"}]},{content:[{type:"output_text",text:"بك"}]}]}),"أهلاً\nبك"));
test("ignore malformed output",()=>assert.equal(extractAssistantText({output:null}),""));

test('rejects missing project and missing status',()=>{
 assert.throws(()=>buildJourneyInstructions({audience:'staff'}),TypeError);
 assert.throws(()=>buildJourneyInstructions({audience:'customer',project:{status:3}}),TypeError);
});
test('keeps staff and customer roles separate',()=>{
 const p={status:'discovery'};
 const staff=buildJourneyInstructions({audience:'staff',project:p});
 const customer=buildJourneyInstructions({audience:'customer',project:p});
 assert.match(staff,/مساعد داخلي/);
 assert.match(customer,/مساعد ATSH AI للعميل/);
 assert.notEqual(staff,customer);
});
test('rejects missing output and nontext blocks',()=>{
 assert.equal(extractAssistantText(undefined),'');
 assert.equal(extractAssistantText({output:[null,{}, {content:[null,{type:'output_text',text:17},{type:'input_text',text:'secret'}]}]}),'');
});
test('preserves source package data without inventing prices',()=>{
 const instructions=buildJourneyInstructions({audience:'customer',project:{status:'quoted'},packages:[]});
 assert.match(instructions,/الباقات المنشورة: \[\]/);
 assert.match(instructions,/لا تختلق سعرًا/);
});
