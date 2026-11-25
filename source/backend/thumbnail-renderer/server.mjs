import http from "node:http";
import {chromium} from "playwright";
let busy=false;
function isolatedDemoHtml(html) {
 const policy='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'; frame-src \'none\'; object-src \'none\'">';
 // React Router's URL constructor cannot resolve relative paths against an opaque
 // origin or blob URL. Supply an inert base for resolution, not for network access.
 const routerCompat="<script>(()=>{const U=window.URL;window.URL=class extends U{constructor(input,base){if(base==='about:srcdoc'||base==='null'||(typeof base==='string'&&base.startsWith('blob:')))base='https://demo.invalid/';super(input,base)}}})();</script>";
 const injection=policy+routerCompat;
 let documentHtml;
 if(/<head(?:\s[^>]*)?>/i.test(html))documentHtml=html.replace(/<head(?:\s[^>]*)?>/i,match=>match+injection);
 else if(/<html(?:\s[^>]*)?>/i.test(html))documentHtml=html.replace(/<html(?:\s[^>]*)?>/i,match=>match+"<head>"+injection+"</head>");
 else documentHtml="<!doctype html><html><head>"+injection+"</head><body>"+html.replace(/^\s*<!doctype[^>]*>/i,"")+"</body></html>";
 // Bootstrap inside the already opaque sandbox. The Blob MUST be created by
 // this iframe, not the ATSH parent page; its origin is null, not the platform.
 // A blob URL permits hash-based history changes unlike about:srcdoc.
 const encoded=JSON.stringify(documentHtml).replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
 return '<!doctype html><meta charset="utf-8"><script>location.replace(URL.createObjectURL(new Blob(['+encoded+'],{type:"text/html;charset=utf-8"})));</script>';
}

export async function render(html){
 // Untrusted code runs only here, in an opaque sandbox with all network requests denied.
 const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});
 try{
  const context=await browser.newContext({viewport:{width:1200,height:750},serviceWorkers:"block",acceptDownloads:false});
  await context.route("**/*",r=>r.request().url().startsWith("blob:")||r.request().url().startsWith("data:")?r.continue():r.abort());
  await context.routeWebSocket("**/*",ws=>ws.close());
  const page=await context.newPage();
  const doc=isolatedDemoHtml(html);
  await page.setContent('<!doctype html><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style><iframe sandbox="allow-scripts"></iframe>');
  await page.locator("iframe").evaluate((el,source)=>el.srcdoc=source,doc);
  await page.waitForFunction(()=>!!document.querySelector("iframe"),{},{timeout:3000});
  // Wait for the opaque blob navigation, then real painted content (not just the bootstrap).
  const deadline=Date.now()+11000;
  while(Date.now()<deadline){
   const child=page.frames().find(f=>f.parentFrame()===page.mainFrame()&&f.url().startsWith("blob:"));
   if(child){
    try{
     const ready=await child.evaluate(()=>!!document.body&&document.readyState!=="loading"&&([...document.body.querySelectorAll("*")].some(el=>{if(["SCRIPT","STYLE","LINK","META","NOSCRIPT"].includes(el.tagName))return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>8&&r.height>8&&s.visibility!=="hidden"&&s.display!=="none"&&(!!el.textContent?.trim()&&el.children.length===0||["IMG","SVG","CANVAS","VIDEO"].includes(el.tagName));})));
     if(ready){
      const imagesReady=await child.evaluate(async()=>{
       const urls=new Set();
       for(const el of document.querySelectorAll("body,body *")){
        const r=el.getBoundingClientRect();if(r.width<1||r.height<1||r.bottom<0||r.right<0||r.top>=innerHeight||r.left>=innerWidth)continue;
        for(const pseudo of [null,"::before","::after"]){
         const style=getComputedStyle(el,pseudo);if(style.display==="none"||style.visibility==="hidden")continue;
         for(const match of style.backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g))urls.add(match[1]);
        }
        if(el instanceof HTMLImageElement&&(el.currentSrc||el.src))urls.add(el.currentSrc||el.src);
       }
       if([...urls].some(url=>!url.startsWith("data:")&&!url.startsWith("blob:")))return false;
       const loaded=await Promise.race([Promise.all([...urls].map(async url=>{try{const img=new Image();img.src=url;await img.decode();return img.naturalWidth>0;}catch{return false;}})),new Promise(resolve=>setTimeout(()=>resolve(null),2500))]);
       if(!loaded||!loaded.every(Boolean))return false;
       await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1000))]);
       await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
       return true;
      });
      if(!imagesReady){await page.waitForTimeout(250);continue;}
      {const bytes=await page.screenshot({type:"jpeg",quality:65,timeout:3000,animations:"disabled"});const {default:jpeg}=await import("jpeg-js");const decoded=jpeg.decode(bytes,{useTArray:true,maxMemoryUsageInMB:32});let min=255,max=0,nonwhite=0;for(let i=0;i<decoded.data.length;i+=64){const v=(decoded.data[i]+decoded.data[i+1]+decoded.data[i+2])/3;min=Math.min(min,v);max=Math.max(max,v);if(v<225)nonwhite++;}if(max-min>25&&nonwhite>100)return bytes;}
     }
    }catch{}
   }
   await page.waitForTimeout(250);
  }
  throw Error("Demo did not render visible content");
 }finally{await browser.close();}
}
const server=http.createServer(async(req,res)=>{
 if(req.method!=="POST"||req.url!=="/render"){res.writeHead(404).end();return;}
 if(busy){res.writeHead(429).end();return;}busy=true;
 try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>10*1024*1024){res.writeHead(413).end();return;}chunks.push(chunk);}
 const image=await render(Buffer.concat(chunks).toString("utf8"));
 res.writeHead(200,{"content-type":"image/jpeg","content-length":image.length}).end(image);
 }catch(e){console.warn("Thumbnail render failed:",e.message);if(!res.headersSent)res.writeHead(422).end();}finally{busy=false;}
});
server.requestTimeout=15000;server.listen(3001,"0.0.0.0");
