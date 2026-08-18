"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tags, Search } from "lucide-react";
import { AddProductButton } from "@/features/products/add-product-button";

const navItems = [
  { href: "/", label: "أسعار المنتجات", icon: Search },
  { href: "/categories", label: "الأصناف", icon: Tags },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-s bg-sidebar text-sidebar-foreground flex flex-col gap-4 p-4">
      <div className="px-2 py-1">
        <h1 className="text-lg font-bold">أسعار المنتجات</h1>
      </div>

      <AddProductButton className="w-full" />

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
