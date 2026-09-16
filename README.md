# JWT Decoder

Decode and inspect JSON Web Tokens — header, payload, and signature — fast, free, and 100% client-side. Your token is never sent over the network; everything runs in your browser.

**Live:** https://techshield-tech.github.io/jwt-decoder/

Part of [MMOALL Developer Tools](https://mmoall.com/tools).

## Features

- Paste a JWT (tolerates a leading `Bearer ` prefix and surrounding whitespace).
- Decodes and shows the header and payload as pretty-printed JSON, and the
  signature segment raw as base64url — the signature is displayed only, never
  verified.
- Color-coded token segments (header / payload / signature), similar to
  jwt.io.
- Human-readable time blocks for any of `exp`, `iat`, `nbf` present in the
  payload: local time, UTC time, and a relative description (e.g. "expired 3h
  ago", "issued 2 minutes ago", "not valid for another 5 minutes").
- Clear inline error messages for malformed base64url segments or invalid
  JSON after decoding, instead of crashing.
- Detects a 5-part token (JWE, not JWS) and decodes only its header (the
  first segment) as JSON, with a clear note that the tool cannot decrypt or
  further decode encrypted JWEs.
- Copy header/payload/signature to clipboard.
- Responsive down to 360px viewport width.

## Privacy

**Tokens never leave your browser.** This tool is 100% client-side — no JWKS
fetching, no analytics of pasted content, no network requests derived from
your input.

## Embedding

This tool can be embedded in an iframe, e.g. on mmoall.com. In embed mode it
renders only the tool itself (no header/footer) on a transparent background.

```html
<iframe
  id="jwt-decoder"
  src="https://techshield-tech.github.io/jwt-decoder/?embed=1&theme=dark"
  style="width: 100%; border: 0;"
  title="JWT Decoder"
></iframe>

<script>
  const iframe = document.getElementById('jwt-decoder');

  // Resize the iframe to fit its content.
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data && data.type === 'mmoall-tool:height' && data.slug === 'jwt-decoder') {
      iframe.style.height = `${data.height}px`;
    }
    if (data && data.type === 'mmoall-tool:ready' && data.slug === 'jwt-decoder') {
      // The tool has mounted and is ready.
    }
  });

  // Push a theme change into the iframe (only accepted from an allowed origin).
  iframe.contentWindow.postMessage({ type: 'mmoall-tool:theme', theme: 'dark' }, '*');
</script>
```

### Contract

- `?embed=1` in the URL renders only the tool (no chrome), transparent
  background.
- `?theme=light` / `?theme=dark` sets the initial theme; otherwise it follows
  `prefers-color-scheme`.
- The page listens for `window.postMessage({type:'mmoall-tool:theme', theme})`
  from the parent frame to change theme at runtime. Only messages whose
  `event.origin` is `https://mmoall.com`, `https://www.mmoall.com`, or
  `http://localhost:3000` are accepted.
- On mount (embed mode only), the page posts
  `{type:'mmoall-tool:ready', slug:'jwt-decoder'}` to `window.parent`.
- Whenever its rendered height changes (embed mode only), the page posts
  `{type:'mmoall-tool:height', slug:'jwt-decoder', height}` to
  `window.parent`.

## Local development

```bash
bun install
bun dev
```

Build for production:

```bash
bun run build
```

Deployment to GitHub Pages happens automatically via
`.github/workflows/deploy.yml` on every push to `main`.

## License

MIT — see [LICENSE](./LICENSE).
