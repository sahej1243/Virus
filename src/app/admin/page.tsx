import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { addStaffMember, changeEmployerShop, createEmployerAccount, createShop, deleteEmployerAccount, removeStaffMember, signOutAdmin, updateShop } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type AdminPageProps = { searchParams: Promise<{ error?: string; notice?: string }> };

type ShopRow = {
  id: string; name: string; slug: string; location: string; is_active: boolean; is_open: boolean;
  price_per_page_paise: number; color_price_per_page_paise?: number; contact_phone?: string | null; opening_hours?: string | null;
};
type OrderRow = { id: string; shop_id: string; customer_name: string | null; original_filename: string; selected_pages: number[]; copies: number; print_mode?: "bw" | "color"; amount_paise: number; created_at: string };
type StaffRow = { shop_id: string; user_id: string; role: "owner" | "operator"; created_at: string };

const messages: Record<string, string> = {
  "shop-created": "Shop created.", "shop-updated": "Shop settings saved.", "staff-added": "Staff member added.", "staff-removed": "Staff access removed.",
  "shop-details": "Check the shop name, location and prices.", "create-shop": "We couldn't create that shop. The slug may already be in use.",
  "update-shop": "We couldn't save those shop settings.", "staff-details": "We couldn't save that staff change.",
  "staff-user": "That email does not belong to an existing Printify account yet.",
  "employer-created": "Employer account created and assigned to shop.", "employer-deleted": "Employer account deleted.", "employer-shop-changed": "Employer's shop assignment updated.",
  "employer-details": "Check all employer fields and try again.", "employer-exists": "An account with that email already exists.", "employer-create": "We couldn't create the employer account.", "employer-delete": "We couldn't delete the employer account.",
};

function rupees(paise: number) { return `₹${(paise / 100).toFixed(0)}`; }
function shortOrderId(id: string) { return `PF-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`; }

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const context = await getAdminContext();
  if (!context) redirect("/admin/login?error=denied");
  const admin = createAdminClient();
  const detailedShops = admin.from("shops").select("id,name,slug,location,is_active,is_open,price_per_page_paise,color_price_per_page_paise,contact_phone,opening_hours").order("created_at", { ascending: false });
  const [shopsResult, ordersResult, staffResult, usersResult] = await Promise.all([
    detailedShops,
    admin.from("orders").select("id,shop_id,customer_name,original_filename,selected_pages,copies,print_mode,amount_paise,created_at").eq("payment_status", "paid").order("created_at", { ascending: false }).limit(100),
    admin.from("shop_staff").select("shop_id,user_id,role,created_at").order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  let shops = shopsResult.data as unknown as ShopRow[] | null;
  const schemaReady = !shopsResult.error;
  if (!schemaReady) {
    const fallback = await admin.from("shops").select("id,name,slug,location,is_active,is_open,price_per_page_paise").order("created_at", { ascending: false });
    shops = fallback.data as unknown as ShopRow[] | null;
  }
  const shopRows = shops ?? [];
  const paidOrders = (ordersResult.data ?? []) as unknown as OrderRow[];
  const staff = (staffResult.data ?? []) as unknown as StaffRow[];
  const emailByUserId = new Map((usersResult.data?.users ?? []).map((user) => [user.id, user.email ?? "Unknown email"]));
  const shopById = new Map(shopRows.map((shop) => [shop.id, shop]));
  const totalSales = paidOrders.reduce((sum, order) => sum + Number(order.amount_paise), 0);
  const { error, notice } = await searchParams;
  const message = messages[notice ?? error ?? ""];

  return <main className="admin-page">
    <header className="admin-header">
      <a href="#overview" className="admin-brand">printify<span>.</span> <small>Admin Controls</small></a>
      <nav aria-label="Admin sections"><a href="#shops">Shops</a><a href="#orders">Orders</a><a href="#staff">Staff</a><a href="#employers">Employers</a></nav>
      <form action={signOutAdmin}><button className="admin-signout" type="submit">Sign out</button></form>
    </header>

    <section className="admin-hero" id="overview"><div><span className="admin-eyebrow">PRIVATE MANAGEMENT AREA</span><h1>Admin Controls</h1><p>Manage Printify shops, paid print orders, pricing and shop access from one place.</p></div><span className="admin-account">Signed in as {context.email}</span></section>
    {message ? <p className={`admin-message ${notice ? "admin-success" : "admin-error"}`} role={notice ? "status" : "alert"}>{message}</p> : null}
    {!schemaReady ? <section className="admin-setup"><b>One setup step remains.</b><p>Run the new admin-controls SQL migration in Supabase before creating shops or changing colour prices.</p></section> : null}

    <section className="admin-stats" aria-label="Admin overview"><article><span>Active shops</span><b>{shopRows.filter((shop) => shop.is_active).length}</b></article><article><span>Paid orders</span><b>{paidOrders.length}</b></article><article><span>Paid order value</span><b>{rupees(totalSales)}</b></article><article><span>Shop staff</span><b>{staff.length}</b></article></section>

    <section className="admin-section" id="shops"><div className="admin-section-heading"><div><span className="admin-eyebrow">SHOPS & PRICING</span><h2>Manage print shops</h2></div><p>Set availability and per-page prices for each location.</p></div>
      <div className="admin-shop-grid">{shopRows.map((shop) => <form action={updateShop} className="admin-shop-card" key={shop.id}><input type="hidden" name="shopId" value={shop.id}/><div className="admin-shop-card-heading"><div><h3>{shop.name}</h3><p>{shop.location} · /{shop.slug}</p></div><span className={shop.is_active ? "admin-status active" : "admin-status"}>{shop.is_active ? "Active" : "Inactive"}</span></div><div className="admin-fields"><label>B&W price <span>₹ / page, including Printify fee</span><input name="bwPrice" type="number" min="1.01" max="1000" step="any" defaultValue={(shop.price_per_page_paise + 100) / 100} required/></label><label>Colour price <span>₹ / page</span><input name="colorPrice" type="number" min="0.01" max="1000" step="any" defaultValue={(shop.color_price_per_page_paise ?? 1000) / 100} required/></label><label>Phone<input name="contactPhone" defaultValue={shop.contact_phone ?? ""} maxLength={40} placeholder="Optional"/></label><label>Hours<input name="openingHours" defaultValue={shop.opening_hours ?? ""} maxLength={120} placeholder="e.g. 9 AM – 6 PM"/></label></div><div className="admin-toggles"><label><input type="checkbox" name="isActive" defaultChecked={shop.is_active}/> Accept orders</label><label><input type="checkbox" name="isOpen" defaultChecked={shop.is_open}/> Currently open</label></div><button type="submit" disabled={!schemaReady}>Save shop</button></form>)}</div>
      <form action={createShop} className="admin-add-card"><div><span className="admin-eyebrow">NEW LOCATION</span><h3>Add a shop</h3><p>Create another Printify pickup location.</p></div><div className="admin-fields"><label>Shop name<input name="name" maxLength={120} required placeholder="e.g. Library Print Desk"/></label><label>Short link name<input name="slug" maxLength={120} placeholder="e.g. library-print-desk"/></label><label>Location<input name="location" maxLength={180} required placeholder="e.g. Main Library, Ground Floor"/></label><label>Phone<input name="contactPhone" maxLength={40} placeholder="Optional"/></label><label>B&W price <span>₹ / page</span><input name="bwPrice" type="number" min="1" max="1000" defaultValue="3" required/></label><label>Colour price <span>₹ / page</span><input name="colorPrice" type="number" min="1" max="1000" defaultValue="10" required/></label><label>Opening hours<input name="openingHours" maxLength={120} placeholder="Optional"/></label></div><button type="submit" disabled={!schemaReady}>Create shop</button></form>
    </section>

    <section className="admin-section" id="orders"><div className="admin-section-heading"><div><span className="admin-eyebrow">PAID ORDERS</span><h2>Recent payments</h2></div><p>Only orders marked paid are shown here.</p></div><div className="admin-table-wrap"><table><thead><tr><th>Order</th><th>Shop</th><th>Student</th><th>Document</th><th>Print details</th><th>Amount</th><th>Placed</th></tr></thead><tbody>{paidOrders.length ? paidOrders.map((order) => <tr key={order.id}><td>{shortOrderId(order.id)}</td><td>{shopById.get(order.shop_id)?.name ?? "Unknown shop"}</td><td>{order.customer_name ?? "Student"}</td><td>{order.original_filename}</td><td>{order.selected_pages.length} pages · {order.copies} {order.copies === 1 ? "copy" : "copies"} · {order.print_mode === "color" ? "Colour" : "B&W"}</td><td>{rupees(Number(order.amount_paise))}</td><td>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))}</td></tr>) : <tr><td colSpan={7} className="admin-empty">No paid orders yet.</td></tr>}</tbody></table></div></section>

    <section className="admin-section" id="staff"><div className="admin-section-heading"><div><span className="admin-eyebrow">SHOP ACCESS</span><h2>Staff members</h2></div><p>Staff must already have a Printify account before you can assign them.</p></div><form action={addStaffMember} className="admin-staff-add"><label>Shop<select name="shopId" required defaultValue=""><option value="" disabled>Select a shop</option>{shopRows.map((shop) => <option value={shop.id} key={shop.id}>{shop.name}</option>)}</select></label><label>Account email<input name="email" type="email" maxLength={254} required placeholder="staff@shop.com"/></label><label>Access role<select name="role" defaultValue="operator"><option value="operator">Operator</option><option value="owner">Owner</option></select></label><button type="submit">Add staff member</button></form><div className="admin-table-wrap"><table><thead><tr><th>Account</th><th>Shop</th><th>Role</th><th>Added</th><th></th></tr></thead><tbody>{staff.length ? staff.map((member) => <tr key={`${member.shop_id}-${member.user_id}`}><td>{emailByUserId.get(member.user_id) ?? member.user_id}</td><td>{shopById.get(member.shop_id)?.name ?? "Unknown shop"}</td><td><span className="admin-role">{member.role}</span></td><td>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(member.created_at))}</td><td><form action={removeStaffMember}><input type="hidden" name="shopId" value={member.shop_id}/><input type="hidden" name="userId" value={member.user_id}/><button className="admin-remove" type="submit">Remove</button></form></td></tr>) : <tr><td colSpan={5} className="admin-empty">No staff are assigned yet.</td></tr>}</tbody></table></div></section>

    <section className="admin-section" id="employers">
      <div className="admin-section-heading"><div><span className="admin-eyebrow">EMPLOYER MANAGEMENT</span><h2>Employer accounts</h2></div><p>Create employer accounts with email and password. Each employer can only access their assigned shop's dashboard.</p></div>
      <form action={createEmployerAccount} className="admin-staff-add">
        <label>Shop<select name="employerShopId" required defaultValue=""><option value="" disabled>Select a shop</option>{shopRows.map((shop) => <option value={shop.id} key={shop.id}>{shop.name}</option>)}</select></label>
        <label>Email address<input name="employerEmail" type="email" maxLength={254} required placeholder="employer@shop.com"/></label>
        <label>Password <span style={{fontSize:10,fontWeight:400,color:"#969c92"}}>min. 8 characters</span><input name="employerPassword" type="password" minLength={8} required placeholder="Secure password"/></label>
        <button type="submit">Create employer</button>
      </form>
      <div className="admin-table-wrap"><table><thead><tr><th>Email</th><th>Assigned shop</th><th>Change shop</th><th>Created</th><th></th></tr></thead><tbody>
        {staff.length ? staff.map((member) => {
          const memberEmail = emailByUserId.get(member.user_id) ?? member.user_id;
          const memberUser = (usersResult.data?.users ?? []).find((u) => u.id === member.user_id);
          const isEmployer = memberUser?.user_metadata?.role === "employer";
          if (!isEmployer) return null;
          return <tr key={`emp-${member.shop_id}-${member.user_id}`}>
            <td>{memberEmail}</td>
            <td>{shopById.get(member.shop_id)?.name ?? "Unknown shop"}</td>
            <td>
              <form action={changeEmployerShop} style={{display:"flex",gap:6,alignItems:"center"}}>
                <input type="hidden" name="userId" value={member.user_id}/>
                <select name="newShopId" defaultValue={member.shop_id} style={{fontSize:12,padding:"5px 7px",border:"1px solid #dfe3da",borderRadius:4,background:"#fcfdfb"}}>
                  {shopRows.map((shop) => <option value={shop.id} key={shop.id}>{shop.name}</option>)}
                </select>
                <button type="submit" style={{padding:"5px 10px",fontSize:11}}>Change</button>
              </form>
            </td>
            <td>{memberUser?.created_at ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(memberUser.created_at)) : "—"}</td>
            <td><form action={deleteEmployerAccount}><input type="hidden" name="userId" value={member.user_id}/><button className="admin-remove" type="submit">Delete</button></form></td>
          </tr>;
        }).filter(Boolean) : null}
        {!staff.some((m) => (usersResult.data?.users ?? []).find((u) => u.id === m.user_id)?.user_metadata?.role === "employer") && <tr><td colSpan={5} className="admin-empty">No employer accounts yet. Create one above.</td></tr>}
      </tbody></table></div>
    </section>
  </main>;
}
