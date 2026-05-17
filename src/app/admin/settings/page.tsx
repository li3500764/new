import { AlertBanner } from "@/components/alert-banner";
import { SubmitButton } from "@/components/submit-button";
import { upsertSiteTextAction } from "@/lib/actions/admin";
import { getAdminSiteTextsData } from "@/lib/data";
import { getFlashMessage } from "@/lib/utils";

type AdminSettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const presetTextKeys = [
  { key: "home.hero.title", label: "首页主标题" },
  { key: "home.hero.subtitle", label: "首页副标题" },
  { key: "home.service.badge", label: "商品列表标签" },
  { key: "recharge.auto.notice", label: "自动充值说明" },
  { key: "recharge.manual.notice", label: "人工充值说明" },
  { key: "recharge.manual.bonus", label: "人工充值赠送说明" },
  { key: "orders.empty", label: "订单空状态" },
  { key: "footer.notice", label: "底部说明" },
  { key: "contact.title", label: "联系页标题" },
  { key: "contact.subtitle", label: "联系页副标题" },
  { key: "product.notes.hint", label: "商品下单提示" },
  { key: "dashboard.balance.hint", label: "余额说明" },
  { key: "nav.announcement", label: "全站公告" },
  { key: "nav.home", label: "导航-首页" },
  { key: "nav.recharge", label: "导航-充值" },
  { key: "nav.orders", label: "导航-订单" },
  { key: "nav.account", label: "导航-账户" },
  { key: "nav.signIn", label: "导航-登录" },
  { key: "nav.signUp", label: "导航-注册" },
  { key: "nav.signOut", label: "导航-退出" },
  { key: "auth.signIn.title", label: "登录页标题" },
  { key: "auth.signUp.title", label: "注册页标题" },
  { key: "recharge.steps.1", label: "充值步骤1" },
  { key: "recharge.steps.2", label: "充值步骤2" },
  { key: "recharge.steps.3", label: "充值步骤3" },
  { key: "recharge.steps.4", label: "充值步骤4" },
  { key: "orders.title", label: "订单页标题" },
  { key: "orders.description", label: "订单页说明" },
  { key: "dashboard.invite.hint", label: "邀请码说明" },
  { key: "footer.funds.title", label: "底部-资金规则标题" },
  { key: "footer.funds.body", label: "底部-资金规则内容" },
  { key: "footer.delivery.title", label: "底部-交付规则标题" },
  { key: "footer.delivery.body", label: "底部-交付规则内容" },
];

function groupTexts(
  rows: Awaited<ReturnType<typeof getAdminSiteTextsData>>,
) {
  return rows.reduce<Record<string, Record<string, string>>>((map, row) => {
    map[row.textKey] ??= {};
    map[row.textKey][row.locale] = row.value;
    return map;
  }, {});
}

export default async function AdminSettingsPage({
  searchParams,
}: AdminSettingsPageProps) {
  const flash = getFlashMessage(await searchParams);
  const rows = await getAdminSiteTextsData();
  const grouped = groupTexts(rows);

  // Merge preset keys with any custom keys already in DB
  const presetKeySet = new Set(presetTextKeys.map((item) => item.key));
  const customKeys = Object.keys(grouped)
    .filter((key) => !presetKeySet.has(key))
    .sort()
    .map((key) => ({ key, label: `自定义: ${key}` }));
  const allTextKeys = [...presetTextKeys, ...customKeys];

  return (
    <>
      {flash ? <AlertBanner {...flash} /> : null}

      <section className="panel p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Site Settings
        </div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">站点文案与多语言管理</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          所有模块的文字都可以在这里自定义。每个 key 对应页面上的一段文案，分别维护中文、英文、韩文三个版本。
          保存后立即生效，不需要改代码。你也可以新增自定义 key 来覆盖更多位置。
        </p>
      </section>

      {/* 新增自定义 key */}
      <section className="panel p-6">
        <h2 className="text-lg font-black text-slate-950">新增自定义文案</h2>
        <p className="mt-2 text-sm text-slate-500">
          如果预设列表里没有你要改的文案，可以在这里新增一个 key。key 的命名建议用英文点分格式，例如 page.section.field。
        </p>
        <form action={upsertSiteTextAction} className="mt-4 grid gap-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <input
              name="textKey"
              required
              placeholder="文案 key，例如 home.banner.text"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <textarea
              name="zh"
              rows={2}
              placeholder="中文文案"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <textarea
              name="en"
              rows={2}
              placeholder="English copy"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <textarea
              name="ko"
              rows={2}
              placeholder="한국어 문안"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <SubmitButton pendingText="保存中...">新增并保存</SubmitButton>
          </div>
        </form>
      </section>

      {/* 所有文案列表 */}
      <section className="panel overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-black text-slate-950">全站多语言文案配置</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            共 {allTextKeys.length} 组文案。每一行是一组业务文案，同一个 key 下分别维护 ZH / EN / KO 三个版本。留空表示使用代码默认值。
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {allTextKeys.map((item) => (
            <form key={item.key} action={upsertSiteTextAction} className="grid gap-4 px-6 py-5">
              <input type="hidden" name="textKey" value={item.key} />
              <div>
                <div className="text-sm font-semibold text-slate-950">{item.label}</div>
                <div className="mt-1 text-xs text-slate-500">{item.key}</div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <textarea
                  name="zh"
                  rows={3}
                  defaultValue={grouped[item.key]?.zh ?? ""}
                  placeholder="中文文案"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
                <textarea
                  name="en"
                  rows={3}
                  defaultValue={grouped[item.key]?.en ?? ""}
                  placeholder="English copy"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
                <textarea
                  name="ko"
                  rows={3}
                  defaultValue={grouped[item.key]?.ko ?? ""}
                  placeholder="한국어 문안"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
              <div className="flex justify-end">
                <SubmitButton pendingText="保存中...">保存这一组</SubmitButton>
              </div>
            </form>
          ))}
        </div>
      </section>

      {/* CrazySMM 对接说明 */}
      <section className="panel p-6">
        <h2 className="text-xl font-black text-slate-950">返佣设置</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          设置充值返佣比例。支持多级返佣：一级是直接邀请人，二级是邀请人的邀请人，以此类推。比例用百分比填写，例如填 5 表示 5%。设为 0 表示关闭该级别。
        </p>
        <form action={upsertSiteTextAction} className="mt-4 space-y-4">
          <input type="hidden" name="textKey" value="commission.config" />
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">一级返佣比例 (%)</label>
              <input
                name="zh"
                defaultValue={grouped["commission.config"]?.zh ?? "5"}
                placeholder="例如 5"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-500">A 邀请 B，B 充值时 A 获得的比例</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">二级返佣比例 (%)</label>
              <input
                name="en"
                defaultValue={grouped["commission.config"]?.en ?? "2"}
                placeholder="例如 2，填 0 关闭"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-500">A 邀请 B，B 邀请 C，C 充值时 A 获得的比例</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">三级返佣比例 (%)</label>
              <input
                name="ko"
                defaultValue={grouped["commission.config"]?.ko ?? "0"}
                placeholder="例如 1，填 0 关闭"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-500">A→B→C→D，D 充值时 A 获得的比例</p>
            </div>
          </div>
          <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
            <strong>说明：</strong>返佣在充值审核通过时自动结算。当前环境变量默认一级 5%（COMMISSION_RATE_BPS=500）。
            这里保存后，系统会优先读取数据库配置。如果只需要一级返佣，二级和三级填 0 即可。
          </div>
          <div className="flex justify-end">
            <SubmitButton pendingText="保存中...">保存返佣设置</SubmitButton>
          </div>
        </form>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-black text-slate-950">CrazySMM API 对接说明</h2>
        <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
          <p className="font-semibold text-slate-900">一、环境变量配置</p>
          <p>1. 在部署环境变量中填写 <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">CRAZYSMM_API_URL</code>（默认 https://crazysmm.com/api/v2）。</p>
          <p>2. 填写 <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">CRAZYSMM_API_KEY</code>，在 CrazySMM 后台 → API 页面获取。</p>
          <p className="font-semibold text-slate-900 mt-4">二、商品映射步骤</p>
          <p>1. 到「商品管理」页面，选择要对接的商品，展开高级配置。</p>
          <p>2. 履约模式选择 <strong>CRAZYSMM</strong>（上游自动下单）。</p>
          <p>3. 填写「上游服务 ID」—— 在 CrazySMM 后台 → Services 列表中找到对应服务的 ID 数字。</p>
          <p>4. 选择「上游服务类型」：</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>DEFAULT</strong>（标准数量单）：需要 link + quantity，适合刷粉、刷赞等。</li>
            <li><strong>CUSTOM_COMMENTS</strong>（自定义评论单）：需要 link + 评论内容（每行一条）。</li>
            <li><strong>SUBSCRIPTIONS</strong>（订阅单）：需要 username + min/max/delay 等参数。</li>
          </ul>
          <p>5. 如果上游支持取消或补单，勾选对应选项。</p>
          <p className="font-semibold text-slate-900 mt-4">三、用户下单流程</p>
          <p>1. 用户在商品详情页填写目标链接、数量等参数后提交订单。</p>
          <p>2. 系统先扣平台余额，再自动调用 CrazySMM API 提交订单。</p>
          <p>3. 提交成功后订单进入「处理中」，系统会持续同步上游状态。</p>
          <p>4. 如果提交失败（hard error），系统会自动退款并标记失败原因。</p>
          <p>5. 如果提交结果不确定（网络超时等），订单进入待核实状态，管理员可手动同步或处理。</p>
          <p className="font-semibold text-slate-900 mt-4">四、后台管理操作</p>
          <p>1. 在「订单处理」页面可以看到上游状态、上游订单号。</p>
          <p>2. 点击「同步」按钮可手动拉取最新上游状态。</p>
          <p>3. 如果上游支持取消，可以点击「取消并退款」。</p>
          <p>4. 没有配置上游 ID 的商品会继续走人工开单，不影响正常售卖。</p>
          <p className="font-semibold text-slate-900 mt-4">五、常见问题</p>
          <p>• API Key 为空时，自动下单商品会提示「上游接口密钥尚未配置」。</p>
          <p>• 上游服务 ID 填错会导致提交失败，请仔细核对 CrazySMM 后台的服务列表。</p>
          <p>• 价格由本平台自行设置，与上游价格无关（可以加价销售）。</p>
        </div>
      </section>
    </>
  );
}
