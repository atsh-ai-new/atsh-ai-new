import test from 'node:test';
import assert from 'node:assert/strict';
import {sameVerifiedEmail,canClaimQuote} from '../src/customer-commercial-rules.js';
test('email match is case-insensitive',()=>assert.equal(sameVerifiedEmail(' A@Example.com ','a@example.com'),true));
test('email alone cannot claim quote',()=>assert.equal(canClaimQuote({accountEmail:'a@b.com',quoteEmail:'a@b.com',accountId:'1',linkActive:false}),false));
test('valid token and matching email can claim unowned quote',()=>assert.equal(canClaimQuote({accountEmail:'a@b.com',quoteEmail:'A@B.COM',accountId:'1',linkActive:true}),true));
test('different owner blocks claim',()=>assert.equal(canClaimQuote({accountEmail:'a@b.com',quoteEmail:'a@b.com',accountId:'1',existingOwner:'2',linkActive:true}),false));
test('wrong email blocks claim',()=>assert.equal(canClaimQuote({accountEmail:'a@b.com',quoteEmail:'x@b.com',accountId:'1',linkActive:true}),false));
