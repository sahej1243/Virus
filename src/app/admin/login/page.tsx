import { redirect } from "next/navigation";
import { configuredAdminEmail, getAdminContext } from "@/lib/admin";
import { sendAdminSignInLink } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type AdminLoginPageProps = { searchParams: Promise<{ error?: string; sent?: string }> };

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  if (await getAdminContext()) redirect("/admin");
  const { error, sent } = await searchParams;
  const message = error === "setup"
    ? "Admin access has not been configured yet. Add PRINTIFY_ADMIN_EMAIL in Vercel first."
    : error === "denied"
      ? "This account does not have admin access."
      : error === "invalid"
        ? "This email does not have admin access."
        : error === "send" || error === "link"
          ? "We couldn’t send the sign-in link. Check Supabase email settings and try again."
        : null;

  return <main className="admin-login-page">
    <section className="admin-login-card">
      <span className="admin-eyebrow">PRIVATE AREA</span>
      <h1>Admin Controls</h1>
      <p>Use your Printify owner account to manage shops, staff, pricing and paid orders.</p>
      <form action={sendAdminSignInLink} className="admin-form">
        <label htmlFor="admin-email">Your email</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required maxLength={254} />
        {message ? <p className="admin-message admin-error" role="alert">{message}</p> : null}
        {sent === "1" ? <p className="admin-message admin-success" role="status">Check your email for a secure sign-in link. Open it on this device.</p> : null}
        <button type="submit">Email me a sign-in link <span>→</span></button>
      </form>
    </section>
  </main>;
}
