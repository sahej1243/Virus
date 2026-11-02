import { redirect } from "next/navigation";
import { getShopkeeperContext } from "@/lib/shopkeeper";
import ShopSettings from "@/components/dashboard/shop-settings";

export const dynamic = "force-dynamic";

export default async function ShopSettingsPage() {
  const context = await getShopkeeperContext();
  if (!context || !context.assignment) redirect("/shop/login");

  const claims = (await context.supabase.auth.getClaims()).data?.claims;
  const email = typeof claims?.email === "string" ? claims.email : "";
  const metadata = claims?.user_metadata;
  const name = metadata && typeof metadata === "object" && "full_name" in metadata && typeof metadata.full_name === "string"
    ? metadata.full_name
    : email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  return <ShopSettings name={name} email={email} />;
}
