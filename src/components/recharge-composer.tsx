"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { createRechargeOrderAction } from "@/lib/actions/shop";
import { cn } from "@/lib/utils";

import { CopyButton } from "./copy-button";
import { SubmitButton } from "./submit-button";

type RechargeChannel = "AUTO" | "MANUAL";

type NetworkOption = {
  value: string;
  label: string;
  chainLabel: string;
  note: string;
  address: string;
  minConfirmations: number;
  recommended: boolean;
  autoVerifyReady: boolean;
};

type RechargeComposerProps = {
  balanceLabel: string;
  networks: NetworkOption[];
  copy: {
    balanceLabel: string;
    steps: ReadonlyArray<{ title: string; body: string }>;
    amountLabel: string;
    amountPlaceholder: string;
    networkLabel: string;
    recommended: string;
    pendingEnable: string;
    networkUnavailable: string;
    currentAddress: string;
    addressTips: ReadonlyArray<string>;
    createOrder: string;
    depositQr: string;
    qrAltSuffix: string;
    generatingQr: string;
    scanHint: string;
    paymentNotice: string;
    paymentTips: ReadonlyArray<string>;
    copyAddress: string;
    copied: string;
    processing: string;
  };
};

const amountPresets = ["10", "20", "50", "100", "200"];

const text = {
  channelLabel: "\u5145\u503c\u6e20\u9053",
  autoHint:
    "\u81ea\u52a8\u5145\u503c\u4e0d\u5c55\u793a\u5e73\u53f0\u6536\u6b3e\u5730\u5740\uff1b\u4eba\u5de5\u5145\u503c\u624d\u9700\u8981\u63d0\u4ea4\u54c8\u5e0c\u3002",
  autoButton: "\u524d\u5f80\u81ea\u52a8\u5145\u503c",
  autoTitle: "\u81ea\u52a8\u5145\u503c",
  autoDescription:
    "\u63d0\u4ea4\u91d1\u989d\u548c\u7f51\u7edc\u540e\u6253\u5f00 Cryptomus \u5b98\u65b9\u4ed8\u6b3e\u9875\uff0c\u652f\u4ed8\u56de\u8c03\u6210\u529f\u540e\u81ea\u52a8\u5199\u5165\u5e73\u53f0\u4f59\u989d\u3002",
  autoPoints: [
    "\u4e0d\u5c55\u793a\u5e73\u53f0\u6536\u6b3e\u5730\u5740",
    "\u4e0d\u9700\u8981\u63d0\u4ea4\u4ea4\u6613\u54c8\u5e0c",
    "\u652f\u4ed8\u6210\u529f\u540e\u81ea\u52a8\u5165\u8d26",
  ],
  autoFallback:
    "\u5982\u679c\u81ea\u52a8\u901a\u9053\u4e34\u65f6\u4e0d\u53ef\u7528\uff0c\u518d\u5207\u6362\u5230\u4eba\u5de5\u5145\u503c\u6e20\u9053\u63d0\u4ea4\u54c8\u5e0c\u5ba1\u6838\u3002",
};

const channelOptions: Array<{
  value: RechargeChannel;
  title: string;
  badge: string;
  description: string;
}> = [
  {
    value: "AUTO",
    title: "\u81ea\u52a8\u5145\u503c\u6e20\u9053",
    badge: "\u63a8\u8350",
    description:
      "\u8df3\u8f6c Cryptomus \u5b98\u65b9\u4ed8\u6b3e\u9875\uff0c\u652f\u4ed8\u6210\u529f\u540e\u7cfb\u7edf\u81ea\u52a8\u56de\u8c03\u5165\u8d26\u3002",
  },
  {
    value: "MANUAL",
    title: "\u4eba\u5de5\u5145\u503c\u6e20\u9053",
    badge: "\u5907\u7528",
    description:
      "\u663e\u793a\u6536\u6b3e\u5730\u5740\u548c\u4e8c\u7ef4\u7801\uff0c\u8f6c\u8d26\u540e\u63d0\u4ea4\u4ea4\u6613\u54c8\u5e0c\u7b49\u5f85\u5ba1\u6838\u3002",
  },
];

export function RechargeComposer({
  balanceLabel,
  networks,
  copy,
}: RechargeComposerProps) {
  const [amount, setAmount] = useState("50");
  const [channel, setChannel] = useState<RechargeChannel>("AUTO");
  const [selectedNetwork, setSelectedNetwork] = useState(networks[0]?.value ?? "");
  const [qrCode, setQrCode] = useState("");

  const currentNetwork =
    networks.find((network) => network.value === selectedNetwork) ?? networks[0];
  const isManualChannel = channel === "MANUAL";

  useEffect(() => {
    let active = true;

    async function generate() {
      if (!isManualChannel || !currentNetwork?.address) {
        setQrCode("");
        return;
      }

      const dataUrl = await QRCode.toDataURL(currentNetwork.address, {
        margin: 1,
        width: 220,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });

      if (active) {
        setQrCode(dataUrl);
      }
    }

    generate();

    return () => {
      active = false;
    };
  }, [currentNetwork?.address, isManualChannel]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">{copy.balanceLabel}</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{balanceLabel}</div>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
            {text.autoHint}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {copy.steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Step {index + 1}
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{step.title}</div>
              <div className="mt-1 text-sm text-slate-500">{step.body}</div>
            </div>
          ))}
        </div>

        <form action={createRechargeOrderAction} className="mt-8 space-y-6">
          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-700">
              {text.channelLabel}
            </label>
            <input type="hidden" name="channel" value={channel} />
            <div className="grid gap-3 md:grid-cols-2">
              {channelOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChannel(option.value)}
                  className={cn(
                    "rounded-[24px] border p-4 text-left transition",
                    channel === option.value
                      ? "border-sky-600 bg-sky-50 text-sky-900 shadow-[0_16px_35px_rgba(59,130,246,0.12)]"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-500",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-black">{option.title}</div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700">
                      {option.badge}
                    </span>
                  </div>
                  <div className="mt-2 text-sm leading-6 opacity-80">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-700">
              {copy.amountLabel}
            </label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                type="text"
                name="amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={copy.amountPlaceholder}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-slate-950"
              />
              <div className="flex flex-wrap gap-2">
                {amountPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-semibold transition",
                      amount === preset
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-sky-500 hover:text-sky-700",
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-700">
              {copy.networkLabel}
            </label>
            <input type="hidden" name="network" value={currentNetwork.value} />
            <div className="grid gap-3 lg:grid-cols-3">
              {networks.map((network) => (
                <button
                  key={network.value}
                  type="button"
                  disabled={!network.autoVerifyReady}
                  onClick={() => setSelectedNetwork(network.value)}
                  className={cn(
                    "rounded-[26px] border p-4 text-left transition",
                    !network.autoVerifyReady &&
                      "cursor-not-allowed border-dashed border-slate-200 bg-slate-100 text-slate-400 opacity-70",
                    network.value === currentNetwork.value
                      ? "border-sky-600 bg-sky-50 text-sky-800 shadow-[0_16px_35px_rgba(59,130,246,0.12)]"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-500",
                    !network.autoVerifyReady &&
                      network.value !== currentNetwork.value &&
                      "hover:border-slate-200",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-base font-black">{network.label}</div>
                    {network.recommended ? (
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {copy.recommended}
                      </div>
                    ) : null}
                    {!network.autoVerifyReady ? (
                      <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                        {copy.pendingEnable}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm opacity-80">{network.chainLabel}</div>
                  <div className="mt-3 text-sm leading-6 opacity-85">{network.note}</div>
                  {!network.autoVerifyReady ? (
                    <div className="mt-3 text-xs font-semibold opacity-90">
                      {copy.networkUnavailable}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {isManualChannel ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-500">{copy.currentAddress}</div>
                  <div className="mt-2 break-all text-base font-black text-slate-950">
                    {currentNetwork.address}
                  </div>
                </div>
                <CopyButton
                  text={currentNetwork.address}
                  idleLabel={copy.copyAddress}
                  copiedLabel={copy.copied}
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                  {copy.addressTips[0]}
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                  {copy.addressTips[1].replace("{count}", String(currentNetwork.minConfirmations))}
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                  {currentNetwork.autoVerifyReady ? copy.addressTips[2] : copy.addressTips[3]}
                </div>
              </div>
            </div>
          ) : null}

          <SubmitButton pendingText={copy.processing} className="w-full justify-center py-3 text-base">
            {isManualChannel ? copy.createOrder : text.autoButton}
          </SubmitButton>
        </form>
      </section>

      <section className="panel p-6">
        {isManualChannel ? (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.2em] text-slate-400">
                  {copy.depositQr}
                </div>
                <div className="mt-2 text-2xl font-black text-slate-950">{currentNetwork.label}</div>
              </div>
              <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                USDT
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-slate-950">
              {qrCode ? (
                <Image
                  src={qrCode}
                  alt={`${currentNetwork.label} ${copy.qrAltSuffix}`}
                  className="h-[220px] w-[220px] rounded-2xl"
                  width={220}
                  height={220}
                  unoptimized
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400">
                  {copy.generatingQr}
                </div>
              )}
              <div className="mt-4 text-xs text-slate-500">{copy.scanHint}</div>
            </div>

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-700">{copy.paymentNotice}</div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                {copy.paymentTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[420px] flex-col rounded-[30px] border border-slate-200 bg-white p-6 text-slate-950">
            <div>
              <div className="text-sm uppercase tracking-[0.22em] text-slate-400">
                Cryptomus Checkout
              </div>
              <h2 className="mt-3 text-3xl font-black">{text.autoTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {text.autoDescription}
              </p>
            </div>
            <div className="mt-8 grid gap-3">
              {text.autoPoints.map((item, index) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                    AUTO {index + 1}
                  </div>
                  <div className="mt-1 text-base font-semibold text-slate-900">{item}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-800">
              {text.autoFallback}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
