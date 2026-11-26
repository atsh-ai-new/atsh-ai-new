import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote } from '../src/lib/catalog.ts';

for (const [packageId, includedPages] of [['landing', 1], ['multi', 5], ['dynamic', 5], ['enterprise', 1]]) {
  test(`${packageId}: shared extras use their selected quantities and recurring periods`, () => {
    const quote = calculateQuote({
      packageId, identity: 'logo', content: 'writing', addons: ['seo', 'booking', 'contact', 'analytics'],
      pages: includedPages + 2, bilingual: true, hosting: true, maintenance: true, domain: 'none'
    }, undefined, [
      { code: 'extra_page', name: 'Extra pages', price: 1000, pricingType: 'per_page' },
      { code: 'writing', name: 'Writing', price: 250, pricingType: 'per_page' }
    ], 14, [
      { id: 'bot', name: 'Bot', price: 500, pricingType: 'fixed', unitLabel: '' },
      { id: 'assistant', name: 'Assistant', price: 2500, pricingType: 'yearly', unitLabel: '' }
    ]);
    assert.equal(quote.items.filter(item => item.id === 'extra_page').length, 1);
    assert.equal(quote.items.find(item => item.id === 'extra_page').amount, 2000);
    assert.equal(quote.items.find(item => item.id === 'content').amount, 250 * (includedPages + 2));
    assert.equal(quote.items.find(item => item.id === 'identity').amount, 800);
    assert.equal(quote.recurring, 6700);
  });
}
