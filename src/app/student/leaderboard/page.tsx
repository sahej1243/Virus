import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/lib/version";
import Leaderboard from "@/components/student/leaderboard";
import StudentBottomNav from "@/components/student/student-bottom-nav";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="student-page student-account-page">
      <header className="student-header">
        <Link href="/" className="student-brand">
          <span className="student-brand-mark"><span /></span>printify<span className="student-brand-dot">.</span>
        </Link>
        {user ? (
          <div className="student-account-header-actions">
            <span>{user.email}</span>
            <Link className="student-shop-link" href="/">New order</Link>
          </div>
        ) : (
          <Link className="student-shop-link" href="/student/login">Sign in</Link>
        )}
      </header>
      <Leaderboard initialUser={user} />
      <footer className="student-footer">
        <span>© 2026 Printify · v{APP_VERSION}</span>
        <span>Top students</span>
        <span>Need help? <a href="https://wa.me/919268729970" target="_blank" rel="noopener noreferrer">Get in touch</a></span>
      </footer>
      <StudentBottomNav active="leaderboard" />
    </main>
  );
}
