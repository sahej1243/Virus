"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/version";

type AuthState = "loading" | "ready" | "invalid" | "success";

export default function StudentResetPasswordPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function establishSession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) {
            setError("This password reset link is invalid or has expired. Please request a new one.");
            setAuthState("invalid");
          }
          return;
        }
      } else {
        const hash = new URLSearchParams(url.hash.slice(1));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            if (active) {
              setError("This password reset link is invalid or has expired. Please request a new one.");
              setAuthState("invalid");
            }
            return;
          }
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError || !data.session) {
        setError("This password reset link is invalid or has expired. Please request a new one.");
        setAuthState("invalid");
        return;
      }

      // Clean address bar query and hash
      window.history.replaceState(null, "", window.location.pathname);
      setAuthState("ready");
    }

    establishSession().catch(() => {
      if (active) {
        setError("We couldn't verify this password reset link. Please try requesting a new one.");
        setAuthState("invalid");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "We couldn't update your password. Please try again.");
        setSaving(false);
        return;
      }
      setAuthState("success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="student-page student-account-page">
      <header className="student-header">
        <Link href="/" className="student-brand">
          <span className="student-brand-mark"><span /></span>printify<span className="student-brand-dot">.</span>
        </Link>
        <Link className="student-shop-link" href="/student/login">Back to sign in</Link>
      </header>

      <section className="student-account-card">
        <span className="student-eyebrow">PASSWORD RESET</span>
        <h1>{authState === "success" ? "Password updated." : "Set a new password."}</h1>

        {authState === "loading" && <p>Verifying your reset link…</p>}

        {authState === "invalid" && (
          <>
            <p className="student-account-error" role="alert">{error}</p>
            <div style={{ marginTop: "18px" }}>
              <Link className="student-guest-signin" href="/student/login">
                Request a new link <span>→</span>
              </Link>
            </div>
          </>
        )}

        {authState === "ready" && (
          <>
            <p>Choose a secure password for your student account (minimum 8 characters).</p>
            <form className="student-account-form" onSubmit={handleReset}>
              <label htmlFor="student-reset-password">New password</label>
              <input
                id="student-reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={256}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />

              <label htmlFor="student-reset-confirm">Confirm new password</label>
              <input
                id="student-reset-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                maxLength={256}
                autoComplete="new-password"
                placeholder="Repeat your new password"
              />

              {error && <p className="student-account-error" role="alert">{error}</p>}

              <button type="submit" disabled={saving}>
                {saving ? "Saving new password…" : "Save new password"}
                <span>→</span>
              </button>
            </form>
          </>
        )}

        {authState === "success" && (
          <>
            <p className="student-account-success" role="status">
              Your password has been set successfully! You can now access your student account.
            </p>
            <div style={{ marginTop: "20px" }}>
              <Link className="student-guest-signin" href="/student/account">
                Continue to your account <span>→</span>
              </Link>
            </div>
          </>
        )}

        <p className="student-account-footnote">
          Your account remains accessible via magic link anytime even after setting a password.
        </p>
      </section>

      <footer className="student-footer">
        <span>© 2026 Printify · v{APP_VERSION}</span>
        <span>Student account · security</span>
        <span>
          Need help? <a href="https://wa.me/919268729970" target="_blank" rel="noopener noreferrer">Get in touch</a>
        </span>
      </footer>
    </main>
  );
}
