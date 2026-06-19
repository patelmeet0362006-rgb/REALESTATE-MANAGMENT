const SUPABASE_URL = "https://qpwynaxfsyybpfznuivg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ZluXlj-471bzYqiRA0Mzig_gVtEuHwm";

if (!window.supabase) {
  console.error("Supabase SDK was not loaded before backend/supabase.js");
} else {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}
