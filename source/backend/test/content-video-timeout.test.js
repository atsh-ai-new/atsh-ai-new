import test from "node:test";
import assert from "node:assert/strict";
import {contentVideoTimeoutMinutes} from "../src/content-video-timeout.js";
test("content video timeout defaults safely and allows bounded opt-in",()=>{
  for(const v of ["","-1","0","1","119","1441","6000","2.5","Infinity","120;drop"])assert.equal(contentVideoTimeoutMinutes(v),120);
  assert.equal(contentVideoTimeoutMinutes("120"),120);
  assert.equal(contentVideoTimeoutMinutes("480"),480);
  assert.equal(contentVideoTimeoutMinutes("1440"),1440);
});
