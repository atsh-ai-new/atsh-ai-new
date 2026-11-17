import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const emailSchema=z.string().trim().email().max(254).transform(v=>v.toLowerCase());
const passwordSchema=z.string().min(12).max(128);
const hash=v=>createHash('sha256').update(v).digest('hex');
const secret=()=>randomBytes(32).toString('hex');
const sessionCookie='atsh_customer';
const cookieOptions={httpOnly:true,secure:process.env.COOKIE_SECURE!=='false',sameSite:'lax',path:'/',maxAge:7*24*3600*1000};
const safe=(handler)=>(req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next);

export function customerAuthRouter({pool,sendEmail,allowedOrigins=[]}){
 const router=Router();
 const publicUrl=process.env.PUBLIC_SITE_URL;
 const session=async(res,id)=>{const q=await pool.query('SELECT session_version FROM customer_accounts WHERE id=$1',[id]);res.cookie(sessionCookie,jwt.sign({sub:String(id),kind:'customer',ver:q.rows[0].session_version},process.env.JWT_SECRET,{issuer:'atsh-ai-api',audience:'atsh-customer',expiresIn:'7d'}),cookieOptions);};
 const issue=async(client,id,purpose)=>{const token=secret();await client.query('INSERT INTO customer_auth_tokens(customer_id,purpose,token_hash,expires_at) VALUES($1,$2,$3,now()+interval \'30 minutes\')',[id,purpose,hash(token)]);return token;};
 const sendLink=async({email,name,token,purpose})=>{
  if(!publicUrl||!process.env.BREVO_API_KEY)throw Error('Customer email delivery not configured');
  const path=purpose==='verify'?'verify':'reset-password';
  const url=new URL('/account/'+path,publicUrl);url.searchParams.set('token',token);
  await sendEmail({to:email,toName:name,subject:purpose==='verify'?'تأكيد حساب ATSH AI':'استعادة كلمة مرور ATSH AI',textContent:`افتح الرابط خلال 30 دقيقة:\n${url.toString()}\nإذا لم تطلب ذلك تجاهل الرسالة.`});
 };
 router.use((req,res,next)=>{if(['POST','PUT','PATCH','DELETE'].includes(req.method)){const origin=req.get('origin');if(!origin||!allowedOrigins.includes(origin))return res.status(403).json({error:'Origin not allowed'});}next();});
 router.post('/register',safe(async(req,res)=>{
  const p=z.object({name:z.string().trim().min(2).max(120),email:emailSchema,password:passwordSchema}).safeParse(req.body);
  if(!p.success)return res.status(400).json({error:'Invalid registration'});
  const {name,email,password}=p.data;
  const client=await pool.connect();let token=null;
  try{await client.query('BEGIN');
   const existing=await client.query('SELECT id FROM customer_accounts WHERE email=$1',[email]);
   if(!existing.rowCount){const passwordHash=await bcrypt.hash(password,12);const inserted=await client.query('INSERT INTO customer_accounts(name,email,password_hash) VALUES($1,$2,$3) RETURNING id',[name,email,passwordHash]);token=await issue(client,inserted.rows[0].id,'verify');await sendLink({email,name,token,purpose:'verify'});}
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  res.status(202).json({message:'If eligible, a verification email has been sent'});
 }));
 router.post('/verify',safe(async(req,res)=>{
  const p=z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'Invalid token'});
  const client=await pool.connect();try{await client.query('BEGIN');const q=await client.query("UPDATE customer_auth_tokens SET used_at=now() WHERE token_hash=$1 AND purpose='verify' AND used_at IS NULL AND expires_at>now() RETURNING customer_id",[hash(p.data.token)]);
   if(!q.rowCount){await client.query('ROLLBACK');return res.status(400).json({error:'Invalid or expired token'});}
   await client.query('UPDATE customer_accounts SET email_verified_at=now() WHERE id=$1',[q.rows[0].customer_id]);await client.query('COMMIT');res.json({verified:true});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 router.post('/login',safe(async(req,res)=>{
  const p=z.object({email:emailSchema,password:z.string().max(128)}).safeParse(req.body);if(!p.success)return res.status(401).json({error:'Invalid credentials'});
  const q=await pool.query('SELECT id,name,email,password_hash,email_verified_at,is_active FROM customer_accounts WHERE email=$1',[p.data.email]);
  if(!q.rowCount||!q.rows[0].password_hash||!await bcrypt.compare(p.data.password,q.rows[0].password_hash)||!q.rows[0].email_verified_at||!q.rows[0].is_active)return res.status(401).json({error:'Invalid credentials or unverified account'});
  await session(res,q.rows[0].id);res.json({customer:{name:q.rows[0].name,email:q.rows[0].email}});
 }));
 router.post('/password/forgot',safe(async(req,res)=>{
  const p=z.object({email:emailSchema}).safeParse(req.body);if(!p.success)return res.status(202).json({message:'If the account exists, a reset email will be sent'});
  const q=await pool.query('SELECT id,name,email FROM customer_accounts WHERE email=$1 AND is_active=true AND password_hash IS NOT NULL',[p.data.email]);
  if(q.rowCount){const token=await issue(pool,q.rows[0].id,'reset');try{await sendLink({email:q.rows[0].email,name:q.rows[0].name,token,purpose:'reset'});}catch(e){console.error('Customer password reset email failed');}}
  res.status(202).json({message:'If the account exists, a reset email will be sent'});
 }));
 router.post('/password/reset',safe(async(req,res)=>{
  const p=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),password:passwordSchema}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'Invalid reset request'});
  const passwordHash=await bcrypt.hash(p.data.password,12);const client=await pool.connect();try{await client.query('BEGIN');const q=await client.query("UPDATE customer_auth_tokens SET used_at=now() WHERE token_hash=$1 AND purpose='reset' AND used_at IS NULL AND expires_at>now() RETURNING customer_id",[hash(p.data.token)]);
   if(!q.rowCount){await client.query('ROLLBACK');return res.status(400).json({error:'Invalid or expired token'});}
   await client.query('UPDATE customer_accounts SET password_hash=$1,session_version=session_version+1 WHERE id=$2',[passwordHash,q.rows[0].customer_id]);await client.query('COMMIT');res.clearCookie(sessionCookie,cookieOptions);res.json({reset:true});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 router.post('/google',safe(async(req,res)=>{
  const p=z.object({credential:z.string().min(30).max(5000)}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'Invalid credential'});
  if(!process.env.GOOGLE_CLIENT_ID)return res.status(503).json({error:'Google login not configured'});
  const upstream=await fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(p.data.credential),{signal:AbortSignal.timeout(8000)});
  if(!upstream.ok)return res.status(401).json({error:'Google authentication failed'});
  const identity=await upstream.json();
  if(identity.aud!==process.env.GOOGLE_CLIENT_ID||!['accounts.google.com','https://accounts.google.com'].includes(identity.iss)||identity.email_verified!=='true'||!identity.sub||!identity.email)return res.status(401).json({error:'Google authentication failed'});
  const email=emailSchema.parse(identity.email);const name=String(identity.name||email.split('@')[0]).slice(0,120);
  const client=await pool.connect();let id;
  try{await client.query('BEGIN');const byGoogle=await client.query('SELECT id,is_active FROM customer_accounts WHERE google_sub=$1 FOR UPDATE',[identity.sub]);
   if(byGoogle.rowCount){if(!byGoogle.rows[0].is_active){await client.query('ROLLBACK');return res.status(403).json({error:'Account disabled'});}id=byGoogle.rows[0].id;}
   else{const byEmail=await client.query('SELECT id FROM customer_accounts WHERE email=$1 FOR UPDATE',[email]);
    if(byEmail.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'Existing email account: sign in with password first; account linking requires verification'});}
    const inserted=await client.query('INSERT INTO customer_accounts(name,email,google_sub,email_verified_at) VALUES($1,$2,$3,now()) RETURNING id',[name,email,identity.sub]);id=inserted.rows[0].id;}
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  await session(res,id);res.json({customer:{name,email}});
 }));
 const requireCustomer=safe(async(req,res,next)=>{let payload;try{payload=jwt.verify(req.cookies?.[sessionCookie],process.env.JWT_SECRET,{issuer:'atsh-ai-api',audience:'atsh-customer'});}catch{return res.status(401).json({error:'Sign in required'});}const q=await pool.query('SELECT id,name,email,is_active,session_version FROM customer_accounts WHERE id=$1',[payload.sub]);if(!q.rowCount||!q.rows[0].is_active)return res.status(401).json({error:'Session revoked'});if(payload.ver!==undefined&&payload.ver!==q.rows[0].session_version)return res.status(401).json({error:'Session revoked'});req.customer=q.rows[0];next();});
 router.get('/me',requireCustomer,(req,res)=>res.json({customer:{name:req.customer.name,email:req.customer.email}}));
 // Project ownership is explicit: a matching email address alone never grants access.
 router.post('/projects/claim',requireCustomer,safe(async(req,res)=>{
  const p=z.object({projectId:z.string().uuid(),accessToken:z.string().regex(/^[a-f0-9]{64}$/)}).safeParse(req.body);
  if(!p.success)return res.status(400).json({error:'Invalid claim request'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const q=await client.query(`SELECT p.id,p.customer_email,p.customer_account_id,a.token_hash,a.expires_at,a.revoked_at
     FROM customer_journey_projects p JOIN customer_journey_access a ON a.project_id=p.id
     WHERE p.id=$1 FOR UPDATE OF p,a`,[p.data.projectId]);
   const row=q.rows[0];
   if(!row||row.customer_account_id&&String(row.customer_account_id)!==String(req.customer.id)||
      !row.customer_email||row.customer_email.toLowerCase()!==req.customer.email.toLowerCase()||
      row.revoked_at||new Date(row.expires_at)<=new Date()||row.token_hash!==hash(p.data.accessToken)){
    await client.query('ROLLBACK');return res.status(403).json({error:'Unable to claim project'});
   }
   await client.query('UPDATE customer_journey_projects SET customer_account_id=$1 WHERE id=$2',[req.customer.id,row.id]);
   await client.query('UPDATE customer_journey_access SET revoked_at=now() WHERE project_id=$1',[row.id]);
   await client.query('COMMIT');res.json({claimed:true,projectId:row.id});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 router.get('/projects',requireCustomer,safe(async(req,res)=>{const q=await pool.query('SELECT id,customer_name,status,created_at,updated_at FROM customer_journey_projects WHERE customer_account_id=$1 ORDER BY created_at DESC LIMIT 100',[req.customer.id]);res.json({projects:q.rows});}));
 router.post('/logout',(_req,res)=>{res.clearCookie(sessionCookie,cookieOptions);res.json({ok:true});});
 return router;
}
