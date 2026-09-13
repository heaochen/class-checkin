import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export type Group = {
  id: string;
  name: string;
  created_at: string;
};

export type Member = {
  id: string;
  group_id: string;
  student_id: string;
  name: string;
  created_at: string;
};

export type Attendance = {
  id: string;
  meeting_id: string;
  member_id: string;
  checkin_time: string;
  checkin_method: string;
  created_at: string;
};

export type Feedback = {
  id: string;
  meeting_id: string;
  member_id: string | null;
  rating: number | null;
  content: string | null;
  anonymous: boolean;
  created_at: string;
};

export type Meeting = {
  id: string;
  title: string;
  group_id: string;
  meeting_date: string;
  checkin_start: string;
  checkin_end: string;
  feedback_enabled: boolean;
  status: string;
  checkin_token: string;
  created_at: string;
  groups?: { name: string }[] | null;
};

export type MeetingStatus = "未开始" | "签到中" | "已结束";

export function getMeetingStatus(
  checkinStart: string,
  checkinEnd: string,
  now = new Date(),
): MeetingStatus {
  const currentTime = now.getTime();
  if (currentTime < new Date(checkinStart).getTime()) return "未开始";
  if (currentTime <= new Date(checkinEnd).getTime()) return "签到中";
  return "已结束";
}
