// Project 2 — Google as an IDENTITY provider (OpenID Connect)
// Google tells our app WHO the user is. Our app never sees a password.
import express from 'express';
import session from 'express-session';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OAuth2Client } from 'google-auth-library';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET, PORT = 3000 } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SESSION_SECRET) {
  console.error('Missing env vars. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const REDIRECT_URI = `http://localhost:${PORT}/auth/google/callback`;
const google = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const view = (name) => path.join(__dirname, 'views', `${name}.html`);

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }, // add secure: true behind HTTPS
}));

const fail = (res, reason) => res.redirect(`/error?reason=${encodeURIComponent(reason)}`);

// Middleware: only logged-in users may pass
function requireLogin(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/');
}

// ---------- pages ----------
app.get('/', (req, res) => (req.session.user ? res.redirect('/dashboard') : res.sendFile(view('index'))));
app.get('/dashboard', requireLogin, (req, res) => res.sendFile(view('dashboard')));
app.get('/error', (req, res) => res.sendFile(view('error')));

// ---------- OpenID Connect flow ----------
// Step 1: send the browser to Google
app.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex'); // anti-CSRF value
  req.session.state = state;
  const url = google.generateAuthUrl({
    scope: ['openid', 'email', 'profile'], // identity only, no API access
    state,
    prompt: 'select_account',
  });
  res.redirect(url);
});

// Step 2: Google sends the browser back here with ?code=...&state=...
app.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return fail(res, `Google returned: ${error}`);
  if (!state || state !== req.session.state) return fail(res, 'Invalid state. Please try signing in again.');
  delete req.session.state;

  try {
    // Step 3: exchange the one-time code for tokens (server to server)
    const { tokens } = await google.getToken(code);

    // Step 4: verify the ID token (signature, issuer, audience, expiry)
    const ticket = await google.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
    const claims = ticket.getPayload();

    // Step 5: create OUR app session
    req.session.user = { id: claims.sub, name: claims.name, email: claims.email, picture: claims.picture };
    req.session.claims = claims;
    res.redirect('/dashboard');
  } catch (err) {
    const reason = err.response?.data?.error_description || err.response?.data?.error || err.message;
    console.error('Login failed:', reason);
    fail(res, reason);
  }
});

// ---------- JSON API used by the pages ----------
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'not_logged_in' });
  res.json({ user: req.session.user, claims: req.session.claims });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.listen(PORT, () => console.log(`Identity demo running on http://localhost:${PORT}`));
