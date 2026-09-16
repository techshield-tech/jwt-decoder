// Pure, framework-free JWT decoding logic. Tool-specific.
//
// Handles two shapes of compact serialization (RFC 7519 / RFC 7516):
//  - JWS (3 dot-separated segments): header.payload.signature — header and
//    payload are base64url(JSON); the signature is opaque bytes.
//  - JWE (5 dot-separated segments): an encrypted token. Only its header
//    (the first segment) is base64url(JSON) and can be shown; the remaining
//    segments (encrypted key, IV, ciphertext, auth tag) require the
//    decryption key and are never decoded by this tool.
//
// This module only ever decodes — it never verifies a signature or attempts
// decryption.

import { base64UrlDecodeToString } from './base64url';

export interface JsonSegment {
  /** Raw base64url text of this segment, exactly as it appeared in the token. */
  raw: string;
  /** Pretty-printed JSON (2-space indent) of the decoded value. */
  pretty: string;
  /** The parsed JSON value. */
  value: unknown;
}

export interface DecodedJws {
  kind: 'JWS';
  header: JsonSegment;
  payload: JsonSegment;
  /** Raw base64url signature segment. Never decoded or verified. */
  signature: string;
}

export interface DecodedJwe {
  kind: 'JWE';
  header: JsonSegment;
}

export type DecodedToken = DecodedJws | DecodedJwe;

export type DecodeResult = { ok: true; token: DecodedToken } | { ok: false; error: string };

/** Strips a leading "Bearer " prefix (case-insensitive) and surrounding whitespace. */
export function normalizeTokenInput(input: string): string {
  return input.trim().replace(/^Bearer\s+/i, '').trim();
}

function decodeJsonSegment(raw: string, label: string): JsonSegment {
  let text: string;
  try {
    text = base64UrlDecodeToString(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not base64url-decode the ${label}: ${message}.`);
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`The ${label} did not decode to valid JSON: ${message}.`);
  }

  return { raw, pretty: JSON.stringify(value, null, 2), value };
}

/** Decodes a pasted JWT/JWE string. Never throws — errors are returned in the result. */
export function decodeToken(input: string): DecodeResult {
  const normalized = normalizeTokenInput(input);
  if (normalized === '') {
    return { ok: false, error: 'No token content found — paste a JWT to decode.' };
  }

  const parts = normalized.split('.');

  if (parts.length !== 3 && parts.length !== 5) {
    return {
      ok: false,
      error: `A JWT should have 3 segments (5 for an encrypted JWE). Found ${parts.length} segment${
        parts.length === 1 ? '' : 's'
      } instead.`,
    };
  }

  if (parts.some((part) => part === '')) {
    return { ok: false, error: 'One or more token segments are empty.' };
  }

  try {
    const header = decodeJsonSegment(parts[0], 'header');

    if (parts.length === 5) {
      return { ok: true, token: { kind: 'JWE', header } };
    }

    const payload = decodeJsonSegment(parts[1], 'payload');
    return { ok: true, token: { kind: 'JWS', header, payload, signature: parts[2] } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
