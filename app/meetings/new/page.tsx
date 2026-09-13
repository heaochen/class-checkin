"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Group } from "@/lib/supabase";

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#dfe6f1] bg-white px-3 text-sm text-[#34425a] outline-none transition-colors focus:border-[#7ca5ed] focus:ring-2 focus:ring-[#e9f1ff]";

export default function NewMeetingPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [checkinStart, setCheckinStart] = useState("");
  const [checkinEnd, setCheckinEnd] = useState("");
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadGroups() {
      if (!supabase) {
        setError("尚未配置 Supabase，请先填写 .env.local 中的连接信息");
        return;
      }
      const { data, error: queryError } = await supabase
        .from("groups")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });
      if (queryError) setError(`加载名单失败：${queryError.message}`);
      else setGroups(data ?? []);
    }
    void loadGroups();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return setError("会议名称不能为空");
    if (!groupId) return setError("请选择人员名单");
    if (!meetingDate || !checkinStart || !checkinEnd)
      return setError("请完整填写会议日期和签到时间");
    const start = new Date(`${meetingDate}T${checkinStart}`);
    const end = new Date(`${meetingDate}T${checkinEnd}`);
    if (end <= start) return setError("签到截止时间必须晚于签到开始时间");
    if (!supabase) return setError("尚未配置 Supabase，请先填写 .env.local");
    setIsSaving(true);
    setError("");
    const checkinToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    const { data, error: insertError } = await supabase
      .from("meetings")
      .insert({
        title: title.trim(),
        group_id: groupId,
        meeting_date: meetingDate,
        checkin_start: start.toISOString(),
        checkin_end: end.toISOString(),
        feedback_enabled: feedbackEnabled,
        status: "not_started",
        checkin_token: checkinToken,
      })
      .select("id")
      .single();
    if (insertError) {
      setError(`创建会议失败：${insertError.message}`);
      setIsSaving(false);
      return;
    }
    router.replace(`/meetings/${data.id}`);
  }
  return (
    <div className="min-h-screen px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <div className="mb-8">
        <Link
          href="/meetings"
          className="cursor-pointer text-xs font-semibold text-[#71819a] transition-colors hover:text-[#5b8def]"
        >
          ← 返回会议管理
        </Link>
      </div>
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#6c7b95] lg:hidden">
          <span className="font-bold text-[#5b8def]">C</span> ClassHub
        </div>
        <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#17233a] sm:text-[32px]">
          新建会议
        </h1>
        <p className="mt-2 text-sm text-[#7d899e]">
          填写会议安排，创建新的班级会议
        </p>
      </header>
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)] sm:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold text-[#34425a]">
              会议名称
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder="例如：第一次班会"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold text-[#34425a]">
              选择人员名单
            </span>
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className={inputClass}
            >
              <option value="">请选择人员名单</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-semibold text-[#34425a]">
              会议日期
            </span>
            <input
              type="date"
              className={inputClass}
              value={meetingDate}
              onChange={(event) => setMeetingDate(event.target.value)}
            />
          </label>
          <label>
            <span className="text-sm font-semibold text-[#34425a]">
              签到开始时间
            </span>
            <input
              type="time"
              value={checkinStart}
              onChange={(event) => setCheckinStart(event.target.value)}
              className={inputClass}
            />
          </label>
          <label>
            <span className="text-sm font-semibold text-[#34425a]">
              签到截止时间
            </span>
            <input
              type="time"
              value={checkinEnd}
              onChange={(event) => setCheckinEnd(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <div className="mt-7 border-t border-[#edf0f5] pt-6">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={feedbackEnabled}
              onChange={(event) => setFeedbackEnabled(event.target.checked)}
              className="h-4 w-4 accent-[#5b8def]"
            />
            <span>
              <span className="block text-sm font-semibold text-[#34425a]">
                是否开启会后反馈
              </span>
              <span className="mt-1 block text-xs text-[#9aa5b7]">
                会议结束后收集成员的意见与建议
              </span>
            </span>
          </label>
        </div>
        {error && (
          <p className="mt-5 rounded-xl border border-[#f0d9d9] bg-[#fff8f8] px-3 py-3 text-xs text-[#cb7373]">
            {error}
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Link
            href="/meetings"
            className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-[#dfe6f1] px-5 text-sm font-semibold text-[#61718b] transition-colors hover:border-[#c8d7ef]"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#5b8def] px-6 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-[#4d7fdc] disabled:cursor-wait disabled:opacity-50"
          >
            {isSaving ? "创建中..." : "创建会议"}
          </button>
        </div>
      </form>
    </div>
  );
}
