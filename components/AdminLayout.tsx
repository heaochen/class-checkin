"use client";

import { usePathname } from "next/navigation";
import AdminSidebar, { MobileNavigation } from "@/components/AdminSidebar";
import AuthGuard from "@/components/AuthGuard";
import LogoutButton from "@/components/LogoutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthGuard>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname === "/login" || pathname.startsWith("/checkin/") ? (
    <>{children}</>
  ) : (
    <ProtectedAdminLayout>{children}</ProtectedAdminLayout>
  );
}

export function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px]">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <MobileNavigation />
        <div className="flex h-16 items-center justify-end border-b border-[#e8ecf3] bg-white px-5 sm:px-8 lg:px-10">
          <LogoutButton compact />
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
