import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import pkg from 'redis';
import connectRedis from 'connect-redis';

dotenv.config();

const supabaseUrl = 'https://tlatqijpqeyxshdjjllr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
export const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

const require = createRequire(import.meta.url);
const FitbitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;

// Redis setup
const RedisStore = connectRedis(session);
const redis = pkg.createClient;
const redisClient = redis({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
await redisClient.connect();

const app = express();
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set true if using HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
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

// OAuth start
app.get('/auth/fitbit', (req, res, next) => {
  const email = req.query.email;
  const redirect = req.query.redirect;

  console.log("Email:", email, "Redirect:", redirect);

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

    if (!email || !redirect) {
      return res.redirect('/auth/failed');
    }

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

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
