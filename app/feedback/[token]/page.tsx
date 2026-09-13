"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FeedbackMeeting = {
  title: string;
  feedback_enabled: boolean;
};

export default function FeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const [meeting, setMeeting] = useState<FeedbackMeeting | null>(null);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    async function loadMeeting() {
      if (!supabase || !token) {
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_checkin_meeting", {
        p_meeting_token: token,
      });
      const record = Array.isArray(data) ? data[0] : data;
      if (!error && record) {
        setMeeting(record as FeedbackMeeting);
      }
      setIsLoading(false);
    }
    void loadMeeting();
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId.trim() || !name.trim()) {
      setMessage("请输入学号和姓名");
      return;
    }
    if (!rating) {
      setMessage("请选择评分");
      return;
    }
    if (content.length > 1000) {
      setMessage("反馈内容不能超过 1000 字");
      return;
    }
    if (!supabase || !token) return;

    setIsSubmitting(true);
    setMessage("");
    const { data, error } = await supabase.rpc("submit_meeting_feedback", {
      meeting_token: token,
      input_student_id: studentId.trim(),
      input_name: name.trim(),
      input_rating: rating,
      input_content: content,
      input_anonymous: anonymous,
    });
    if (error) {
      setMessage("提交反馈失败，请稍后重试");
    } else {
      const result = Array.isArray(data) ? data[0] : data;
      if (result === "success") {
        setMessage("反馈提交成功，感谢你的建议");
        setIsSubmitted(true);
      } else if (result === "already_submitted") {
        setMessage("你已经提交过本次会议的反馈");
      } else if (result === "member_not_found") {
        setMessage("未在本次会议名单中找到该成员");
      } else if (result === "feedback_disabled") {
        setMessage("本次会议暂未开放会后反馈");
      } else if (result === "invalid_meeting") {
        setMessage("反馈链接无效");
      } else {
        setMessage("提交反馈失败，请稍后重试");
      }
    }
    setIsSubmitting(false);
  }

  if (isLoading) return <PageMessage>正在加载反馈信息...</PageMessage>;
  if (!meeting) return <PageMessage>反馈链接无效</PageMessage>;
  if (!meeting.feedback_enabled)
    return <PageMessage>本次会议暂未开放会后反馈</PageMessage>;

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
              会后反馈
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#17233a]">
          {meeting.title}
        </h1>
        <p className="mt-2 text-sm text-[#7d899e]">本次班会对你是否有帮助？</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-[#34425a]">学号</span>
            <input
              required
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#34425a]">姓名</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-[#34425a]">
              评分
            </legend>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${rating === value ? "border-[#5b8def] bg-[#e9f1ff] text-[#5b8def]" : "border-[#dfe6f1] bg-white text-[#71819a] hover:border-[#c8d7ef]"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="text-sm font-semibold text-[#34425a]">
              你的建议或问题：
            </span>
            <textarea
              maxLength={1000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className={`${inputClass} h-28 resize-y py-3`}
            />
            <span className="mt-1 block text-right text-[11px] text-[#9aa5b7]">
              {content.length} / 1000
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(event) => setAnonymous(event.target.checked)}
              className="h-4 w-4 accent-[#5b8def]"
            />
            <span className="text-sm font-semibold text-[#34425a]">
              匿名提交
            </span>
          </label>
          {message && (
            <p className="rounded-xl border border-[#e8ecf3] bg-[#fafbfc] px-3 py-3 text-xs text-[#61718b]">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || isSubmitted}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#5b8def] text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-[#4d7fdc] disabled:cursor-wait disabled:opacity-50"
          >
            {isSubmitting ? "提交中..." : isSubmitted ? "已提交" : "提交反馈"}
          </button>
        </form>
      </section>
    </main>
  );
}

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#dfe6f1] px-3 text-base text-[#34425a] outline-none focus:border-[#7ca5ed] focus:ring-2 focus:ring-[#e9f1ff]";

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
