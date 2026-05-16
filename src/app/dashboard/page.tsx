import Link from "next/link";
import { redirect } from "next/navigation";

import { AlertBanner } from "@/components/alert-banner";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { formatDate, getFlashMessage } from "@/lib/utils";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireSession();

  if (session.role === "ADMIN") {
    redirect("/admin");
  }

  const flash = getFlashMessage(await searchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const data = await getDashboardData(session.userId);

  if (!data) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {flash ? <AlertBanner {...flash} className="mb-6" /> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
        <section className="panel p-6">
          <div className="text-sm text-slate-500">{copy.dashboard.balanceLabel}</div>
          <div className="mt-2 text-4xl font-black text-slate-950">
            {formatUsdt(data.wallet?.balanceMicros ?? 0n)} USDT
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-500">
            {copy.dashboard.balanceHint}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/recharge"
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              {copy.dashboard.rechargeAction}
            </Link>
            <Link
              href="/orders"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              {copy.dashboard.ordersAction}
            </Link>
          </div>
        </section>

        <section className="panel p-6">
          <div className="text-sm text-slate-500">{copy.dashboard.inviteLabel}</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{data.inviteCode}</div>
          <div className="mt-3 text-sm leading-6 text-slate-500">
            {copy.dashboard.inviteHint}
          </div>
        </section>

        <section className="panel p-6">
          <div className="text-sm text-slate-500">{copy.dashboard.commissionLabel}</div>
          <div className="mt-2 text-3xl font-black text-slate-950">
            {data.commissionReceipts.length}
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-500">
            {copy.dashboard.commissionHint}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950">{copy.dashboard.recentLedgerTitle}</h2>
            <Link href="/recharge" className="text-sm font-semibold text-slate-500">
              {copy.dashboard.rechargeLedgerLink}
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {data.walletEntries.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                {copy.dashboard.noLedger}
              </div>
            ) : (
              data.walletEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-950">{entry.note}</div>
                    <div className="mt-1 text-xs text-slate-500">
                          {formatDate(entry.createdAt, locale)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-base font-black ${
                        entry.direction === "CREDIT" ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {entry.direction === "CREDIT" ? "+" : "-"}
                      {formatUsdt(entry.amountMicros)} USDT
                    </div>
                    <div className="text-xs text-slate-500">
                      {copy.dashboard.balanceAfter} {formatUsdt(entry.balanceAfterMicros)} USDT
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="panel p-6">
            <h2 className="text-2xl font-black text-slate-950">{copy.dashboard.recentCommissionsTitle}</h2>
            <div className="mt-6 space-y-3">
              {data.commissionReceipts.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  {copy.dashboard.noCommissions}
                </div>
              ) : (
                data.commissionReceipts.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <div className="font-semibold text-slate-950">
                      {copy.dashboard.commissionFrom} {record.fromUser.displayName}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      {copy.dashboard.rechargeOrderPrefix} {record.rechargeOrder.serialNo}
                    </div>
                    <div className="mt-3 text-lg font-black text-emerald-600">
                      +{formatUsdt(record.amountMicros)} USDT
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-2xl font-black text-slate-950">{copy.dashboard.referralsTitle}</h2>
            <div className="mt-6 space-y-3">
              {data.referrals.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  {copy.dashboard.noReferrals}
                </div>
              ) : (
                data.referrals.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <div className="font-semibold text-slate-950">{user.displayName}</div>
                    <div className="mt-1 text-sm text-slate-500">{user.email}</div>
                    <div className="mt-3 text-xs text-slate-400">
                      {copy.dashboard.registeredAt} {formatDate(user.createdAt, locale)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
