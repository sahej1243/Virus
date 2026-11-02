"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/version";

export default function ShopSettings({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim() || busy) return;
    setBusy(true); setNotice(""); setError("");
    const { error: updateError } = await createClient().auth.updateUser({ data: { full_name: displayName.trim() } });
    if (updateError) setError("We couldn’t save your profile. Try again.");
    else { setNotice("Profile saved."); router.refresh(); }
    setBusy(false);
  }

  return <main className="shop-settings-page">
    <header className="shop-settings-header"><Link href="/dashboard" className="brand"><span className="brand-mark"><span /></span><span>printify<span className="brand-dot">.</span></span></Link><Link href="/dashboard" className="settings-back">Back to dashboard</Link></header>
    <section className="shop-settings-card"><span className="eyebrow">YOUR SHOP ACCOUNT</span><h1>Profile &amp; settings</h1><p>Manage the name and account details shown in your shop dashboard.</p>
      <form className="shop-settings-form" onSubmit={saveProfile}><label htmlFor="shop-settings-name">Display name</label><input id="shop-settings-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" maxLength={100}/><label htmlFor="shop-settings-email">Account email</label><input id="shop-settings-email" value={email} readOnly disabled/><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>{error && <p className="settings-error" role="alert">{error}</p>}{notice && <p className="settings-success" role="status">{notice}</p>}</form>
      <div className="settings-section"><span className="eyebrow">ACCOUNT</span><h2>More settings are coming</h2><p>Shop availability, notifications, and staff access can be added here as the shop portal grows.</p></div>
    </section>
    <footer className="dashboard-footer"><span>Printify <span>·</span> Shopkeeper portal <span>v{APP_VERSION}</span></span><span>Need help? <a href="https://wa.me/919268729970" target="_blank" rel="noopener noreferrer">Contact support</a></span></footer>
  </main>;
}
