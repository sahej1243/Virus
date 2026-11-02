import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AdminContext = {
  email: string;
  userId: string;
};

export function configuredAdminEmail() {
  return process.env.PRINTIFY_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const expectedEmail = configuredAdminEmail();
  if (!expectedEmail) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const email = data?.claims?.email;
  if (error || typeof userId !== "string" || typeof email !== "string") return null;
  if (email.toLowerCase() !== expectedEmail) return null;

  return { userId, email };
}
