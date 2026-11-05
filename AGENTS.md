<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- `npm ci` is the install. Node 22 is already on the image. The local preview needs no API keys. Accounts and company books are written under gitignored `data/`.
- `npm run dev` listens on `0.0.0.0:43123`. `npm test` is the domain suite. `npm run build` is the typecheck that passes. `npx tsc --noEmit` before Next generates `.next/types` fails on `LayoutProps` in `app/layout.tsx`.
- `npm run lint` exits with existing React hook errors in the app. That result is the repository today, not a missing toolchain.
