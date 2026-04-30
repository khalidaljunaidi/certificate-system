import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth";
import { canManageOperationalTasks } from "@/lib/permissions";
import { getTaskLookupOptions } from "@/server/queries/task-queries";

export async function GET() {
  const session = await requireAdminSession();

  if (!canManageOperationalTasks(session.user)) {
    return NextResponse.json(
      { error: "You do not have permission to create operational tasks." },
      { status: 403 },
    );
  }

  const lookupOptions = await getTaskLookupOptions();

  return NextResponse.json({ lookupOptions });
}
