"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, ArrowLeftRight, Store, SquareTerminal } from "lucide-react";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/console", label: "Console", icon: SquareTerminal },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          💧
        </span>
        <span className="brand-name">Payper</span>
        <span className="pill">testnet</span>
      </div>

      <nav className="nav">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`nav-item${active ? " active" : ""}`}
            >
              <Icon aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">One settled XRPL payment per API call.</div>
    </aside>
  );
}
