import express from 'express';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import querystring from 'querystring';
import {sub,formatDate,format} from "date-fns"
dotenv.config();

const require = createRequire(import.meta.url);
const FitbitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;

// Supabase setup
const supabaseUrl = 'https://tlatqijpqeyxshdjjllr.supabase.co';
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYXRxaWpwcWV5eHNoZGpqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTcxNTg5NSwiZXhwIjoyMDU3MjkxODk1fQ.Oz_7gzTznXtpFIp2R6GIOfpkyJ4Kz4m-PnjVAT0NTo4";
export const supabase = createClient(supabaseUrl, supabaseKey);
// Express app setup
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use(passport.initialize());


export default async function fetchData( url,accessToken) {
  const today = new Date();
  const before = sub(today, { days: 5 });
  const endpoint = `${url}/date/${format(before, 'yyyy-MM-dd')}/${format(today, 'yyyy-MM-dd')}.json`;
  console.log("Fetch",endpoint,accessToken)
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = response.json();
  return data;
}




// Fitbit OAuth strategy
passport.use(new FitbitStrategy({
  clientID: process.env.clientId,
  clientSecret: process.env.clientSecret,
  callbackURL: 'https://backendrepo-7lce.onrender.com/auth/fitbit/callback',
  scope: ['activity', 'heartrate', 'sleep', 'profile']
},async (accessToken, refreshToken, profile, done) => {
  console.log('passport')
  return done(null, { profile, accessToken, refreshToken });
}));

// OAuth initiation route
app.get('/auth/fitbit', (req, res, next) => {
  console.log('auth')
  const email = req.query.email;
  const redirect = req.query.redirect;

  if (!email || !redirect) {
    return res.status(400).json({ error: 'Missing email or redirect' });
  }

  const state = Buffer.from(JSON.stringify({ email, redirect })).toString('base64');
  console.log("Auth state",state)
  passport.authenticate('fitbit', { state })(req, res, next);
});

// OAuth callback route
app.get('/auth/fitbit/callback',
  passport.authenticate('fitbit', { failureRedirect: '/auth/failed', session: false }),
  async (req, res) => {
    console.log('callback')
    try {
      const { profile, accessToken, refreshToken } = req.user;
      console.log("Callback state",req.query.state)
      const rawState = req.query.state;
      const { email, redirect } = JSON.parse(Buffer.from(rawState, 'base64').toString());
      console.log("JSON", JSON.parse(Buffer.from(rawState, 'base64').toString()))
      console.log("redirect",redirect)
      console.log("email",email)
      if (!email || !redirect) {
        return res.status(400).json({ error: 'Invalid state' });
      }

      // Save tokens to Supabase
      console.log("Insertion",{
        email: email,
        accessToken: accessToken,
        refreshToken: refreshToken
      })
      const jsonData =  {
        heartRate: await fetchData(`https://api.fitbit.com/1/user/-/activities/heart`, accessToken),
        sleep: await fetchData(`https://api.fitbit.com/1.2/user/-/sleep`, accessToken),
        calories: await fetchData(`https://api.fitbit.com/1/user/-/activities/calories`, accessToken),
        distance: await fetchData(`https://api.fitbit.com/1/user/-/activities/distance`, accessToken),
        steps: await fetchData(`https://api.fitbit.com/1/user/-/activities/steps`, accessToken),
        profile: profile
    };
      console.log("Data: ",jsonData)
      const {data,error} = await supabase.from('tokens').upsert({
        email: email,
        accessToken: accessToken,
        refreshToken: refreshToken,
        fitbitData: jsonData
      }).select("*");
      console.log("Insertion after supabase",data,error)

      const redirectUrl = `${redirect}?email=${encodeURIComponent(email)}&fitbitId=${profile.id}&auth=true`;
      console.log("Redirect: ",redirectUrl)
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
