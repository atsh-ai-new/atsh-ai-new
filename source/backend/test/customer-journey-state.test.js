import test from 'node:test';
import assert from 'node:assert/strict';
import {canJourneyTransition} from '../src/customer-journey-state.js';
test('manual admin cannot mark payment as paid',()=>assert.equal(canJourneyTransition('payment_pending','paid',{manual:true}),false));
test('manual workflow cannot skip configuration',()=>assert.equal(canJourneyTransition('draft','quoted',{manual:true}),false));
test('commercial quote can advance a draft',()=>assert.equal(canJourneyTransition('draft','quoted'),true));
test('delivery needs handover note',()=>{assert.equal(canJourneyTransition('approved','delivered',{manual:true}),false);assert.equal(canJourneyTransition('approved','delivered',{manual:true,note:'handover'}),true);});
test('invalid state regressions are rejected',()=>assert.equal(canJourneyTransition('delivered','draft'),false));
test('payment status requires verified ledger context',()=>{assert.equal(canJourneyTransition('payment_pending','paid'),false);assert.equal(canJourneyTransition('payment_pending','paid',{manual:true,paymentVerified:true}),false);assert.equal(canJourneyTransition('payment_pending','paid',{paymentVerified:true}),true);});
