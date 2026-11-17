import crypto from 'node:crypto';

export function createWebhookManifest(dataId, requestId, timestamp) {
  return `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${timestamp};`;
}

export function verifyWebhookSignature({ dataId, requestId, signature, secret }) {
  if (!dataId || !requestId || !signature || !secret) return false;

  const parts = Object.fromEntries(
    signature.split(',').map((part) => {
      const separator = part.indexOf('=');
      return separator < 0
        ? [part.trim(), '']
        : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    })
  );
  if (!parts.ts || !parts.v1) return false;

  const manifest = createWebhookManifest(dataId, requestId, parts.ts);
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest();
  let received;
  try {
    received = Buffer.from(parts.v1, 'hex');
  } catch {
    return false;
  }

  return received.length === expected.length
    && crypto.timingSafeEqual(received, expected);
}

export function toPaymentStatus(status) {
  if (status === 'approved') return 'Aprobado';
  if (status === 'rejected' || status === 'cancelled') return 'Rechazado';
  return 'Pendiente';
}
