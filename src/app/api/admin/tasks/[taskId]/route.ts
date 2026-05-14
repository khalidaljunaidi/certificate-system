import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { getOperationalTaskDetail } from "@/server/queries/task-queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await requireAdminSession();
  const { taskId } = await params;

  const taskDetail = await getOperationalTaskDetail(
    {
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
      permissions: session.user.permissions,
    },
    taskId,
  );

  if (!taskDetail) {
    return NextResponse.json({ error: "Operational task not found." }, { status: 404 });
  }

  return NextResponse.json({ taskDetail });
}
