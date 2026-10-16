// Runnable check for tools-suite/keycode-logger: runs the page's inline script against a
// minimal DOM stub and drives it with synthetic keyboard/IME events, then asserts what the
// page should have done. No browser, no Playwright, no dependencies.
//
// usage: node check-keycode-logger.mjs /path/to/keycode-logger/index.html
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || join(here, 'index.html');
const html = readFileSync(file, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) { console.error('no inline script found'); process.exit(1); }
const code = scripts.join('\n') + `
globalThis.__api = { handleKeyEvent, handleKeyUp, handleComposition, eventHistory, stats, unlocked,
  ACHIEVEMENTS, getKeyComboString, snapshot, renderEventFields, heldRecords, topCounts, lockLights };
`;

// ---- minimal DOM ----
const makeEl = (id) => ({
  id, innerHTML: '', textContent: '', style: {}, dataset: {}, checked: true, value: '',
  classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
               toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
  addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {},
  getBoundingClientRect: () => ({ width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10 }),
  querySelector: () => makeEl('anon'), querySelectorAll: () => [],
});
const els = new Map();
const getEl = (id) => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); };
const listeners = {};
const store = new Map();

const ctx = {
  console,
  performance: { now: () => Date.now() },
  setTimeout: () => 0, clearTimeout: () => {}, requestAnimationFrame: () => 0,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
  document: {
    getElementById: getEl,
    querySelector: () => makeEl('anon'),
    querySelectorAll: () => [],
    addEventListener: (t, fn) => { (listeners[t] ||= []).push(fn); },
    body: makeEl('body'),
  },
  window: { addEventListener: () => {}, isSecureContext: true },
  navigator: { clipboard: null },
  Utils: { escapeHtml: s => String(s), copyToClipboard: async () => true },
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(code, ctx);
const api = ctx.__api;

// ---- synthetic events ----
const ev = (type, o = {}) => Object.assign({
  type, key: '', code: '', keyCode: 0, which: 0, location: 0, repeat: false,
  ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, isComposing: false,
  data: '', timeStamp: 12.7, getModifierState: () => false, preventDefault() {}, target: { tagName: 'BODY' },
}, o);
const down = (o) => api.handleKeyEvent(ev('keydown', o));
const up = (o) => api.handleKeyUp(ev('keyup', o));

const results = [];
const check = (name, cond, detail) => { results.push([cond, name, detail]); };

// 1. a plain key
down({ key: 'a', code: 'KeyA', keyCode: 65, which: 65 });
up({ key: 'a', code: 'KeyA', keyCode: 65, which: 65 });
check('keydown + keyup both logged', api.eventHistory.length === 2, `history=${api.eventHistory.length}`);
check('history marks press and release',
  api.eventHistory.map(h => h.type).join(',') === 'keyup,keydown',
  api.eventHistory.map(h => h.type).join(','));
check('released key leaves the held set', api.heldRecords.size === 0, `held=${api.heldRecords.size}`);
check('did not double-count the press', api.topCounts.get('KeyA') === 1, `count=${api.topCounts.get('KeyA')}`);
check('"first key" achievement unlocked', !!api.unlocked['first'], JSON.stringify(api.unlocked));

// 2. held keys / chord size
down({ key: 'Control', code: 'ControlLeft', keyCode: 17, ctrlKey: true });
down({ key: 'Shift', code: 'ShiftLeft', keyCode: 16, ctrlKey: true, shiftKey: true });
down({ key: 'k', code: 'KeyK', keyCode: 75, ctrlKey: true, shiftKey: true });
check('modifiers are tracked as held', api.heldRecords.size === 3, `held=${api.heldRecords.size}`);
check('chord of 3 detected', api.stats.maxChord >= 3, `maxChord=${api.stats.maxChord}`);
check('chord achievement unlocked', !!api.unlocked['chord'], 'expected chord');
check('combo string is Ctrl+Shift+k',
  api.getKeyComboString(api.snapshot(ev('keydown', { key: 'k', ctrlKey: true, shiftKey: true }), 'keydown')) === 'Ctrl+Shift+k',
  api.getKeyComboString(api.snapshot(ev('keydown', { key: 'k', ctrlKey: true, shiftKey: true }), 'keydown')));
[['Control', 'ControlLeft'], ['Shift', 'ShiftLeft'], ['k', 'KeyK']].forEach(([key, code]) => up({ key, code }));
check('all keys released', api.heldRecords.size === 0, `held=${api.heldRecords.size}`);

// 3. lock lights + caps achievement
down({ key: 'A', code: 'KeyA', keyCode: 65, getModifierState: n => n === 'CapsLock' });
check('CapsLock light recorded', api.lockLights.CapsLock === true, JSON.stringify(api.lockLights));
check('caps achievement unlocked', !!api.unlocked['caps'], 'expected caps');
check('lock lights render as ON', ctx.__api && getEl('lockLights').innerHTML.includes('ON'), getEl('lockLights').innerHTML.slice(0, 60));
up({ key: 'A', code: 'KeyA' });

// 4. function key + repeats
down({ key: 'F5', code: 'F5', keyCode: 116 });
for (let i = 0; i < 21; i++) down({ key: 'x', code: 'KeyX', keyCode: 88, repeat: true });
check('function-row achievement unlocked', !!api.unlocked['fn'], 'expected fn');
check('auto-repeat counted', api.stats.maxRepeat >= 20, `maxRepeat=${api.stats.maxRepeat}`);
check('repeat achievement unlocked', !!api.unlocked['repeat'], 'expected repeat');

// 5. IME composition
api.handleComposition(ev('compositionstart', { data: 'n' }));
api.handleComposition(ev('compositionupdate', { data: 'ni' }));
api.handleComposition(ev('compositionend', { data: '你好' }));
check('composition events logged', api.eventHistory.filter(h => h.type.startsWith('composition')).length === 3,
  api.eventHistory.map(h => h.type).join(','));
check('IME achievement unlocked', !!api.unlocked['ime'], 'expected ime');
check('composing text shows the committed string', getEl('composingText').textContent.includes('你好'), getEl('composingText').textContent);

// 6. richer fields
const fields = api.renderEventFields(api.snapshot(ev('keydown', { key: 'a', code: 'KeyA', keyCode: 65, timeStamp: 123.4, isComposing: true }), 'keydown'));
check('fields include type', fields.includes('event.type'), '');
check('fields include isComposing', fields.includes('event.isComposing'), '');
check('fields include timeStamp', fields.includes('event.timeStamp'), '');
check('fields include modifier state', fields.includes('getModifierState'), '');

// 7. aria-live + most-pressed panel
check('aria-live region updated', getEl('liveRegion').textContent.length > 0, getEl('liveRegion').textContent);
check('most-pressed panel rendered', getEl('topKeys').innerHTML.includes('topkey'), getEl('topKeys').innerHTML.slice(0, 80));
check('achievement panel rendered', getEl('achGrid').innerHTML.includes('ach-name'), '');
check('achievement counter shown', /\d+\/15/.test(getEl('achCount').textContent), getEl('achCount').textContent);

// 8. held state does not persist forever (blur clears it)
down({ key: 'z', code: 'KeyZ', keyCode: 90 });
const heldNow = [...api.heldRecords.keys()].sort().join(',');
check('only unreleased keys are held (F5, KeyX, KeyZ)', heldNow === 'F5,KeyX,KeyZ', heldNow);

let pass = 0;
console.log(`\nkeycode-logger behaviour check (${file})\n`);
for (const [ok, name, detail] of results) {
  if (ok) pass++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(42)} ${ok ? '' : detail}`);
}
console.log(`\n${pass}/${results.length} checks passed`);
process.exit(pass === results.length ? 0 : 1);
