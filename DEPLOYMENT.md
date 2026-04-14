# Deployment Guide

Dieses Projekt wird am einfachsten als zwei Deployments betrieben:

- `client/` als Next.js Frontend
- `server/` als Express + Socket.IO Backend

## 1. Frontend deployen

Empfohlen: Vercel

Build command:

```bash
npm run build
```

Start command:

```bash
npm run start
```

Umgebungsvariable im Frontend setzen:

```env
NEXT_PUBLIC_SERVER_URL=https://dein-backend.example.com
```

## 2. Backend deployen

Empfohlen: Render, Railway oder Fly.io

Start command:

```bash
npm run start
```

Umgebungsvariablen im Backend setzen:

```env
PORT=4000
CLIENT_URLS=https://dein-frontend.example.com
```

Falls du mehrere Frontend-URLs erlauben willst, trenne sie mit Komma:

```env
CLIENT_URLS=https://dein-frontend.example.com,https://www.dein-frontend.example.com
```

## 3. Lokale Entwicklung

Frontend `client/.env`:

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

Backend `server/.env`:

```env
PORT=4000
CLIENT_URLS=http://localhost:3000
```

## 4. Health Check

Der Backend-Health-Check liegt unter:

```txt
GET /health
```

Beispiel:

```txt
https://dein-backend.example.com/health
```
