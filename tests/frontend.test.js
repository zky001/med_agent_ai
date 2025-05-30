const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (err) {
    console.error('✗', name);
    console.error(err);
    process.exitCode = 1;
  }
}

const script = fs.readFileSync('script.js', 'utf-8');
const lines = script.split('\n').slice(643, 654).join('\n');
const context = {};
vm.createContext(context);
vm.runInContext(lines, context);
const { formatFileSize, formatDate } = context;

test('formatFileSize works', () => {
  assert.strictEqual(formatFileSize(0), '0 Bytes');
  assert.strictEqual(formatFileSize(1024), '1 KB');
});

test('formatDate works', () => {
  const ts = 1700000000;
  const expected = new Date(ts * 1000).toLocaleDateString('zh-CN');
  assert.strictEqual(formatDate(ts), expected);
});
