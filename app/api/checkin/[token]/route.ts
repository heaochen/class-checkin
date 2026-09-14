import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!supabase || !token) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      student_id?: unknown;
      name?: unknown;
    };
    if (typeof body.student_id !== "string" || typeof body.name !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("check_in_meeting", {
      meeting_token: token,
      input_student_id: body.student_id.trim(),
      input_name: body.name.trim(),
    });
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      status: result?.status ?? "invalid_meeting",
      checkin_time: result?.checkin_time ?? null,
    });
  } catch (error) {
    console.error("Failed to submit public check-in", error);
    return NextResponse.json(
      { error: "Failed to submit check-in" },
      { status: 500 },
    );
  }
}
