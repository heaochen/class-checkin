import { NextResponse } from "next/server";
import { getMeetingStatus, supabase } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!supabase || !token) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { data, error } = await supabase.rpc("get_checkin_meeting", {
      p_meeting_token: token,
    });
    if (error) throw error;

    const record = Array.isArray(data) ? data[0] : data;
    if (!record) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json({
      title: record.title,
      meeting_date: record.meeting_date,
      checkin_start: record.checkin_start,
      checkin_end: record.checkin_end,
      feedback_enabled: record.feedback_enabled,
      status: getMeetingStatus(record.checkin_start, record.checkin_end),
    });
  } catch (error) {
    console.error("Failed to load public meeting", error);
    return NextResponse.json(
      { error: "Failed to load meeting" },
      { status: 500 },
    );
  }
}
