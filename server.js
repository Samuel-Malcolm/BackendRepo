import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import FileStoreFactory from 'session-file-store';

dotenv.config();

const FileStore = FileStoreFactory(session);
const require = createRequire(import.meta.url);
const FitbitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;

// Setup Supabase
const supabaseUrl = 'https://tlatqijpqeyxshdjjllr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Create Express app
const app = express();
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Setup File-based Session Store
app.use(session({
  store: new FileStore({}),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Fitbit OAuth strategy
passport.use(new FitbitStrategy({
  clientID: process.env.clientId,
  clientSecret: process.env.clientSecret,
  callbackURL: 'https://backendrepo-7lce.onrender.com/auth/fitbit/callback',
  scope: ['activity', 'heartrate', 'sleep', 'profile']
}, (accessToken, refreshToken, profile, done) => {
  return done(null, { profile, accessToken, refreshToken });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Auth initiation
app.get('/auth/fitbit', (req, res, next) => {
  const email = req.query.email;
  const redirect = req.query.redirect;
  req.session.email = email || "";
  req.session.redirect = redirect || "";
  next();
}, passport.authenticate('fitbit'));

// OAuth callback
app.get('/auth/fitbit/callback',
  passport.authenticate('fitbit', { failureRedirect: '/auth/failed' }),
  async (req, res) => {
    const { profile, accessToken, refreshToken } = req.user;
    const { email, redirect } = req.session;

    // Store token in Supabase
    await supabase.from('tokens').upsert({
      email,
      accessToken,
      refreshToken
    });

    const redirectUrl = `${redirect}?email=${encodeURIComponent(email)}&fitbitId=${profile.id}`;
    res.redirect(redirectUrl);
  }
);

// Auth failure
app.get('/auth/failed', (req, res) => {
  res.status(401).json({ error: 'Authentication failed' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
