"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type OrderRow = {
  id: string;
  customer_name: string | null;
  original_filename: string;
  page_count: number;
  selected_pages: number[];
  copies: number;
  amount_paise: number;
  payment_status: string;
  fulfillment_status: string;
  created_at: string;
};

function statusLabel(status: string) {
  if (status === "printing") return "Printing";
  if (status === "ready") return "Ready for pickup";
  if (status === "collected") return "Collected";
  if (status === "cancelled") return "Cancelled";
  return "Accepted · queued";
}

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

function PasswordManagement({ email }: { email: string }) {
  const [mode, setMode] = useState<"idle" | "set" | "change" | "forgot">("idle");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function reset() { setNewPassword(""); setConfirmPassword(""); setCurrentPassword(""); setNotice(""); setError(""); }

  async function handleSetOrChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(""); setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "change" && currentPassword) {
        // Re-authenticate with current password first
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (signInError) { setError("Current password is incorrect."); setBusy(false); return; }
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) setError(updateError.message || "We couldn't update your password. Try again.");
      else { setNotice(mode === "set" ? "Password set successfully! You can now log in with your email and password." : "Password changed successfully."); reset(); setMode("idle"); }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(""); setError(""); setBusy(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/student-callback?next=%2Fstudent%2Faccount%3Ftab%3Dsettings`,
      });
      if (resetError) setError(resetError.message || "We couldn't send the reset email. Try again.");
      else setNotice("Password reset email sent. Check your inbox and follow the link.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="student-password-section">
      <span className="student-eyebrow">PASSWORD MANAGEMENT</span>
      <h3>Manage your password</h3>
      <p className="student-password-note">Magic-link login is always available. A password lets you sign in directly without waiting for an email.</p>
      {mode === "idle" && (
        <div className="student-password-buttons">
          <button type="button" className="student-password-btn" onClick={() => { reset(); setMode("set"); }}>Set password</button>
          <button type="button" className="student-password-btn" onClick={() => { reset(); setMode("change"); }}>Change password</button>
          <button type="button" className="student-password-btn student-password-btn-link" onClick={() => { reset(); setMode("forgot"); }}>Forgot password?</button>
        </div>
      )}
      {(mode === "set" || mode === "change") && (
        <form className="student-account-form student-password-form" onSubmit={handleSetOrChange}>
          {mode === "change" && (
            <>
              <label htmlFor="pwd-current">Current password</label>
              <input id="pwd-current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
            </>
          )}
          <label htmlFor="pwd-new">New password</label>
          <input id="pwd-new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
          <label htmlFor="pwd-confirm">Confirm new password</label>
          <input id="pwd-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          {error && <p className="student-account-error" role="alert">{error}</p>}
          {notice && <p className="student-account-success" role="status">{notice}</p>}
          <div className="student-password-form-actions">
            <button type="button" className="student-password-cancel" onClick={() => { reset(); setMode("idle"); }}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? "Saving…" : mode === "set" ? "Set password" : "Change password"}<span>→</span></button>
          </div>
        </form>
      )}
      {mode === "forgot" && (
        <form className="student-account-form student-password-form" onSubmit={handleForgot}>
          <p className="student-password-desc">We'll send a password reset link to <b>{email}</b>.</p>
          {error && <p className="student-account-error" role="alert">{error}</p>}
          {notice && <p className="student-account-success" role="status">{notice}</p>}
          <div className="student-password-form-actions">
            <button type="button" className="student-password-cancel" onClick={() => { reset(); setMode("idle"); }}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset email"}<span>→</span></button>
          </div>
        </form>
      )}
    </div>
  );
}

function ThemeSection() {
  return (
    <div className="student-theme-section">
      <span className="student-eyebrow">APPEARANCE</span>
      <h3>Theme</h3>
      <p className="student-password-note">Customise how Printify looks on your device. More themes are coming soon.</p>
      <div className="student-theme-options">
        <div className="student-theme-option student-theme-option-active">
          <div className="student-theme-preview student-theme-preview-default">
            <div /><div /><div />
          </div>
          <span>Default</span>
          <small>Current theme</small>
        </div>
        <div className="student-theme-option student-theme-option-disabled" aria-disabled="true">
          <div className="student-theme-preview student-theme-preview-dark">
            <div /><div /><div />
          </div>
          <span>Dark</span>
          <small>Coming soon</small>
        </div>
        <div className="student-theme-option student-theme-option-disabled" aria-disabled="true">
          <div className="student-theme-preview student-theme-preview-warm">
            <div /><div /><div />
          </div>
          <span>Warm</span>
          <small>Coming soon</small>
        </div>
      </div>
    </div>
  );
}

export default function StudentAccount({ name, email, updatesEnabled, orders, activeTab }: { name: string; email: string; updatesEnabled: boolean; orders: OrderRow[]; activeTab: "orders" | "settings" | "theme" }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(name);
  const [saveHistory, setSaveHistory] = useState(updatesEnabled);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice(""); setError("");
    const { error: updateError } = await createClient().auth.updateUser({ data: { full_name: fullName.trim(), save_order_history: saveHistory } });
    if (updateError) setError("We couldn't save your settings. Try again.");
    else setNotice("Your profile and settings are saved.");
    setBusy(false);
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return <>
    <section className="student-account-welcome"><div><span className="student-eyebrow">YOUR PRINTIFY ACCOUNT</span><h1>Hi{fullName ? `, ${fullName.split(" ")[0]}` : " there"}.</h1><p>Your paid orders stay here when you come back.</p></div><button type="button" className="student-account-signout" onClick={signOut}>Sign out</button></section>
    <div className={`student-account-layout ${activeTab === "settings" || activeTab === "theme" ? "student-account-layout-single" : "student-account-layout-orders"}`}>
      {activeTab === "orders" ? <section className="student-account-panel student-history-panel"><div className="student-account-panel-heading"><div><span className="student-eyebrow">YOUR ORDERS</span><h2>Print history &amp; status</h2></div><span className="student-history-count">{orders.length} {orders.length === 1 ? "order" : "orders"}</span></div>
        {orders.length === 0 ? <div className="student-history-empty"><span>▤</span><b>No paid orders yet</b><p>Your new paid print orders will appear here.</p><Link href="/">Order prints <span>→</span></Link></div> : <div className="student-history-list">{orders.map((order) => <article className="student-history-item" key={order.id}>
          <div className="student-history-file-icon">▤</div><div className="student-history-main"><b title={order.original_filename}>{order.original_filename}</b><span>PF-{order.id.slice(0, 8).toUpperCase()} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(order.created_at))}</span><small>{order.selected_pages.length} pages · {order.copies} {order.copies === 1 ? "copy" : "copies"}</small></div><div className="student-history-state"><span className={`student-history-status status-${order.fulfillment_status}`}>{statusLabel(order.fulfillment_status)}</span><b>{money(order.amount_paise)}</b></div>
        </article>)}</div>}
        <p className="student-history-note">Showing your latest 100 paid orders. Files stay private to the print shop and are not downloadable from this account.</p>
      </section> : activeTab === "theme" ? (
        <aside className="student-account-panel student-profile-panel">
          <nav className="student-settings-subnav" aria-label="Settings sections">
            <Link href="/student/account?tab=settings" className="student-settings-subnav-link">Profile &amp; settings</Link>
            <Link href="/student/account?tab=theme" className="student-settings-subnav-link student-settings-subnav-link-active">Appearance</Link>
          </nav>
          <ThemeSection />
        </aside>
      ) : <aside className="student-account-panel student-profile-panel">
        <nav className="student-settings-subnav" aria-label="Settings sections">
          <Link href="/student/account?tab=settings" className="student-settings-subnav-link student-settings-subnav-link-active">Profile &amp; settings</Link>
          <Link href="/student/account?tab=theme" className="student-settings-subnav-link">Appearance</Link>
        </nav>
        <span className="student-eyebrow">ACCOUNT SETTINGS</span><h2>Profile &amp; settings</h2><p>We&apos;ll add more settings here over time.</p><form className="student-account-form" onSubmit={saveSettings}><label htmlFor="student-profile-name">Your name</label><input id="student-profile-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" maxLength={100}/><label htmlFor="student-profile-email">Email address</label><input id="student-profile-email" value={email} disabled readOnly/><label className="student-account-toggle"><input type="checkbox" checked={saveHistory} onChange={(event) => setSaveHistory(event.target.checked)}/><span><b>Save future orders to history</b><small>Turn this off to place orders without attaching them to this account.</small></span></label>{error && <p className="student-account-error" role="alert">{error}</p>}{notice && <p className="student-account-success" role="status">{notice}</p>}<button type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}<span>→</span></button></form>
        <PasswordManagement email={email} />
      </aside>}
    </div>
  </>;
}
