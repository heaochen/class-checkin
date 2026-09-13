"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMeetingStatus, supabase, type Meeting } from "@/lib/supabase";

type MeetingListItem = Meeting & {
  checkedInCount: number;
  totalMemberCount: number;
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMeetings() {
      if (!supabase) {
        setError("尚未配置 Supabase，请先填写 .env.local 中的连接信息");
        setIsLoading(false);
        return;
      }
      const client = supabase;
      const { data, error: queryError } = await client
        .from("meetings")
        .select(
          "id, title, group_id, meeting_date, checkin_start, checkin_end, feedback_enabled, status, checkin_token, created_at, groups(name)",
        )
        .order("checkin_start", { ascending: false });
      if (queryError) {
        setError(`加载会议失败：${queryError.message}`);
      } else {
        const loadedMeetings = (data as Meeting[]) ?? [];
        const enrichedMeetings = await Promise.all(
          loadedMeetings.map(async (meeting) => {
            const [attendanceResult, membersResult] = await Promise.all([
              client
                .from("attendance")
                .select("id", { count: "exact", head: true })
                .eq("meeting_id", meeting.id),
              client
                .from("members")
                .select("id", { count: "exact", head: true })
                .eq("group_id", meeting.group_id),
            ]);
            if (attendanceResult.error || membersResult.error) {
              setError("加载签到统计失败，请刷新后重试");
            }
            return {
              ...meeting,
              checkedInCount: attendanceResult.count ?? 0,
              totalMemberCount: membersResult.count ?? 0,
            };
          }),
        );
        setMeetings(enrichedMeetings);
      }
      setIsLoading(false);
    }
    void loadMeetings();
  }, []);

  return (
    <div className="min-h-screen px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#6c7b95] lg:hidden">
            <span className="font-bold text-[#5b8def]">C</span> ClassHub
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#17233a] sm:text-[32px]">
            会议管理
          </h1>
          <p className="mt-2 text-sm text-[#7d899e]">
            安排会议、管理签到与查看会议记录
          </p>
        </div>
        <Link
          href="/meetings/new"
          className="flex h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[#5b8def] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-[#4d7fdc] sm:self-auto"
        >
          <span className="text-xl font-light leading-none">+</span> 新建会议
        </Link>
      </header>
      <section className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)] sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#17233a]">全部会议</h2>
            <p className="mt-1 text-xs text-[#9aa5b7]">
              共 {meetings.length} 场会议
            </p>
          </div>
          <span className="text-xs text-[#9aa5b7]">按时间排序</span>
        </div>
        {error && (
          <div className="mb-5 rounded-xl border border-[#f0d9d9] bg-[#fff8f8] px-4 py-3 text-sm text-[#cb7373]">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-sm text-[#9aa5b7]">
            正在加载会议...
          </div>
        ) : meetings.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#9aa5b7]">
            暂无会议
          </div>
        ) : (
          <div className="divide-y divide-[#edf0f5]">
            {meetings.map((meeting) => {
              const status = getMeetingStatus(
                meeting.checkin_start,
                meeting.checkin_end,
              );
              const statusTone =
                status === "已结束"
                  ? "done"
                  : status === "未开始"
                    ? "upcoming"
                    : "active";
              return (
                <div
                  key={meeting.id}
                  className="flex flex-col gap-4 py-5 first:pt-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${statusTone === "done" ? "bg-[#e9f1ff] text-[#5b8def]" : "bg-[#eaf8f5] text-[#50b69f]"}`}
                    >
                      ▣
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#273650]">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="cursor-pointer transition-colors hover:text-[#5b8def]"
                        >
                          {meeting.title}
                        </Link>
                      </h3>
                      <p className="mt-1 text-xs text-[#9aa5b7]">
                        {new Date(meeting.checkin_start).toLocaleString(
                          "zh-CN",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                      <p className="mt-1 text-xs text-[#9aa5b7]">
                        名单：{meeting.groups?.[0]?.name ?? "未知名单"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-5 pl-[52px] sm:pl-0">
                    <span className="text-xs font-semibold text-[#34425a]">
                      {meeting.checkedInCount} / {meeting.totalMemberCount}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusTone === "done" ? "bg-[#edf7f1] text-[#43a278]" : statusTone === "active" ? "bg-[#e9f1ff] text-[#5b8def]" : "bg-[#fff5e7] text-[#c7843d]"}`}
                    >
                      {status}
                    </span>
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-[#61718b] transition-colors hover:bg-[#f1f5fd] hover:text-[#5b8def]"
                    >
                      查看详情
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
