"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getMeetingStatus, supabase, type MeetingStatus } from "@/lib/supabase";

type CheckinMeeting = {
  title: string;
  meeting_date: string;
  checkin_start: string;
  checkin_end: string;
  feedback_enabled: boolean;
};

export default function CheckinPage() {
  const { token } = useParams<{ token: string }>();
  const [meeting, setMeeting] = useState<CheckinMeeting | null>(null);
  const [status, setStatus] = useState<MeetingStatus | null>(null);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMeeting() {
      try {
        if (!supabase || !token) {
          if (isMounted) setLoadError(true);
          return;
        }

        const timeout = new Promise<never>((_, reject) => {
          window.setTimeout(
            () => reject(new Error("Loading public meeting timed out")),
            10000,
          );
        });
        const request = supabase.rpc("get_checkin_meeting", {
          p_meeting_token: token,
        });
        const { data, error } = await Promise.race([request, timeout]);

        if (error) throw error;
        const record = Array.isArray(data) ? data[0] : data;
        if (!record) {
          if (isMounted) setMeeting(null);
          return;
        }

        const loadedMeeting = record as CheckinMeeting;
        if (isMounted) {
          setMeeting(loadedMeeting);
          setStatus(
            getMeetingStatus(
              toBrowserDateValue(loadedMeeting.checkin_start),
              toBrowserDateValue(loadedMeeting.checkin_end),
            ),
          );
        }
      } catch (cause) {
        console.error("Failed to load public meeting", cause);
        if (isMounted) {
          setLoadError(true);
          setMeeting(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadMeeting();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId.trim() || !name.trim()) {
      setMessage("请输入学号和姓名");
      return;
    }
    if (!supabase || !token) return;
    setIsSubmitting(true);
    setMessage("");
    const { data, error } = await supabase.rpc("check_in_meeting", {
      meeting_token: token,
      input_student_id: studentId.trim(),
      input_name: name.trim(),
    });
    if (error) {
      setMessage("身份验证失败，请稍后重试");
    } else {
      const result = Array.isArray(data) ? data[0] : data;
      const checkinResult = result as
        | { status: string; checkin_time: string | null }
        | undefined;
      if (checkinResult?.status === "success") {
        setFeedbackAvailable(Boolean(meeting?.feedback_enabled));
        setMessage(
          `✓ 签到成功\n${name.trim()}\n签到时间：${formatCheckinTime(checkinResult.checkin_time)}`,
        );
      } else if (checkinResult?.status === "already_checked_in") {
        setFeedbackAvailable(Boolean(meeting?.feedback_enabled));
        setMessage(
          `你已经签到过了\n签到时间：${formatCheckinTime(checkinResult.checkin_time)}`,
        );
      } else if (checkinResult?.status === "member_not_found") {
        setMessage("未在本次会议名单中找到该成员");
      } else if (checkinResult?.status === "not_started") {
        setMessage("签到尚未开始");
      } else if (checkinResult?.status === "ended") {
        setMessage("签到已结束");
      } else if (checkinResult?.status === "invalid_meeting") {
        setMessage("签到链接无效");
      } else {
        setMessage("签到失败，请稍后重试");
      }
    }
    setIsSubmitting(false);
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

  if (status === "未开始") {
    return <PageMessage>签到尚未开始</PageMessage>;
  }

  if (status === "已结束") {
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
  const date = new Date(toBrowserDateValue(value));
  return Number.isNaN(date.getTime())
    ? "未知时间"
    : date.toLocaleString("zh-CN");
}

function toBrowserDateValue(value: string) {
  const normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00`;
  }
  if (normalized.includes(" ") && !normalized.includes("T")) {
    return normalized.replace(" ", "T");
  }
  return normalized;
}

function PageMessage({ children }: { children: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#e8ecf3] bg-white p-8 text-center shadow-[0_12px_40px_rgba(31,49,82,0.08)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#e9f1ff] text-lg font-bold text-[#5b8def]">
          C
        </div>
        <p className="mt-5 text-base font-semibold text-[#34425a]">
          {children}
        </p>
      </section>
    </main>
  );
}
