import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { createElement } from "react";

import { CeoPresentationDocument } from "@/pdf/ceo-presentation";

export const runtime = "nodejs";

export async function GET() {
  const buffer = await renderToBuffer(createElement(CeoPresentationDocument));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="tg-gate-ceo-presentation.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
