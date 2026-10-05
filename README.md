# VitalTelecom Accounting — deploy guide

Zero dependencies. Needs only Node.js 18+. Real username/password login (scrypt-hashed),
separate private data per user, saved on the server, reachable from anywhere.

## Run locally
    npm start          # http://localhost:3000

## Environment variables
- PORT        (default 3000; hosts set it automatically)
- DATA_DIR    folder for data (default ./data)  ← MUST be on persistent storage
- ALLOW_SIGNUP=false   after creating your accounts, to close public sign-up

## Option A — Railway / Render / Fly.io (easiest, gives a public https link)
1. Upload this folder to a GitHub repo.
2. Create a new Web Service from the repo. Start command: `npm start`.
3. Add a persistent disk/volume (e.g. mount /data) and set DATA_DIR=/data.
   (Without a persistent disk, data is lost on every redeploy!)
4. Open the link the host gives you. Create your account on the first screen.

## Option B — Your own VPS (Ubuntu)
    sudo apt install nodejs npm
    cd vitaltelecom && DATA_DIR=/var/vt PORT=3000 node server.js
Keep it running with pm2 (`npm i -g pm2 && pm2 start server.js`) and put Nginx or Caddy
in front for HTTPS (required so cookies are secure). Back up DATA_DIR regularly.

## Notes
- Forgotten passwords can't be recovered (delete that user from data/users.json to let them re-register).
- Back up the data folder: it contains users.json, sessions.json and one u_<id>.json per user.
