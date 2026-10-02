const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = readFileSync(require('node:path').join(__dirname, '../universal-car-card.js'), 'utf8');
const context = {HTMLElement: class {}, customElements: {get() {return true;}}, window: {}, console: {info() {}}};
vm.createContext(context);
vm.runInContext(source + '\nglobalThis.Card = UniversalCarCard;', context);
assert.equal(context.uccAspectRatio().css, '1 / 1');
assert.equal(context.uccAspectRatio('7 / 5').value, 1.4);
assert.equal(context.uccAspectRatio(1.5).css, '1.5 / 1');
for (const value of ['0 / 1', '1 / 0', '-1', 'auto', '1; color:red', 'Infinity', '']) {
  assert.throws(() => context.uccAspectRatio(value));
}
const card = Object.create(context.Card.prototype);
card._config = card._normalizeConfig({display: {aspect_ratio: '7 / 5'}});
card.getBoundingClientRect = () => ({width: 350});
assert.equal(card.getCardSize(), 5);
assert.equal(card._normalizeConfig({}).display.aspect_ratio, '1 / 1');
assert.throws(() => card._normalizeConfig({display: {aspect_ratio:'bad'}}));
assert.ok(source.includes('aspect-ratio: ${c.display.aspect_ratio}'));
console.log('Aspect ratio validation, normalization and masonry sizing passed.');
