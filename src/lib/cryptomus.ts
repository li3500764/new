import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { RechargeNetwork } from "@prisma/client";
import { z } from "zod";

import { env } from "./env";
import { formatUsdt } from "./money";

const execFileAsync = promisify(execFile);

const invoiceResponseSchema = z.object({
  state: z.number().optional(),
  result: z.object({
    uuid: z.string().min(1),
    order_id: z.string().min(1),
    url: z.string().url().optional(),
    payment_url: z.string().url().optional(),
    address: z.string().optional(),
    status: z.string().optional(),
  }),
});

export const cryptomusSuccessfulStatuses = new Set(["paid", "paid_over"]);
export const cryptomusTerminalFailureStatuses = new Set([
  "cancel",
  "fail",
  "system_fail",
  "refund_process",
  "refund_fail",
  "refund_paid",
]);

export type CryptomusWebhookPayload = {
  sign?: string;
  uuid?: string;
  order_id?: string;
  status?: string;
  is_final?: boolean | string | number;
  amount?: string;
  payment_amount?: string;
  payer_amount?: string;
  currency?: string;
  payer_currency?: string;
  network?: string;
  txid?: string;
  url?: string;
  [key: string]: unknown;
};

export function getCryptomusNetwork(network: RechargeNetwork) {
  switch (network) {
    case RechargeNetwork.TRC20:
      return env.CRYPTOMUS_TRC20_NETWORK;
    case RechargeNetwork.ERC20:
      return env.CRYPTOMUS_ERC20_NETWORK;
    case RechargeNetwork.BEP20:
      return env.CRYPTOMUS_BEP20_NETWORK;
    default:
      throw new Error("Unsupported recharge network.");
  }
}

function stableStringify(payload: unknown) {
  return JSON.stringify(payload).replace(/\//g, "\\/");
}

function signCryptomusBody(body: string, apiKey = env.CRYPTOMUS_PAYMENT_API_KEY) {
  return crypto
    .createHash("md5")
    .update(Buffer.from(body).toString("base64") + apiKey)
    .digest("hex");
}

export function signCryptomusPayload(payload: unknown, apiKey = env.CRYPTOMUS_PAYMENT_API_KEY) {
  return signCryptomusBody(stableStringify(payload), apiKey);
}

export function verifyCryptomusWebhookSignature(payload: CryptomusWebhookPayload) {
  if (!env.CRYPTOMUS_PAYMENT_API_KEY || !payload.sign) {
    return false;
  }

  const { sign, ...unsignedPayload } = payload;
  const expected = signCryptomusPayload(unsignedPayload);
  const provided = Buffer.from(sign, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return provided.length === expectedBuffer.length && crypto.timingSafeEqual(provided, expectedBuffer);
}

export function parseSignedCryptomusWebhookBody(bodyText: string) {
  const payload = JSON.parse(bodyText) as CryptomusWebhookPayload;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid webhook payload.");
  }

  return payload;
}

async function postCryptomusJson(
  path: string,
  bodyText: string,
  sign: string,
): Promise<{ ok: boolean; status: number; payload: unknown }> {
  const endpoint = `${env.CRYPTOMUS_API_URL.replace(/\/$/, "")}${path}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        merchant: env.CRYPTOMUS_MERCHANT_UUID,
        sign,
      },
      body: bodyText,
    });

    const payload = await response.json().catch(() => null);

    if (response.ok || process.platform !== "win32") {
      return {
        ok: response.ok,
        status: response.status,
        payload,
      };
    }
  } catch (error) {
    if (process.platform !== "win32") {
      throw error;
    }
  }

  return postCryptomusJsonWithPowerShell(endpoint, bodyText, sign);
}

async function postCryptomusJsonWithPowerShell(
  endpoint: string,
  bodyText: string,
  sign: string,
) {
  const bodyBase64 = Buffer.from(bodyText, "utf8").toString("base64");
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$body = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:CRYPTOMUS_BODY_BASE64))",
    "$headers = @{ merchant = $env:CRYPTOMUS_MERCHANT_HEADER; sign = $env:CRYPTOMUS_SIGN_HEADER }",
    "try {",
    "  $response = Invoke-WebRequest -Uri $env:CRYPTOMUS_ENDPOINT -Method Post -Headers $headers -ContentType 'application/json' -Body $body -UseBasicParsing -TimeoutSec 30",
    "  [Console]::Out.Write(($response.StatusCode.ToString() + \"`n\" + $response.Content))",
    "} catch {",
    "  if ($_.Exception.Response) {",
    "    $reader = [IO.StreamReader]::new($_.Exception.Response.GetResponseStream())",
    "    [Console]::Out.Write(([int]$_.Exception.Response.StatusCode).ToString() + \"`n\" + $reader.ReadToEnd())",
    "  } else { throw }",
    "}",
  ].join("; ");

  const encodedCommand = Buffer.from(script, "utf16le").toString("base64");
  const { stdout } = await execFileAsync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      encodedCommand,
    ],
    {
      windowsHide: true,
      timeout: 40_000,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        CRYPTOMUS_BODY_BASE64: bodyBase64,
        CRYPTOMUS_ENDPOINT: endpoint,
        CRYPTOMUS_MERCHANT_HEADER: env.CRYPTOMUS_MERCHANT_UUID,
        CRYPTOMUS_SIGN_HEADER: sign,
      },
    },
  );
  const separatorIndex = stdout.indexOf("\n");
  const status = Number.parseInt(stdout.slice(0, separatorIndex).trim(), 10);
  const rawBody = stdout.slice(separatorIndex + 1).trim();

  return {
    ok: status >= 200 && status < 300,
    status,
    payload: rawBody ? JSON.parse(rawBody) : null,
  };
}

export function isCryptomusConfigured() {
  return Boolean(env.CRYPTOMUS_MERCHANT_UUID && env.CRYPTOMUS_PAYMENT_API_KEY);
}

export function isCryptomusPaidFinal(payload: Pick<CryptomusWebhookPayload, "status" | "is_final">) {
  const status = payload.status?.toLowerCase().trim();

  return Boolean(
    isCryptomusFinal(payload.is_final) &&
      status &&
      cryptomusSuccessfulStatuses.has(status),
  );
}

export function isCryptomusFailedFinal(payload: Pick<CryptomusWebhookPayload, "status" | "is_final">) {
  const status = payload.status?.toLowerCase().trim();

  return Boolean(
    isCryptomusFinal(payload.is_final) &&
      status &&
      cryptomusTerminalFailureStatuses.has(status),
  );
}

function isCryptomusFinal(value: CryptomusWebhookPayload["is_final"]) {
  return value === true || value === 1 || value === "1" || value === "true";
}

export async function createCryptomusInvoice(input: {
  amountMicros: bigint;
  network: RechargeNetwork;
  serialNo: string;
}) {
  if (!isCryptomusConfigured()) {
    throw new Error("Cryptomus credentials are not configured.");
  }

  const callbackUrl = new URL("/api/cryptomus/webhook", env.SITE_URL).toString();
  const returnUrl = new URL(`/recharge#${input.serialNo}`, env.SITE_URL).toString();
  const body = {
    amount: formatUsdt(input.amountMicros),
    currency: "USDT",
    network: getCryptomusNetwork(input.network),
    order_id: input.serialNo,
    url_callback: callbackUrl,
    url_return: returnUrl,
    lifetime: 21_600,
    is_payment_multiple: false,
  };
  const bodyText = stableStringify(body);

  const response = await postCryptomusJson("/payment", bodyText, signCryptomusBody(bodyText));

  if (!response.ok) {
    const message =
      response.payload &&
      typeof response.payload === "object" &&
      "message" in response.payload &&
      typeof response.payload.message === "string"
        ? `: ${response.payload.message}`
        : "";
    throw new Error(`Cryptomus invoice failed: ${response.status}${message}`);
  }

  const parsed = invoiceResponseSchema.safeParse(response.payload);

  if (!parsed.success) {
    throw new Error("Cryptomus returned an invalid invoice response.");
  }

  return {
    uuid: parsed.data.result.uuid,
    orderId: parsed.data.result.order_id,
    paymentUrl: parsed.data.result.url ?? parsed.data.result.payment_url ?? "",
    address: parsed.data.result.address ?? "",
    status: parsed.data.result.status ?? "created",
    raw: JSON.stringify(response.payload),
  };
}
