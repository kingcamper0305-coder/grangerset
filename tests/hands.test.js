const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const RightHand = require('../hands/right');

describe('RightHand', () => {
  const hand = new RightHand();

  it('should initialize correctly', () => {
    assert.equal(hand.name, 'Right Hand');
    assert.equal(hand.role, 'Clean Executor');
    assert.deepEqual(hand.getLog(), []);
  });

  it('should write and read files', async () => {
    const testFile = '/tmp/granger-test-' + Date.now() + '.txt';
    const content = 'hello granger';
    const writeResult = await hand.write(testFile, content);
    assert.equal(writeResult.ok, true);

    const readResult = await hand.read(testFile);
    assert.equal(readResult.ok, true);
    assert.equal(readResult.content, content);

    fs.unlinkSync(testFile);
  });

  it('should return error for missing file', async () => {
    const result = await hand.read('/tmp/nonexistent-granger-file.txt');
    assert.equal(result.ok, false);
  });

  it('should run shell commands', async () => {
    const result = await hand.run('echo "test"');
    assert.equal(result.ok, true);
    assert.equal(result.stdout, 'test');
  });

  it('should track log entries', () => {
    const log = hand.getLog();
    assert.ok(log.length > 0);
    assert.ok(log[0].action);
    assert.ok(log[0].time);
  });

  it('should detect no build system in empty dir', async () => {
    const result = await hand.build('/tmp');
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('No build system'));
  });
});
