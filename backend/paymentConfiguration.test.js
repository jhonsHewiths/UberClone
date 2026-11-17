import assert from 'node:assert/strict';
import test from 'node:test';
import { getOptionalCheckoutRedirects } from './paymentConfiguration.js';

test('allows test checkout without public URL or webhook', () => {
  assert.deepEqual(
    getOptionalCheckoutRedirects({ publicUrl: undefined, webhookSecret: undefined }),
    {}
  );
});

test('adds return URLs without enabling a webhook when only public URL is configured', () => {
  const configuration = getOptionalCheckoutRedirects({
    publicUrl: 'https://demo.example',
    webhookSecret: undefined,
  });

  assert.equal(configuration.back_urls.success, 'https://demo.example/api/payments/return?status=success');
  assert.equal(configuration.auto_return, 'approved');
  assert.equal(configuration.notification_url, undefined);
});

test('uses the app deep link for Checkout Pro return without a public server URL', () => {
  const returnUrl = 'uberclone://payment-return';
  const configuration = getOptionalCheckoutRedirects({
    publicUrl: undefined,
    webhookSecret: undefined,
    returnUrl,
  });

  assert.deepEqual(configuration.back_urls, {
    success: returnUrl,
    failure: returnUrl,
    pending: returnUrl,
  });
  assert.equal(configuration.auto_return, 'approved');
  assert.equal(configuration.notification_url, undefined);
});

test('rejects return URLs that do not target the app deep link', () => {
  assert.throws(
    () => getOptionalCheckoutRedirects({
      publicUrl: undefined,
      webhookSecret: undefined,
      returnUrl: 'http://localhost:4242/payment-return',
    }),
    /enlace profundo/
  );
});

test('adds the webhook URL only when its signing secret is configured', () => {
  const configuration = getOptionalCheckoutRedirects({
    publicUrl: 'https://demo.example',
    webhookSecret: 'test-secret',
  });

  assert.equal(configuration.notification_url, 'https://demo.example/api/payments/webhook');
});

test('rejects webhook configuration without a public HTTPS URL', () => {
  assert.throws(
    () => getOptionalCheckoutRedirects({ publicUrl: undefined, webhookSecret: 'test-secret' }),
    /PAYMENT_API_PUBLIC_URL/
  );
  assert.throws(
    () => getOptionalCheckoutRedirects({ publicUrl: 'http://localhost:4242', webhookSecret: undefined }),
    /HTTPS/
  );
});
