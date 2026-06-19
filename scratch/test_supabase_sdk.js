const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://qpwynaxfsyybpfznuivg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ZluXlj-471bzYqiRA0Mzig_gVtEuHwm";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectData() {
  console.log("=== REGULAR USERS ===");
  const { data: regUsers, error: regUsersErr } = await supabase.from('regular_users').select('*');
  if (regUsersErr) console.error("Error:", regUsersErr);
  else console.log(regUsers);

  console.log("=== PREMIUM USERS ===");
  const { data: premUsers, error: premUsersErr } = await supabase.from('premium_users').select('*');
  if (premUsersErr) console.error("Error:", premUsersErr);
  else console.log(premUsers);

  console.log("=== USER FAVORITES ===");
  const { data: favs, error: favsErr } = await supabase.from('user_favorites').select('*');
  if (favsErr) console.error("Error:", favsErr);
  else console.log(favs);
}

inspectData();
