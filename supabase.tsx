import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = 'https://tlatqijpqeyxshdjjllr.supabase.co';
const supabaseKey = process.env.SESSION_SECRET || "";

export const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase