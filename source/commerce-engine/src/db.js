import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export function openDb(path){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS stores(id TEXT PRIMARY KEY,slug TEXT UNIQUE NOT NULL,name TEXT NOT NULL,sector TEXT NOT NULL,theme TEXT NOT NULL,mode TEXT NOT NULL CHECK(mode IN ('rent','rent_monthly','copy','code')),project_id TEXT UNIQUE,design TEXT NOT NULL,currency TEXT NOT NULL DEFAULT 'EGP',shipping INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY,store_id TEXT NOT NULL REFERENCES stores(id),name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN('owner','manager','sales','inventory','designer')),token_hash TEXT UNIQUE NOT NULL,active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS branches(id TEXT PRIMARY KEY,store_id TEXT NOT NULL REFERENCES stores(id),name TEXT NOT NULL,is_online INTEGER NOT NULL DEFAULT 0,UNIQUE(store_id,name));
 CREATE UNIQUE INDEX IF NOT EXISTS online_branch ON branches(store_id) WHERE is_online=1;
 CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,store_id TEXT NOT NULL REFERENCES stores(id),name TEXT NOT NULL,description TEXT NOT NULL,category TEXT NOT NULL,image TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS variants(id TEXT PRIMARY KEY,store_id TEXT NOT NULL REFERENCES stores(id),product_id TEXT NOT NULL REFERENCES products(id),sku TEXT NOT NULL,label TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=0),UNIQUE(store_id,sku));
 CREATE TABLE IF NOT EXISTS stock(store_id TEXT NOT NULL REFERENCES stores(id),branch_id TEXT NOT NULL REFERENCES branches(id),variant_id TEXT NOT NULL REFERENCES variants(id),quantity INTEGER NOT NULL CHECK(quantity>=0),PRIMARY KEY(branch_id,variant_id));
 CREATE TABLE IF NOT EXISTS coupons(store_id TEXT NOT NULL REFERENCES stores(id),code TEXT NOT NULL,percent INTEGER NOT NULL CHECK(percent BETWEEN 1 AND 90),active INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(store_id,code));
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,store_id TEXT NOT NULL REFERENCES stores(id),branch_id TEXT NOT NULL REFERENCES branches(id),request_key TEXT NOT NULL,fingerprint TEXT NOT NULL,tracking_hash TEXT UNIQUE NOT NULL,status TEXT NOT NULL,payment TEXT NOT NULL,payment_status TEXT NOT NULL,customer TEXT NOT NULL,phone TEXT NOT NULL,address TEXT NOT NULL,subtotal INTEGER NOT NULL,discount INTEGER NOT NULL,shipping INTEGER NOT NULL,total INTEGER NOT NULL,currency TEXT NOT NULL,channel TEXT NOT NULL,created INTEGER NOT NULL,UNIQUE(store_id,request_key));
 CREATE TABLE IF NOT EXISTS order_items(order_id TEXT NOT NULL REFERENCES orders(id),variant_id TEXT NOT NULL REFERENCES variants(id),name TEXT NOT NULL,sku TEXT NOT NULL,quantity INTEGER NOT NULL,price INTEGER NOT NULL,PRIMARY KEY(order_id,variant_id));
 CREATE TABLE IF NOT EXISTS payment_events(id TEXT PRIMARY KEY,store_id TEXT NOT NULL REFERENCES stores(id),order_id TEXT NOT NULL REFERENCES orders(id),created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,store_id TEXT NOT NULL REFERENCES stores(id),kind TEXT NOT NULL,payload TEXT NOT NULL,created INTEGER NOT NULL,delivered INTEGER);
 CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,store_id TEXT NOT NULL REFERENCES stores(id),member_id TEXT NOT NULL,action TEXT NOT NULL,data TEXT NOT NULL,created INTEGER NOT NULL);`);
 return db;
}
export function atomic(db,fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
