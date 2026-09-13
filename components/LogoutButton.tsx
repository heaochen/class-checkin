"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LogoutButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (!supabase) {
      router.replace("/login");
      return;
    }

    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setIsSigningOut(false);
      return;
    }
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={isSigningOut}
      aria-label="退出登录"
      title="退出登录"
      className={
        compact
          ? "flex cursor-pointer items-center gap-2 rounded-xl border border-[#e5eaf2] bg-white px-3 py-2 text-xs font-semibold text-[#61718b] transition-colors hover:border-[#c8d7ef] hover:bg-[#f9fbff] hover:text-[#4d7fdc] disabled:cursor-wait disabled:opacity-60"
          : "cursor-pointer text-lg text-blue-200/50 transition-colors hover:text-white disabled:cursor-wait disabled:opacity-50"
      }
    >
      <span className={compact ? "text-base" : ""}>↪</span>
      {compact && (isSigningOut ? "退出中..." : "退出登录")}
    </button>
  );
}
