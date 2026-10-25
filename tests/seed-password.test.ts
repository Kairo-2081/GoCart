import assert from 'node:assert/strict';
import test from 'node:test';
import { readAdminPassword, MIN_ADMIN_PASSWORD_LENGTH } from '../src/db/seed.ts';
import { initialAdmin, initialCustomers, initialSellers } from '../src/data/seedData.ts';

test('no admin password is set: none is created', () => {
  assert.equal(readAdminPassword({}), null);
  assert.equal(readAdminPassword({ GOCART_ADMIN_PASSWORD: '' }), null);
});

test('a short admin password is refused', () => {
  assert.equal(readAdminPassword({ GOCART_ADMIN_PASSWORD: 'x'.repeat(MIN_ADMIN_PASSWORD_LENGTH - 1) }), null);
});

test('a long enough admin password is accepted unchanged', () => {
  const value = 'correct-horse-battery-staple';
  assert.equal(readAdminPassword({ GOCART_ADMIN_PASSWORD: value }), value);
});

test('no password is hard-coded in the seed data', () => {
  for (const account of [initialAdmin, ...initialSellers, ...initialCustomers]) {
    assert.equal(account.Password, '', `${account.Username} must not ship a password`);
  }
});
