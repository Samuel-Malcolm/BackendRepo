import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tlatqijpqeyxshdjjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYXRxaWpwcWV5eHNoZGpqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTcxNTg5NSwiZXhwIjoyMDU3MjkxODk1fQ.Oz_7gzTznXtpFIp2R6GIOfpkyJ4Kz4m-PnjVAT0NTo4';

export const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase