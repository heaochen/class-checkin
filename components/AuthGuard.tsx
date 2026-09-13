"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicCheckin = pathname.startsWith("/checkin/");
  const [isChecking, setIsChecking] = useState(
    pathname !== "/login" && !isPublicCheckin,
  );

  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/checkin/")) {
      return;
    }

    let isMounted = true;
    const client = supabase;
    const checkSession = async () => {
      if (!client) {
        router.replace("/login");
        return;
      }

      const { data } = await client.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      if (isMounted) setIsChecking(false);
    };

    void Promise.resolve().then(checkSession);
    const {
      data: { subscription },
    } = client?.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    }) ?? { data: { subscription: null } };

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [pathname, router]);

  if (pathname !== "/login" && !isPublicCheckin && isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] text-sm text-[#9aa5b7]">
        正在验证登录状态...
      </div>
    );
  }

  return <>{children}</>;
}
