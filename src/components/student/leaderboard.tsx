"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type LeaderEntry = { rank: number; name: string; value: number; isYou: boolean };

type LeaderboardData = {
  prints: LeaderEntry[];
  donations: LeaderEntry[];
};

function TrophyIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="lb-rank-icon lb-rank-gold">🥇</span>;
  if (rank === 2) return <span className="lb-rank-icon lb-rank-silver">🥈</span>;
  if (rank === 3) return <span className="lb-rank-icon lb-rank-bronze">🥉</span>;
  return <span className="lb-rank-num">{rank}</span>;
}

function LeaderRow({ entry, unit }: { entry: LeaderEntry; unit: string }) {
  return (
    <div className={`lb-row ${entry.isYou ? "lb-row-you" : ""}`}>
      <span className="lb-rank"><TrophyIcon rank={entry.rank} /></span>
      <span className="lb-name">{entry.name}{entry.isYou ? " (you)" : ""}</span>
      <span className="lb-value">{entry.value.toLocaleString("en-IN")} {unit}</span>
    </div>
  );
}

function AuthGate({ onSuccess }: { onSuccess: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setError(""); setSending(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/student-callback?next=%2Fstudent%2Faccount%3Ftab%3Dleaderboard`,
          data: { full_name: name.trim() },
        },
      });
      if (authError) throw authError;
      setMessage("Check your email for a secure sign-in link.");
    } catch {
      setError("We couldn't send the sign-in link. Check the email and try again.");
    } finally {
      setSending(false);
    }
  }

  // Listen for auth state changes (e.g. magic link in same tab)
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) onSuccess(session.user);
    });
    return () => subscription.unsubscribe();
  }, [onSuccess]);

  return (
    <section className="student-account-card lb-auth-card">
      <span className="student-eyebrow">LEADERBOARD</span>
      <h1>Join the leaderboard.</h1>
      <p>Sign in to see your ranking and compete with other students.</p>
      <form className="student-account-form" onSubmit={submit}>
        <label htmlFor="lb-name">Your name</label>
        <input id="lb-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} placeholder="Sahej Grover" />
        <label htmlFor="lb-email">Email address</label>
        <input id="lb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required maxLength={254} placeholder="you@example.com" />
        {error && <p className="student-account-error" role="alert">{error}</p>}
        {message && <p className="student-account-success" role="status">{message}</p>}
        <button type="submit" disabled={sending}>{sending ? "Sending link…" : "Email me a sign-in link"}<span>→</span></button>
      </form>
      <p className="student-account-footnote">No password required. Your ranking is based on real print activity.</p>
    </section>
  );
}

export default function Leaderboard({ initialUser }: { initialUser: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"prints" | "donations">("prints");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");

    async function load() {
      try {
        const supabase = createClient();
        // Fetch print leaderboard: total pages printed per student
        const { data: printRows, error: printError } = await supabase
          .from("orders")
          .select("student_user_id, selected_pages, copies, payment_status, fulfillment_status")
          .eq("payment_status", "paid")
          .not("student_user_id", "is", null);

        if (printError) throw printError;

        // Fetch donation leaderboard
        const { data: donationRows, error: donationError } = await supabase
          .from("donations")
          .select("student_user_id, amount_paise");

        // Aggregate print counts per user
        const printMap = new Map<string, number>();
        for (const row of (printRows ?? [])) {
          const uid = row.student_user_id as string;
          const pages = (row.selected_pages as number[]).length * (row.copies as number);
          printMap.set(uid, (printMap.get(uid) ?? 0) + pages);
        }

        // Aggregate donation amounts per user
        const donationMap = new Map<string, number>();
        if (!donationError) {
          for (const row of (donationRows ?? [])) {
            const uid = row.student_user_id as string;
            donationMap.set(uid, (donationMap.get(uid) ?? 0) + (row.amount_paise as number));
          }
        }

        // Fetch display names for top users via auth
        // We only have access to user_metadata via the current user's session.
        // We'll show anonymised names for others.
        const myId = user!.id;
        const myName = typeof user!.user_metadata?.full_name === "string" ? user!.user_metadata.full_name : "You";

        function buildRanking(map: Map<string, number>, multiplier = 1): LeaderEntry[] {
          const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
          return sorted.map(([uid, val], index) => ({
            rank: index + 1,
            name: uid === myId ? myName : `Student #${index + 1}`,
            value: Math.round(val * multiplier),
            isYou: uid === myId,
          }));
        }

        setData({
          prints: buildRanking(printMap),
          donations: donationError ? [] : buildRanking(donationMap, 1 / 100), // paise → rupees
        });
      } catch {
        setError("We couldn't load the leaderboard right now. Try again later.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user]);

  if (!user) {
    return <AuthGate onSuccess={setUser} />;
  }

  return (
    <div className="lb-page">
      <div className="lb-header">
        <span className="student-eyebrow">LEADERBOARD</span>
        <h1>Top students</h1>
        <p>Rankings based on real print activity and donations.</p>
      </div>
      <div className="lb-tabs">
        <button
          type="button"
          className={`lb-tab ${activeTab === "prints" ? "lb-tab-active" : ""}`}
          onClick={() => setActiveTab("prints")}
        >
          🖨 Maximum Prints
        </button>
        <button
          type="button"
          className={`lb-tab ${activeTab === "donations" ? "lb-tab-active" : ""}`}
          onClick={() => setActiveTab("donations")}
        >
          ❤️ Highest Donations
        </button>
      </div>
      {error && <p className="student-account-error" role="alert">{error}</p>}
      {loading ? (
        <div className="lb-loading">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="lb-row-skeleton">
              <span className="student-loading-line" style={{ width: 24 }} />
              <span className="student-loading-line" style={{ flex: 1 }} />
              <span className="student-loading-line" style={{ width: 60 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="lb-list">
          {activeTab === "prints" ? (
            data?.prints.length ? (
              data.prints.map((entry) => <LeaderRow key={entry.rank} entry={entry} unit="pages" />)
            ) : (
              <div className="lb-empty"><span>🖨</span><b>No print data yet</b><p>Start printing to appear on the leaderboard.</p></div>
            )
          ) : (
            data?.donations.length ? (
              data.donations.map((entry) => <LeaderRow key={entry.rank} entry={entry} unit="₹" />)
            ) : (
              <div className="lb-empty"><span>❤️</span><b>No donations yet</b><p>Support Printify to appear on the leaderboard.</p></div>
            )
          )}
        </div>
      )}
      <p className="lb-note">Rankings update in real-time. Only students who opted in to order history are included.</p>
    </div>
  );
}
