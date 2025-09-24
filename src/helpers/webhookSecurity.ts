// src/helpers/webhookSecurity.ts
import crypto from 'crypto';
import Logger from '../core/Logger';

export function verifyWebhookSignature(
  payload: Buffer,
  signature: string,
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature || !payload) {
    Logger.warn('Missing secret/signature/payload for webhook verification');
    return false;
  }

  // Compute HMAC over the EXACT raw bytes
  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  const expected = `sha256=${expectedHex}`;

  // Constant-time compare with length guard
  const recv = Buffer.from(signature, 'utf8');
  const exp = Buffer.from(expected, 'utf8');
  if (recv.length !== exp.length) {
    Logger.warn('Signature length mismatch');
    return false;
  }

  const ok = crypto.timingSafeEqual(recv, exp);

  Logger.info('Signature verification', {
    received: signature,
    expected,
    match: ok,
  });

  return ok;
}
