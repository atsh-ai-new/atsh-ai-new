import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceBalance,dueState,validCalendarDate} from '../src/invoice-ledger-rules.js';
test('remaining is exact integer piasters',()=>assert.deepEqual(invoiceBalance(3000000,1200000),{amountPiasters:3000000,paidPiasters:1200000,remainingPiasters:1800000}));
test('rejects overpayment',()=>assert.throws(()=>invoiceBalance(100,101),RangeError));
test('void takes precedence',()=>assert.equal(dueState({status:'void',amountPiasters:100,paidPiasters:0,dueAt:'2020-01-01'},'2026-11-16'),'void'));
test('paid takes precedence',()=>assert.equal(dueState({status:'paid',amountPiasters:100,paidPiasters:100,dueAt:'2020-01-01'},'2026-11-16'),'paid'));
test('overdue vs upcoming',()=>{assert.equal(dueState({status:'unpaid',amountPiasters:100,paidPiasters:0,dueAt:'2026-11-15'},'2026-11-16'),'overdue');assert.equal(dueState({status:'unpaid',amountPiasters:100,paidPiasters:0,dueAt:'2026-11-16'},'2026-11-16'),'upcoming');});
test('rejects impossible calendar dates',()=>{assert.equal(validCalendarDate('2026-02-30'),false);assert.equal(validCalendarDate('2028-02-29'),true);});
