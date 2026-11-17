import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  createWebhookManifest,
  paymentMatchesTrip,
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

test('matches returned Mercado Pago payments to the stored trip', () => {
  const payment = {
    external_reference: 'driver-1:trip-1',
    preference_id: 'preference-1',
    transaction_amount: 12500,
    currency_id: 'COP',
  };
  const expected = {
    externalReference: 'driver-1:trip-1',
    preferenceId: 'preference-1',
    amount: 12500,
  };

  assert.equal(paymentMatchesTrip(payment, expected), true);
  assert.equal(paymentMatchesTrip(payment, { ...expected, amount: 13000 }), false);
  assert.equal(paymentMatchesTrip(payment, { ...expected, externalReference: 'other:trip' }), false);
  assert.equal(paymentMatchesTrip(payment, { ...expected, preferenceId: 'other-preference' }), false);
  assert.equal(paymentMatchesTrip(payment, {
    externalReference: expected.externalReference,
    amount: expected.amount,
  }), true);
  assert.equal(paymentMatchesTrip(payment, {
    preferenceId: expected.preferenceId,
    amount: expected.amount,
  }), true);
});
