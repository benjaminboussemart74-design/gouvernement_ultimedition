#!/usr/bin/env node
/*
  Minimal DOM test for minister card accent colors.
  Usage: node scripts/test_card_accent.js
  Requires: npm install jsdom
*/

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const projectRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(projectRoot, 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

const dom = new JSDOM(`<!doctype html><html><body>
  <div id="ministers-grid"></div>
  <div id="ministers-empty"></div>
</body></html>`, { url: 'http://localhost', runScripts: 'dangerously' });

const { window } = dom;
const { document } = window;

Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });

const originalAddEventListener = document.addEventListener.bind(document);
document.addEventListener = (type, listener, options) => {
  if (type === 'DOMContentLoaded') return undefined;
  return originalAddEventListener(type, listener, options);
};

document.body.appendChild(document.createElement('div'));

window.eval(`${scriptContent}\nwindow.__TEST_EXPORTED = { buildCard };`);

if (!window.__TEST_EXPORTED || typeof window.__TEST_EXPORTED.buildCard !== 'function') {
  throw new Error('buildCard was not found after evaluating script.js');
}

const { buildCard } = window.__TEST_EXPORTED;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const partyCard = buildCard({
  id: 'test-party',
  name: 'Ministre Parti',
  role: 'minister',
  party: 'Renaissance',
  accentColor: '#ff00ff',
});

assert(partyCard.style.getPropertyValue('--accent-color').trim() === '#b89c05',
  'Party-based accent should override minister accentColor');
assert(partyCard.classList.contains('has-accent'), 'Card with resolved accent should have has-accent class');
assert(partyCard.dataset.accentColor === '#b89c05', 'Resolved accent color should be exposed via data-accent-color');

const accentFallbackCard = buildCard({
  id: 'test-accent',
  name: 'Ministre Accent',
  role: 'minister',
  party: '',
  accentColor: '#123456',
});

assert(accentFallbackCard.style.getPropertyValue('--accent-color').trim() === '#123456',
  'accentColor should be used when no party mapping exists');
assert(accentFallbackCard.dataset.accentColor === '#123456', 'Fallback accent color should be exposed via data attribute');

console.log('Card accent checks passed.');
