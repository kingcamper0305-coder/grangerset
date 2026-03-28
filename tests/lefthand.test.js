const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const LeftHand = require('../hands/left');

describe('LeftHand', () => {
  const hand = new LeftHand();

  it('should initialize correctly', () => {
    assert.equal(hand.name, 'Left Hand');
    assert.equal(hand.role, 'Unconventional Operator');
  });

  it('should return DNS records structure', async () => {
    const result = await hand.dns('example.com');
    assert.equal(result.domain, 'example.com');
    assert.ok(Array.isArray(result.A));
    assert.ok(Array.isArray(result.MX));
  });

  it('should ping a URL and get response time', async () => {
    const result = await hand.ping('http://example.com');
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.ok(typeof result.responseMs === 'number');
  });

  it('should do HTTP recon', async () => {
    const result = await hand.recon('http://example.com');
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.ok(result.headers);
  });

  it('should handle unreachable host gracefully', async () => {
    const result = await hand.recon('http://192.0.2.1:9999');
    assert.equal(result.ok, false);
  });

  it('should track log entries', () => {
    const log = hand.getLog();
    assert.ok(log.length > 0);
  });
});
