"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StudentLogin({
  linkError = false,
  next,
}: {
  linkError?: boolean;
  next?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"magic" | "password">("magic");
  const [view, setView] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/student/account";

  async function submitMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSending(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/student-callback?next=${encodeURIComponent(destination)}`,
          data: { full_name: name.trim() },
        },
      });
      if (authError) throw authError;
      setMessage("Check your email for a secure sign-in link. Open it on this device to see your account.");
    } catch {
      setError("We couldn’t send the sign-in link. Check the email and try again.");
    } finally {
      setSending(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSending(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes("invalid login credentials")) {
          setError("Invalid email or password. If you haven't set a password yet, sign in with Magic Link or use Forgot Password.");
        } else if (authError.message?.toLowerCase().includes("email not confirmed")) {
          setError("Please confirm your email address before signing in with a password.");
        } else {
          setError(authError.message || "Could not sign in with those credentials. Please check and try again.");
        }
        return;
      }

      router.replace(destination);
      router.refresh();
    } catch {
      setError("Something went wrong while signing in. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function submitForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSending(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/student-callback?next=%2Fstudent%2Freset-password`,
      });
      if (resetError) {
        setError(resetError.message || "We couldn't send the reset email. Check the email and try again.");
      } else {
        setMessage(`We've sent a password reset link to ${email.trim().toLowerCase()}. Check your email and open the link to set a new password.`);
      }
    } catch {
      setError("We couldn’t send the reset email. Check the email and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="student-account-card">
      <span className="student-eyebrow">STUDENT ACCOUNT</span>
      <h1>{view === "forgot" ? "Reset your password." : "Keep your print history."}</h1>
      <p>
        {view === "forgot"
          ? "Enter your email address and we'll send you a link to reset your password."
          : tab === "magic"
          ? "Sign in with an email link to save new paid orders to your account and see them again later."
          : "Sign in with your email and password to access your student account and past orders."}
      </p>

      {linkError && (
        <p className="student-account-error" role="alert">
          That sign-in link expired or was already used. Request a fresh one below.
        </p>
      )}

      <div className="student-auth-tabs" role="tablist" aria-label="Sign in method">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "magic" && view !== "forgot"}
          className={`student-auth-tab ${tab === "magic" && view !== "forgot" ? "is-active" : ""}`}
          onClick={() => {
            setTab("magic");
            setView("login");
            setError("");
            setMessage("");
          }}
        >
          Magic link
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "password" || view === "forgot"}
          className={`student-auth-tab ${tab === "password" || view === "forgot" ? "is-active" : ""}`}
          onClick={() => {
            setTab("password");
            setView("login");
            setError("");
            setMessage("");
          }}
        >
          Password
        </button>
      </div>

      {tab === "magic" && (
        <form className="student-account-form" onSubmit={submitMagicLink}>
          <label htmlFor="student-account-name">Your name</label>
          <input
            id="student-account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={100}
            placeholder="Sahej Grover"
          />
          <label htmlFor="student-account-email">Email address</label>
          <input
            id="student-account-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
          />
          {error && <p className="student-account-error" role="alert">{error}</p>}
          {message && <p className="student-account-success" role="status">{message}</p>}
          <button type="submit" disabled={sending}>
            {sending ? "Sending link…" : "Email me a sign-in link"}
            <span>→</span>
          </button>
        </form>
      )}

      {tab === "password" && view === "login" && (
        <form className="student-account-form" onSubmit={submitPassword}>
          <label htmlFor="student-password-email">Email address</label>
          <input
            id="student-password-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
          />
          <div className="student-label-row">
            <label htmlFor="student-password-input">Password</label>
            <button
              type="button"
              className="student-forgot-link"
              onClick={() => {
                setView("forgot");
                setError("");
                setMessage("");
              }}
            >
              Forgot password?
            </button>
          </div>
          <input
            id="student-password-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            maxLength={256}
            placeholder="Enter your password"
          />
          {error && <p className="student-account-error" role="alert">{error}</p>}
          {message && <p className="student-account-success" role="status">{message}</p>}
          <button type="submit" disabled={sending}>
            {sending ? "Signing in…" : "Sign in with password"}
            <span>→</span>
          </button>
        </form>
      )}

      {tab === "password" && view === "forgot" && (
        <form className="student-account-form" onSubmit={submitForgotPassword}>
          <label htmlFor="student-forgot-email">Email address</label>
          <input
            id="student-forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
          />
          {error && <p className="student-account-error" role="alert">{error}</p>}
          {message && <p className="student-account-success" role="status">{message}</p>}
          <div className="student-password-form-actions">
            <button
              type="button"
              className="student-password-cancel"
              onClick={() => {
                setView("login");
                setError("");
                setMessage("");
              }}
            >
              Back to sign in
            </button>
            <button type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send reset link"}
              <span>→</span>
            </button>
          </div>
        </form>
      )}

      <p className="student-account-footnote">
        {tab === "magic"
          ? "No password to remember. Ordering stays available without an account."
          : view === "forgot"
          ? "We'll email you a secure link to create a new password for your account."
          : "Don't have a password yet? You can sign in using a magic link anytime."}
      </p>
    </section>
  );
}
