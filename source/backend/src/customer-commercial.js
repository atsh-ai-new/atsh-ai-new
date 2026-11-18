import express from 'express';
import jwt from 'jsonwebtoken';
import {createHash} from 'node:crypto';
import {z} from 'zod';

const tokenHash=value=>createHash('sha256').update(value).digest('hex');
import {canClaimQuote} from './customer-commercial-rules.js';
export function customerCommercialRouter({pool}){
 const router=express.Router();
 const auth=async(req,res,next)=>{
  try{
   const payload=jwt.verify(req.cookies?.atsh_customer,process.env.JWT_SECRET,{issuer:'atsh-ai-api',audience:'atsh-customer'});
   if(payload.kind!=='customer')return res.status(401).json({error:'Sign in required'});
   const q=await pool.query('SELECT id,email,session_version,is_active,email_verified_at FROM customer_accounts WHERE id=$1',[payload.sub]);
   const user=q.rows[0];if(!user?.is_active||!user.email_verified_at||user.session_version!==payload.ver)return res.status(401).json({error:'Sign in required'});
   req.customer=user;next();
  }catch{return res.status(401).json({error:'Sign in required'});}
 };
 const safe=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 router.use(auth);
 router.post('/quotes/claim',safe(async(req,res)=>{
  const parsed=z.object({quoteId:z.number().int().positive(),reviewToken:z.string().min(20).max(512)}).strict().safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Invalid claim request'});
  const client=await pool.connect();try{
   await client.query('BEGIN');
   const q=await client.query('SELECT id,customer_email,customer_account_id FROM commercial_quotes WHERE id=$1 FOR UPDATE',[parsed.data.quoteId]);
   const link=await client.query('SELECT id FROM commercial_review_links WHERE quote_id=$1 AND token_hash=$2 AND revoked_at IS NULL AND expires_at>now() FOR UPDATE',[parsed.data.quoteId,tokenHash(parsed.data.reviewToken)]);
   if(!q.rowCount||!canClaimQuote({accountEmail:req.customer.email,quoteEmail:q.rows[0].customer_email,existingOwner:q.rows[0].customer_account_id,accountId:req.customer.id,linkActive:link.rowCount>0})){
    await client.query('ROLLBACK');return res.status(403).json({error:'Unable to claim quote'});
   }
   await client.query('UPDATE commercial_quotes SET customer_account_id=$1 WHERE id=$2',[req.customer.id,parsed.data.quoteId]);
   await client.query('COMMIT');return res.json({claimed:true});
  }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
 }));
 router.get('/quotes',safe(async(req,res)=>{
  const q=await pool.query('SELECT id,revision,status,items,total_piasters,currency,valid_until,created_at FROM commercial_quotes WHERE customer_account_id=$1 ORDER BY created_at DESC LIMIT 100',[req.customer.id]);res.json({quotes:q.rows});
 }));
 router.get('/quotes/:id',safe(async(req,res)=>{
  if(!/^\d+$/.test(req.params.id))return res.status(404).json({error:'Not found'});
  const q=await pool.query('SELECT id,revision,status,items,total_piasters,currency,valid_until,created_at FROM commercial_quotes WHERE id=$1 AND customer_account_id=$2',[req.params.id,req.customer.id]);
  if(!q.rowCount)return res.status(404).json({error:'Not found'});res.json({quote:q.rows[0]});
 }));
 router.get('/contracts',safe(async(req,res)=>{
  const q=await pool.query('SELECT c.id,c.quote_id,c.body_snapshot,c.status,c.signer_name,c.signed_at,c.created_at FROM customer_contracts c JOIN commercial_quotes q ON q.id=c.quote_id WHERE q.customer_account_id=$1 ORDER BY c.created_at DESC LIMIT 100',[req.customer.id]);res.json({contracts:q.rows});
 }));
 router.get('/invoices',safe(async(req,res)=>{
  const q=await pool.query('SELECT i.id,i.quote_id,i.amount_piasters,i.due_at,i.status,i.verified_paid_piasters,i.created_at FROM commercial_invoices i JOIN commercial_quotes q ON q.id=i.quote_id WHERE q.customer_account_id=$1 ORDER BY i.created_at DESC LIMIT 100',[req.customer.id]);res.json({invoices:q.rows});
 }));
 // Verified payment history: invoices are always scoped through the authenticated quote owner.
 router.get('/invoices/:id/payments',safe(async(req,res)=>{
  if(!/^\d+$/.test(req.params.id))return res.status(404).json({error:'Not found'});
  const q=await pool.query(`SELECT p.id,p.invoice_id,p.amount_piasters,p.paid_at,p.provider,p.created_at
   FROM commercial_invoice_payments p
   JOIN commercial_invoices i ON i.id=p.invoice_id
   JOIN commercial_quotes q ON q.id=i.quote_id
   WHERE i.id=$1 AND q.customer_account_id=$2 ORDER BY p.paid_at,p.id LIMIT 200`,[req.params.id,req.customer.id]);
  // Do not reveal whether another customer's invoice exists.
  const invoice=await pool.query(`SELECT i.id,i.amount_piasters,i.verified_paid_piasters,i.due_at,i.status
   FROM commercial_invoices i JOIN commercial_quotes q ON q.id=i.quote_id
   WHERE i.id=$1 AND q.customer_account_id=$2`,[req.params.id,req.customer.id]);
  if(!invoice.rowCount)return res.status(404).json({error:'Not found'});
  res.json({invoice:invoice.rows[0],payments:q.rows});
 }));
 // Orders are visible only through an explicitly owned project-to-order link.
 // Email similarity alone never grants access to an order.
 router.get('/orders',safe(async(req,res)=>{
  const q=await pool.query(`SELECT DISTINCT o.id,o.reference,o.status,o.total,o.currency,o.created_at,
      p.id AS project_id,p.status AS project_status
    FROM customer_journey_projects p
    JOIN customer_journey_order_links l ON l.project_id=p.id
    JOIN orders o ON o.id=l.order_id
    WHERE p.customer_account_id=$1
    ORDER BY o.created_at DESC LIMIT 100`,[req.customer.id]);
  res.json({orders:q.rows});
 }));
 router.get('/orders/:id',safe(async(req,res)=>{
  if(!/^[0-9a-f-]{36}$/i.test(req.params.id))return res.status(404).json({error:'Not found'});
  const q=await pool.query(`SELECT o.id,o.reference,o.status,o.total,o.currency,o.snapshot,o.created_at,
      p.id AS project_id
    FROM customer_journey_projects p
    JOIN customer_journey_order_links l ON l.project_id=p.id
    JOIN orders o ON o.id=l.order_id
    WHERE p.customer_account_id=$1 AND o.id=$2 LIMIT 1`,[req.customer.id,req.params.id]);
  if(!q.rowCount)return res.status(404).json({error:'Not found'});
  res.json({order:q.rows[0]});
 }));
 return router;
}
