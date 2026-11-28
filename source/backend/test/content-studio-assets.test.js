import test from "node:test";
import assert from "node:assert/strict";
import {z} from "zod";
import {assetSchema,validWebp} from "../src/content-studio-assets.js";
import {characterAnimationSchema,refineCharacterPlan} from "../src/character-studio.js";
import {localPlan,validateCartoon} from "../../src/app/admin/cartoon-plan.ts";
const image="UklGRh4AAABXRUJQVlA4TBEAAAAvD8ADEAdQlMoUqpaBiOh/AAA=";
const id="123e4567-e89b-42d3-a456-426614174000";
const schema=z.object({animation:characterAnimationSchema,scenes:z.array(z.object({seconds:z.number()}))}).superRefine(refineCharacterPlan);
test("valid image / asset schema and bounded metadata",()=>{
 assert.ok(validWebp(image));assert.equal(validWebp(image+"x"),false);assert.equal(validWebp("not-webp"),false);
 const hero={kind:"hero",name:"Hero",images:[{pose:"stand",image},{pose:"talk-open",image}],voice:{pitch:0,speed:1,intonation:1}};
 assert.ok(assetSchema.safeParse(hero).success);
 assert.equal(assetSchema.safeParse({...hero,images:[hero.images[0],hero.images[0]]}).success,false);
 assert.ok(assetSchema.safeParse({kind:"background",name:"Office",images:[{pose:"stand",image}]}).success);
});
test("uploaded snapshots preserve independent project and require paired walking poses",()=>{
 const p=localPlan({product:"مشروع",audience:"الشركات",benefit:"عمل أسهل",cta:"ابدأ",style:"story",background:"office",seconds:8,castCount:1});
 p.animation.cast[0].artwork={id,revision:1,images:[{pose:"stand",image}]};
 p.animation.shots[0].artwork={id,revision:1,image,mode:"background",framing:"fill"};
 p.animation.shots[0].placements[0].action="walk";
 assert.equal(schema.safeParse(p).success,false);assert.ok(validateCartoon(p).length);
 p.animation.cast[0].artwork.images.push({pose:"walk-a",image},{pose:"walk-b",image});
 assert.ok(schema.safeParse(p).success);assert.deepEqual(validateCartoon(p),[]);
 p.animation.shots[0].artwork.mode="full";assert.ok(schema.safeParse(p).success);
});
test("reference-only character and costume save without becoming render poses",()=>{
 const fronts=[{angle:"front",image},{angle:"back",image}];
 const draft={kind:"hero",name:"نور",images:[],voice:{pitch:0,speed:1,intonation:1},
  referenceAngles:fronts,outfits:[{id,name:"طقم طبي",images:[],referenceAngles:fronts}],
  accessories:[{id,name:"نظارة نظر",image}]};
 assert.deepEqual(assetSchema.parse(draft),draft);
 assert.equal(assetSchema.safeParse({...draft,referenceAngles:[]}).success,false);
 assert.equal(assetSchema.safeParse({...draft,referenceAngles:[fronts[0],fronts[0]]}).success,false);
 assert.equal(assetSchema.safeParse({...draft,outfits:[{id,name:"طقم",images:[]}]}).success,false);
 assert.equal(assetSchema.safeParse({...draft,accessories:[draft.accessories[0],draft.accessories[0]]}).success,false);
 const p=localPlan({product:"مشروع",audience:"الشركات",benefit:"عمل أسهل",cta:"ابدأ",style:"story",background:"office",seconds:8,castCount:1});
 p.animation.cast[0].artwork={id,revision:1,images:[]};
 assert.equal(schema.safeParse(p).success,false);
 p.animation.cast[0].artwork={id,revision:1,images:[{pose:"stand",image}],outfits:draft.outfits};
 assert.equal(schema.safeParse(p).success,false);
});
test("character pack imports only library references, never inline voice or render instructions",async()=>{
 const {parseReferencePack}=await import("../../src/app/admin/studio-reference-pack.ts");
 const value={format:"atsh-character-references-v1",name:"نور",
  referenceAngles:[{angle:"front",image}],accessories:[{id,name:"نظارة شمس",image}],
  outfits:[{id,name:"طقم طبي",images:[{pose:"stand",image}],referenceAngles:[{angle:"front",image}]}],voice:{voiceId:"unverified"}};
 const loaded=parseReferencePack(value);
 assert.equal(loaded.name,"نور");
 assert.equal(loaded.voice,undefined);
 assert.deepEqual(loaded.outfits[0].images,[]);
 assert.throws(()=>parseReferencePack({...value,referenceAngles:[{angle:"constructor",image}]}));
 assert.throws(()=>parseReferencePack({...value,accessories:[value.accessories[0],value.accessories[0]]}));
});
