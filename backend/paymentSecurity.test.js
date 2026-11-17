import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  createWebhookManifest,
  toPaymentStatus,
  verifyWebhookSignature,
} from './paymentSecurity.js';

test('validates the signed Mercado Pago webhook manifest', () => {
  const secret = 'test-webhook-secret';
  const dataId = '123456789';
  const requestId = 'request-123';
  const timestamp = '1700000000';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(createWebhookManifest(dataId, requestId, timestamp))
    .digest('hex');

  assert.equal(
    verifyWebhookSignature({
      dataId,
      requestId,
      signature: `ts=${timestamp},v1=${signature}`,
      secret,
    }),
    true
  );
  assert.equal(
    verifyWebhookSignature({
      dataId,
      requestId: 'different-request',
      signature: `ts=${timestamp},v1=${signature}`,
      secret,
    }),
    false
  );
});

test('maps Mercado Pago payment outcomes to the app status labels', () => {
  assert.equal(toPaymentStatus('approved'), 'Aprobado');
  assert.equal(toPaymentStatus('rejected'), 'Rechazado');
  assert.equal(toPaymentStatus('cancelled'), 'Rechazado');
  assert.equal(toPaymentStatus('in_process'), 'Pendiente');
});
