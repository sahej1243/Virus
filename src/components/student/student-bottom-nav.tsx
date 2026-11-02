import Link from "next/link";
import type { ReactNode } from "react";

type Tab = "home" | "orders" | "leaderboard" | "settings";

const tabs: { id: Tab; label: string; href: string; icon: ReactNode }[] = [
  { id: "home", label: "Home", href: "/", icon: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></> },
  { id: "orders", label: "Orders", href: "/student/account?tab=orders", icon: <><path d="M7 3h10l4 4v14H3V3h4Z"/><path d="M7 3v5h10V3M7 13h10M7 17h7"/></> },
  {
    id: "leaderboard",
    label: "Leaderboard",
    href: "/student/leaderboard",
    icon: (
      <>
        <path d="M8 18v-5M12 18V8M16 18v-3"/>
        <rect x="3" y="20" width="18" height="2" rx="1"/>
      </>
    ),
  },
  { id: "settings", label: "Settings", href: "/student/account?tab=settings", icon: <><circle cx="12" cy="12" r="2.7"/><path d="M10.4 2.7h3.2l.5 2.2a7.6 7.6 0 0 1 1.8.7l1.9-1.2 2.3 2.3-1.2 1.9a7.6 7.6 0 0 1 .7 1.8l2.2.5v3.2l-2.2.5a7.6 7.6 0 0 1-.7 1.8l1.2 1.9-2.3 2.3-1.9-1.2a7.6 7.6 0 0 1-1.8.7l-.5 2.2h-3.2l-.5-2.2a7.6 7.6 0 0 1-1.8-.7l-1.9 1.2-2.3-2.3 1.2-1.9a7.6 7.6 0 0 1-.7-1.8l-2.2-.5v-3.2l2.2-.5a7.6 7.6 0 0 1 .7-1.8L3.9 6.7l2.3-2.3 1.9 1.2a7.6 7.6 0 0 1 1.8-.7l.5-2.2Z"/></> },
];

export default function StudentBottomNav({ active }: { active: Tab }) {
  return <nav className="student-bottom-nav" aria-label="Main navigation">
    {tabs.map((tab) => <Link key={tab.id} href={tab.href} className={`student-bottom-nav-tab ${active === tab.id ? "is-active" : ""}`} aria-current={active === tab.id ? "page" : undefined}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{tab.icon}</svg><span>{tab.label}</span>
    </Link>)}
  </nav>;
}
