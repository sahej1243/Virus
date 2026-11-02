import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import "./shop.css";
import "./admin.css";
import "../components/student/student.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Printify — Queue-free campus printing",
  description: "Upload your document and collect your prints without the queue.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={dmSans.variable}>{children}<Analytics /></body></html>;
}
