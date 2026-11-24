import test from "node:test";
import assert from "node:assert/strict";
import {validateAttachment,MAX_ATTACHMENT_BYTES} from "../src/chat-attachments.js";
const pdf=Buffer.from("%PDF-1.7\n").toString("base64");
test("accepts PDF",()=>assert.equal(validateAttachment("report.pdf",pdf).mime,"application/pdf"));
test("rejects unsafe names and unsupported files",()=>{for(const name of ["../report.pdf","evil.exe","a.svg","a.html"])assert.throws(()=>validateAttachment(name,pdf));});
test("rejects mismatched signature and invalid encoding",()=>{assert.throws(()=>validateAttachment("a.png",pdf));assert.throws(()=>validateAttachment("a.pdf","%%%"));});
test("rejects oversized attachments",()=>assert.throws(()=>validateAttachment("a.pdf",Buffer.alloc(MAX_ATTACHMENT_BYTES+1).toString("base64"))));
