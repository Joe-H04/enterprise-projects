# Project 2: Google as an Identity Provider (Node.js + Express)

"Sign in with Google" for an imaginary enterprise app, the **Acme Portal**. The app stores **no passwords**.
Google authenticates the user and returns a signed **ID token** (OpenID Connect).

## Flow (see `server.js`)

| Route | What happens |
|-------|--------------|
| `GET /login` | Redirects to Google with `scope=openid email profile` and a random `state` |
| `GET /auth/google/callback` | Checks `state`, exchanges the `code` for tokens, **verifies the ID token**, creates a session |
| `GET /dashboard` | Protected page (via the `requireLogin` middleware). Shows the user and the verified claims |
| `GET /logout` | Destroys the session |

## Run

Do the Google Cloud setup in the [root README](../README.md) first, then:

```bash
cp .env.example .env   # add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
npm install
npm start              # http://localhost:3000
```

## Files

```
server.js            Express server: OpenID Connect flow + JSON API (/api/me)
views/index.html     Sign-in page
views/dashboard.html Protected page: profile, flow recap, verified ID-token claims
views/error.html     Shows the reason a sign-in failed
public/style.css     Shared styles
```
