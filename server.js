import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import {Redis} from 'redis';
import {connectRedis} from 'connect-redis';

dotenv.config();

const supabaseUrl = 'https://tlatqijpqeyxshdjjllr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

const require = createRequire(import.meta.url);
const FitbitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;

const app = express();

// Configure Redis client and store
const RedisStore = connectRedis(session);
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379' // Use Redis URL from environment or local
});

redisClient.connect(); // Connect to Redis

// Middleware
app.use(cors());
app.use(express.json());

// Session setup with Redis as the store
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Ensure HTTPS in production
    maxAge: 24 * 60 * 60 * 1000 // 1 day session expiration
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Setup Fitbit OAuth2 strategy
passport.use(new FitbitStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
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

  console.log("Email:", email, "Redirect:", redirect); // Debugging info

  req.session.email = email || ""; // Store email in session
  req.session.redirect = redirect || ""; // Store redirect URL in session

  next(); // Proceed to passport.authenticate
}, passport.authenticate('fitbit'));

// OAuth callback route
app.get('/auth/fitbit/callback',
  passport.authenticate('fitbit', { failureRedirect: '/auth/failed' }),
  async (req, res) => {
    const { profile, accessToken, refreshToken } = req.user;
    const { email, redirect } = req.session;

    console.log("Session Email:", email);  // Log session email for debugging
    console.log("Redirect URL:", redirect);  // Log redirect URL for debugging

    if (!email || !redirect) {
      return res.status(400).json({ error: 'Missing email or redirect in session.' });
    }

    // Save tokens to Supabase (using upsert to insert or update)
    await supabase.from('tokens').upsert({
      email,
      accessToken,
      refreshToken
    });

    // Redirect back to frontend with email and fitbitId
    const redirectUrl = `${redirect}?email=${encodeURIComponent(email)}&fitbitId=${profile.id}`;
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
