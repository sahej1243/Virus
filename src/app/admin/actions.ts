"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { configuredAdminEmail, getAdminContext } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

function priceInPaise(value: FormDataEntryValue | null) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 && price <= 1000 ? Math.round(price * 100) : null;
}

function shopSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function requireAdmin() {
  if (!await getAdminContext()) redirect("/admin/login?error=denied");
}

export async function sendAdminSignInLink(formData: FormData) {
  const email = cleanText(formData.get("email"), 254).toLowerCase();
  const expectedEmail = configuredAdminEmail();
  if (!expectedEmail) redirect("/admin/login?error=setup");
  if (email !== expectedEmail) redirect("/admin/login?error=invalid");

  const supabase = await createClient();
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") === "http" ? "http" : "https";
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const siteUrl = host ? `${protocol}://${host}` : "https://printify-alpha-ten.vercel.app";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl}/auth/admin-callback` },
  });
  if (error) redirect("/admin/login?error=send");
  redirect("/admin/login?sent=1");
}

export async function signOutAdmin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function createShop(formData: FormData) {
  await requireAdmin();
  const name = cleanText(formData.get("name"), 120);
  const slug = shopSlug(cleanText(formData.get("slug"), 120) || name);
  const location = cleanText(formData.get("location"), 180);
  const contactPhone = cleanText(formData.get("contactPhone"), 40);
  const openingHours = cleanText(formData.get("openingHours"), 120);
  const bwPrice = priceInPaise(formData.get("bwPrice"));
  const colorPrice = priceInPaise(formData.get("colorPrice"));
  if (!name || !slug || !location || !bwPrice || bwPrice <= 100 || !colorPrice) redirect("/admin?error=shop-details");

  const admin = createAdminClient();
  const { error } = await admin.from("shops").insert({
    name, slug, location, contact_phone: contactPhone || null, opening_hours: openingHours || null,
    price_per_page_paise: bwPrice - 100, color_price_per_page_paise: colorPrice,
  });
  if (error) redirect("/admin?error=create-shop");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?notice=shop-created");
}

export async function updateShop(formData: FormData) {
  await requireAdmin();
  const shopId = cleanText(formData.get("shopId"), 80);
  const bwPrice = priceInPaise(formData.get("bwPrice"));
  const colorPrice = priceInPaise(formData.get("colorPrice"));
  if (!shopId || !bwPrice || bwPrice <= 100 || !colorPrice) redirect("/admin?error=shop-details");

  const admin = createAdminClient();
  const { error } = await admin.from("shops").update({
    is_active: formData.get("isActive") === "on",
    is_open: formData.get("isOpen") === "on",
    price_per_page_paise: bwPrice - 100,
    color_price_per_page_paise: colorPrice,
    contact_phone: cleanText(formData.get("contactPhone"), 40) || null,
    opening_hours: cleanText(formData.get("openingHours"), 120) || null,
  }).eq("id", shopId);
  if (error) redirect("/admin?error=update-shop");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?notice=shop-updated");
}

export async function addStaffMember(formData: FormData) {
  await requireAdmin();
  const shopId = cleanText(formData.get("shopId"), 80);
  const email = cleanText(formData.get("email"), 254).toLowerCase();
  const role = formData.get("role") === "owner" ? "owner" : "operator";
  if (!shopId || !email) redirect("/admin?error=staff-details");

  const admin = createAdminClient();
  const { data, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = data?.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (usersError || !user) redirect("/admin?error=staff-user");
  const { error } = await admin.from("shop_staff").upsert({ shop_id: shopId, user_id: user.id, role });
  if (error) redirect("/admin?error=staff-details");
  revalidatePath("/admin");
  redirect("/admin?notice=staff-added");
}

export async function removeStaffMember(formData: FormData) {
  await requireAdmin();
  const shopId = cleanText(formData.get("shopId"), 80);
  const userId = cleanText(formData.get("userId"), 80);
  if (!shopId || !userId) redirect("/admin?error=staff-details");
  const { error } = await createAdminClient().from("shop_staff").delete().eq("shop_id", shopId).eq("user_id", userId);
  if (error) redirect("/admin?error=staff-details");
  revalidatePath("/admin");
  redirect("/admin?notice=staff-removed");
}

// ── Employer account management ──────────────────────────────────────────────
// Employers are full Supabase auth users with email+password, assigned to a shop
// via shop_staff. They log in at /shop/login with password (not magic-link).
// Passwords are never stored in our database – Supabase Auth handles hashing.

export async function createEmployerAccount(formData: FormData) {
  await requireAdmin();
  const email = cleanText(formData.get("employerEmail"), 254).toLowerCase();
  const password = cleanText(formData.get("employerPassword"), 128);
  const shopId = cleanText(formData.get("employerShopId"), 80);
  if (!email || password.length < 8 || !shopId) redirect("/admin?error=employer-details");

  const admin = createAdminClient();

  // Check if a user with this email already exists
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const alreadyExists = existing?.users.find((u) => u.email?.toLowerCase() === email);
  if (alreadyExists) redirect("/admin?error=employer-exists");

  // Create the user via Supabase Admin API (password is hashed by Supabase, never stored plain)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "employer" },
  });
  if (createError || !created.user) redirect("/admin?error=employer-create");

  // Assign to the selected shop as an operator
  const { error: staffError } = await admin.from("shop_staff").upsert({
    shop_id: shopId,
    user_id: created.user.id,
    role: "operator",
  });
  if (staffError) {
    // Clean up: remove the user we just created if staff assignment fails
    await admin.auth.admin.deleteUser(created.user.id);
    redirect("/admin?error=employer-details");
  }

  revalidatePath("/admin");
  redirect("/admin?notice=employer-created");
}

export async function deleteEmployerAccount(formData: FormData) {
  await requireAdmin();
  const userId = cleanText(formData.get("userId"), 80);
  if (!userId) redirect("/admin?error=employer-details");

  const admin = createAdminClient();
  // Remove all shop assignments first (cascade would handle it, but be explicit)
  await admin.from("shop_staff").delete().eq("user_id", userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) redirect("/admin?error=employer-delete");

  revalidatePath("/admin");
  redirect("/admin?notice=employer-deleted");
}

export async function changeEmployerShop(formData: FormData) {
  await requireAdmin();
  const userId = cleanText(formData.get("userId"), 80);
  const newShopId = cleanText(formData.get("newShopId"), 80);
  if (!userId || !newShopId) redirect("/admin?error=employer-details");

  const admin = createAdminClient();
  // Remove existing assignment(s), then assign to new shop
  await admin.from("shop_staff").delete().eq("user_id", userId);
  const { error } = await admin.from("shop_staff").insert({ shop_id: newShopId, user_id: userId, role: "operator" });
  if (error) redirect("/admin?error=employer-details");

  revalidatePath("/admin");
  redirect("/admin?notice=employer-shop-changed");
}
