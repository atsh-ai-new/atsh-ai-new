import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {openDb} from './db.js';
import {Commerce,Fault,assert,equal,permit} from './core.js';
import {themes,sectors} from './themes.js';
import {snapshotFor,addonView,enabled} from './addons.js';
const root=new URL('../public/',import.meta.url);
const env=process.env;
const db=openDb(env.COMMERCE_DB||'data/commerce.sqlite');
const c=new Commerce(db);
const bridge={base:env.ATSH_API_BASE,secret:env.COMMERCE_BRIDGE_SECRET};
const provision=env.COMMERCE_PROVISION_SECRET;
const paymentSecret=env.COMMERCE_PAYMENT_SECRET;
// The payment adapter is an authenticated server-to-server verifier, not a card collector.
const paymentReady=Boolean(paymentSecret?.length>=32&&/^https:\/\//.test(env.COMMERCE_PAYMENT_CHECKOUT_URL??''));
const configured=paymentReady?['payment_gateway']:[];
const token=req=>req.headers.authorization?.replace(/^Bearer /,'')??'';
const secretAuth=(req,key)=>assert(key?.length>=32&&equal(token(req),key),401,'Unauthorized');
async function body(req){let n=0;const chunks=[];for await(const chunk of req){n+=chunk.length;assert(n<=1048576,413,'Payload too large');chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{throw new Fault(400,'Invalid JSON')}}
const limits=new Map();
const rate=(req)=>{const k=req.socket.remoteAddress??'unknown',now=Date.now(),v=limits.get(k);if(!v||v.until<now){if(limits.size>10000)for(const [key,r] of limits)if(r.until<now)limits.delete(key);assert(limits.size<20000,429,'Rate limited');limits.set(k,{n:1,until:now+60000})}else assert(++v.n<=240,429,'Rate limited')};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
async function flags(s){try{return enabled(await snapshotFor(s,bridge),configured)}catch{return []}}
const publicStore=s=>({slug:s.slug,name:s.name,sector:s.sector,theme:s.theme,design:s.design,currency:s.currency,shipping:s.shipping});
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 try{
  const url=new URL(req.url,'http://localhost');const path=url.pathname;const method=req.method;
  if(method==='GET'&&(path==='/'||/^\/(store|manage)\/[a-z0-9-]+$/.test(path)||['/app.js','/style.css'].includes(path)||/^\/assets\/(chair|table|lamp|stool)\.svg$/.test(path))){
   const file=path.startsWith('/assets/')?path.slice(1):path==='/app.js'?'app.js':path==='/style.css'?'style.css':'index.html';const data=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8'});return res.end(data)
  }
  rate(req);
  if(path==='/api/health'&&method==='GET')return send(res,200,{ok:true,bridgeConfigured:!!(bridge.base&&bridge.secret)});
  if(path==='/api/themes'&&method==='GET')return send(res,200,{themes,sectors});
  if(path==='/api/stores'&&method==='POST'){secretAuth(req,provision);const x=await body(req);if(x.projectId){assert(/^[a-f0-9-]{36}$/i.test(x.projectId),400,'Invalid project');await snapshotFor({project_id:x.projectId},bridge)}return send(res,201,c.createStore(x))}
  const match=path.match(/^\/api\/stores\/([a-z0-9-]+)\/(.+)$/);assert(match,404,'Not found');const [,slug,action]=match,s=c.store(slug);
  if(action==='shop'&&method==='GET')return send(res,200,{store:publicStore(s),products:c.products(s),capabilities:await flags(s)});
  if(action==='checkout'&&method==='POST'){const x=await body(req);const result=c.checkout(s,x,{flags:await flags(s)});return send(res,201,{...result,paymentCheckout:result.payment==='online'?new URL(encodeURIComponent(result.id),env.COMMERCE_PAYMENT_CHECKOUT_URL.endsWith('/')?env.COMMERCE_PAYMENT_CHECKOUT_URL:env.COMMERCE_PAYMENT_CHECKOUT_URL+'/').href:null})}
  if(action.startsWith('track/')&&method==='GET')return send(res,200,c.track(s,action.split('/')[1],token(req)));
  if(action==='payment-event'&&method==='POST'){secretAuth(req,paymentSecret);return send(res,200,c.payment(s,await body(req)))}
  const m=c.auth(slug,token(req));
  if(action==='session'&&method==='GET')return send(res,200,{member:{name:m.name,role:m.role},store:publicStore(s)});
  if(action==='addons'&&method==='GET'){permit(m,'design');const snap=await snapshotFor(s,bridge);return send(res,200,{items:addonView(snap,configured),projectId:s.project_id,portal:env.ATSH_CUSTOMER_PORTAL&&s.project_id?new URL('/account/dashboard?view=projects&project='+encodeURIComponent(s.project_id),env.ATSH_CUSTOMER_PORTAL).href:null})}
  if(action==='design'&&method==='PUT')return send(res,200,c.design(m,await body(req)));
  if(action==='products'&&method==='GET'){permit(m,'products');return send(res,200,c.products(s,true,url.searchParams.get('branchId')||undefined))}
  if(action==='products'&&method==='POST')return send(res,201,c.product(m,await body(req)));
  if(action==='stock'&&method==='PUT')return send(res,200,c.stock(m,await body(req)));
  if(action==='branches'&&method==='GET'){permit(m,'stock');return send(res,200,c.branches(s))}
  if(action==='branches'&&method==='POST'){assert((await flags(s)).includes('multi_branch'),403,'Multi-branch not enabled');return send(res,201,c.addBranch(m,(await body(req)).name))}
  if(action==='members'&&method==='POST')return send(res,201,c.addMember(m,await body(req)));
  if(action==='coupons'&&method==='POST'){assert((await flags(s)).includes('coupons_discounts'),403,'Coupons not enabled');return send(res,201,c.coupon(m,await body(req)))}
  if(action==='orders'&&method==='GET')return send(res,200,c.orders(m));
  if(action.startsWith('orders/')&&method==='PATCH')return send(res,200,c.transition(m,action.split('/')[1],(await body(req)).status));
  if(action==='pos'&&method==='POST')return send(res,201,c.checkout(s,await body(req),{pos:true,member:m,flags:await flags(s)}));
  if(action==='reports'&&method==='GET')return send(res,200,c.reports(m));
  throw new Fault(404,'Not found');
 }catch(e){if(!(e instanceof Fault))console.error(e.message);send(res,e.status??(String(e.code).includes('SQLITE_CONSTRAINT')?409:500),e instanceof Fault?{error:e.message}:{error:'Operation failed'})}
});
server.listen(Number(env.PORT||3200),env.HOST||'127.0.0.1',()=>console.log('ATSH Commerce Engine ready'));
