# Render Deployment

Dieses Projekt ist jetzt auf Render als Blueprint vorbereitet.

## Dateien

- Root Blueprint: [render.yaml](./render.yaml)
- Frontend Env-Beispiel: [client/.env.example](./client/.env.example)
- Backend Env-Beispiel: [server/.env.example](./server/.env.example)

## Zielstruktur auf Render

- `pong-backend` = Express + Socket.IO
- `pong-frontend` = Next.js

## Deployment auf Render

1. Repository bei GitHub pushen
2. In Render: `New +` -> `Blueprint`
3. Repository verbinden
4. Render liest automatisch die `render.yaml`

## Wichtige Variable

Beim Frontend wird diese Variable abgefragt:

```env
NEXT_PUBLIC_SERVER_URL=https://dein-backend-service.onrender.com
```

Trage dort die öffentliche URL des Backend-Services ein.

Beispiel:

```env
NEXT_PUBLIC_SERVER_URL=https://pong-backend.onrender.com
```

## Warum das Backend `CLIENT_URLS=*` nutzt

Für Render ist das hier die einfachste Variante, damit Frontend und Backend sofort miteinander sprechen können, ohne dass du bei jedem Preview- oder Service-URL-Wechsel CORS nachziehen musst.

Falls du es später strenger machen willst, kannst du stattdessen z. B. setzen:

```env
CLIENT_URLS=https://pong-frontend.onrender.com
```

oder mehrere Domains:

```env
CLIENT_URLS=https://pong-frontend.onrender.com,https://www.deine-domain.de
```

## Health Check

Backend:

```txt
/health
```

## Lokale Entwicklung

Frontend `client/.env`:

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

Backend `server/.env`:

```env
PORT=4000
CLIENT_URLS=http://localhost:3000
```
