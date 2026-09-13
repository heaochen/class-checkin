"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const navigation = [
  { label: "仪表盘", href: "/", icon: "▦" },
  { label: "人员名单", href: "/groups", icon: "♙" },
  { label: "会议管理", href: "/meetings", icon: "▣" },
  { label: "数据统计", href: "/statistics", icon: "◒" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[250px] shrink-0 flex-col bg-[#17253f] px-5 py-7 text-white lg:flex">
      <Link
        href="/"
        className="mb-12 flex cursor-pointer items-center gap-3 px-3 transition-opacity hover:opacity-90"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5b8def] text-lg font-bold shadow-lg shadow-blue-950/20">
          C
        </div>
        <div>
          <div className="text-[17px] font-bold tracking-wide">ClassHub</div>
          <div className="mt-0.5 text-[10px] tracking-[0.12em] text-blue-200/70">
            班级会议管理系统
          </div>
        </div>
      </Link>

      <nav className="space-y-2" aria-label="主导航">
        <div className="mb-4 px-3 text-[10px] font-semibold tracking-[0.2em] text-blue-200/50">
          工作台
        </div>
        {navigation.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const className = `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${active ? "bg-[#2c4163] font-semibold text-white shadow-inner" : "text-blue-100/65 hover:bg-[#213655] hover:text-white"}`;
          const content = (
            <>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-lg ${active ? "bg-[#5b8def] text-white" : "text-blue-200/65"}`}
              >
                {item.icon}
              </span>
              {item.label}
            </>
          );

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`${className} cursor-pointer`}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-5">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2bf8a] text-sm font-bold text-[#6e4529]">
            管
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">管理员</div>
            <div className="mt-0.5 text-[11px] text-blue-200/55">
              ClassHub Admin
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="grid grid-cols-4 gap-2 border-b border-[#e8ecf3] bg-white px-4 py-3 lg:hidden"
      aria-label="移动端主导航"
    >
      {navigation.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors ${active ? "bg-[#e9f1ff] text-[#5b8def]" : "text-[#7d899e] hover:bg-[#f5f7fb] hover:text-[#5b8def]"}`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
