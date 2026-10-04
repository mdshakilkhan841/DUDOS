# Deploying the DUDOS Frontend

This guide puts the DUDOS Next.js frontend live at **https://dudos.daffodilweb.com** on its own Ubuntu server. Follow the sections in order; each ends with a check so you know it worked before moving on.

## How it fits together

```
Browser ──HTTPS──▶ Cloudflare ──HTTPS──▶ Nginx (this server, :443)
                                           │
                                           ▼
                                   Next.js (localhost:3000)  ── systemd service "dudos"
                                           │
                     ┌─────────────────────┴──────────────────────┐
                     ▼                                            ▼
   Browser + server calls: https://aibuilder.prochar.xyz/api/v1   Build bridge: /api/v1/integrations/dudos/*
          (the DUDOS backend, already live on 165.101.23.57)       (needs the shared service token)
```

- **One domain only.** Everything is served from `dudos.daffodilweb.com`: the landing page at `/`, the client workspace at `/en/app`, the admin panel at `/en/app/tenant-admin`. There are no `app.` or `admin.` subdomains.
- **The backend is not deployed here.** It runs on the AI Builder server (`aibuilder.prochar.xyz`), which already accepts requests from `https://dudos.daffodilweb.com`. This server only runs the frontend.

## Current production layout

The live server already runs DUDOS; this guide is for setting up a new one. What
the live server uses, so commands match if you are maintaining it:

| | Live server | This guide (fresh server) |
|---|---|---|
| Folder | `~/dudos-web` | `~/dudos` |
| systemd service | `dudos-web` | `dudos` |
| Port | `localhost:3200` | `localhost:3000` |
| Nginx site | existing `dudos-site.conf` (Cloudflare real-IP + rate limit) | `dudos` |

## What you need before starting

| Item | Where to get it |
|---|---|
| SSH access to the frontend server with `sudo` | the server admin |
| Read access to `https://github.com/mdshakilkhan841/DUDOS` | Shakil or Mainuzzaman |
| **`DEVSCOPE_SERVICE_TOKEN`** (a secret, 64 hex characters) | Mainuzzaman, **sent privately** — it must equal `DUDOS_SERVICE_TOKEN` on the AI Builder server. Never commit it or paste it in a group chat. |
| Access to the Cloudflare DNS for `daffodilweb.com` | the DNS admin (needed in step 6) |

---

## 0. Check what is already on the server

`dudos.daffodilweb.com` already serves an **older** DUDOS build through Cloudflare, possibly from this server. Look before installing anything:

```bash
systemctl list-units --type=service | grep -iE "dudos|next|node"
pm2 ls 2>/dev/null
docker ps 2>/dev/null
sudo ss -tlnp | grep -E ':(80|443|3000)\b'
ls /etc/nginx/sites-enabled/ 2>/dev/null
```

- **Nothing DUDOS-related:** continue with step 1.
- **An old DUDOS is running** (a pm2 process, a container, or a service on port 3000): stop it first so the two don't fight over the port and domain — `pm2 delete <name>` / `docker stop <name>` / `sudo systemctl disable --now <service>` — and note which Nginx site file serves `dudos.daffodilweb.com`; you will replace it in step 5.

---

## 1. Install the tools

```bash
sudo apt-get update
sudo apt-get install -y git nginx certbot python3-certbot-nginx

# Node.js 22 (Next.js 16 needs 20.9 or newer)
node -v 2>/dev/null || true
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm, at the version pinned in package.json
sudo corepack enable
```

**Check:** `node -v` prints `v22.x`, and `pnpm -v` prints `10.33.0` (answer `Y` if corepack asks to download it).

---

## 2. Get the code

```bash
cd ~
git clone https://github.com/mdshakilkhan841/DUDOS.git dudos
cd dudos
git log --oneline -1
```

If the repo is private, git asks for a username and password: use your GitHub username and a **personal access token** as the password.

**Check:** `git log` shows `dd31a28` or a later commit. Older commits lack single-domain mode and will send users to `app.dudos.daffodilweb.com`, which does not exist.

---

## 3. Configure

Create `.env.production.local` in `~/dudos` (replace the token placeholder with the real value):

```bash
cat > .env.production.local <<'EOF'
NEXT_PUBLIC_SINGLE_DOMAIN=true
NEXT_PUBLIC_USE_BACKEND_API=true
NEXT_PUBLIC_API_BASE_URL=https://aibuilder.prochar.xyz/api/v1
DEVSCOPE_BASE_URL=https://aibuilder.prochar.xyz
DEVSCOPE_SERVICE_TOKEN=PASTE_THE_TOKEN_HERE
EOF
chmod 600 .env.production.local
```

| Setting | Meaning |
|---|---|
| `NEXT_PUBLIC_SINGLE_DOMAIN` | Serve landing, workspace and admin from one domain. Must be `true`. |
| `NEXT_PUBLIC_USE_BACKEND_API` | Use the real backend instead of browser-only demo storage. Must be `true`. |
| `NEXT_PUBLIC_API_BASE_URL` | The backend API, called by users' browsers and by this server. Must be the public `https://` address. |
| `DEVSCOPE_BASE_URL` | The AI Builder, for build tracking. No `/api/v1` at the end. |
| `DEVSCOPE_SERVICE_TOKEN` | Shared secret for build tracking. Wrong or missing → build status shows "not configured" / 401. |

> **`NEXT_PUBLIC_*` values are baked in when you build.** If you change one later, run `pnpm build` again and restart. `DEVSCOPE_*` values only need a restart.

**Check:** `grep -c 'PASTE_THE_TOKEN_HERE' .env.production.local` prints `0`.

---

## 4. Build and run as a service

```bash
pnpm install --frozen-lockfile
pnpm build
```

If the build stops with `Killed`, the server ran out of memory — add swap (`sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`) and build again.

Create the service. Replace `ubuntu` in **three** places if you log in as another user (`whoami` tells you):

```bash
sudo tee /etc/systemd/system/dudos.service > /dev/null <<'EOF'
[Unit]
Description=DUDOS Frontend (Next.js)
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/dudos
Environment=NODE_ENV=production
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H localhost -p 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now dudos
```

> **Keep `-H localhost`.** With `-H 127.0.0.1`, pages such as `/app` return **500** behind HTTPS (Next.js mistakes its own address for an external one). This was reproduced and confirmed.

**Check:**
```bash
systemctl status dudos --no-pager        # active (running)
sudo ss -tlnp | grep ':3000'             # 127.0.0.1:3000
curl -sI http://localhost:3000 | head -1 # HTTP/1.1 307 (redirect to /en) or 200
```

---

## 5. Nginx

```bash
sudo tee /etc/nginx/sites-available/dudos > /dev/null <<'EOF'
server {
    listen 80;
    server_name dudos.daffodilweb.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/dudos /etc/nginx/sites-enabled/dudos
sudo nginx -t && sudo systemctl reload nginx
```

- If step 0 found another site file already using `server_name dudos.daffodilweb.com`, remove that one from `sites-enabled` — two blocks for one name and Nginx picks either.
- On a server that runs nothing else, also remove the stock page: `sudo rm -f /etc/nginx/sites-enabled/default`.
- Firewall: if `sudo ufw status` says `active`, run `sudo ufw allow 'Nginx Full'`. **Never enable ufw without `sudo ufw allow OpenSSH` first** — you would lock yourself out. On a cloud provider, also open ports 80 and 443 in its security group.

**Check:** `curl -sI -H "Host: dudos.daffodilweb.com" http://127.0.0.1 | head -1` prints `HTTP/1.1 307` or `200` (not `404` or `502`).

---

## 6. DNS and HTTPS (Cloudflare)

`dudos.daffodilweb.com` is behind Cloudflare. Do these in order:

1. **Cloudflare → DNS:** set the `dudos` A record to **this server's public IP** and switch it to **DNS only** (grey cloud) for now. Wait until `dig +short dudos.daffodilweb.com` (from any machine) returns this server's IP.
2. **On the server**, issue the certificate:
   ```bash
   sudo certbot --nginx -d dudos.daffodilweb.com
   ```
   Choose to redirect HTTP to HTTPS when asked. Renewal is automatic (`sudo certbot renew --dry-run` to confirm).
3. **Cloudflare → DNS:** switch the record back to **Proxied** (orange cloud).
4. **Cloudflare → SSL/TLS → Overview:** set the mode to **Full (strict)**.

> **Do not use "Flexible".** Cloudflare would talk to the server over plain HTTP, certbot's redirect sends it back to HTTPS, and the site loops forever ("too many redirects").

**Check:** `curl -sI https://dudos.daffodilweb.com | head -1` prints `HTTP/1.1 307` or `200`.

---

## 7. Verify end to end

In a private browser window:

1. `https://dudos.daffodilweb.com` → redirects to `/en` and shows the landing page.
2. `https://dudos.daffodilweb.com/en/app` while signed out → goes to the login page **on the same domain** (if it goes to `app.dudos…`, the build is from an old commit — redo step 2).
3. Register a test client → you land on `/en/app`, the client workspace.
4. Sign out, then sign in as an admin (`admin@daffodil.family`, password = the AI Builder server's `ADMIN_PASSWORD`, ask Mainuzzaman privately) → you land on `/en/app/tenant-admin` and the user list loads.
5. Open the browser developer tools → Console: there should be no CORS errors and no requests to `localhost:8000`.

Report back to Mainuzzaman with the results of 1–5.

---

## Updating later

```bash
cd ~/dudos
git pull
pnpm install --frozen-lockfile
pnpm build
sudo systemctl restart dudos
```

Logs: `journalctl -u dudos -f` (Ctrl+C to stop following).

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `/app` or `/tenant-admin` returns **500** | The service runs with `-H 127.0.0.1`. Use `-H localhost` (step 4), `sudo systemctl daemon-reload && sudo systemctl restart dudos`. |
| **Too many redirects** | Cloudflare SSL mode is Flexible. Set **Full (strict)** (step 6). |
| `502 Bad Gateway` | The app isn't running or listens elsewhere: `systemctl status dudos`, `sudo ss -tlnp | grep 3000`. If it shows `[::1]:3000`, change Nginx to `proxy_pass http://[::1]:3000;`. |
| After login you are sent to `app.dudos.daffodilweb.com` | Old code or `NEXT_PUBLIC_SINGLE_DOMAIN` missing at build time. `git pull`, check the env file, `pnpm build`, restart. |
| Login succeeds, then you are bounced back to the login page | The server can't verify the session with the backend. From the server: `curl -s -o /dev/null -w '%{http_code}\n' https://aibuilder.prochar.xyz/api/v1/auth/me` must print `401` (not `000` or `404`). |
| Browser console shows **CORS** errors | The backend doesn't list this origin. The AI Builder's `.env` needs `CORS_ALLOWED_ORIGINS=https://dudos.daffodilweb.com` (already set — check the exact spelling, no trailing `/`). |
| Admin pages show empty lists / 401 | Not signed in as an admin, or the session expired. Sign out and back in with the admin account. |
| Build status says "not configured" or 401 | `DEVSCOPE_SERVICE_TOKEN` missing or not equal to the AI Builder's `DUDOS_SERVICE_TOKEN`. Fix the env file and `sudo systemctl restart dudos`. |
| Build stops with `Killed` | Out of memory — add swap (step 4) and rebuild. |
| `certbot` fails the challenge | The DNS record is still Proxied or not yet pointing here. Set it to DNS only, wait for `dig` to show this IP, retry. |
