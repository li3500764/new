import Link from "next/link";

import { OrderStatus } from "@prisma/client";

import { AlertBanner } from "@/components/alert-banner";
import { getAdminDashboardData } from "@/lib/data";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { getRechargeStatusMeta } from "@/lib/site";
import { formatDate, getFlashMessage } from "@/lib/utils";

type AdminHomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminHomePage({
  searchParams,
}: AdminHomePageProps) {
  const flash = getFlashMessage(await searchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const data = await getAdminDashboardData();

  const orderStatusLabel: Record<OrderStatus, string> = {
    PENDING: copy.admin.overview.orderStatuses.pending,
    PROCESSING: copy.admin.overview.orderStatuses.processing,
    FULFILLED: copy.admin.overview.orderStatuses.fulfilled,
    REFUNDED: copy.admin.overview.orderStatuses.refunded,
    CANCELLED: copy.admin.overview.orderStatuses.cancelled,
    REJECTED: locale === "zh" ? "已驳回" : locale === "ko" ? "반려됨" : "Rejected",
  };

  return (
    <>
      {flash ? <AlertBanner {...flash} /> : null}

      <section className="panel p-6">
        <h1 className="text-3xl font-black text-slate-950">
          {copy.admin.overview.title}
        </h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">
              {copy.admin.overview.metrics.users}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {data.userCount}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">
              {copy.admin.overview.metrics.products}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {data.productCount}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">
              {copy.admin.overview.metrics.pendingRecharges}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {data.pendingRecharges}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">
              {copy.admin.overview.metrics.pendingOrders}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {data.pendingOrders}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950">
              {copy.admin.overview.latestRecharges}
            </h2>
            <Link
              href="/admin/recharges"
              className="text-sm font-semibold text-slate-500"
            >
              {copy.admin.overview.reviewLink}
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {data.latestRecharges.map((recharge) => (
              <div
                key={recharge.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
              >
                <div className="font-semibold text-slate-950">
                  {recharge.serialNo}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {recharge.user.displayName} /{" "}
                  {formatDate(recharge.createdAt, locale)}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  {formatUsdt(recharge.amountMicros)} USDT /{" "}
                  {getRechargeStatusMeta(recharge.status, locale).label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950">
              {copy.admin.overview.latestOrders}
            </h2>
            <Link
              href="/admin/orders"
              className="text-sm font-semibold text-slate-500"
            >
              {copy.admin.overview.handleLink}
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {data.latestOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
              >
                <div className="font-semibold text-slate-950">
                  {order.product.name}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {order.user.displayName} / {formatDate(order.createdAt, locale)}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  {formatUsdt(order.productSnapshotPriceMicros)} USDT /{" "}
                  {orderStatusLabel[order.status]}
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>
    </>
  );
}
