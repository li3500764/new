import { OrderStatus } from "@prisma/client";

import { AlertBanner } from "@/components/alert-banner";
import { SubmitButton } from "@/components/submit-button";
import {
  cancelUpstreamOrderAction,
  syncUpstreamOrderAction,
  updateOrderStatusAction,
  addOrderMessageAction,
} from "@/lib/actions/admin";
import { getAdminOrdersData } from "@/lib/data";
import { getFulfillmentCopy } from "@/lib/fulfillment-copy";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatUsdt } from "@/lib/money";
import { formatOrderRequestSummary } from "@/lib/order-fulfillment";
import { getAllowedNextOrderStatuses } from "@/lib/order-workflow";
import { formatDate, getFlashMessage } from "@/lib/utils";

type AdminOrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const flash = getFlashMessage(await searchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);
  const fulfillmentCopy = getFulfillmentCopy(locale);
  const orders = await getAdminOrdersData();

  const orderStatusLabel: Record<OrderStatus, string> = {
    PENDING: copy.admin.orders.statusLabels.pending,
    PROCESSING: copy.admin.orders.statusLabels.processing,
    FULFILLED: copy.admin.orders.statusLabels.fulfilled,
    REFUNDED: copy.admin.orders.statusLabels.refunded,
    CANCELLED: copy.admin.orders.statusLabels.cancelled,
    REJECTED: "已驳回",
  };

  return (
    <>
      {flash ? <AlertBanner {...flash} /> : null}
      <section className="panel p-6">
        <h1 className="text-3xl font-black text-slate-950">
          {copy.admin.orders.title}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {copy.admin.orders.description}
        </p>
      </section>

      <section className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="space-y-2">
          <form action={updateOrderStatusAction} className="panel p-6">
            <input type="hidden" name="orderId" value={order.id} />
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xl font-black text-slate-950">
                  {order.product.name}
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  {order.user.displayName} / {order.user.email} /{" "}
                  {formatDate(order.createdAt, locale)}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {formatUsdt(order.productSnapshotPriceMicros)} USDT /{" "}
                  {copy.admin.orders.currentStatus}: {orderStatusLabel[order.status]}
                </div>
                {order.userNote ? (
                  <div className="mt-2 text-sm text-slate-600">
                    {copy.admin.orders.userNote}: {order.userNote}
                  </div>
                ) : null}
                {order.deliveryType === "CRAZYSMM" ? (
                  <div className="mt-2 text-sm text-slate-600">
                    {fulfillmentCopy.order.upstreamStatusLabel}:{" "}
                    {order.upstreamStatus || fulfillmentCopy.order.upstreamNotSubmitted}
                  </div>
                ) : null}
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                {order.handler?.displayName ?? copy.admin.orders.unclaimed}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {formatOrderRequestSummary(order, locale).map((item) => (
                <div key={`${order.id}-${item.label}`} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                    {item.label}
                  </div>
                  <div className="mt-1 break-words text-sm text-slate-700">{item.value}</div>
                </div>
              ))}
            </div>

            {order.messages && order.messages.length > 0 ? (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-semibold text-slate-700">订单留言记录</div>
                {order.messages.map((msg: { id: string; authorRole: string; body: string; createdAt: Date; author?: { displayName: string } | null }) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      msg.authorRole === "ADMIN"
                        ? "bg-sky-50 text-sky-800 border border-sky-100"
                        : "bg-amber-50 text-amber-800 border border-amber-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span className="font-semibold">
                        {msg.authorRole === "ADMIN" ? "管理员" : `用户: ${msg.author?.displayName || "匿名"}`}
                      </span>
                      <span>{formatDate(msg.createdAt, locale)}</span>
                    </div>
                    <div>{msg.body}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 xl:grid-cols-[220px_1fr_auto]">
              <select
                name="status"
                defaultValue={order.status}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                {getAllowedNextOrderStatuses(order.status).map((status) => (
                  <option key={status} value={status}>
                    {orderStatusLabel[status]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="fulfillmentNote"
                defaultValue={order.fulfillmentNote ?? ""}
                placeholder={copy.admin.orders.notePlaceholder}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
              <SubmitButton
                pendingText={copy.admin.orders.updating}
                className="h-[50px]"
              >
                {copy.admin.orders.update}
              </SubmitButton>
            </div>

            {order.deliveryType === "CRAZYSMM" ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <SubmitButton
                  formAction={syncUpstreamOrderAction}
                  pendingText={fulfillmentCopy.order.syncPending}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  {fulfillmentCopy.admin.syncAction}
                </SubmitButton>
                {order.product.upstreamSupportsCancel ? (
                  <SubmitButton
                    formAction={cancelUpstreamOrderAction}
                    pendingText={fulfillmentCopy.order.cancelPending}
                    className="bg-rose-600 hover:bg-rose-500"
                  >
                    {fulfillmentCopy.admin.cancelAction}
                  </SubmitButton>
                ) : null}
              </div>
            ) : null}
          </form>

          <form action={addOrderMessageAction} className="panel mt-2 p-4">
            <input type="hidden" name="orderId" value={order.id} />
            <div className="text-sm font-semibold text-slate-700 mb-2">管理员留言</div>
            <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
              <input
                type="text"
                name="body"
                placeholder="给客户留言，例如：请补充账号信息"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
              <SubmitButton pendingText="发送中..." className="h-[50px]">
                发送留言
              </SubmitButton>
            </div>
          </form>
          </div>
        ))}
      </section>
    </>
  );
}
