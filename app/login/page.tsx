"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    void Promise.resolve().then(async () => {
      const { data } = await client.auth.getSession();
      if (data.session) router.replace("/");
    });
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("尚未配置 Supabase，请检查 .env.local");
      return;
    }

    setIsSubmitting(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError("邮箱或密码不正确，请重试");
      setIsSubmitting(false);
      return;
    }
    router.replace("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#e8ecf3] bg-white p-7 shadow-[0_12px_40px_rgba(31,49,82,0.08)] sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5b8def] text-lg font-bold text-white shadow-lg shadow-blue-200">
            C
          </div>
          <div>
            <div className="text-lg font-bold tracking-wide text-[#17233a]">
              ClassHub
            </div>
            <div className="mt-0.5 text-[10px] tracking-[0.12em] text-[#9aa5b7]">
              班级会议管理系统
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#17233a]">
          管理员登录
        </h1>
        <p className="mt-2 text-sm text-[#7d899e]">登录后管理班级名单与会议</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-[#34425a]">邮箱</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[#dfe6f1] px-3 text-base text-[#34425a] outline-none transition-colors focus:border-[#7ca5ed] focus:ring-2 focus:ring-[#e9f1ff]"
              placeholder="admin@example.com"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#34425a]">密码</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[#dfe6f1] px-3 text-base text-[#34425a] outline-none transition-colors focus:border-[#7ca5ed] focus:ring-2 focus:ring-[#e9f1ff]"
              placeholder="请输入密码"
            />
          </label>
          {error && (
            <p className="rounded-xl border border-[#f0d9d9] bg-[#fff8f8] px-3 py-3 text-xs text-[#cb7373]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#5b8def] text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-[#4d7fdc] disabled:cursor-wait disabled:opacity-50"
          >
            {isSubmitting ? "登录中..." : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
