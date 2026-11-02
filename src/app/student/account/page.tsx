import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_VERSION } from "@/lib/version";
import StudentAccount from "@/components/student/student-account";
import StudentBottomNav from "@/components/student/student-bottom-nav";

export const dynamic = "force-dynamic";

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

export default async function StudentAccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const activeTab = params.tab === "settings" ? "settings" : params.tab === "theme" ? "theme" : "orders";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (activeTab === "settings" || activeTab === "theme") redirect("/student/login");
    return <main className="student-page student-account-page">
      <header className="student-header"><Link href="/" className="student-brand"><span className="student-brand-mark"><span /></span>printify<span className="student-brand-dot">.</span></Link><Link className="student-shop-link" href="/student/login">Sign in</Link></header>
      <section className="student-account-panel student-history-panel student-guest-orders"><span className="student-eyebrow">YOUR ORDERS</span><h1>Orders & status</h1><div className="student-history-empty"><span>▤</span><b>No past orders yet</b><p>Orders you place while signed in will appear here with their pickup status.</p><Link href="/">Start an order</Link></div><p className="student-history-note">Ordering as a guest? Create an account to save orders and check their status here.</p><Link className="student-guest-signin" href="/student/login">Sign in or create an account</Link></section>
      <footer className="student-footer"><span>© 2026 Printify · v{APP_VERSION}</span><span>Student orders</span><span>Need help? <a href="https://wa.me/919268729970" target="_blank" rel="noopener noreferrer">Get in touch</a></span></footer>
      <StudentBottomNav active="orders"/>
    </main>;
  }

  const admin = createAdminClient();
  const { data } = await admin.from("orders")
    .select("id,customer_name,original_filename,page_count,selected_pages,copies,amount_paise,payment_status,fulfillment_status,created_at")
    .eq("student_user_id", user.id)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false })
    .limit(100);

  const orders = (data || []) as OrderRow[];
  const name = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const updatesEnabled = user.user_metadata?.save_order_history !== false;

  return <main className="student-page student-account-page">
    <header className="student-header"><Link href="/" className="student-brand"><span className="student-brand-mark"><span /></span>printify<span className="student-brand-dot">.</span></Link><div className="student-account-header-actions"><span>{user.email}</span><Link className="student-shop-link" href="/">New order</Link></div></header>
    <StudentAccount name={name} email={user.email ?? ""} updatesEnabled={updatesEnabled} orders={orders} activeTab={activeTab} />
    <footer className="student-footer"><span>© 2026 Printify · v{APP_VERSION}</span><span>Student account · private history</span><span>Need help? <a href="https://wa.me/919268729970" target="_blank" rel="noopener noreferrer">Get in touch</a></span></footer>
    <StudentBottomNav active={activeTab === "theme" ? "settings" : activeTab}/>
  </main>;
}
