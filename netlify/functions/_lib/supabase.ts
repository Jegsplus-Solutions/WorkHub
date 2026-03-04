import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Service-role client — bypasses RLS. Only use in trusted server-side functions. */
export function supabaseAdmin() {
  return createClient(URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * User-context client — respects RLS.
 * Pass the Supabase access_token from the frontend session.
 */
export function supabaseUser(jwt: string) {
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

/** Extract the user id from a JWT (without network call). Returns null on failure. */
export function getUserIdFromJwt(jwt: string): string | null {
  try {
    const [, payload] = jwt.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return (decoded.sub as string) ?? null;
  } catch {
    return null;
  }
}
