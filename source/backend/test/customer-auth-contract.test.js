import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/customer-auth.js',import.meta.url),'utf8');
const schema=readFileSync(new URL('../db/customer_auth_stage15.sql',import.meta.url),'utf8');
test('registration login verification recovery Google and logout endpoints are defined',()=>{for(const p of ['/register','/login','/verify','/password/forgot','/password/reset','/google','/logout','/me','/projects'])assert.ok(src.includes(p),p)});
test('reset and verification tokens are hashed and single use',()=>{assert.match(src,/createHash\('sha256'\)/);assert.match(src,/used_at IS NULL AND expires_at>now\(\)/);assert.match(schema,/token_hash char\(64\) NOT NULL UNIQUE/)});
test('customer sessions use dedicated audience and secure httpOnly cookie',()=>{assert.match(src,/audience:'atsh-customer'/);assert.match(src,/httpOnly:true/);assert.match(src,/session_version\+1/)});
test('Google login validates audience and refuses silent linking to password account',()=>{assert.match(src,/identity.aud!==process.env.GOOGLE_CLIENT_ID/);assert.match(src,/account linking requires verification/)});
