# Quickstart: User Login (Mobile)

**Feature**: `001-user-login` | **Date**: 2026-10-31

Commands for you to run. Nothing here has been executed yet.

## Prerequisites

- Node.js 22 LTS and npm
- Expo Go on an Android phone **or** an Android emulator
- Phone and development machine on the same Wi-Fi network
- A PostgreSQL database for development (Supabase project or local Docker)

## 1. Point the app at your machine, not localhost

```powershell
ipconfig | Select-String "IPv4"
```

Use that address (for example `192.168.1.24`) in `apps/mobile/.env`:

```text
EXPO_PUBLIC_API_URL=http://192.168.1.24:4000/api/v1
```

`apps/api/.env`:

```text
DATABASE_URL=postgresql://...
PORT=4000
SESSION_TTL_HOURS=8
NODE_ENV=development
```

Allow port 4000 through Windows Firewall for private networks, or the phone will time
out while `curl` on the machine works.

## 2. Install, migrate, seed

```powershell
cd C:\Dev\School\oak-sports-academy
npm install
npx prisma migrate dev --schema apps/api/prisma/schema.prisma --name init_auth
npm run seed -w apps/api
```

Expected: the seed prints the created customer accounts (verified, unverified, suspended)
and no password hashes.

## 3. Start the API and the app

```powershell
npm run dev -w apps/api      # http://0.0.0.0:4000
npm run dev -w apps/mobile   # Expo dev server, scan the QR code
```

## 4. Verify the API directly

```powershell
curl.exe -i -X POST http://localhost:4000/api/v1/auth/login `
  -H "content-type: application/json" `
  -H "X-Client-Platform: mobile" `
  -d '{"email":"customer@example.com","password":"<seeded password>"}'
```

Expected: `200` with `sessionToken`, `expiresAt`, `landingPath: "/"` and **no**
`Set-Cookie` header.

```powershell
# Without the client header → 400 UNSUPPORTED_CLIENT
curl.exe -i -X POST http://localhost:4000/api/v1/auth/login -H "content-type: application/json" -d '{"email":"customer@example.com","password":"<seeded password>"}'

# Wrong password vs unknown email → identical 401 body
curl.exe -i -X POST http://localhost:4000/api/v1/auth/login -H "content-type: application/json" -H "X-Client-Platform: mobile" -d '{"email":"customer@example.com","password":"wrong"}'
curl.exe -i -X POST http://localhost:4000/api/v1/auth/login -H "content-type: application/json" -H "X-Client-Platform: mobile" -d '{"email":"nobody@example.com","password":"wrong"}'

# Authenticated call → 200; after logout → 401
curl.exe -i http://localhost:4000/api/v1/auth/session -H "authorization: Bearer <token>"
curl.exe -i -X POST http://localhost:4000/api/v1/auth/logout -H "authorization: Bearer <token>"
```

## 5. Verify on the device

| Check | Expected |
| --- | --- |
| Correct credentials | Home screen, no login prompt on reopen |
| Force-close and reopen | Home screen, session restored |
| Wrong password | "Email or password is incorrect", form still usable |
| Unverified seed account | "Verify your email" message, no session |
| Suspended seed account | Neutral "cannot sign in" message |
| 6 attempts in 15 min | Retry message with a wait time |
| Airplane mode, then submit | Offline message, button re-enabled |
| Sign out | Login screen; copied token rejected by the API |
| Rotate / small screen | Keyboard does not cover the submit button; usable at 360 dp |

## 6. Run the test suite

```powershell
npm test -w apps/api     # Vitest + Supertest against the test database
```

## What "done" looks like

- Every acceptance scenario in `spec.md` passes on a real device or emulator.
- Auth tests pass, including rate limiting, enumeration parity, and revocation.
- No password hash, token, or internal error appears in responses, logs, or the app UI.
