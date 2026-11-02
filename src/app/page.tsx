import StudentOrder from "@/components/student/student-cart";
import { createClient } from "@/lib/supabase/server";

// Force dynamic rendering so shop prices are always fresh from the database on every visit.
export const dynamic = "force-dynamic";

export type PickupShop = {
  id: string;
  name: string;
  location: string;
  isOpen: boolean;
  bwPricePaise: number;
  colorPricePaise: number;
};

export default async function StudentPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select("id,name,location,is_open,price_per_page_paise,color_price_per_page_paise")
    .eq("is_active", true)
    .order("name");

  const shops: PickupShop[] = error
    ? []
    : (data ?? []).map((shop) => ({
      id: shop.id,
      name: shop.name,
      location: shop.location,
      isOpen: shop.is_open,
      bwPricePaise: shop.price_per_page_paise + 100,
      colorPricePaise: shop.color_price_per_page_paise ?? 1000,
    }));

  return <StudentOrder shops={shops} />;
}
