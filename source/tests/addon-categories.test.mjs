import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {addonCategories,categoryFor,groupAddons} from "../src/lib/addon-categories.ts";
const migration=readFileSync(new URL("../backend/db/addon_categories_20261126.sql",import.meta.url),"utf8");
const mapping=[...migration.matchAll(/\('([a-z_]+)','([a-z_]+)',(\d+)\)/g)].map(([,code,category_code,sort_order])=>({code,category_code,sort_order:Number(sort_order),price:100,is_active:false}));
test("all 45 approved definitions map exactly once and preserve identity and values",()=>{
 assert.equal(mapping.length,45);assert.equal(new Set(mapping.map(x=>x.code)).size,45);
 for(const row of mapping)assert.equal(categoryFor({code:row.code}),row.category_code);
 const original=structuredClone(mapping);
 assert.deepEqual(groupAddons(mapping).map(g=>g.items.length),[10,12,6,5,5,7]);
 assert.deepEqual(mapping,original);
});
test("new add-ons, admin category changes, and independent sorting of groups and items",()=>{
 const order=addonCategories.map((c,i)=>({code:c.code,sort_order:(6-i)*10}));
 const items=[{code:"new_feature",category_code:"marketing",sort_order:1},{code:"logo",category_code:"marketing",sort_order:2},{code:"extra_page",sort_order:2},{code:"language",sort_order:1}];
 const groups=groupAddons(items,order);
 assert.equal(groups[0].code,"marketing");
 assert.deepEqual(groups[0].items.map(x=>x.code),["new_feature","logo"]);
 assert.deepEqual(groups.at(-1).items.map(x=>x.code),["language","extra_page"]);
 assert.equal(categoryFor({code:"future_feature"}),"foundation");
});
test("public API category metadata alone controls order",()=>{
 const groups=groupAddons([{code:"language",category_code:"foundation",category_sort_order:60},{code:"social_links",category_code:"marketing",category_sort_order:10}]).filter(g=>g.items.length);
 assert.deepEqual(groups.map(g=>g.code),["marketing","foundation"]);
});
