import { useCallback, useState, type ReactNode } from 'react';
import { Button, CopyButton, ErrorBox, Panel, TextArea, Toolbar } from '../shell/ui';
import { decodeToken, normalizeTokenInput, type JsonSegment } from './jwt-decode';
import { extractClaimTimes, type ClaimTimeInfo, type InvalidClaimTime } from './claim-time';

// Segment colors, jwt.io-style: header / payload / signature (or, for a JWE,
// just the header — the rest is opaque ciphertext). Kept as plain hex so
// they read reasonably on both light and dark backgrounds.
const HEADER_COLOR = '#ec4899'; // pink
const PAYLOAD_COLOR = '#8b5cf6'; // violet
const SIGNATURE_COLOR = '#06b6d4'; // cyan
const OTHER_COLOR = 'var(--color-muted)';

const EMPTY_EXTRACTION = { times: [] as ClaimTimeInfo[], invalid: [] as InvalidClaimTime[] };

function colorForPart(index: number, total: number): string {
  if (total === 3) {
    if (index === 0) return HEADER_COLOR;
    if (index === 1) return PAYLOAD_COLOR;
    return SIGNATURE_COLOR;
  }
  if (total === 5) {
    return index === 0 ? HEADER_COLOR : OTHER_COLOR;
  }
  return OTHER_COLOR;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

function ColorizedToken({ value }: { value: string }) {
  const parts = value.split('.');
  return (
    <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] p-3 font-mono text-xs leading-relaxed break-all">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && <span className="text-[var(--color-muted)]">.</span>}
          <span style={{ color: colorForPart(index, parts.length) }}>{part}</span>
        </span>
      ))}
    </div>
  );
}

function ClaimTimeCard({ info }: { info: ClaimTimeInfo }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm">
      <div className="font-medium text-[var(--color-fg)]">{info.label}</div>
      <div className="mt-1 text-[var(--color-fg)]">{capitalize(info.relative)}</div>
      <div className="mt-1 text-xs text-[var(--color-muted)]">Local: {info.local}</div>
      <div className="text-xs text-[var(--color-muted)]">UTC: {info.utc}</div>
    </div>
  );
}

function ClaimTimes({
  times,
  invalid,
}: {
  times: ClaimTimeInfo[];
  invalid: InvalidClaimTime[];
}) {
  if (times.length === 0 && invalid.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-2">
      {times.map((info) => (
        <ClaimTimeCard key={info.claim} info={info} />
      ))}
      {invalid.map(({ claim, value }) => (
        <div key={claim} className="text-xs text-[var(--color-danger)]">
          Claim "{claim}" is present but is not a valid NumericDate (got {JSON.stringify(value)}).
        </div>
      ))}
    </div>
  );
}

function JsonSegmentPanel({
  title,
  segment,
  color,
  children,
}: {
  title: string;
  segment: JsonSegment;
  color: string;
  children?: ReactNode;
}) {
  return (
    <Panel title={title} actions={<CopyButton getText={() => segment.pretty} />}>
      <div style={{ borderLeftColor: color }} className="-ml-3 border-l-4 pl-[11px]">
        <TextArea
          aria-label={`Decoded ${title.toLowerCase()}`}
          value={segment.pretty}
          readOnly
          className="min-h-[140px]"
        />
      </div>
      {children}
    </Panel>
  );
}

export function Tool() {
  const [input, setInput] = useState('');

  const normalized = normalizeTokenInput(input);
  const result = decodeToken(input);
  const decoded = result.ok ? result.token : null;
  const error = result.ok ? null : result.error;

  const claimExtraction =
    decoded !== null && decoded.kind === 'JWS' ? extractClaimTimes(decoded.payload.value) : EMPTY_EXTRACTION;

  const handleClear = useCallback(() => setInput(''), []);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-xs text-[var(--color-muted)]">
        🔒 Tokens never leave your browser — decoding happens entirely on your device, with no
        network requests.
      </div>

      <Toolbar>
        <Button variant="ghost" onClick={handleClear}>
          Clear
        </Button>
      </Toolbar>

      <Panel title="Token">
        <TextArea
          aria-label="JWT input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste a JWT here… (a leading “Bearer ” prefix is fine)"
          className="min-h-[120px]"
        />
        {normalized !== '' && (
          <div className="mt-3">
            <ColorizedToken value={normalized} />
          </div>
        )}
      </Panel>

      {error !== null && input.trim() !== '' && <ErrorBox>{error}</ErrorBox>}

      {decoded !== null && decoded.kind === 'JWE' && (
        <>
          <ErrorBox>
            This is an encrypted JWE token (5 segments), not a signed JWS. Only the header can be
            decoded — the encrypted key, IV, ciphertext, and authentication tag require the
            decryption key and cannot be decoded or decrypted by this tool.
          </ErrorBox>
          <JsonSegmentPanel title="JWE Header" segment={decoded.header} color={HEADER_COLOR} />
        </>
      )}

      {decoded !== null && decoded.kind === 'JWS' && (
        <>
          <JsonSegmentPanel title="Header" segment={decoded.header} color={HEADER_COLOR} />

          <JsonSegmentPanel title="Payload" segment={decoded.payload} color={PAYLOAD_COLOR}>
            <ClaimTimes times={claimExtraction.times} invalid={claimExtraction.invalid} />
          </JsonSegmentPanel>

          <Panel title="Signature" actions={<CopyButton getText={() => decoded.signature} />}>
            <div style={{ borderLeftColor: SIGNATURE_COLOR }} className="-ml-3 border-l-4 pl-[11px]">
              <TextArea
                aria-label="Signature (base64url, not verified)"
                value={decoded.signature}
                readOnly
                className="min-h-[72px]"
              />
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Shown as raw base64url — this tool decodes only, it does not verify signatures.
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}
