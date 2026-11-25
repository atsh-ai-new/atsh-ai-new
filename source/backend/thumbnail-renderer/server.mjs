import http from "node:http";
import {chromium} from "playwright";
let busy=false;
const policy="<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none';\">";
export async function render(html){
 // Untrusted code runs only here, in an opaque sandbox with all network requests denied.
 const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});
 try{
  const context=await browser.newContext({viewport:{width:1200,height:750},serviceWorkers:"block",acceptDownloads:false});
  await context.route("**/*",r=>r.abort());
  await context.routeWebSocket("**/*",ws=>ws.close());
  const page=await context.newPage();
  const doc=/<head(?:\s[^>]*)?>/i.test(html)?html.replace(/<head(?:\s[^>]*)?>/i,m=>m+policy):policy+html;
  await page.setContent('<!doctype html><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style><iframe sandbox="allow-scripts"></iframe>');
  await page.locator("iframe").evaluate((el,source)=>el.srcdoc=source,doc);
  await page.waitForTimeout(1400);
  const image=await page.screenshot({type:"jpeg",quality:65,timeout:8000});
  return image;
 }finally{await browser.close();}
}
const server=http.createServer(async(req,res)=>{
 if(req.method!=="POST"||req.url!=="/render"){res.writeHead(404).end();return;}
 if(busy){res.writeHead(429).end();return;}busy=true;
 try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>10*1024*1024){res.writeHead(413).end();return;}chunks.push(chunk);}
 const image=await render(Buffer.concat(chunks).toString("utf8"));
 res.writeHead(200,{"content-type":"image/jpeg","content-length":image.length}).end(image);
 }catch{if(!res.headersSent)res.writeHead(500).end();}finally{busy=false;}
});
server.requestTimeout=15000;server.listen(3001,"0.0.0.0");
