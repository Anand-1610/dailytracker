import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://bppfmjmctnwirkggjvnf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcGZtam1jdG53aXJrZ2dqdm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NjEwNjYsImV4cCI6MjA4MzQzNzA2Nn0.dJbA7qVeSPPmmoVNlqay2gXdiO1SsOcwHqVCbLolnIM"
);
