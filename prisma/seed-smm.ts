/**
 * Seed script to import all CrazySMM services as products.
 * Run with: npx tsx prisma/seed-smm.ts
 *
 * - Fetches live service list from CrazySMM API
 * - Maps services into clean categories for the storefront
 * - Creates products with proper Chinese names, English/Korean translations stored in SiteText
 * - All translations can be further customized in admin/settings
 */
import {
  PrismaClient,
  ProductFulfillmentMode,
  ProductStatus,
  UpstreamProvider,
  UpstreamServiceType,
} from "@prisma/client";

const prisma = new PrismaClient();

const API_URL = "https://crazysmm.com/api/v2";
const API_KEY = process.env.CRAZYSMM_API_KEY;

const MARKUP = 1.4;
const MIN_PRICE_PER_1000 = 1;

if (!API_KEY) {
  throw new Error("CRAZYSMM_API_KEY is required to import upstream services.");
}

type RawService = {
  service: number;
  name: string;
  type: string;
  rate: string;
  min: number;
  max: number;
  dripfeed: boolean;
  refill: boolean;
  cancel: boolean;
  category: string;
};

// ─── Category Mapping ────────────────────────────────────────────────
// Map CrazySMM raw categories to clean storefront categories
type CategoryMeta = {
  zh: string;
  en: string;
  ko: string;
  cover: string;
  sortOrder: number;
};

const categoryMap: Record<string, CategoryMeta> = {
  "Twitter｜X 粉丝(加密货币相关)｜没有加速只有取消": {
    zh: "Twitter/X 加密货币粉丝", en: "Twitter/X Crypto Followers", ko: "Twitter/X 암호화폐 팔로워", cover: "TW", sortOrder: 100,
  },
  "Twitter｜X 机器人粉丝｜快速完成｜高掉落": {
    zh: "Twitter/X 快速粉丝", en: "Twitter/X Fast Followers", ko: "Twitter/X 빠른 팔로워", cover: "TW", sortOrder: 110,
  },
  "Twitter｜X 转推｜必须公开推文": {
    zh: "Twitter/X 转推", en: "Twitter/X Retweets", ko: "Twitter/X 리트윗", cover: "TW", sortOrder: 120,
  },
  "Twitter｜X [转推+点赞+评论]｜同帐号": {
    zh: "Twitter/X 互动套餐", en: "Twitter/X Engagement Bundle", ko: "Twitter/X 인게이지먼트 번들", cover: "TW", sortOrder: 130,
  },
  "Twitter｜X 投票": {
    zh: "Twitter/X 投票", en: "Twitter/X Poll Votes", ko: "Twitter/X 투표", cover: "TW", sortOrder: 140,
  },
  "Twitter｜X 推文数据 [浏览量 ｜Bookmark ]": {
    zh: "Twitter/X 浏览量与数据", en: "Twitter/X Views & Impressions", ko: "Twitter/X 조회수 & 데이터", cover: "TW", sortOrder: 150,
  },
  "Twitter｜X  推文评论｜必须允许评论｜禁止带链接": {
    zh: "Twitter/X 评论", en: "Twitter/X Comments", ko: "Twitter/X 댓글", cover: "TW", sortOrder: 160,
  },
  "Twitter｜X  推文引用♻️｜带内容转推♻️": {
    zh: "Twitter/X 引用转推", en: "Twitter/X Quote Retweets", ko: "Twitter/X 인용 리트윗", cover: "TW", sortOrder: 170,
  },
  "Twitter｜X  🔥中日韩🇨🇳🇯🇵🇰🇷｜禁止政治、18+相关内容": {
    zh: "Twitter/X 中日韩互动", en: "Twitter/X CJK Engagement", ko: "Twitter/X 한중일 인게이지먼트", cover: "TW", sortOrder: 180,
  },
  "Twitter｜X  Space听众(未登录状态)": {
    zh: "Twitter/X Space 听众", en: "Twitter/X Space Listeners", ko: "Twitter/X Space 청취자", cover: "TW", sortOrder: 190,
  },
  "Telegram电报成员 （若有防护机器人不售后）": {
    zh: "Telegram 频道/群成员", en: "Telegram Channel/Group Members", ko: "Telegram 채널/그룹 멤버", cover: "TG", sortOrder: 200,
  },
  "Telegram电报Premium成员 （开拦截不售后）": {
    zh: "Telegram Premium 成员", en: "Telegram Premium Members", ko: "Telegram 프리미엄 멤버", cover: "TG", sortOrder: 210,
  },
  "Telegram电报 - 未来帖子自动浏览": {
    zh: "Telegram 自动浏览", en: "Telegram Auto Views", ko: "Telegram 자동 조회", cover: "TG", sortOrder: 220,
  },
  "Telegram电报帖子浏览": {
    zh: "Telegram 帖子浏览", en: "Telegram Post Views", ko: "Telegram 게시물 조회", cover: "TG", sortOrder: 230,
  },
  "Telegram电报 - 帖子表情反应👍👎❤️🔥💩🤮": {
    zh: "Telegram 表情反应", en: "Telegram Reactions", ko: "Telegram 반응", cover: "TG", sortOrder: 240,
  },
  "Facebook 帖子点赞❤️ 🥰 😄 😢 😡 😯 ｜必须公开帖子": {
    zh: "Facebook 帖子点赞", en: "Facebook Post Likes", ko: "Facebook 게시물 좋아요", cover: "FB", sortOrder: 300,
  },
  "Facebook Profile/Page 点赞｜粉丝": {
    zh: "Facebook 主页粉丝", en: "Facebook Page Followers", ko: "Facebook 페이지 팔로워", cover: "FB", sortOrder: 310,
  },
  "Facebook 组成员": {
    zh: "Facebook 群组成员", en: "Facebook Group Members", ko: "Facebook 그룹 멤버", cover: "FB", sortOrder: 320,
  },
  "Facebook 评论｜分享": {
    zh: "Facebook 分享", en: "Facebook Shares", ko: "Facebook 공유", cover: "FB", sortOrder: 330,
  },
  "Facebook视频观看": {
    zh: "Facebook 视频观看", en: "Facebook Video Views", ko: "Facebook 동영상 조회", cover: "FB", sortOrder: 340,
  },
  "Facebook直播观看｜下单前阅读服务描述": {
    zh: "Facebook 直播观看", en: "Facebook Live Views", ko: "Facebook 라이브 시청", cover: "FB", sortOrder: 350,
  },
  "Instagram 粉丝【无售后】｜必须关闭过滤": {
    zh: "Instagram 粉丝（无售后）", en: "Instagram Followers (No Refill)", ko: "Instagram 팔로워 (리필 없음)", cover: "IG", sortOrder: 400,
  },
  "Instagram 粉丝【有售后】｜必须关闭过滤": {
    zh: "Instagram 粉丝（有售后）", en: "Instagram Followers (With Refill)", ko: "Instagram 팔로워 (리필 포함)", cover: "IG", sortOrder: 410,
  },
  "Instagram 点赞【无售后】": {
    zh: "Instagram 点赞（无售后）", en: "Instagram Likes (No Refill)", ko: "Instagram 좋아요 (리필 없음)", cover: "IG", sortOrder: 420,
  },
  "Instagram 点赞【有售后】": {
    zh: "Instagram 点赞（有售后）", en: "Instagram Likes (With Refill)", ko: "Instagram 좋아요 (리필 포함)", cover: "IG", sortOrder: 430,
  },
  "Instagram - 自动 点赞｜观看｜评论🤖️": {
    zh: "Instagram 自动服务", en: "Instagram Auto Services", ko: "Instagram 자동 서비스", cover: "IG", sortOrder: 440,
  },
  "Instagram 评论": {
    zh: "Instagram 评论", en: "Instagram Comments", ko: "Instagram 댓글", cover: "IG", sortOrder: 450,
  },
  "Instagram 视频观看": {
    zh: "Instagram 视频观看", en: "Instagram Video Views", ko: "Instagram 동영상 조회", cover: "IG", sortOrder: 460,
  },
  "Instagram 个人资料展示｜转发｜impressions｜Save": {
    zh: "Instagram 数据提升", en: "Instagram Impressions & Reach", ko: "Instagram 노출 & 도달", cover: "IG", sortOrder: 470,
  },
  "Youtube订阅者｜频道必须有1个大于5分钟的视频": {
    zh: "YouTube 订阅", en: "YouTube Subscribers", ko: "YouTube 구독자", cover: "YT", sortOrder: 500,
  },
  "YouTube视频点赞👍（无售后）": {
    zh: "YouTube 点赞（无售后）", en: "YouTube Likes (No Refill)", ko: "YouTube 좋아요 (리필 없음)", cover: "YT", sortOrder: 510,
  },
  "YouTube视频点赞👍（有售后）": {
    zh: "YouTube 点赞（有售后）", en: "YouTube Likes (With Refill)", ko: "YouTube 좋아요 (리필 포함)", cover: "YT", sortOrder: 520,
  },
  "Youtube 视频观看｜有售后": {
    zh: "YouTube 视频观看", en: "YouTube Video Views", ko: "YouTube 동영상 조회", cover: "YT", sortOrder: 530,
  },
  "YouTube评论｜评论点赞": {
    zh: "YouTube 评论", en: "YouTube Comments", ko: "YouTube 댓글", cover: "YT", sortOrder: 540,
  },
  "Youtube直播观看": {
    zh: "YouTube 直播观看", en: "YouTube Live Views", ko: "YouTube 라이브 시청", cover: "YT", sortOrder: 550,
  },
  "TikTok 粉丝": {
    zh: "TikTok 粉丝", en: "TikTok Followers", ko: "TikTok 팔로워", cover: "TK", sortOrder: 600,
  },
  "TikTok 点赞": {
    zh: "TikTok 点赞", en: "TikTok Likes", ko: "TikTok 좋아요", cover: "TK", sortOrder: 610,
  },
  "TikTok 观看": {
    zh: "TikTok 观看", en: "TikTok Views", ko: "TikTok 조회수", cover: "TK", sortOrder: 620,
  },
  "Tiktok 保存｜下载｜分享": {
    zh: "TikTok 保存/分享", en: "TikTok Saves & Shares", ko: "TikTok 저장/공유", cover: "TK", sortOrder: 630,
  },
  "Medium": {
    zh: "Medium 粉丝", en: "Medium Followers", ko: "Medium 팔로워", cover: "MD", sortOrder: 700,
  },
  "CoinMarketCap": {
    zh: "CoinMarketCap 数据", en: "CoinMarketCap Engagement", ko: "CoinMarketCap 데이터", cover: "CM", sortOrder: 710,
  },
  "🌐网站流量｜0-24小时启动": {
    zh: "网站流量（全球）", en: "Website Traffic (Global)", ko: "웹사이트 트래픽 (글로벌)", cover: "WB", sortOrder: 800,
  },
  "网站流量来源Google｜目标国家": {
    zh: "网站流量（指定国家）", en: "Website Traffic (By Country)", ko: "웹사이트 트래픽 (국가별)", cover: "WB", sortOrder: 810,
  },
  "网络流量｜来源网络广告等": {
    zh: "网站流量（广告来源）", en: "Website Traffic (Ad Sources)", ko: "웹사이트 트래픽 (광고)", cover: "WB", sortOrder: 820,
  },
  "网站流量 - 手机流量": {
    zh: "网站流量（移动端）", en: "Website Traffic (Mobile)", ko: "웹사이트 트래픽 (모바일)", cover: "WB", sortOrder: 830,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function mapServiceType(type: string): UpstreamServiceType {
  if (type === "Custom Comments") return UpstreamServiceType.CUSTOM_COMMENTS;
  if (type === "Subscriptions") return UpstreamServiceType.SUBSCRIPTIONS;
  return UpstreamServiceType.DEFAULT;
}

function slugify(name: string, id: number): string {
  void name;
  return `smm-${id}`;
}

function isValidService(s: RawService): boolean {
  const rate = parseFloat(s.rate);
  if (rate >= 999999) return false;
  if (s.category === "私人（不属于你）") return false;
  if (s.name.startsWith("---") || s.name.startsWith("——")) return false;
  if (s.name.includes("下单前必看") || s.name.includes("下单必看")) return false;
  if (s.name.includes("购买前必看")) return false;
  if (s.name.startsWith("⚠️") && s.name.includes("关于")) return false;
  if (s.name.startsWith("❗️")) return false;
  if (s.name.startsWith("⬇️")) return false;
  return true;
}

function getCategoryMeta(rawCategory: string): CategoryMeta {
  return categoryMap[rawCategory] || {
    zh: rawCategory.split("｜")[0].replace(/[^\p{L}\p{N}\s]/gu, "").trim() || "其他服务",
    en: "Other Services",
    ko: "기타 서비스",
    cover: "SM",
    sortOrder: 900,
  };
}

function getServiceTypeLabel(type: string, locale: "zh" | "en" | "ko"): string {
  const labels = {
    DEFAULT: { zh: "标准单", en: "Standard", ko: "표준" },
    "Custom Comments": { zh: "评论单", en: "Comments", ko: "댓글" },
    Subscriptions: { zh: "订阅单", en: "Subscription", ko: "구독" },
  };
  return (labels as Record<string, Record<string, string>>)[type]?.[locale] || type;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching CrazySMM service list...");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `key=${API_KEY}&action=services`,
  });

  const services: RawService[] = await res.json();
  const validServices = services.filter(isValidService);

  console.log(`Found ${services.length} total, ${validServices.length} valid services.`);

  // Upsert categories
  const seenCategories = new Set<string>();
  for (const service of validServices) {
    if (seenCategories.has(service.category)) continue;
    seenCategories.add(service.category);

    const meta = getCategoryMeta(service.category);
    const catSlug = `smm-${meta.zh.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 20).toLowerCase() || "cat"}`;

    await prisma.productCategory.upsert({
      where: { name: meta.zh },
      update: { sortOrder: meta.sortOrder },
      create: { name: meta.zh, slug: catSlug, sortOrder: meta.sortOrder },
    });
  }

  console.log(`Upserted ${seenCategories.size} categories.`);

  // Upsert products + translations
  let created = 0;
  let updated = 0;

  for (const [index, service] of validServices.entries()) {
    const rate = parseFloat(service.rate);
    const sellRate = Math.max(rate * MARKUP, MIN_PRICE_PER_1000);
    const priceMicros = BigInt(Math.round(sellRate * 1_000_000));
    const slug = slugify(service.name, service.service);
    const meta = getCategoryMeta(service.category);
    const serviceTypeLabel = getServiceTypeLabel(service.type, "zh");

    const refillText = service.refill ? "支持售后补单" : "无售后";
    const cancelText = service.cancel ? "支持取消" : "不可取消";

    const data = {
      name: service.name,
      subtitle: `${meta.zh} · ${serviceTypeLabel} · 最小${service.min}`,
      category: meta.zh,
      cover: meta.cover,
      summary: `${service.name}。${refillText}，${cancelText}。`,
      description: `通过上游 API 自动下单处理。价格为每1000个的价格。最小下单量 ${service.min}，最大 ${service.max}。${service.refill ? "掉粉可补单。" : ""}${service.cancel ? "未开始可取消退款。" : ""}`,
      tags: [meta.zh, serviceTypeLabel, refillText, service.cancel ? "可取消" : ""].filter(Boolean).join("|"),
      deliveryNote: `自动处理，通常0-1小时开始。范围 ${service.min} ~ ${service.max}。`,
      priceMicros,
      fulfillmentMode: ProductFulfillmentMode.CRAZYSMM,
      listingMin: service.min,
      listingMax: service.max,
      listingAverageTime: "0-1小时",
      upstreamProvider: UpstreamProvider.CRAZYSMM,
      upstreamServiceId: String(service.service),
      upstreamServiceType: mapServiceType(service.type),
      upstreamSupportsRefill: service.refill,
      upstreamSupportsCancel: service.cancel,
      autoDeliverStock: false,
      sortOrder: meta.sortOrder + index,
      status: ProductStatus.ACTIVE,
    };

    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { slug },
          {
            upstreamProvider: UpstreamProvider.CRAZYSMM,
            upstreamServiceId: String(service.service),
          },
        ],
      },
    });

    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: { slug, ...data } });
      updated++;
    } else {
      await prisma.product.create({ data: { slug, ...data } });
      created++;
    }

    // Store English translation
    const enName = `${service.name.replace(/[^\p{L}\p{N}\s|·\-()]/gu, "").trim()}`;
    const enRefill = service.refill ? "Refill supported." : "No refill.";
    const enCancel = service.cancel ? "Cancellation supported." : "No cancellation.";
    const enTexts: Record<string, string> = {
      [`product.${slug}.name`]: enName,
      [`product.${slug}.subtitle`]: `${meta.en} · ${getServiceTypeLabel(service.type, "en")} · Min ${service.min}`,
      [`product.${slug}.description`]: `Automated via upstream API. Price is per 1000. Min order ${service.min}, max ${service.max}. ${enRefill} ${enCancel}`,
      [`product.${slug}.deliveryNote`]: `Auto-processed, usually starts within 0-1 hour. Range ${service.min} ~ ${service.max}.`,
      [`product.${slug}.tags`]: [meta.en, getServiceTypeLabel(service.type, "en"), service.refill ? "Refill" : "No Refill", service.cancel ? "Cancellable" : ""].filter(Boolean).join("|"),
    };

    // Store Korean translation
    const koRefill = service.refill ? "리필 지원." : "리필 없음.";
    const koCancel = service.cancel ? "취소 가능." : "취소 불가.";
    const koTexts: Record<string, string> = {
      [`product.${slug}.name`]: enName,
      [`product.${slug}.subtitle`]: `${meta.ko} · ${getServiceTypeLabel(service.type, "ko")} · 최소 ${service.min}`,
      [`product.${slug}.description`]: `상위 API를 통해 자동 처리됩니다. 가격은 1000개당 가격입니다. 최소 ${service.min}, 최대 ${service.max}. ${koRefill} ${koCancel}`,
      [`product.${slug}.deliveryNote`]: `자동 처리, 보통 0-1시간 내 시작. 범위 ${service.min} ~ ${service.max}.`,
      [`product.${slug}.tags`]: [meta.ko, getServiceTypeLabel(service.type, "ko"), service.refill ? "리필" : "리필없음", service.cancel ? "취소가능" : ""].filter(Boolean).join("|"),
    };

    // Upsert translations
    for (const [textKey, value] of Object.entries(enTexts)) {
      await prisma.siteText.upsert({
        where: { textKey_locale: { textKey, locale: "en" } },
        update: { value },
        create: { textKey, locale: "en", value },
      });
    }
    for (const [textKey, value] of Object.entries(koTexts)) {
      await prisma.siteText.upsert({
        where: { textKey_locale: { textKey, locale: "ko" } },
        update: { value },
        create: { textKey, locale: "ko", value },
      });
    }
  }

  console.log(`Products: created ${created}, updated ${updated}.`);
  console.log("Translations stored in SiteText (editable in admin/settings).");
  console.log("Done!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
