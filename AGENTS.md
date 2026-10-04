<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Production

- Live at `https://dudos.daffodilweb.com` (behind Cloudflare) in **single-domain
  mode**: landing `/`, client workspace `/en/app/...`, admin panel
  `/en/app/tenant-admin` and `/en/app/<section>` for admins. There are no `app.` /
  `admin.` subdomains — `proxy.ts` guards by path and role when
  `NEXT_PUBLIC_SINGLE_DOMAIN=true`. The page picks the admin or client workbench by
  the signed-in role, so the proxy must not redirect admins away from
  `/en/app/<section>`.
- Backend: the DUDOS customer API in the AI Builder (`https://aibuilder.prochar.xyz/api/v1`,
  repo `devscope-ai-builder`, `customer_domain/`). Never hard-code
  `http://localhost:8000` — use `API_BASE` from `lib/dudos/packages.ts`
  (`NEXT_PUBLIC_API_BASE_URL`). Admin calls must send `authHeaders()`.
- Runs as a systemd service with `next start -H localhost` — **not** `-H 127.0.0.1`,
  which makes `/app` rewrites 500 behind HTTPS. `NEXT_PUBLIC_*` values are baked in
  at build time; change one ⇒ `pnpm build` and restart.
- Deploy: push to `main`, then on the server
  `git pull --ff-only && pnpm install --frozen-lockfile && pnpm build` and restart the
  service. Setup from scratch: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- Server access, service names, nginx/Cloudflare and incident fixes are in the
  **private** `devscope-ai-builder` repo (`AGENTS.md` and the `dudos-ops` skill). This
  repo is public: never commit server IPs, SSH details, tokens or `.env` files.
