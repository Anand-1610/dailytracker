import { supabase } from "./supabase.js";

/* =========================================================
   AUTH GUARD
   ========================================================= */

// Check for existing session
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  // If not logged in, kick to login page
  // We use replace() so they can't click "Back" to return to the protected page
  window.location.replace("login.html");
}

/* =========================================================
   LOGOUT FUNCTION
   ========================================================= */
window.logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Error logging out:", error);
  window.location.href = "login.html";
};