/**
 * Cryptographically Secure Parking Pass Token Utilities
 * 
 * - Opaque, high-entropy pass tokens (never embed sensitive PII or raw payment data)
 * - SHA-256 token hashing for server-side verification
 * - Backwards-compatible parser for legacy and demo QR passes
 */

export interface ParsedPassPayload {
  isValidFormat: boolean;
  type: 'v2_token' | 'legacy_composite' | 'legacy_raw';
  token?: string;
  tokenHash?: string;
  passCode?: string;
  locationId?: string;
  slot?: string;
  rawPayload: string;
}

/**
 * Generates an opaque, cryptographically secure 32-character high-entropy pass token.
 */
export function generatePassToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback if crypto.getRandomValues is unavailable
  return `${Date.now().toString(16)}${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
}

// No 0/O, 1/I/L: pass codes are read aloud and typed by hand at the gate
const PASS_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates a human-typeable pass code such as `IDM-7K2Q-9XMP`.
 * 8 characters from a 31-letter alphabet (~8.5e11 codes) from a cryptographic source, so
 * codes cannot be guessed and do not collide as bookings grow (unlike the old 5 digits).
 */
export function generatePassCode(): string {
  const chars: string[] = [];
  const buf = new Uint8Array(1);
  while (chars.length < 8) {
    crypto.getRandomValues(buf);
    // Rejection sampling keeps every character equally likely
    if (buf[0] < 248) chars.push(PASS_CODE_ALPHABET[buf[0] % PASS_CODE_ALPHABET.length]);
  }
  return `IDM-${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

/**
 * Computes the SHA-256 hex digest of a pass token string.
 */
export async function hashPassToken(token: string): Promise<string> {
  const clean = token.trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(clean);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Deterministic fallback hash for non-crypto environments
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * Formats a secure QR payload for a new booking.
 */
export function formatSecureQrPayload(passToken: string): string {
  return `IDAM:v2:${passToken}`;
}

/**
 * Parses any incoming scanned QR string and determines format.
 * Supports:
 * 1. Secure v2 format: IDAM:v2:<token>
 * 2. Legacy composite: IDAM_PASS:<passCode>_<locationId>
 * 3. Legacy slot: IDAM-PASS-<passCode>-<slot>
 * 4. Raw pass code: IDM-XXXXX
 */
export async function parseScannedQrPayload(raw: string): Promise<ParsedPassPayload> {
  const trimmed = (raw || '').trim();

  if (!trimmed) {
    return {
      isValidFormat: false,
      type: 'legacy_raw',
      rawPayload: raw
    };
  }

  // 1. Secure v2 Token format: IDAM:v2:<token>
  if (trimmed.startsWith('IDAM:v2:')) {
    const token = trimmed.replace('IDAM:v2:', '').trim();
    if (token.length >= 8) {
      const tokenHash = await hashPassToken(token);
      return {
        isValidFormat: true,
        type: 'v2_token',
        token,
        tokenHash,
        rawPayload: trimmed
      };
    }
  }

  // 2. Legacy Composite: IDAM_PASS:<passCode>_<locationId>
  if (trimmed.startsWith('IDAM_PASS:')) {
    const body = trimmed.replace('IDAM_PASS:', '');
    const [passCode, locationId] = body.split('_');
    return {
      isValidFormat: true,
      type: 'legacy_composite',
      passCode: passCode?.trim(),
      locationId: locationId?.trim(),
      rawPayload: trimmed
    };
  }

  // 3. Legacy Slot: IDAM-PASS-<passCode>-<slot>
  if (trimmed.startsWith('IDAM-PASS-')) {
    const parts = trimmed.split('-');
    // e.g. ['IDAM', 'PASS', '82931', 'SPOT', 'A02']
    const passCode = parts.length >= 3 ? `IDM-${parts[2]}` : trimmed;
    return {
      isValidFormat: true,
      type: 'legacy_composite',
      passCode,
      rawPayload: trimmed
    };
  }

  // 4. Raw Pass Code: IDM-XXXXX or alphanumeric reference
  // Current codes (IDM-7K2Q-9XMP) and older all-digit codes (IDM-82931)
  if (/^IDM(-[A-Z0-9]+)+$/i.test(trimmed)) {
    return {
      isValidFormat: true,
      type: 'legacy_raw',
      passCode: trimmed.toUpperCase(),
      rawPayload: trimmed
    };
  }

  // 5. JSON string legacy fallback (e.g. from service.ts qrData)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const code = parsed.passCode || parsed.passId;
      if (code) {
        return {
          isValidFormat: true,
          type: 'legacy_composite',
          passCode: String(code).trim().toUpperCase(),
          locationId: parsed.locationId || parsed.location,
          rawPayload: trimmed
        };
      }
    } catch {
      // not JSON
    }
  }

  return {
    isValidFormat: false,
    type: 'legacy_raw',
    rawPayload: trimmed
  };
}
