"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMeetingStatus, supabase, type Meeting } from "@/lib/supabase";

type DashboardMeeting = Meeting & {
  groupName: string;
  checkedInCount: number;
  totalMemberCount: number;
  feedbackCount: number;
};

type DashboardData = {
  totalMembers: number;
  totalMeetings: number;
  attendanceRate: string;
  totalFeedback: number;
  meetings: DashboardMeeting[];
};

const quickActions = [
  {
    label: "新建会议",
    detail: "安排下一场班级活动",
    icon: "+",
    tone: "blue",
    href: "/meetings/new",
  },
  {
    label: "导入人员名单",
    detail: "批量维护班级成员",
    icon: "↥",
    tone: "mint",
    href: "/groups",
  },
  {
    label: "查看签到记录",
    detail: "回顾每次出勤情况",
    icon: "↗",
    tone: "orange",
    href: "/meetings",
  },
];

function CalendarIcon() {
  return <span className="text-lg leading-none">▣</span>;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      if (!supabase) {
        setError("尚未配置 Supabase，请先填写 .env.local 中的连接信息");
        setIsLoading(false);
        return;
      }
      const client = supabase;
      const [membersResult, meetingsResult, attendanceResult, feedbackResult] =
        await Promise.all([
          client.from("members").select("id", { count: "exact", head: true }),
          client
            .from("meetings")
            .select(
              "id, title, group_id, meeting_date, checkin_start, checkin_end, feedback_enabled, status, checkin_token, created_at, groups(name)",
            )
            .order("created_at", { ascending: false }),
          client
            .from("attendance")
            .select("id", { count: "exact", head: true }),
          client.from("feedback").select("id", { count: "exact", head: true }),
        ]);

      const queryErrors = [
        membersResult.error,
        meetingsResult.error,
        attendanceResult.error,
        feedbackResult.error,
      ].filter(Boolean);
      if (queryErrors.length) {
        setError("部分仪表盘数据加载失败，请刷新后重试");
      }

      const meetings = (meetingsResult.data as Meeting[]) ?? [];
      const groupIds = [
        ...new Set(meetings.map((meeting) => meeting.group_id)),
      ];
      const groupCounts = new Map<string, number>();
      await Promise.all(
        groupIds.map(async (groupId) => {
          const result = await client
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("group_id", groupId);
          groupCounts.set(groupId, result.count ?? 0);
          if (result.error) setError("部分会议统计加载失败，请刷新后重试");
        }),
      );

      const enrichedMeetings = await Promise.all(
        meetings.slice(0, 5).map(async (meeting) => {
          const [attendance, feedback] = await Promise.all([
            client
              .from("attendance")
              .select("id", { count: "exact", head: true })
              .eq("meeting_id", meeting.id),
            client
              .from("feedback")
              .select("id", { count: "exact", head: true })
              .eq("meeting_id", meeting.id),
          ]);
          return {
            ...meeting,
            groupName: meeting.groups?.[0]?.name ?? "未知分组",
            checkedInCount: attendance.count ?? 0,
            totalMemberCount: groupCounts.get(meeting.group_id) ?? 0,
            feedbackCount: feedback.count ?? 0,
          };
        }),
      );
      const theoreticalAttendance = meetings.reduce(
        (total, meeting) => total + (groupCounts.get(meeting.group_id) ?? 0),
        0,
      );
      const attendanceRate = theoreticalAttendance
        ? `${(((attendanceResult.count ?? 0) / theoreticalAttendance) * 100).toFixed(1)}%`
        : "0.0%";
      setData({
        totalMembers: membersResult.count ?? 0,
        totalMeetings: meetings.length,
        attendanceRate,
        totalFeedback: feedbackResult.count ?? 0,
        meetings: enrichedMeetings,
      });
      setIsLoading(false);
    }
    void loadDashboard();
  }, []);

  const statistics = data
    ? [
        {
          label: "人员总数",
          value: `${data.totalMembers}`,
          note: "位班级成员",
          tone: "blue",
        },
        {
          label: "会议总数",
          value: `${data.totalMeetings}`,
          note: "场累计会议",
          tone: "mint",
        },
        {
          label: "总反馈数",
          value: `${data.totalFeedback}`,
          note: "条真实反馈",
          tone: "orange",
        },
        {
          label: "总签到率",
          value: data.attendanceRate,
          note: "按各会议应到人数计算",
          tone: "purple",
        },
      ]
    : [];

  return (
    <div className="min-h-screen px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#6c7b95] lg:hidden">
            <span className="font-bold text-[#5b8def]">C</span> ClassHub
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#17233a] sm:text-[32px]">
            仪表盘
          </h1>
          <p className="mt-2 text-sm text-[#7d899e]">
            欢迎回来，这里是你的班级会议管理中心
          </p>
        </div>
        <Link
          href="/meetings/new"
          className="flex h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[#5b8def] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-transform hover:-translate-y-0.5 hover:bg-[#4d7fdc] sm:self-auto"
        >
          <span className="text-xl font-light leading-none">+</span> 新建会议
        </Link>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-[#f0d9d9] bg-[#fff8f8] px-4 py-3 text-sm text-[#cb7373]">
          {error}
        </div>
      )}

      <div className="mb-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? ["人员总数", "会议总数", "总反馈数", "总签到率"].map((label) => (
              <div
                key={label}
                className="rounded-2xl border border-[#e8ecf3] bg-white p-5 text-sm text-[#9aa5b7]"
              >
                正在加载{label}...
              </div>
            ))
          : statistics.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)]"
              >
                <div className="mb-5 flex items-start justify-between">
                  <span className="text-sm font-medium text-[#738099]">
                    {stat.label}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${stat.tone === "blue" ? "bg-[#5b8def]" : stat.tone === "mint" ? "bg-[#50c3aa]" : stat.tone === "orange" ? "bg-[#f3a662]" : "bg-[#9e8ee8]"}`}
                  />
                </div>
                <div className="text-[30px] font-bold tracking-[-0.04em] text-[#17233a]">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-[#a0aabd]">{stat.note}</div>
              </div>
            ))}
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <section className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)] sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#17233a]">最近会议</h2>
              <p className="mt-1 text-xs text-[#9aa5b7]">
                查看近期班级会议安排与签到情况
              </p>
            </div>
            <Link
              href="/meetings"
              className="cursor-pointer text-xs font-semibold text-[#5b8def] transition-colors hover:text-[#3d6fca]"
            >
              查看全部 <span className="ml-1">→</span>
            </Link>
          </div>
          <div className="divide-y divide-[#edf0f5]">
            {!isLoading && data?.meetings.length === 0 && (
              <p className="py-10 text-center text-sm text-[#9aa5b7]">
                暂无会议数据
              </p>
            )}
            {data?.meetings.map((meeting) => {
              const status = getMeetingStatus(
                meeting.checkin_start,
                meeting.checkin_end,
              );
              const attendanceRate = meeting.totalMemberCount
                ? `${((meeting.checkedInCount / meeting.totalMemberCount) * 100).toFixed(1)}%`
                : "0.0%";
              return (
                <div
                  key={meeting.id}
                  className="flex flex-col gap-4 py-5 first:pt-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${status === "已结束" ? "bg-[#e9f1ff] text-[#5b8def]" : "bg-[#eaf8f5] text-[#50b69f]"}`}
                    >
                      <CalendarIcon />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#273650]">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="transition-colors hover:text-[#5b8def]"
                        >
                          {meeting.title}
                        </Link>
                      </h3>
                      <p className="mt-1 text-xs text-[#9aa5b7]">
                        {meeting.groupName} ·{" "}
                        {new Date(meeting.meeting_date).toLocaleDateString(
                          "zh-CN",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 pl-[52px] sm:pl-0">
                    <div>
                      <p className="text-xs text-[#9aa5b7]">签到人数</p>
                      <p className="mt-1 text-sm font-semibold text-[#34425a]">
                        {meeting.checkedInCount} / {meeting.totalMemberCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9aa5b7]">反馈数量</p>
                      <p className="mt-1 text-sm font-semibold text-[#34425a]">
                        {meeting.feedbackCount}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-medium ${status === "已结束" ? "bg-[#edf7f1] text-[#43a278]" : "bg-[#fff5e7] text-[#c7843d]"}`}
                    >
                      {status} · {attendanceRate}
                    </span>
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="cursor-pointer whitespace-nowrap text-xs font-semibold text-[#61718b] transition-colors hover:text-[#5b8def]"
                    >
                      查看详情
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)] sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-[#17233a]">快捷操作</h2>
            <p className="mt-1 text-xs text-[#9aa5b7]">常用功能快速入口</p>
          </div>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex w-full items-center gap-3 rounded-xl border border-[#edf0f5] p-3 text-left transition-colors hover:border-[#d5e0f5] hover:bg-[#fafcff]"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg font-light ${action.tone === "blue" ? "bg-[#e9f1ff] text-[#5b8def]" : action.tone === "mint" ? "bg-[#eaf8f5] text-[#50b69f]" : "bg-[#fff2e5] text-[#e9a05d]"}`}
                >
                  {action.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#34425a]">
                    {action.label}
                  </span>
                  <span className="mt-1 block text-[11px] text-[#9aa5b7]">
                    {action.detail}
                  </span>
                </span>
                <span className="text-[#b5bfce]">→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
