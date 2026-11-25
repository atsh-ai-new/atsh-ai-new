import test from "node:test";
import assert from "node:assert/strict";
import {publishedThumbnail,runThumbnailJob} from "../src/demo-thumbnail.js";
test("reject invalid thumbnail ID without database access",async()=>{assert.equal(await publishedThumbnail({}, "../private"),null)});
test("persist rendered JPEG for referenced asset",async()=>{const id="a".repeat(64),jpeg=Buffer.from([255,216,1,2,3,4,5,6,7,8,255,217]);const calls=[];const db={query:async(sql,args)=>{calls.push([sql,args]);return {rows:sql.startsWith("SELECT")?[{id,html:"<h1>demo</h1>"}]:[]}}};assert.equal(await runThumbnailJob(db,async html=>{assert.match(html,/demo/);return jpeg}),true);assert.deepEqual(calls[1][1],[id,jpeg]);});
test("invalid renderer output is not stored and is retried",async()=>{const calls=[];const db={query:async(sql,args)=>{calls.push([sql,args]);return {rows:[{id:"b".repeat(64),html:"x"}]}}};await assert.rejects(runThumbnailJob(db,async()=>Buffer.from("bad")));assert.match(calls[1][0],/thumbnail_retry_at/);});
