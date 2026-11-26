import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
const item = {slug:"hadnty",name:"حضانتي",category:"الحضانات",description:"إدارة الأطفال والحضور والمدفوعات",features:["الحضور","أولياء الأمور"],sectorId:"education",subcategoryId:"schools",published:true,modules:["Dashboard"],sampleStats:[],sampleRows:[]};
test("SEO renders published CMS data in HTML and updates sitemap without indexing hidden systems or private pages", {timeout:120000}, async()=>{
  let items=[item,{...item,slug:"archived-system",archived:true},{...item,slug:"hidden-system",published:false}];
  const backend=createServer((req,res)=>{
    const url=new URL(req.url,"http://localhost");
    const english=url.searchParams.get("locale")==="en";
    let result={page:null};
    if(url.pathname==="/api/site-content/catalog") result={page:{updated_at:"2026-11-26T12:00:00Z",content:{items:english?items.map(x=>({...x,name:"My Nursery",description:"Nursery attendance and parent communication",features:["Attendance","Parent communication"]})):items}}};
    if(url.pathname==="/api/site-content/home")result={page:{content:{marketingHeroTitle:english?"Web development in Egypt":"شركة تطوير المواقع في مصر"}}};
    if(url.pathname==="/api/site-content/about")result={page:{content:{title:english?"About our company":"عن شركتنا",description:"Business software"}}};
    if(url.pathname==="/api/site-pages")result={pages:[{slug:"about",title:"About"},{slug:"assistant-knowledge",title:"Internal"},{slug:"catalog",title:"Catalog"}]};
    res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify(result));
  });
  backend.listen(0,"127.0.0.1");await once(backend,"listening");
  const port=backend.address().port, front=3168;
  const next=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","-H","127.0.0.1","-p",String(front)],{env:{...process.env,ATSH_API_BASE_URL:"http://127.0.0.1:"+port},stdio:["ignore","pipe","pipe"]});
  let logs="";next.stdout.on("data",x=>logs+=x);next.stderr.on("data",x=>logs+=x);
  const get=async path=>{const r=await fetch("http://127.0.0.1:"+front+path,{headers:{"user-agent":"Googlebot"}});return {status:r.status,headers:r.headers,body:await r.text()};};
  try {
    let ready=false;
    for(let i=0;i<60;i++){try{await get("/robots.txt");ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}}
    assert.ok(ready,logs);
    const robots=await get("/robots.txt");assert.match(robots.body,/Sitemap: https:\/\/atsh-ai\.com\/sitemap\.xml/);
    const map=await get("/sitemap.xml");assert.equal(map.status,200);assert.match(map.body,/<loc>https:\/\/atsh-ai\.com\/catalog\/hadnty<\/loc>/);assert.match(map.body,/<loc>https:\/\/atsh-ai\.com\/en\/catalog\/hadnty<\/loc>/);assert.match(map.body,/<loc>https:\/\/atsh-ai\.com\/about<\/loc>/);assert.doesNotMatch(map.body,/archived-system|hidden-system|assistant-knowledge|\/pricing/);
    const gallery=await get("/catalog");assert.match(gallery.body,/<h3[^>]*><a[^>]*href="\/catalog\/hadnty"/);assert.match(gallery.body,/إدارة الأطفال والحضور والمدفوعات/);
    for(const [path,name,lang] of [["/catalog/hadnty","حضانتي","ar"],["/en/catalog/hadnty","My Nursery","en"]]){
      const r=await get(path);assert.equal(r.status,200);assert.match(r.body,new RegExp('<html lang="'+lang+'"'));assert.match(r.body,new RegExp('<title>'+name));assert.ok(r.body.includes('rel="canonical" href="https://atsh-ai.com'+path+'"'));assert.match(r.body,new RegExp('<h1[^>]*>'+name+'</h1>'));assert.match(r.body,/hrefLang="en"/i);
    }
    assert.match((await get("/catalog/archived-system")).body,/<meta name="robots" content="noindex, follow"/);
    assert.match((await get("/en/customer-portal")).headers.get("x-robots-tag")||"",/noindex/);
    assert.match((await get("/catalog/hadnty/pricing")).headers.get("x-robots-tag")||"",/noindex/);
    assert.match((await get("/ar")).body,/<h1[^>]*>شركة تطوير المواقع في مصر<\/h1>/);
    assert.match((await get("/about")).body,/<h1[^>]*>عن شركتنا<\/h1>/);
    items=[...items,{...item,slug:"new-school"}];
    assert.match((await get("/sitemap.xml")).body,/<loc>https:\/\/atsh-ai\.com\/catalog\/new-school<\/loc>/);
  }finally{next.kill("SIGTERM");backend.close();}
});
