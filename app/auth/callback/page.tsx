"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      // Clean the code from the URL immediately
      window.history.replaceState({}, "", "/auth/callback");

      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          window.location.href = "/dashboard";
        } else {
          console.error("[auth/callback] Code exchange failed:", error.message);
          window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
        }
      });
    } else {
      // No code — check if session already exists (e.g. hash fragment flow)
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/login";
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
