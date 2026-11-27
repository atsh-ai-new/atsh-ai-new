import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {openDb} from './db.js';
import {Commerce,Fault,assert,equal,permit} from './core.js';
import {themes,sectors} from './themes.js';
import {snapshotFor,addonView,enabled,pageQuota} from './addons.js';
const root=new URL('../public/',import.meta.url);
const env=process.env;
const db=openDb(env.COMMERCE_DB||'data/commerce.sqlite');
const c=new Commerce(db);
const bridge={base:env.ATSH_API_BASE,secret:env.COMMERCE_BRIDGE_SECRET};
const provision=env.COMMERCE_PROVISION_SECRET;
const paymentSecret=env.COMMERCE_PAYMENT_SECRET;
// The payment adapter is an authenticated server-to-server verifier, not a card collector.
const paymentReady=Boolean(paymentSecret?.length>=32&&/^https:\/\//.test(env.COMMERCE_PAYMENT_CHECKOUT_URL??''));
const automationSecret=env.COMMERCE_AUTOMATION_SECRET;
const configured=[...(paymentReady?['payment_gateway']:[]),...(automationSecret?.length>=32?['workflow_automation']:[])];
const token=req=>req.headers.authorization?.replace(/^Bearer /,'')??'';
const secretAuth=(req,key)=>assert(key?.length>=32&&equal(token(req),key),401,'Unauthorized');
async function body(req){let n=0;const chunks=[];for await(const chunk of req){n+=chunk.length;assert(n<=1048576,413,'Payload too large');chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{throw new Fault(400,'Invalid JSON')}}
const limits=new Map();
const rate=(req)=>{const k=req.socket.remoteAddress??'unknown',now=Date.now(),v=limits.get(k);if(!v||v.until<now){if(limits.size>10000)for(const [key,r] of limits)if(r.until<now)limits.delete(key);assert(limits.size<20000,429,'Rate limited');limits.set(k,{n:1,until:now+60000})}else assert(++v.n<=240,429,'Rate limited')};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
async function flags(s){try{return enabled(await snapshotFor(s,bridge),configured)}catch{return []}}
async function quota(s){try{return pageQuota(await snapshotFor(s,bridge))}catch{return 0}}
async function branchAccess(s,id){if(id&&!c.branch(s,id).is_online)assert((await flags(s)).includes('multi_branch'),403,'Multi-branch not enabled')}
const publicStore=s=>({slug:s.slug,name:s.name,sector:s.sector,theme:s.theme,design:s.design,currency:s.currency,shipping:s.shipping});
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 try{
  const url=new URL(req.url,'http://localhost');const path=url.pathname;const method=req.method;
  if(method==='GET'&&(path==='/'||/^\/(store|manage)\/[a-z0-9-]+$/.test(path)||/^\/store\/[a-z0-9-]+\/page\/[a-z0-9-]+$/.test(path)||['/app.js','/style.css'].includes(path)||/^\/assets\/(chair|table|lamp|stool)\.svg$/.test(path))){
   const file=path.startsWith('/assets/')?path.slice(1):path==='/app.js'?'app.js':path==='/style.css'?'style.css':'index.html';const data=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8'});return res.end(data)
  }
  rate(req);
  if(path==='/api/health'&&method==='GET')return send(res,200,{ok:true,bridgeConfigured:!!(bridge.base&&bridge.secret)});
  if(path==='/api/themes'&&method==='GET')return send(res,200,{themes,sectors});
  if(path==='/api/stores'&&method==='GET'){secretAuth(req,provision);return send(res,200,{stores:c.q("SELECT s.id,s.slug,s.name,s.sector,s.theme,s.mode,s.project_id,s.created,(SELECT COUNT(*) FROM products p WHERE p.store_id=s.id AND p.active=1) products,(SELECT COUNT(*) FROM store_pages p WHERE p.store_id=s.id AND p.published=1) pages,(SELECT COUNT(*) FROM orders o WHERE o.store_id=s.id) orders FROM stores s WHERE s.project_id IS NOT NULL ORDER BY s.created DESC LIMIT 250")})}
  if(path==='/api/stores'&&method==='POST'){secretAuth(req,provision);const x=await body(req);if(x.projectId){assert(/^[a-f0-9-]{36}$/i.test(x.projectId),400,'Invalid project');await snapshotFor({project_id:x.projectId},bridge)}return send(res,201,c.createStore(x))}
  const match=path.match(/^\/api\/stores\/([a-z0-9-]+)\/(.+)$/);assert(match,404,'Not found');const [,slug,action]=match,s=c.store(slug);
  if(action==='shop'&&method==='GET')return send(res,200,{store:publicStore(s),products:c.products(s),capabilities:await flags(s),pages:c.visiblePages(s,await quota(s)).map(({slug,title})=>({slug,title}))});
  if(/^pages\/public\/[^/]+$/.test(action)&&method==='GET'){const p=c.visiblePages(s,await quota(s)).find(p=>p.slug===action.split('/')[2]);assert(p,404,'Page not found');return send(res,200,{title:p.title,content:p.content})}
  if(action==='checkout'&&method==='POST'){const x=await body(req);const result=c.checkout(s,x,{flags:await flags(s)});return send(res,201,{...result,paymentCheckout:result.payment==='online'?new URL(encodeURIComponent(result.id),env.COMMERCE_PAYMENT_CHECKOUT_URL.endsWith('/')?env.COMMERCE_PAYMENT_CHECKOUT_URL:env.COMMERCE_PAYMENT_CHECKOUT_URL+'/').href:null})}
  if(action.startsWith('track/')&&method==='GET')return send(res,200,c.track(s,action.split('/')[1],token(req)));
  if(action==='payment-event'&&method==='POST'){secretAuth(req,paymentSecret);return send(res,200,c.payment(s,await body(req)))}
  if(action==='events'&&method==='GET'){secretAuth(req,automationSecret);assert((await flags(s)).includes('workflow_automation'),403,'Automation not enabled');return send(res,200,{events:c.q('SELECT id,kind,payload,created FROM outbox WHERE store_id=? AND delivered IS NULL ORDER BY created,rowid LIMIT 100',s.id).map(x=>({...x,payload:JSON.parse(x.payload)}))})}
  if(action==='events/ack'&&method==='POST'){secretAuth(req,automationSecret);assert((await flags(s)).includes('workflow_automation'),403,'Automation not enabled');const x=await body(req);assert(typeof x.id==='string',400,'Invalid event');const result=c.run('UPDATE outbox SET delivered=COALESCE(delivered,?) WHERE store_id=? AND id=?',Date.now(),s.id,x.id);assert(result.changes,404,'Event not found');return send(res,200,{ok:true})}
  const m=c.auth(slug,token(req));
  if(action==='session'&&method==='GET')return send(res,200,{member:{name:m.name,role:m.role},store:publicStore(s),capabilities:await flags(s)});
  if(action==='addons'&&method==='GET'){permit(m,'design');const snap=await snapshotFor(s,bridge);return send(res,200,{items:addonView(snap,configured),projectId:s.project_id,portal:env.ATSH_CUSTOMER_PORTAL&&s.project_id?new URL('/account/dashboard?view=projects&project='+encodeURIComponent(s.project_id),env.ATSH_CUSTOMER_PORTAL).href:null})}
  if(action==='pages'&&method==='GET'){permit(m,'design');const snap=await snapshotFor(s,bridge);return send(res,200,{pages:c.pages(s),quota:pageQuota(snap),pricing:snap.catalog.find(a=>a.code==='extra_page')??null,portal:env.ATSH_CUSTOMER_PORTAL&&s.project_id?new URL('/account/dashboard?view=projects&project='+encodeURIComponent(s.project_id),env.ATSH_CUSTOMER_PORTAL).href:null})}
  if(action==='pages'&&method==='POST')return send(res,201,c.savePage(m,await body(req),await quota(s)));
  if(/^pages\/[^/]+$/.test(action)&&method==='PUT')return send(res,200,c.savePage(m,await body(req),await quota(s),action.split('/')[1]));
  if(action==='design'&&method==='PUT')return send(res,200,c.design(m,await body(req)));
  if(action==='products'&&method==='GET'){permit(m,'products');const bid=url.searchParams.get('branchId')||undefined;await branchAccess(s,bid);return send(res,200,c.products(s,true,bid))}
  if(action==='products'&&method==='POST')return send(res,201,c.product(m,await body(req)));
  if(/^products\/[^/]+$/.test(action)&&method==='PATCH')return send(res,200,c.editProduct(m,action.split('/')[1],await body(req)));
  if(action==='stock'&&method==='PUT'){const x=await body(req);await branchAccess(s,x.branchId);return send(res,200,c.stock(m,x))}
  if(action==='stock/transfer'&&method==='POST'){assert((await flags(s)).includes('multi_branch'),403,'Multi-branch not enabled');return send(res,201,c.transfer(m,await body(req)))}
  if(action==='stock/movements'&&method==='GET'){const bid=url.searchParams.get('branchId')||undefined;await branchAccess(s,bid);return send(res,200,c.movements(m,bid))}
  if(action==='pos/catalog'&&method==='GET'){permit(m,'pos');const bid=url.searchParams.get('branchId')||undefined;await branchAccess(s,bid);return send(res,200,c.products(s,false,bid))}
  if(action==='pos/branches'&&method==='GET'){permit(m,'pos');const f=await flags(s);return send(res,200,c.branches(s).filter(b=>b.is_online||f.includes('multi_branch')))}
  if(action==='branches'&&method==='GET'){permit(m,'stock');const f=await flags(s);return send(res,200,c.branches(s).filter(b=>b.is_online||f.includes('multi_branch')))}
  if(action==='branches'&&method==='POST'){assert((await flags(s)).includes('multi_branch'),403,'Multi-branch not enabled');return send(res,201,c.addBranch(m,(await body(req)).name))}
  if(action==='members'&&method==='GET')return send(res,200,c.members(m));
  if(/^members\/[^/]+$/.test(action)&&method==='PATCH')return send(res,200,c.changeMember(m,action.split('/')[1],await body(req)));
  if(action==='members'&&method==='POST')return send(res,201,c.addMember(m,await body(req)));
  if(action==='coupons'&&method==='POST'){assert((await flags(s)).includes('coupons_discounts'),403,'Coupons not enabled');return send(res,201,c.coupon(m,await body(req)))}
  if(action==='orders'&&method==='GET')return send(res,200,c.orders(m));
  if(/^orders\/[^/]+\/return$/.test(action)&&method==='POST')return send(res,200,c.returnOrder(m,action.split('/')[1],await body(req)));
  if(/^orders\/[^/]+$/.test(action)&&method==='PATCH')return send(res,200,c.transition(m,action.split('/')[1],(await body(req)).status));
  if(action==='pos'&&method==='POST'){const x=await body(req);await branchAccess(s,x.branchId);return send(res,201,c.checkout(s,x,{pos:true,member:m,flags:await flags(s)}))}
  if(action==='reports'&&method==='GET')return send(res,200,c.reports(m));
  throw new Fault(404,'Not found');
 }catch(e){if(!(e instanceof Fault))console.error(e.message);send(res,e.status??(String(e.code).includes('SQLITE_CONSTRAINT')?409:500),e instanceof Fault?{error:e.message}:{error:'Operation failed'})}
});
server.listen(Number(env.PORT||3200),env.HOST||'127.0.0.1',()=>console.log('ATSH Commerce Engine ready'));
