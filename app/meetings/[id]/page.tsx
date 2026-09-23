"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { exportMeetingWorkbook } from "@/lib/export";
import {
  getMeetingStatus,
  supabase,
  type Attendance,
  type Feedback,
  type Meeting,
  type Member,
} from "@/lib/supabase";

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [actionMemberId, setActionMemberId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(
      /\/+$/,
      "",
    );
    const timer = window.setTimeout(
      () => setOrigin(configuredAppUrl || window.location.origin),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadMeeting() {
      if (!supabase) {
        setError("尚未配置 Supabase，请先填写 .env.local 中的连接信息");
        setIsLoading(false);
        return;
      }
      const { data, error: queryError } = await supabase
        .from("meetings")
        .select(
          "id, title, group_id, meeting_date, checkin_start, checkin_end, feedback_enabled, status, checkin_token, created_at, groups(name)",
        )
        .eq("id", id)
        .maybeSingle();
      if (queryError) {
        setError(`加载会议失败：${queryError.message}`);
      } else if (!data) {
        setError("没有找到这场会议");
      } else {
        const loadedMeeting = data as Meeting;
        const [memberResult, attendanceResult, feedbackResult] =
          await Promise.all([
            supabase
              .from("members")
              .select("id, group_id, student_id, name, created_at")
              .eq("group_id", loadedMeeting.group_id)
              .order("created_at", { ascending: true }),
            supabase
              .from("attendance")
              .select(
                "id, meeting_id, member_id, checkin_time, checkin_method, created_at",
              )
              .eq("meeting_id", loadedMeeting.id)
              .order("checkin_time", { ascending: true }),
            supabase
              .from("feedback")
              .select(
                "id, meeting_id, member_id, rating, content, anonymous, created_at",
              )
              .eq("meeting_id", loadedMeeting.id)
              .order("created_at", { ascending: false }),
          ]);
        if (memberResult.error)
          setError(`加载成员失败：${memberResult.error.message}`);
        else setMembers(memberResult.data ?? []);
        if (attendanceResult.error)
          setError(`加载签到记录失败：${attendanceResult.error.message}`);
        else setAttendance(attendanceResult.data ?? []);
        if (feedbackResult.error)
          setError(`加载反馈失败：${feedbackResult.error.message}`);
        else setFeedback(feedbackResult.data ?? []);
        setMeeting(loadedMeeting);
      }
      setIsLoading(false);
    }
    if (id) void loadMeeting();
  }, [id, reloadToken]);

  if (isLoading)
    return (
      <div className="min-h-screen px-5 py-12 text-center text-sm text-[#9aa5b7]">
        正在加载会议...
      </div>
    );
  if (!meeting)
    return (
      <div className="min-h-screen px-5 py-12 text-center text-sm text-[#cb7373]">
        {error || "没有找到这场会议"}
      </div>
    );
  const status = getMeetingStatus(meeting.checkin_start, meeting.checkin_end);
  const attendanceByMemberId = new Map(
    attendance.map((record) => [record.member_id, record]),
  );
  const checkedInMembers = members.filter((member) =>
    attendanceByMemberId.has(member.id),
  );
  const absentMembers = members.filter(
    (member) => !attendanceByMemberId.has(member.id),
  );
  const attendanceRate = members.length
    ? `${((checkedInMembers.length / members.length) * 100).toFixed(1)}%`
    : "0.0%";
  const ratedFeedback = feedback.filter(
    (item): item is Feedback & { rating: number } => item.rating !== null,
  );
  const averageRating = ratedFeedback.length
    ? (
        ratedFeedback.reduce((total, item) => total + item.rating, 0) /
        ratedFeedback.length
      ).toFixed(1)
    : "暂无";
  const memberById = new Map(members.map((member) => [member.id, member]));
  const checkinPath = `/checkin/${meeting.checkin_token}`;
  const resolvedOrigin = (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/+$/, "");
  const checkinUrl = `${resolvedOrigin}${checkinPath}`;

  async function copyCheckinUrl() {
    await navigator.clipboard.writeText(checkinUrl);
    setCopyMessage("考勤链接已复制");
    window.setTimeout(() => setCopyMessage(""), 2000);
  }

  function openCheckinPage() {
    window.open(checkinUrl, "_blank", "noopener,noreferrer");
  }

  async function manuallyCheckIn(member: Member) {
    if (!supabase || !meeting) return;
    const confirmed = window.confirm(
      `确认补签？\n姓名：${member.name}\n学号：${member.student_id}`,
    );
    if (!confirmed) return;

    setActionMemberId(member.id);
    setActionMessage("");
    setError("");
    const { error: insertError } = await supabase.from("attendance").insert({
      meeting_id: meeting.id,
      member_id: member.id,
      checkin_method: "manual",
    });
    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "该成员已经签到，不能重复补签"
          : `补签失败：${insertError.message}`,
      );
    } else {
      setActionMessage("补签成功");
      setReloadToken((current) => current + 1);
    }
    setActionMemberId(null);
  }

  async function cancelCheckIn(member: Member) {
    if (!supabase) return;
    const record = attendanceByMemberId.get(member.id);
    if (!record) return;
    const confirmed = window.confirm(
      `确定取消 ${member.name} 的签到记录吗？取消后该成员将重新变为未签到。`,
    );
    if (!confirmed) return;

    setActionMemberId(member.id);
    setActionMessage("");
    setError("");
    const { error: deleteError } = await supabase
      .from("attendance")
      .delete()
      .eq("id", record.id);
    if (deleteError) {
      setError(`取消签到失败：${deleteError.message}`);
    } else {
      setActionMessage("已取消签到");
      setReloadToken((current) => current + 1);
    }
    setActionMemberId(null);
  }

  function exportMeeting() {
    if (!meeting) return;
    try {
      exportMeetingWorkbook({
        title: meeting.title,
        groupName: meeting.groups?.[0]?.name ?? "未知名单",
        meetingDate: meeting.meeting_date,
        expected: members.length,
        attended: checkedInMembers.length,
        absent: absentMembers.length,
        attendanceRate: members.length
          ? checkedInMembers.length / members.length
          : 0,
        members: members.map((member) => {
          const record = attendanceByMemberId.get(member.id);
          return {
            name: member.name,
            studentId: member.student_id,
            checkinTime: record?.checkin_time,
            checkinMethod: record?.checkin_method,
          };
        }),
        feedbackEnabled: meeting.feedback_enabled,
        feedback: feedback.map((item) => ({
          anonymous: item.anonymous,
          memberName: item.anonymous
            ? undefined
            : item.member_id
              ? memberById.get(item.member_id)?.name
              : undefined,
          rating: item.rating,
          content: item.content,
          createdAt: item.created_at,
        })),
      });
      setActionMessage("签到表已导出");
      setError("");
    } catch {
      setError("导出失败，请稍后重试");
    }
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#17233a] sm:text-[32px]">
              {meeting.title}
            </h1>
            <p className="mt-2 text-sm text-[#7d899e]">
              {meeting.meeting_date}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-fit rounded-full bg-[#edf7f1] px-3 py-1.5 text-xs font-medium text-[#43a278]">
              {status}
            </span>
            <button
              type="button"
              onClick={exportMeeting}
              className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-[#dfe6f1] bg-white px-4 text-sm font-semibold text-[#61718b] transition-colors hover:border-[#c8d7ef] hover:bg-[#fafcff]"
            >
              导出签到表
            </button>
          </div>
        </div>
      </header>
      {error && (
        <div className="mb-6 rounded-xl border border-[#f0d9d9] bg-[#fff8f8] px-4 py-3 text-sm text-[#cb7373]">
          {error}
        </div>
      )}
      {actionMessage && (
        <div className="mb-6 rounded-xl border border-[#d9eee4] bg-[#f3fbf7] px-4 py-3 text-sm text-[#43a278]">
          {actionMessage}
        </div>
      )}
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
          <p className="text-xs text-[#9aa5b7]">绑定名单</p>
          <p className="mt-2 text-lg font-bold text-[#17233a]">
            {meeting.groups?.[0]?.name ?? "未知名单"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
          <p className="text-xs text-[#9aa5b7]">签到时间</p>
          <p className="mt-2 text-lg font-bold text-[#5b8def]">
            {new Date(meeting.checkin_start).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            -{" "}
            {new Date(meeting.checkin_end).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
          <p className="text-xs text-[#9aa5b7]">会后反馈</p>
          <p className="mt-2 text-lg font-bold text-[#17233a]">
            {meeting.feedback_enabled ? "已开启" : "未开启"}
          </p>
        </div>
      </div>
      <section className="mb-7 rounded-2xl border border-[#e8ecf3] bg-white p-6 shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-[#17233a]">学生考勤链接</h2>
            <p className="mt-2 text-xs text-[#9aa5b7]">
              复制链接后，可使用任意静态二维码生成工具制作二维码。
            </p>
          </div>

          <div className="rounded-xl border border-[#edf0f5] bg-[#f9fbff] p-4">
            <p className="max-w-full break-all text-sm font-medium text-[#2f3d52]">
              {checkinUrl}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyCheckinUrl()}
              className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-[#dfe6f1] px-4 text-sm font-semibold text-[#61718b] transition-colors hover:border-[#c8d7ef] hover:bg-[#fafcff]"
            >
              复制考勤链接
            </button>
            <button
              type="button"
              onClick={openCheckinPage}
              className="flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#5b8def] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-[#4d7fdc]"
            >
              打开考勤页面
            </button>
          </div>

          {copyMessage && (
            <p className="text-xs text-[#43a278]">{copyMessage}</p>
          )}
        </div>
      </section>
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
          <p className="text-xs text-[#9aa5b7]">签到人数</p>
          <p className="mt-2 text-2xl font-bold text-[#17233a]">
            {checkedInMembers.length} / {members.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
          <p className="text-xs text-[#9aa5b7]">签到率</p>
          <p className="mt-2 text-2xl font-bold text-[#5b8def]">
            {attendanceRate}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
          <p className="text-xs text-[#9aa5b7]">名单总人数</p>
          <p className="mt-2 text-2xl font-bold text-[#17233a]">
            {members.length}
          </p>
        </div>
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#e8ecf3] bg-white shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
        <div className="grid gap-0 divide-y divide-[#edf0f5] md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#17233a]">已签到成员</h2>
              <span className="text-xs text-[#43a278]">
                {checkedInMembers.length} 人
              </span>
            </div>
            <div className="space-y-3">
              {checkedInMembers.length === 0 ? (
                <p className="text-sm text-[#9aa5b7]">暂无签到记录</p>
              ) : (
                checkedInMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center gap-3 text-sm text-[#34425a]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{member.name}</span>
                      <span className="ml-2 text-xs text-[#9aa5b7]">
                        {member.student_id}
                      </span>
                    </span>
                    <span className="text-xs text-[#43a278]">
                      <span className="block">
                        {new Date(
                          attendanceByMemberId.get(member.id)!.checkin_time,
                        ).toLocaleString("zh-CN")}
                      </span>
                      <span className="mt-1 block text-[#71819a]">
                        {formatCheckinMethod(
                          attendanceByMemberId.get(member.id)!.checkin_method,
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={actionMemberId === member.id}
                      onClick={() => void cancelCheckIn(member)}
                      className="cursor-pointer text-xs font-semibold text-[#9a7d86] transition-colors hover:text-[#7c5965] disabled:cursor-wait disabled:opacity-50"
                    >
                      取消签到
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#17233a]">未签到成员</h2>
              <span className="text-xs text-[#c7843d]">
                {absentMembers.length} 人
              </span>
            </div>
            <div className="space-y-3">
              {absentMembers.length === 0 ? (
                <p className="text-sm text-[#9aa5b7]">全部成员已签到</p>
              ) : (
                absentMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center gap-3 text-sm text-[#34425a]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{member.name}</span>
                      <span className="ml-2 text-xs text-[#9aa5b7]">
                        {member.student_id}
                      </span>
                    </span>
                    <span className="text-xs text-[#c7843d]">未签到</span>
                    <button
                      type="button"
                      disabled={actionMemberId === member.id}
                      onClick={() => void manuallyCheckIn(member)}
                      className="cursor-pointer rounded-lg bg-[#edf4ff] px-3 py-1 text-xs font-semibold text-[#5b8def] transition-colors hover:bg-[#e2edff] disabled:cursor-wait disabled:opacity-50"
                    >
                      {actionMemberId === member.id ? "处理中..." : "补签"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="mt-7 overflow-hidden rounded-2xl border border-[#e8ecf3] bg-white shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
        <div className="border-b border-[#edf0f5] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#17233a]">会后反馈</h2>
              <p className="mt-1 text-xs text-[#9aa5b7]">
                共 {feedback.length} 条反馈
              </p>
            </div>
            <span className="rounded-full bg-[#fff5e7] px-3 py-1 text-xs font-medium text-[#c7843d]">
              平均评分：{averageRating}
            </span>
          </div>
        </div>
        <div className="divide-y divide-[#edf0f5]">
          {feedback.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[#9aa5b7]">
              暂无反馈
            </p>
          ) : (
            feedback.map((item) => {
              const member =
                item.anonymous || !item.member_id
                  ? null
                  : memberById.get(item.member_id);
              return (
                <article key={item.id} className="px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[#34425a]">
                        {member ? member.name : "匿名用户"}
                      </span>
                      {member && (
                        <span className="text-xs text-[#9aa5b7]">
                          {member.student_id}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-[#e9a05d]">
                        {item.rating ?? "-"} / 5
                      </span>
                    </div>
                    <span className="text-xs text-[#9aa5b7]">
                      {new Date(item.created_at).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#61718b]">
                    {item.content || "未填写文字反馈"}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function formatCheckinMethod(method: string) {
  return method === "manual" ? "管理员补签" : "扫码签到";
}
