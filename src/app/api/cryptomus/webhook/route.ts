import { NextResponse } from "next/server";

import { parseSignedCryptomusWebhookBody } from "@/lib/cryptomus";
import { processCryptomusWebhook } from "@/lib/cryptomus-webhook";

export async function POST(request: Request) {
  let payload: ReturnType<typeof parseSignedCryptomusWebhookBody>;

  try {
    payload = parseSignedCryptomusWebhookBody(await request.text());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  try {
    const result = await processCryptomusWebhook(payload);

    return NextResponse.json(
      { ok: result.ok, message: result.message },
      { status: result.status },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
