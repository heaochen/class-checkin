import * as XLSX from "xlsx";

export type MeetingExportMember = {
  name: string;
  studentId: string;
  checkinTime?: string;
  checkinMethod?: string;
};

export type MeetingExportFeedback = {
  anonymous: boolean;
  memberName?: string;
  rating: number | null;
  content: string | null;
  createdAt: string;
};

export type MeetingExportData = {
  title: string;
  groupName: string;
  meetingDate: string;
  expected: number;
  attended: number;
  absent: number;
  attendanceRate: number;
  members: MeetingExportMember[];
  feedbackEnabled: boolean;
  feedback: MeetingExportFeedback[];
};

export type StatisticsMeetingExportRow = {
  title: string;
  date: string;
  groupName: string;
  expected: number;
  attended: number;
  absent: number;
  attendanceRate: number;
  feedbackCount: number;
  averageRating: string;
};

export type StatisticsMemberExportRow = {
  name: string;
  studentId: string;
  groupName: string;
  expected: number;
  attended: number;
  absent: number;
  attendanceRate: number;
};

export function exportMeetingWorkbook(data: MeetingExportData) {
  const summaryRows: unknown[][] = [
    ["会议名称", data.title],
    ["所属班级", data.groupName],
    ["会议日期", data.meetingDate],
    ["应到人数", data.expected],
    ["实到人数", data.attended],
    ["缺勤人数", data.absent],
    ["签到率", data.attendanceRate],
    [],
    [
      "序号",
      "姓名",
      "学号",
      "所属班级/分组",
      "签到状态",
      "签到时间",
      "签到方式",
    ],
  ];

  if (data.members.length === 0) {
    summaryRows.push(["暂无成员数据"]);
  } else {
    data.members.forEach((member, index) => {
      summaryRows.push([
        index + 1,
        member.name,
        member.studentId,
        data.groupName,
        member.checkinTime ? "已签到" : "未签到",
        member.checkinTime ? formatDateTime(member.checkinTime) : "",
        member.checkinTime ? formatCheckinMethod(member.checkinMethod) : "-",
      ]);
    });
  }

  const workbook = XLSX.utils.book_new();
  const detailSheet = XLSX.utils.aoa_to_sheet(summaryRows);
  detailSheet["B7"] = { v: data.attendanceRate, t: "n", z: "0.0%" };
  detailSheet["!cols"] = [
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 22 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, detailSheet, "签到明细");

  if (data.feedbackEnabled) {
    const feedbackRows: unknown[][] = data.feedback.length
      ? [["序号", "提交身份", "评分", "反馈内容", "提交时间"]]
      : [["暂无反馈数据"]];
    data.feedback.forEach((item, index) => {
      feedbackRows.push([
        index + 1,
        item.anonymous ? "匿名用户" : (item.memberName ?? "实名用户"),
        item.rating ?? "",
        item.content ?? "",
        formatDateTime(item.createdAt),
      ]);
    });
    const feedbackSheet = XLSX.utils.aoa_to_sheet(feedbackRows);
    feedbackSheet["!cols"] = [
      { wch: 10 },
      { wch: 18 },
      { wch: 10 },
      { wch: 60 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(workbook, feedbackSheet, "会后反馈");
  }

  XLSX.writeFile(
    workbook,
    `${safeFilePart(data.title)}_签到统计_${today()}.xlsx`,
  );
}

export function exportStatisticsWorkbook(
  meetings: StatisticsMeetingExportRow[],
  members: StatisticsMemberExportRow[],
) {
  const meetingRows: unknown[][] = meetings.length
    ? [
        [
          "会议名称",
          "日期",
          "所属班级",
          "应到人数",
          "实到人数",
          "缺勤人数",
          "签到率",
          "反馈数",
          "平均评分",
        ],
      ]
    : [["暂无会议数据"]];
  meetings.forEach((meeting) => {
    meetingRows.push([
      meeting.title,
      meeting.date,
      meeting.groupName,
      meeting.expected,
      meeting.attended,
      meeting.absent,
      meeting.attendanceRate,
      meeting.feedbackCount,
      meeting.averageRating,
    ]);
  });

  const memberRows: unknown[][] = members.length
    ? [
        [
          "姓名",
          "学号",
          "所属班级",
          "应参加会议数",
          "已签到次数",
          "缺勤次数",
          "个人签到率",
        ],
      ]
    : [["暂无成员数据"]];
  members.forEach((member) => {
    memberRows.push([
      member.name,
      member.studentId,
      member.groupName,
      member.expected,
      member.attended,
      member.absent,
      member.attendanceRate,
    ]);
  });

  const workbook = XLSX.utils.book_new();
  const meetingSheet = XLSX.utils.aoa_to_sheet(meetingRows);
  const memberSheet = XLSX.utils.aoa_to_sheet(memberRows);
  meetings.forEach((_, index) => {
    const row = index + 2;
    meetingSheet[`G${row}`] = {
      v: meetings[index].attendanceRate,
      t: "n",
      z: "0.0%",
    };
  });
  members.forEach((_, index) => {
    const row = index + 2;
    memberSheet[`G${row}`] = {
      v: members[index].attendanceRate,
      t: "n",
      z: "0.0%",
    };
  });
  meetingSheet["!cols"] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
  ];
  memberSheet["!cols"] = [
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, meetingSheet, "会议统计");
  XLSX.utils.book_append_sheet(workbook, memberSheet, "成员统计");
  XLSX.writeFile(workbook, `ClassHub_统计报表_${today()}.xlsx`);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatCheckinMethod(method?: string) {
  if (method === "qr") return "扫码签到";
  if (method === "manual") return "管理员补签";
  return "-";
}

function today() {
  return formatDateTime(new Date().toISOString()).slice(0, 10);
}

function safeFilePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "ClassHub";
}
