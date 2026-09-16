// Pure, framework-free helpers for turning JWT `iat`/`nbf`/`exp` claims
// (NumericDate — seconds since the Unix epoch, RFC 7519 §2) into
// human-readable time info. Tool-specific.

export type TimeClaimName = 'iat' | 'nbf' | 'exp';

export interface ClaimTimeInfo {
  claim: TimeClaimName;
  label: string;
  epochSeconds: number;
  /** Formatted in the viewer's local timezone. */
  local: string;
  /** Formatted as UTC. */
  utc: string;
  /** Human-readable relative description, e.g. "expired 3 hours ago". */
  relative: string;
}

export interface InvalidClaimTime {
  claim: TimeClaimName;
  value: unknown;
}

export interface ClaimTimeExtraction {
  times: ClaimTimeInfo[];
  invalid: InvalidClaimTime[];
}

const CLAIM_ORDER: TimeClaimName[] = ['iat', 'nbf', 'exp'];

const CLAIM_LABELS: Record<TimeClaimName, string> = {
  iat: 'Issued at (iat)',
  nbf: 'Not valid before (nbf)',
  exp: 'Expires at (exp)',
};

const DURATION_UNITS: { name: string; seconds: number }[] = [
  { name: 'year', seconds: 365 * 24 * 3600 },
  { name: 'month', seconds: 30 * 24 * 3600 },
  { name: 'day', seconds: 24 * 3600 },
  { name: 'hour', seconds: 3600 },
  { name: 'minute', seconds: 60 },
  { name: 'second', seconds: 1 },
];

function formatDuration(totalSeconds: number): string {
  const abs = Math.max(0, Math.round(totalSeconds));
  for (const unit of DURATION_UNITS) {
    const value = Math.floor(abs / unit.seconds);
    if (value >= 1) {
      return `${value} ${unit.name}${value === 1 ? '' : 's'}`;
    }
  }
  return 'less than a second';
}

function relativeDescription(claim: TimeClaimName, diffSeconds: number): string {
  const duration = formatDuration(Math.abs(diffSeconds));
  const isPast = diffSeconds <= 0;
  if (claim === 'exp') {
    return isPast ? `expired ${duration} ago` : `expires in ${duration}`;
  }
  if (claim === 'iat') {
    return isPast ? `issued ${duration} ago` : `issued ${duration} in the future`;
  }
  // nbf
  return isPast ? `valid since ${duration} ago` : `not valid for another ${duration}`;
}

/** Builds local/UTC/relative time info for a single NumericDate claim value. */
export function describeClaimTime(
  claim: TimeClaimName,
  epochSeconds: number,
  now: Date = new Date(),
): ClaimTimeInfo {
  const date = new Date(epochSeconds * 1000);
  const diffSeconds = (date.getTime() - now.getTime()) / 1000;
  return {
    claim,
    label: CLAIM_LABELS[claim],
    epochSeconds,
    local: date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'long' }),
    utc: date.toUTCString(),
    relative: relativeDescription(claim, diffSeconds),
  };
}

/**
 * Reads `iat`/`nbf`/`exp` off a decoded JWT payload (when it's a plain
 * object) and returns time info for the numeric ones, plus a list of claims
 * that were present but not a valid NumericDate.
 */
export function extractClaimTimes(payload: unknown, now: Date = new Date()): ClaimTimeExtraction {
  const times: ClaimTimeInfo[] = [];
  const invalid: InvalidClaimTime[] = [];

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { times, invalid };
  }

  const record = payload as Record<string, unknown>;
  for (const claim of CLAIM_ORDER) {
    if (!(claim in record)) continue;
    const value = record[claim];
    if (typeof value === 'number' && Number.isFinite(value)) {
      times.push(describeClaimTime(claim, value, now));
    } else {
      invalid.push({ claim, value });
    }
  }

  return { times, invalid };
}
