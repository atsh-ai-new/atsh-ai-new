import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
const item = {slug:"hadnty",name:"حضانتي",category:"الحضانات",description:"إدارة الأطفال والحضور والمدفوعات",features:["الحضور","أولياء الأمور"],sectorId:"education",subcategoryId:"schools",published:true,modules:["Dashboard"],sampleStats:[],sampleRows:[]};
test("SEO renders published CMS data in HTML and updates sitemap without indexing hidden systems or private pages", {timeout:120000}, async()=>{
  let aboutPublished=true;
  let monthly=1234,daily=59,newsPosition="top";
  let items=[item,{...item,slug:"archived-system",archived:true},{...item,slug:"hidden-system",published:false}];
  const backend=createServer((req,res)=>{
    const url=new URL(req.url,"http://localhost");
    const english=url.searchParams.get("locale")==="en";
    let result={page:null};
    if(url.pathname==="/api/site-content/catalog") result={page:{updated_at:"2026-11-26T12:00:00Z",content:{items:english?items.filter(x=>x.slug==="hadnty").map(x=>({...x,name:"My Nursery",description:"Nursery attendance and parent communication",features:["Attendance","Parent communication"]})):items}}};
    if(url.pathname==="/api/site-content/home")result={page:{content:{newsTicker:{enabled:true,text:english?"Latest news":"أخبار جديدة",position:newsPosition},marketingHeroTitle:english?"Web development in Egypt":"شركة تطوير المواقع في مصر"}}};
    if(url.pathname==="/api/site-content/about"&&aboutPublished)result={page:{content:{title:english?"About our company":"عن شركتنا",description:"Business software"}}};
    if(url.pathname==="/api/visitor/monthly-count")result={monthly,daily};
    if(url.pathname==="/api/site-pages")result={pages:[...(aboutPublished?[{slug:"about",title:"About"}]:[]),{slug:"assistant-knowledge",title:"Internal"},{slug:"catalog",title:"Catalog"}]};
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
      const r=await get(path);assert.equal(r.status,200);assert.match(r.body,new RegExp('<html lang="'+lang+'"'));assert.match(r.body,new RegExp('<title>'+name));assert.ok(r.body.includes('rel="canonical" href="https://atsh-ai.com'+path+'"'));assert.match(r.body,new RegExp('<h1[^>]*>'+name+'</h1>'));assert.match(r.body,/hrefLang="en"/i);assert.equal((r.body.match(/<h1(?:\s|>)/g)||[]).length,1);
    }
    const archived=await get("/catalog/archived-system");
    assert.equal(archived.status,404);assert.match(archived.body,/<meta name="robots" content="noindex/);
    const missing=await get("/completely-missing");
    assert.equal(missing.status,404);assert.match(missing.body,/<meta name="robots" content="noindex/);
    const draft=await get("/completely-missing?atshPreview=83ab3c99-56e4-4d17-bccd-1c43f1667c52");
    assert.equal(draft.status,200);assert.match(draft.headers.get("x-robots-tag")||"",/noindex/);
    assert.match((await get("/en/admin")).headers.get("x-robots-tag")||"",/noindex/);
    assert.match((await get("/stores/pricing")).headers.get("x-robots-tag")||"",/noindex/);
    assert.match((await get("/en/customer-portal")).headers.get("x-robots-tag")||"",/noindex/);
    assert.match((await get("/catalog/hadnty/pricing")).headers.get("x-robots-tag")||"",/noindex/);
    assert.match((await get("/ar")).body,/<h1[^>]*>شركة تطوير المواقع في مصر<\/h1>/);
    for(const [path,label] of [["/ar","عدد الزيارات"],["/en","Visit count"]]){
      const page=await get(path);
      const header=page.body.match(/<header class="platform-header">[\s\S]*?<\/header>/)?.[0];
      const news=page.body.match(/<section[^>]*data-news-bubbles="true"[^>]*>[\s\S]*?<\/section>/)?.[0];
      assert.ok(header);
      assert.ok(news);
      assert.doesNotMatch(header,/data-monthly-visit-badge|home-visitor-stats/);
      assert.match(news,new RegExp('</ul></div></div><span[^>]+data-monthly-visit-badge="true"[^>]*><span>'+label+'</span><bdi dir="ltr">1,234</bdi>'));
      assert.equal((page.body.match(/data-monthly-visit-badge="true"/g)??[]).length,1);
      assert.doesNotMatch(page.body,/data-period="daily"/);
    }
    const topNews=(await get("/ar")).body;
    assert.match(topNews,/<main[^>]*><div class="atsh-news-slot" data-home-ticker-seeded="true" data-home-news-sticky="true">/);
    for(const [position,preceding] of [["below_header","</header>"],["after_hero","</section>"]]){
      newsPosition=position;
      const html=(await get("/ar")).body;
      assert.ok(html.includes(preceding+'<div class="atsh-news-slot" data-home-ticker-seeded="true">'),position);
      assert.doesNotMatch(html,/data-home-news-sticky="true"/);
    }
    newsPosition="top";
    assert.doesNotMatch((await get("/ar?atshPreview=83ab3c99-56e4-4d17-bccd-1c43f1667c52")).body,/<div class="atsh-news-slot" data-home-ticker-seeded="true"[^>]*>/);
    daily=undefined;
    assert.match((await get("/ar")).body,/<bdi dir="ltr">1,234<\/bdi>/);
    monthly=0;
    assert.match((await get("/en")).body,/<bdi dir="ltr">0<\/bdi>/);
    monthly=null;
    assert.doesNotMatch((await get("/ar")).body,/data-monthly-visit-badge="true"/);
    assert.match((await get("/about")).body,/<h1[^>]*>عن شركتنا<\/h1>/);
    assert.match((await get("/ar/services/ecommerce")).body,/<h1[^>]*>برمجة المتاجر الإلكترونية وأنظمة المبيعات<\/h1>/);
    assert.match((await get("/en/services/ecommerce")).body,/<h1[^>]*>E-commerce &amp; sales software development<\/h1>/);
    assert.match(map.body,/<loc>https:\/\/atsh-ai\.com\/services\/ai-solutions<\/loc>/);
    const storeSector=await get("/stores/sectors/furniture");
    assert.equal(storeSector.status,200);assert.match(storeSector.body,/<h1>تصميم متجر إلكتروني لقطاع أثاث وديكور<\/h1>/);
    assert.match(storeSector.body,/href="\/stores\/furniture-atelier"/);
    assert.match((await get("/stores/furniture-atelier")).body,/<meta name="robots" content="noindex, follow"/);
    assert.match(map.body,/<loc>https:\/\/atsh-ai\.com\/en\/stores\/sectors\/furniture<\/loc>/);
    assert.doesNotMatch(map.body,/\/stores\/furniture-atelier/);
    items=[...items,{...item,slug:"new-school",updatedAt:"2026-11-27T12:00:00Z",seoTitle:"عنوان النظام التجريبي"}];
    const updatedMap=await get("/sitemap.xml");
    assert.match(updatedMap.body,/<loc>https:\/\/atsh-ai\.com\/catalog\/new-school<\/loc>\s*<lastmod>2026-11-27/);
    assert.doesNotMatch(updatedMap.body,/\/en\/catalog\/new-school/);
    const unlocalized=await get("/en/catalog/new-school");
    assert.match(unlocalized.body,/<meta name="robots" content="noindex, follow"/);
    assert.match((await get("/catalog/new-school")).body,/<title>عنوان النظام التجريبي/);
    items=items.map(x=>x.slug==="new-school"?{...x,archived:true}:x);aboutPublished=false;
    assert.doesNotMatch((await get("/sitemap.xml")).body,/new-school|\/about/);
    assert.equal((await get("/catalog/new-school")).status,404);
    assert.equal((await get("/about")).status,404);
  }finally{next.kill("SIGTERM");backend.close();}
});
