import express from 'express';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import querystring from 'querystring';

dotenv.config();

const require = createRequire(import.meta.url);
const FitbitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;

// Supabase setup
const supabaseUrl = 'https://tlatqijpqeyxshdjjllr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Express app setup
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use(passport.initialize());

// Fitbit OAuth strategy
passport.use(new FitbitStrategy({
  clientID: process.env.clientId,
  clientSecret: process.env.clientSecret,
  callbackURL: 'https://backendrepo-7lce.onrender.com/auth/fitbit/callback',
  scope: ['activity', 'heartrate', 'sleep', 'profile']
}, (accessToken, refreshToken, profile, done) => {
  return done(null, { profile, accessToken, refreshToken });
}));

// OAuth initiation route
app.get('/auth/fitbit', (req, res, next) => {
  const email = req.query.email;
  const redirect = req.query.redirect;

  if (!email || !redirect) {
    return res.status(400).json({ error: 'Missing email or redirect' });
  }

  const state = Buffer.from(JSON.stringify({ email, redirect })).toString('base64');
  console.log(state)
  passport.authenticate('fitbit', { state })(req, res, next);
});

// OAuth callback route
app.get('/auth/fitbit/callback',
  passport.authenticate('fitbit', { failureRedirect: '/auth/failed', session: false }),
  async (req, res) => {
    try {
      const { profile, accessToken, refreshToken } = req.user;
      console.log(req.query.state)
      const rawState = req.query.state;
      const { email, redirect } = JSON.parse(Buffer.from(rawState, 'base64').toString());

      if (!email || !redirect) {
        return res.status(400).json({ error: 'Invalid state' });
      }

      // Save tokens to Supabase
      await supabase.from('tokens').upsert({
        email,
        accessToken,
        refreshToken
      });

      const redirectUrl = `${redirect}?email=${encodeURIComponent(email)}&fitbitId=${profile.id}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Callback error:", error);
      res.redirect('/auth/failed');
    }
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
