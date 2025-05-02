import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = 'https://tlatqijpqeyxshdjjllr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

const require = createRequire(import.meta.url);
const FitbitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;

const app = express();
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Setup Fitbit strategy once
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

// OAuth initiation route
app.get('/auth/fitbit', (req, res, next) => {
  const email = req.query.email;
  const redirect = req.query.redirect;

  console.log("Email:", email, "Redirect:", redirect);

  req.session.email = email || "";
  req.session.redirect = redirect || "";
  console.log(req.session)
  next(); // Proceed to passport authentication
}, passport.authenticate('fitbit'));

// OAuth callback route
app.get('/auth/fitbit/callback',
  passport.authenticate('fitbit', { failureRedirect: '/auth/failed' }),
  async (req, res) => {
    console.log(req.session)

    const { profile, accessToken, refreshToken } = req.user;
    const { email, redirect } = req.session;

    // Save tokens to Supabase
    await supabase.from('tokens').upsert({
      email,
      accessToken,
      refreshToken
    });
    // Redirect back to frontend with email and fitbitId
    const redirectUrl = `${redirect}?email=${encodeURIComponent(email)}`;
    console.log(redirect)
    res.redirect(redirectUrl);
  }
);

// Auth failure route
app.get('/auth/failed', (req, res) => {
  res.status(401).json({ error: 'Authentication failed' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
