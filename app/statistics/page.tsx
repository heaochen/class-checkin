"use client";

import { useEffect, useState } from "react";
import { exportStatisticsWorkbook } from "@/lib/export";
import {
  supabase,
  type Attendance,
  type Feedback,
  type Member,
} from "@/lib/supabase";

type Group = { id: string; name: string };
type Meeting = {
  id: string;
  title: string;
  group_id: string;
  meeting_date: string;
};
type MeetingStat = Meeting & {
  groupName: string;
  expected: number;
  attended: number;
  absent: number;
  rate: string;
  feedbackCount: number;
  averageRating: string;
};
type MemberStat = Member & {
  groupName: string;
  expected: number;
  attended: number;
  absent: number;
  rate: string;
};
type StatisticsData = {
  totalMembers: number;
  totalMeetings: number;
  attendanceRate: string;
  totalFeedback: number;
  averageRating: string;
  meetingStats: MeetingStat[];
  memberStats: MemberStat[];
  distribution: Record<number, number>;
};

export default function StatisticsPage() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStatistics() {
      if (!supabase) {
        setError("尚未配置 Supabase，请先填写 .env.local 中的连接信息");
        setIsLoading(false);
        return;
      }
      const client = supabase;
      const [
        groupsResult,
        membersResult,
        meetingsResult,
        attendanceResult,
        feedbackResult,
      ] = await Promise.all([
        client.from("groups").select("id, name"),
        client
          .from("members")
          .select("id, group_id, student_id, name, created_at"),
        client.from("meetings").select("id, title, group_id, meeting_date"),
        client
          .from("attendance")
          .select(
            "id, meeting_id, member_id, checkin_time, checkin_method, created_at",
          ),
        client
          .from("feedback")
          .select(
            "id, meeting_id, member_id, rating, content, anonymous, created_at",
          ),
      ]);

      if (
        groupsResult.error ||
        membersResult.error ||
        meetingsResult.error ||
        attendanceResult.error ||
        feedbackResult.error
      ) {
        setError("部分统计数据加载失败，当前页面显示可用数据");
      }

      const groups = (groupsResult.data as Group[]) ?? [];
      const members = (membersResult.data as Member[]) ?? [];
      const meetings = (meetingsResult.data as Meeting[]) ?? [];
      const attendance = (attendanceResult.data as Attendance[]) ?? [];
      const feedback = (feedbackResult.data as Feedback[]) ?? [];
      const memberCounts = new Map<string, number>();
      const groupNames = new Map(groups.map((group) => [group.id, group.name]));
      for (const member of members)
        memberCounts.set(
          member.group_id,
          (memberCounts.get(member.group_id) ?? 0) + 1,
        );

      const meetingStats = [...meetings]
        .sort((first, second) =>
          second.meeting_date.localeCompare(first.meeting_date),
        )
        .map((meeting) => {
          const expected = memberCounts.get(meeting.group_id) ?? 0;
          const attended = attendance.filter(
            (record) => record.meeting_id === meeting.id,
          ).length;
          const meetingFeedback = feedback.filter(
            (item) => item.meeting_id === meeting.id,
          );
          const ratedMeetingFeedback = meetingFeedback.filter(
            (item): item is Feedback & { rating: number } =>
              item.rating !== null,
          );
          return {
            ...meeting,
            groupName: groupNames.get(meeting.group_id) ?? "未知分组",
            expected,
            attended,
            absent: Math.max(expected - attended, 0),
            rate: expected
              ? `${((attended / expected) * 100).toFixed(1)}%`
              : "0.0%",
            feedbackCount: meetingFeedback.length,
            averageRating: ratedMeetingFeedback.length
              ? (
                  ratedMeetingFeedback.reduce(
                    (total, item) => total + item.rating,
                    0,
                  ) / ratedMeetingFeedback.length
                ).toFixed(1)
              : "暂无",
          };
        });

      const meetingsByGroup = new Map<string, Meeting[]>();
      for (const meeting of meetings)
        meetingsByGroup.set(meeting.group_id, [
          ...(meetingsByGroup.get(meeting.group_id) ?? []),
          meeting,
        ]);
      const attendanceKeys = new Set(
        attendance.map((record) => `${record.meeting_id}:${record.member_id}`),
      );
      const memberStats = members.map((member) => {
        const groupMeetings = meetingsByGroup.get(member.group_id) ?? [];
        const attended = groupMeetings.filter((meeting) =>
          attendanceKeys.has(`${meeting.id}:${member.id}`),
        ).length;
        return {
          ...member,
          groupName: groupNames.get(member.group_id) ?? "未知分组",
          expected: groupMeetings.length,
          attended,
          absent: Math.max(groupMeetings.length - attended, 0),
          rate: groupMeetings.length
            ? `${((attended / groupMeetings.length) * 100).toFixed(1)}%`
            : "0.0%",
        };
      });

      const theoreticalAttendance = meetingStats.reduce(
        (total, meeting) => total + meeting.expected,
        0,
      );
      const actualAttendance = meetingStats.reduce(
        (total, meeting) => total + meeting.attended,
        0,
      );
      const ratedFeedback = feedback.filter(
        (item): item is Feedback & { rating: number } => item.rating !== null,
      );
      const distribution: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
      for (const item of ratedFeedback)
        if (item.rating >= 1 && item.rating <= 5)
          distribution[item.rating] += 1;

      setData({
        totalMembers: members.length,
        totalMeetings: meetings.length,
        attendanceRate: theoreticalAttendance
          ? `${((actualAttendance / theoreticalAttendance) * 100).toFixed(1)}%`
          : "0.0%",
        totalFeedback: feedback.length,
        averageRating: ratedFeedback.length
          ? (
              ratedFeedback.reduce((total, item) => total + item.rating, 0) /
              ratedFeedback.length
            ).toFixed(1)
          : "暂无",
        meetingStats,
        memberStats,
        distribution,
      });
      setIsLoading(false);
    }
    void loadStatistics();
  }, []);

  function exportStatistics() {
    if (!data) return;
    try {
      exportStatisticsWorkbook(
        data.meetingStats.map((meeting) => ({
          title: meeting.title,
          date: meeting.meeting_date,
          groupName: meeting.groupName,
          expected: meeting.expected,
          attended: meeting.attended,
          absent: meeting.absent,
          attendanceRate: meeting.expected
            ? meeting.attended / meeting.expected
            : 0,
          feedbackCount: meeting.feedbackCount,
          averageRating: meeting.averageRating,
        })),
        data.memberStats.map((member) => ({
          name: member.name,
          studentId: member.student_id,
          groupName: member.groupName,
          expected: member.expected,
          attended: member.attended,
          absent: member.absent,
          attendanceRate: member.expected
            ? member.attended / member.expected
            : 0,
        })),
      );
      setError("");
    } catch {
      setError("导出失败，请稍后重试");
    }
  }

  return (
    <div className="min-h-screen px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#6c7b95] lg:hidden">
            <span className="font-bold text-[#5b8def]">C</span> ClassHub
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#17233a] sm:text-[32px]">
            数据统计
          </h1>
          <p className="mt-2 text-sm text-[#7d899e]">
            查看班级会议与签到情况概览
          </p>
        </div>
        <button
          type="button"
          onClick={exportStatistics}
          disabled={isLoading || !data}
          className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-[#dfe6f1] bg-white px-4 text-sm font-semibold text-[#61718b] transition-colors hover:border-[#c8d7ef] hover:bg-[#fafcff] disabled:cursor-wait disabled:opacity-50"
        >
          导出统计报表
        </button>
      </header>
      {error && (
        <div className="mb-6 rounded-xl border border-[#f0d9d9] bg-[#fff8f8] px-4 py-3 text-sm text-[#cb7373]">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="rounded-2xl border border-[#e8ecf3] bg-white p-10 text-center text-sm text-[#9aa5b7]">
          正在加载统计数据...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Summary
              label="总成员数"
              value={`${data?.totalMembers ?? 0}`}
              tone="blue"
            />
            <Summary
              label="会议总数"
              value={`${data?.totalMeetings ?? 0}`}
              tone="mint"
            />
            <Summary
              label="平均签到率"
              value={data?.attendanceRate ?? "0.0%"}
              tone="orange"
            />
            <Summary
              label="总反馈数"
              value={`${data?.totalFeedback ?? 0}`}
              tone="purple"
            />
            <Summary
              label="平均反馈评分"
              value={data?.averageRating ?? "暂无"}
              tone="blue"
            />
          </div>

          <section className="mt-7 rounded-2xl border border-[#e8ecf3] bg-white shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
            <SectionTitle
              title="会议签到统计"
              detail="按会议日期从新到旧排列"
            />
            {data?.meetingStats.length === 0 ? (
              <EmptyState text="暂无会议数据" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
                  <thead className="bg-[#fafbfc] text-xs text-[#8d99aa]">
                    <tr>
                      <th className="px-6 py-4 font-medium">会议名称</th>
                      <th className="px-6 py-4 font-medium">日期</th>
                      <th className="px-6 py-4 font-medium">应到人数</th>
                      <th className="px-6 py-4 font-medium">实到人数</th>
                      <th className="px-6 py-4 font-medium">未签到人数</th>
                      <th className="px-6 py-4 font-medium">签到率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f5]">
                    {data?.meetingStats.map((meeting) => (
                      <tr key={meeting.id} className="text-sm text-[#34425a]">
                        <td className="px-6 py-4 font-medium">
                          {meeting.title}
                        </td>
                        <td className="px-6 py-4 text-[#71819a]">
                          {meeting.meeting_date}
                        </td>
                        <td className="px-6 py-4">{meeting.expected}</td>
                        <td className="px-6 py-4">{meeting.attended}</td>
                        <td className="px-6 py-4">{meeting.absent}</td>
                        <td className="px-6 py-4 font-semibold text-[#5b8def]">
                          {meeting.rate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-7 rounded-2xl border border-[#e8ecf3] bg-white shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
            <SectionTitle
              title="个人签到统计"
              detail="只统计成员所属分组的会议"
            />
            {data?.memberStats.length === 0 ? (
              <EmptyState text="暂无成员数据" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-[#fafbfc] text-xs text-[#8d99aa]">
                    <tr>
                      <th className="px-6 py-4 font-medium">姓名</th>
                      <th className="px-6 py-4 font-medium">学号</th>
                      <th className="px-6 py-4 font-medium">所属分组</th>
                      <th className="px-6 py-4 font-medium">应参加会议</th>
                      <th className="px-6 py-4 font-medium">已签到次数</th>
                      <th className="px-6 py-4 font-medium">缺勤次数</th>
                      <th className="px-6 py-4 font-medium">个人签到率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f5]">
                    {data?.memberStats.map((member) => (
                      <tr key={member.id} className="text-sm text-[#34425a]">
                        <td className="px-6 py-4 font-medium">{member.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-[#71819a]">
                          {member.student_id}
                        </td>
                        <td className="px-6 py-4">{member.groupName}</td>
                        <td className="px-6 py-4">{member.expected}</td>
                        <td className="px-6 py-4">{member.attended}</td>
                        <td className="px-6 py-4">{member.absent}</td>
                        <td className="px-6 py-4 font-semibold text-[#5b8def]">
                          {member.rate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-7 rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)] sm:p-6">
            <SectionTitle
              title="反馈统计"
              detail="匿名反馈只参与汇总，不显示成员身份"
            />
            {data?.totalFeedback === 0 ? (
              <EmptyState text="暂无反馈数据" />
            ) : (
              <div className="grid gap-7 lg:grid-cols-[220px_1fr]">
                <div>
                  <p className="text-xs text-[#9aa5b7]">平均评分</p>
                  <p className="mt-2 text-3xl font-bold text-[#17233a]">
                    {data?.averageRating ?? "暂无"}
                  </p>
                </div>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div
                      key={rating}
                      className="flex items-center gap-3 text-sm text-[#34425a]"
                    >
                      <span className="w-10">{rating} 分</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edf0f5]">
                        <div
                          className="h-full rounded-full bg-[#f3a662]"
                          style={{
                            width: `${data && data.totalFeedback ? ((data.distribution[rating] / data.totalFeedback) * 100).toFixed(1) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-[#71819a]">
                        {data?.distribution[rating] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "mint" | "orange" | "purple";
}) {
  const colors = {
    blue: "bg-[#5b8def]",
    mint: "bg-[#50c3aa]",
    orange: "bg-[#f3a662]",
    purple: "bg-[#9e8ee8]",
  };
  return (
    <section className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
      <div className="mb-5 flex items-start justify-between">
        <span className="text-sm font-medium text-[#738099]">{label}</span>
        <span className={`h-2 w-2 rounded-full ${colors[tone]}`} />
      </div>
      <div className="text-[30px] font-bold tracking-[-0.04em] text-[#17233a]">
        {value}
      </div>
    </section>
  );
}

function SectionTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-b border-[#edf0f5] px-5 py-5 sm:px-6">
      <h2 className="text-base font-bold text-[#17233a]">{title}</h2>
      <p className="mt-1 text-xs text-[#9aa5b7]">{detail}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="px-5 py-10 text-center text-sm text-[#9aa5b7]">{text}</p>
  );
}
