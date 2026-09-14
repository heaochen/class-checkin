"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeetingStatus = "未开始" | "签到中" | "已结束";

type CheckinMeeting = {
  title: string;
  meeting_date: string;
  checkin_start: string;
  checkin_end: string;
  feedback_enabled: boolean;
  status: MeetingStatus;
};

type CheckinClientProps = {
  token: string;
  debug: boolean;
};

type RuntimeErrorInfo = {
  name: string;
  message: string;
};

type DebugInfo = {
  userAgent: string;
  currentUrl: string;
  hydrated: boolean;
  fetchStarted: boolean;
  fetchUrl: string;
  fetchReturned: boolean;
  httpStatus: string;
  jsonParsed: boolean;
  loading: boolean;
  step: number;
};

export default function CheckinClient({ token, debug }: CheckinClientProps) {
  const [meeting, setMeeting] = useState<CheckinMeeting | null>(null);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);
  const [runtimeError, setRuntimeError] = useState<RuntimeErrorInfo | null>(
    null,
  );
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    userAgent: "未读取",
    currentUrl: "未读取",
    hydrated: false,
    fetchStarted: false,
    fetchUrl: "未开始",
    fetchReturned: false,
    httpStatus: "未返回",
    jsonParsed: false,
    loading: true,
    step: 1,
  });

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setRuntimeError({
        name: event.error?.name || "ErrorEvent",
        message: event.message || "页面发生未知 JavaScript 错误",
      });
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setRuntimeError(toRuntimeError(event.reason));
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const startId = setTimeout(() => {
      setDebugInfo((current) => ({
        ...current,
        userAgent: window.navigator.userAgent,
        currentUrl: window.location.href,
        hydrated: true,
        step: 2,
      }));
      void loadMeeting();
    }, 0);
    let isMounted = true;
    const fetchUrl = `/api/checkin/${encodeURIComponent(token)}/meeting`;

    async function loadMeeting() {
      try {
        setDebugInfo((current) => ({
          ...current,
          fetchStarted: true,
          fetchUrl,
          step: 3,
        }));
        const response = await fetch(fetchUrl, { signal: controller.signal });
        setDebugInfo((current) => ({
          ...current,
          fetchReturned: true,
          httpStatus: String(response.status),
          step: 4,
        }));
        if (!response.ok) throw new Error("Failed to load public meeting");

        const loadedMeeting = (await response.json()) as CheckinMeeting;
        setDebugInfo((current) => ({
          ...current,
          jsonParsed: true,
          step: 5,
        }));
        if (!isMounted) return;
        if (!loadedMeeting.title || !loadedMeeting.status) {
          throw new Error("Invalid public meeting response");
        }
        setMeeting(loadedMeeting);
        setDebugInfo((current) => ({ ...current, step: 6 }));
      } catch (cause) {
        console.error("Failed to load public meeting", cause);
        if (isMounted) {
          setLoadError(true);
          setMeeting(null);
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setIsLoading(false);
          setDebugInfo((current) => ({
            ...current,
            loading: false,
            step: 7,
          }));
        }
      }
    }

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
      clearTimeout(startId);
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId.trim() || !name.trim()) {
      setMessage("请输入学号和姓名");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
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
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  if (runtimeError) {
    return (
      <RuntimeErrorMessage
        error={runtimeError}
        debug={debug}
        debugInfo={debugInfo}
      />
    );
  }
  if (isLoading)
    return (
      <PageMessage debug={debug} debugInfo={debugInfo}>
        正在加载签到信息...
      </PageMessage>
    );
  if (loadError)
    return (
      <PageMessage debug={debug} debugInfo={debugInfo}>
        签到信息加载失败，请刷新重试
      </PageMessage>
    );
  if (!meeting)
    return (
      <PageMessage debug={debug} debugInfo={debugInfo}>
        签到链接无效
      </PageMessage>
    );
  if (meeting.status === "未开始")
    return (
      <PageMessage debug={debug} debugInfo={debugInfo}>
        签到尚未开始
      </PageMessage>
    );
  if (meeting.status === "已结束")
    return (
      <PageMessage debug={debug} debugInfo={debugInfo}>
        签到已结束
      </PageMessage>
    );

  const feedbackUrl = `/feedback/${encodeURIComponent(token)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#e8ecf3] bg-white p-7 shadow-[0_12px_40px_rgba(31,49,82,0.08)] sm:p-9">
        <Brand />
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
        {debug && <DebugPanel info={debugInfo} />}
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

function Brand() {
  return (
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
  );
}

function toRuntimeError(reason: unknown): RuntimeErrorInfo {
  if (reason instanceof Error) {
    return { name: reason.name || "Error", message: reason.message };
  }
  return { name: "PromiseRejection", message: String(reason) };
}

function sanitizeDiagnostic(value: string) {
  return value
    .replace(/sb_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+/g, "[redacted]");
}

function PageMessage({
  children,
  debug,
  debugInfo,
}: {
  children: string;
  debug: boolean;
  debugInfo: DebugInfo;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#e8ecf3] bg-white p-8 text-center shadow-[0_12px_40px_rgba(31,49,82,0.08)]">
        <Brand />
        <p className="mt-5 text-base font-semibold text-[#34425a]">
          {children}
        </p>
        {debug && <DebugPanel info={debugInfo} />}
      </section>
    </main>
  );
}

function RuntimeErrorMessage({
  error,
  debug,
  debugInfo,
}: {
  error: RuntimeErrorInfo;
  debug: boolean;
  debugInfo: DebugInfo;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#f1d4d4] bg-white p-8 shadow-[0_12px_40px_rgba(31,49,82,0.08)]">
        <Brand />
        <h1 className="text-base font-semibold text-[#a33f3f]">页面运行异常</h1>
        <p className="mt-3 break-words rounded-xl bg-[#fff6f6] px-3 py-3 text-xs text-[#7d4b4b]">
          {sanitizeDiagnostic(error.name)}: {sanitizeDiagnostic(error.message)}
        </p>
        {debug && <DebugPanel info={debugInfo} />}
      </section>
    </main>
  );
}

function DebugPanel({ info }: { info: DebugInfo }) {
  return (
    <div className="mt-6 border-t border-[#e8ecf3] pt-4 text-left text-[11px] leading-5 text-[#61718b]">
      <div className="mb-2 font-semibold text-[#34425a]">调试信息</div>
      <div>userAgent: {info.userAgent}</div>
      <div>当前 URL: {info.currentUrl}</div>
      <div>页面已 hydration: {info.hydrated ? "是" : "否"}</div>
      <div>fetch 已开始: {info.fetchStarted ? "是" : "否"}</div>
      <div>fetch URL: {info.fetchUrl}</div>
      <div>fetch 已返回: {info.fetchReturned ? "是" : "否"}</div>
      <div>HTTP status: {info.httpStatus}</div>
      <div>JSON 解析成功: {info.jsonParsed ? "是" : "否"}</div>
      <div>loading: {info.loading ? "true" : "false"}</div>
      <div>当前步骤: STEP {info.step}</div>
    </div>
  );
}
