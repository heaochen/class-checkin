"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type CheckinMeeting = {
  title: string;
  meeting_date: string;
  checkin_start: string;
  checkin_end: string;
  feedback_enabled: boolean;
  status: "未开始" | "签到中" | "已结束";
};

export default function CheckinPage() {
  const { token } = useParams<{ token: string }>();
  const [meeting, setMeeting] = useState<CheckinMeeting | null>(null);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    let isMounted = true;

    async function loadMeeting() {
      try {
        if (!token) throw new Error("Missing check-in token");
        const response = await fetch(
          `/api/checkin/${encodeURIComponent(token)}/meeting`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Failed to load public meeting");
        const loadedMeeting = (await response.json()) as CheckinMeeting;
        if (isMounted) {
          setMeeting(loadedMeeting);
        }
      } catch (cause) {
        console.error("Failed to load public meeting", cause);
        if (isMounted) {
          setLoadError(true);
          setMeeting(null);
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (isMounted) setIsLoading(false);
      }
    }

    void loadMeeting();

    return () => {
      isMounted = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId.trim() || !name.trim()) {
      setMessage("请输入学号和姓名");
      return;
    }
    if (!token) return;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/checkin/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId.trim(),
            name: name.trim(),
          }),
          signal: controller.signal,
        },
      );
      const data = (await response.json()) as {
        status?: string;
        checkin_time?: string | null;
      };
      if (!response.ok) throw new Error("Check-in request failed");

      if (data.status === "success") {
        setFeedbackAvailable(Boolean(meeting?.feedback_enabled));
        setMessage(
          `✓ 签到成功\n${name.trim()}\n签到时间：${formatCheckinTime(data.checkin_time ?? null)}`,
        );
      } else if (data.status === "already_checked_in") {
        setFeedbackAvailable(Boolean(meeting?.feedback_enabled));
        setMessage(
          `你已经签到过了\n签到时间：${formatCheckinTime(data.checkin_time ?? null)}`,
        );
      } else if (data.status === "member_not_found") {
        setMessage("未在本次会议名单中找到该成员");
      } else if (data.status === "not_started") {
        setMessage("签到尚未开始");
      } else if (data.status === "ended") {
        setMessage("签到已结束");
      } else if (data.status === "invalid_meeting") {
        setMessage("签到链接无效");
      } else {
        setMessage("签到失败，请稍后重试");
      }
    } catch (cause) {
      console.error("Failed to submit check-in", cause);
      setMessage("身份验证失败，请稍后重试");
    } finally {
      window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <PageMessage>正在加载签到信息...</PageMessage>;
  }

  if (loadError) {
    return <PageMessage>签到信息加载失败，请刷新重试</PageMessage>;
  }

  if (!meeting) {
    return <PageMessage>签到链接无效</PageMessage>;
  }

  if (meeting.status === "未开始") {
    return <PageMessage>签到尚未开始</PageMessage>;
  }

  if (meeting.status === "已结束") {
    return <PageMessage>签到已结束</PageMessage>;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const feedbackUrl = `${appUrl}/feedback/${token}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#e8ecf3] bg-white p-7 shadow-[0_12px_40px_rgba(31,49,82,0.08)] sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5b8def] text-lg font-bold text-white shadow-lg shadow-blue-200">
            C
          </div>
          <div>
            <div className="text-lg font-bold tracking-wide text-[#17233a]">
              ClassHub
            </div>
            <div className="mt-0.5 text-[10px] tracking-[0.12em] text-[#9aa5b7]">
              学生签到
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#17233a]">
          {meeting.title}
        </h1>
        <p className="mt-2 text-sm text-[#7d899e]">请输入名单中的学号和姓名</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-[#34425a]">学号</span>
            <input
              required
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[#dfe6f1] px-3 text-base text-[#34425a] outline-none focus:border-[#7ca5ed] focus:ring-2 focus:ring-[#e9f1ff]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#34425a]">姓名</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[#dfe6f1] px-3 text-base text-[#34425a] outline-none focus:border-[#7ca5ed] focus:ring-2 focus:ring-[#e9f1ff]"
            />
          </label>
          {message && (
            <p className="whitespace-pre-line rounded-xl border border-[#e8ecf3] bg-[#fafbfc] px-3 py-3 text-xs text-[#61718b]">
              {message}
            </p>
          )}
          {feedbackAvailable && (
            <Link
              href={feedbackUrl}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-[#cfe0fb] bg-[#f4f8ff] text-sm font-semibold text-[#5b8def] transition-colors hover:bg-[#eaf2ff]"
            >
              填写会后反馈
            </Link>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#5b8def] text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-[#4d7fdc] disabled:cursor-wait disabled:opacity-50"
          >
            {isSubmitting ? "验证中..." : "确认签到"}
          </button>
        </form>
      </section>
    </main>
  );
}

function formatCheckinTime(value: string | null) {
  if (!value) return "未知时间";
  try {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "未知时间"
      : date.toLocaleString("zh-CN");
  } catch {
    return "未知时间";
  }
}

function PageMessage({ children }: { children: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#e8ecf3] bg-white p-8 text-center shadow-[0_12px_40px_rgba(31,49,82,0.08)]">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5b8def] text-lg font-bold text-white shadow-lg shadow-blue-200">
            C
          </div>
          <div className="text-left">
            <div className="text-lg font-bold tracking-wide text-[#17233a]">
              ClassHub
            </div>
            <div className="mt-0.5 text-[10px] tracking-[0.12em] text-[#9aa5b7]">
              学生签到
            </div>
          </div>
        </div>
        <p className="mt-5 text-base font-semibold text-[#34425a]">
          {children}
        </p>
      </section>
    </main>
  );
}
