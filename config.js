// Fill these in from Supabase > Project Settings > API. The anon key is meant to be public:
// the data is protected by the household password (row level security in schema.sql).
window.BASKET_CONFIG = {
  supabaseUrl: "https://tbdpyoggfjbcddpngqpt.supabase.co",
  supabaseAnonKey: "sb_publishable_96-Tvb6YZv43F2nNDfWu1w_iSeKqZVe", // "publishable" (sb_publishable_...) or legacy "anon" key
  householdEmail: "household@basket-home.app", // the shared account's email; people only type the password
};
