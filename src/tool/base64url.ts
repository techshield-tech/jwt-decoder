// Pure, framework-free base64url helpers (RFC 4648 §5). Tool-specific.

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Decodes a base64url-encoded segment into raw bytes. Throws on malformed input. */
export function base64UrlDecodeToBytes(segment: string): Uint8Array {
  // The compact JWT serialization omits padding; tolerate it anyway in case
  // it's present, then validate what remains against the base64url alphabet.
  const withoutPadding = segment.replace(/=+$/, '');

  if (withoutPadding === '') {
    throw new Error('segment is empty');
  }
  if (!BASE64URL_PATTERN.test(withoutPadding)) {
    throw new Error('segment contains characters outside the base64url alphabet');
  }

  const base64 = withoutPadding.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error('segment is not valid base64url');
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Decodes a base64url-encoded segment into a UTF-8 string. Throws on malformed input. */
export function base64UrlDecodeToString(segment: string): string {
  const bytes = base64UrlDecodeToBytes(segment);
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}
