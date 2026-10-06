/**
 * SecuPulse — 日本語中心の公開RSSからニュースを収集し data/news.json を生成する
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "data", "news.json");

const CATEGORIES = [
  "AIセキュリティ",
  "個人情報漏洩",
  "規制・ガバナンス",
  "インシデント対応・被害拡大",
  "サプライチェーン／委託先",
];

/** 日本語中心の公開RSS（出典リンク付きで掲載） */
const FEEDS = [
  {
    id: "jpcert",
    name: "JPCERT/CC",
    url: "https://www.jpcert.or.jp/rss/jpcert.rdf",
  },
  {
    id: "ipa",
    name: "IPA セキュリティセンター",
    url: "https://www.ipa.go.jp/security/rss/alert.rdf",
  },
  {
    id: "security-next",
    name: "Security NEXT",
    url: "https://www.security-next.com/feed",
  },
  {
    id: "scan",
    name: "ScanNetSecurity",
    url: "https://scan.netsecurity.ne.jp/rss/index.rdf",
  },
  {
    id: "itmedia-security",
    name: "ITmedia セキュリティ",
    url: "https://rss.itmedia.co.jp/rss/2.0/security.xml",
  },
  {
    id: "publickey",
    name: "Publickey",
    url: "https://www.publickey1.jp/atom.xml",
  },
];

const KEYWORDS = {
  "AIセキュリティ": [
    "AI",
    "人工知能",
    "生成AI",
    "ChatGPT",
    "LLM",
    "機械学習",
    "ディープフェイク",
    "プロンプト",
    "モデル漏洩",
    "AIエージェント",
    "自動運転",
  ],
  "個人情報漏洩": [
    "個人情報",
    "漏洩",
    "漏えい",
    "流出",
    "不正アクセス",
    "顧客情報",
    "会員情報",
    "プライバシー",
    "データ流出",
    "情報漏えい",
    "情報漏洩",
  ],
  "規制・ガバナンス": [
    "個人情報保護法",
    "GDPR",
    "規制",
    "ガイドライン",
    "ガバナンス",
    "合规",
    "コンプライアンス",
    "法改正",
    "罰則",
    "報告義務",
    "セキュリティ対策基準",
  ],
  "インシデント対応・被害拡大": [
    "ランサムウェア",
    "インシデント",
    "被害",
    "攻撃",
    "マルウェア",
    "フィッシング",
    "復旧",
    "対応",
    "緊急",
    "ゼロデイ",
    "脆弱性",
  ],
  "サプライチェーン／委託先": [
    "サプライチェーン",
    "委託",
    "再委託",
    "ベンダー",
    "取引先",
    "外部サービス",
    "クラウド",
    "SaaS",
    "パートナー",
    "供給網",
  ],
};

const INSIGHTS = {
  "AIセキュリティ":
    "経営示唆: AI導入方針・利用ポリシーと、モデル／データ取扱いの責任分界を再確認してください。",
  "個人情報漏洩":
    "経営示唆: 影響顧客への説明責任と、報告義務・再発防止の取締役会報告体制を点検してください。",
  "規制・ガバナンス":
    "経営示唆: 規制動向をコンプライアンス計画に織り込み、監査・開示スケジュールを更新してください。",
  "インシデント対応・被害拡大":
    "経営示唆: 初動・広報・事業継続の役割分担を確認し、机上訓練の実施時期を見直してください。",
  "サプライチェーン／委託先":
    "経営示唆: 委託先のセキュリティ条項・監査権・インシデント通知期限を契約面から再点検してください。",
};

function stripHtml(html = "") {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(text, max = 120) {
  const t = stripHtml(text);
  if (!t) return "";
  const m = t.match(/^(.+?[。！？.!?])\s*/);
  const base = m ? m[1] : t;
  return base.length > max ? `${base.slice(0, max - 1)}…` : base;
}

function parseRssItems(xml, feed) {
  const items = [];
  const itemBlocks = [
    ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi),
  ];

  for (const match of itemBlocks) {
    const block = match[0];
    const title = stripHtml(
      (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ""
    );
    const link =
      (block.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] ||
      stripHtml((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || "") ||
      (block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1] ||
      "";
    const summaryRaw =
      (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] ||
      (block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [])[1] ||
      (block.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [])[1] ||
      "";
    const dateRaw =
      (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] ||
      (block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) || [])[1] ||
      (block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i) || [])[1] ||
      (block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) || [])[1] ||
      "";

    if (!title || !link) continue;

    const publishedAt = dateRaw ? new Date(stripHtml(dateRaw)) : new Date();
    if (Number.isNaN(publishedAt.getTime())) continue;

    items.push({
      title,
      url: stripHtml(link).trim(),
      summaryCandidate: firstSentence(summaryRaw) || firstSentence(title),
      publishedAt: publishedAt.toISOString(),
      source: feed.name,
      sourceId: feed.id,
    });
  }
  return items;
}

function scoreCategory(text, category) {
  const words = KEYWORDS[category] || [];
  let score = 0;
  for (const w of words) {
    if (text.includes(w)) score += w.length >= 4 ? 2 : 1;
  }
  return score;
}

function classify(item) {
  const text = `${item.title} ${item.summaryCandidate}`;
  let best = "インシデント対応・被害拡大";
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    const s = scoreCategory(text, cat);
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  }
  // AI / 漏洩を同比重で拾うため、該当キーワードがあれば優先
  const ai = scoreCategory(text, "AIセキュリティ");
  const leak = scoreCategory(text, "個人情報漏洩");
  if (ai >= 2 && ai >= leak && ai >= bestScore) return "AIセキュリティ";
  if (leak >= 2 && leak > ai) return "個人情報漏洩";
  return bestScore > 0 ? best : "インシデント対応・被害拡大";
}

function isRelevant(item) {
  const text = `${item.title} ${item.summaryCandidate}`;
  // セキュリティ・プライバシー・AI関連に絞る
  const needles = [
    "セキュリティ",
    "脆弱性",
    "漏洩",
    "漏えい",
    "流出",
    "不正アクセス",
    "個人情報",
    "ランサム",
    "攻撃",
    "サイバー",
    "プライバシー",
    "AI",
    "人工知能",
    "生成AI",
    "マルウェア",
    "フィッシング",
    "インシデント",
    "委託",
    "サプライ",
    "GDPR",
    "個人情報保護",
  ];
  return needles.some((n) => text.includes(n));
}

function makeId(url, title) {
  return createHash("sha256").update(`${url}|${title}`).digest("hex").slice(0, 16);
}

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SecuPulseBot/1.0 (+https://github.com/office626/SecuPulse)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseRssItems(xml, feed);
  } finally {
    clearTimeout(timer);
  }
}

function balanceByPillar(items, limit = 40) {
  const ai = items.filter((i) => i.category === "AIセキュリティ");
  const leak = items.filter((i) => i.category === "個人情報漏洩");
  const others = items.filter(
    (i) => i.category !== "AIセキュリティ" && i.category !== "個人情報漏洩"
  );

  const half = Math.floor(limit / 2);
  const pickAi = ai.slice(0, Math.min(half, ai.length));
  const pickLeak = leak.slice(0, Math.min(half, leak.length));
  const remaining = limit - pickAi.length - pickLeak.length;
  const used = new Set([...pickAi, ...pickLeak].map((i) => i.id));
  const restPool = [...ai, ...leak, ...others]
    .filter((i) => !used.has(i.id))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return [...pickAi, ...pickLeak, ...restPool.slice(0, remaining)].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
}

async function main() {
  const collected = [];
  const errors = [];

  for (const feed of FEEDS) {
    try {
      const items = await fetchFeed(feed);
      collected.push(...items);
      console.log(`[ok] ${feed.name}: ${items.length} items`);
    } catch (err) {
      errors.push({ feed: feed.name, error: String(err.message || err) });
      console.warn(`[warn] ${feed.name}: ${err.message || err}`);
    }
  }

  const mapped = collected
    .filter(isRelevant)
    .map((item) => {
      const category = classify(item);
      const summary =
        item.summaryCandidate ||
        "公開情報に基づく速報です。詳細は出典をご確認ください。";
      return {
        id: makeId(item.url, item.title),
        title: item.title,
        summary,
        insight: INSIGHTS[category],
        category,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
      };
    });

  // 重複排除
  const seen = new Set();
  const unique = [];
  for (const item of mapped) {
    const key = item.url.replace(/#.*$/, "").replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  unique.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // 直近14日を優先
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recent = unique.filter((i) => new Date(i.publishedAt).getTime() >= cutoff);
  const pool = recent.length >= 10 ? recent : unique;
  const items = balanceByPillar(pool, 48);

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const i of items) counts[i.category] = (counts[i.category] || 0) + 1;

  const payload = {
    site: "SecuPulse",
    title: "AI時代の情報セキュリティ・個人情報漏洩ニュースサイト",
    updatedAt: new Date().toISOString(),
    timezone: "Asia/Tokyo",
    categories: CATEGORIES,
    stats: {
      total: items.length,
      aiSecurity: counts["AIセキュリティ"] || 0,
      personalData: counts["個人情報漏洩"] || 0,
      byCategory: counts,
    },
    sources: FEEDS.map((f) => ({ id: f.id, name: f.name, url: f.url })),
    errors,
    items,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${items.length} items -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
