import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pdwuqobybxczoaojjioq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkd3Vxb2J5Ynhjem9hb2pqaW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MzkxMjIsImV4cCI6MjA2MzAxNTEyMn0.XHoU9guV-b2X4xrKAMU5mBBcezKUj1vbhS5YkpJ1YxU";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Anon Key in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);