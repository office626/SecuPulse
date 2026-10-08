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
  "AIセキュリティ対策・向上",
  "サイバーセキュリティ企業の取り組み",
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
    id: "itmedia-enterprise",
    name: "ITmedia Enterprise",
    url: "https://rss.itmedia.co.jp/rss/2.0/enterprise.xml",
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
  "AIセキュリティ対策・向上": [
    "AI安全",
    "AIセーフティ",
    "AIガバナンス",
    "AIガイドライン",
    "AI利用指針",
    "AIリスク管理",
    "AIセキュリティ対策",
    "生成AI対策",
    "モデルカード",
    "レッドチーミング",
    "安全性評価",
    "信頼できるAI",
    "責任あるAI",
    "AI規制",
    "AI法",
    "NIST AI",
    "AI安全管理",
  ],
  "サイバーセキュリティ企業の取り組み": [
    "セキュリティサービス",
    "セキュリティ事業",
    "セキュリティソリューション",
    "新サービス",
    "サービス開始",
    "提供開始",
    "SOC",
    "MDR",
    "EDR",
    "XDR",
    "脆弱性診断",
    "ペネトレーション",
    "ゼロトラスト",
    "SIEM",
    "セキュリティ監視",
    "インシデント対応支援",
    "セキュリティコンサル",
    "MSS",
    "マネージドセキュリティ",
    "製品発表",
    "事業拡大",
    "資本提携",
    "業務提携",
  ],
  "規制・ガバナンス": [
    "個人情報保護法",
    "GDPR",
    "規制",
    "ガイドライン",
    "ガバナンス",
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

const MEASURE_HINTS = [
  "対策",
  "ガイドライン",
  "指針",
  "枠組み",
  "フレームワーク",
  "提言",
  "公表",
  "策定",
  "改訂",
  "強化",
  "向上",
  "整備",
  "導入",
  "評価",
  "認証",
  "ベストプラクティス",
  "手引き",
  "チェックリスト",
  "ロードマップ",
];

const ORG_HINTS = [
  "IPA",
  "NISC",
  "内閣",
  "経産省",
  "総務省",
  "警察庁",
  "JNSA",
  "NIST",
  "ENISA",
  "OECD",
  "政府",
  "省庁",
  "自治体",
  "業界団体",
  "協議会",
  "委員会",
  "企業",
  "発表",
];

const VENDOR_ACTION_HINTS = [
  "サービス開始",
  "提供開始",
  "新サービス",
  "サービス拡充",
  "ソリューション",
  "製品発表",
  "発売",
  "提供開始",
  "事業拡大",
  "事業強化",
  "業務提携",
  "資本提携",
  "協業",
  "パートナーシップ",
  "買収",
  "子会社化",
  "センター開設",
  "拠点開設",
  "認証取得",
];

const SERVICE_MENU = [
  { keys: ["SOC"], label: "SOC運用" },
  { keys: ["MDR"], label: "MDR" },
  { keys: ["EDR"], label: "EDR" },
  { keys: ["XDR"], label: "XDR" },
  { keys: ["SIEM"], label: "SIEM" },
  { keys: ["MSS", "マネージドセキュリティ"], label: "マネージドセキュリティ" },
  { keys: ["脆弱性診断", "セキュリティ診断"], label: "脆弱性診断" },
  { keys: ["ペネトレーション", "侵入テスト"], label: "ペネトレーションテスト" },
  { keys: ["ゼロトラスト"], label: "ゼロトラスト" },
  { keys: ["クラウドセキュリティ", "CSPM", "CWPP"], label: "クラウドセキュリティ" },
  { keys: ["セキュリティ監視", "24時間監視", "監視サービス"], label: "セキュリティ監視" },
  { keys: ["インシデント対応", "IR支援", "緊急対応"], label: "インシデント対応支援" },
  { keys: ["コンサル", "助言", "伴走"], label: "セキュリティコンサルティング" },
  { keys: ["教育", "研修", "訓練", "啓発"], label: "教育・訓練" },
  { keys: ["IAM", "ID管理", "認証基盤"], label: "IAM／ID管理" },
  { keys: ["CASB", "SASE"], label: "CASB／SASE" },
  { keys: ["生成AI", "AIセキュリティ"], label: "生成AI関連セキュリティサービス" },
  { keys: ["メールセキュリティ", "フィッシング対策"], label: "メールセキュリティ" },
  { keys: ["OTセキュリティ", "制御システム"], label: "OT／制御システムセキュリティ" },
];

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

    const bodyText = stripHtml(summaryRaw).slice(0, 800);

    items.push({
      title,
      url: stripHtml(link).trim(),
      summaryCandidate: firstSentence(summaryRaw) || firstSentence(title),
      bodyText,
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

function looksLikeAiMeasure(text) {
  const hasAi =
    /AI|人工知能|生成AI|LLM|機械学習|ChatGPT|プロンプト/.test(text);
  if (!hasAi) return false;
  const measureHits = MEASURE_HINTS.filter((w) => text.includes(w)).length;
  const orgHits = ORG_HINTS.filter((w) => text.includes(w)).length;
  const incidentHits = [
    "漏洩",
    "漏えい",
    "流出",
    "不正アクセス",
    "ランサム",
    "被害",
    "攻撃を受け",
  ].filter((w) => text.includes(w)).length;
  return measureHits >= 1 && (orgHits >= 1 || measureHits >= 2) && incidentHits === 0;
}

function looksLikeVendorInitiative(text) {
  const victimIncident = [
    "個人情報が",
    "情報が流出",
    "不正アクセスを受け",
    "ランサムウェア攻撃を受け",
    "サイバー攻撃の可能性",
    "攻撃の可能性",
    "被害に遭",
    "漏えいした可能性",
    "漏洩した可能性",
    "調査を開始",
    "外部から情報提供",
  ].some((w) => text.includes(w));
  if (victimIncident) return false;

  // 脆弱性修正・注意喚起は企業PRではなくインシデント／脆弱性側へ
  if (/脆弱性|ゼロデイ|CVE-|注意喚起|修正パッチ/.test(text) && !/新サービス|サービス開始|事業拡大|提携/.test(text)) {
    return false;
  }

  const hasSecurity = /セキュリティ|サイバー|SOC|MDR|EDR|XDR|脆弱性診断|ゼロトラスト/.test(
    text
  );
  if (!hasSecurity) return false;

  const actionHits = VENDOR_ACTION_HINTS.filter((w) => text.includes(w)).length;
  const serviceHits = SERVICE_MENU.filter((s) =>
    s.keys.some((k) => text.includes(k))
  ).length;
  const vendorScore = scoreCategory(text, "サイバーセキュリティ企業の取り組み");

  return actionHits >= 1 || serviceHits >= 2 || vendorScore >= 4;
}

function extractServiceMenu(text) {
  const found = [];
  for (const item of SERVICE_MENU) {
    if (item.keys.some((k) => text.includes(k))) found.push(item.label);
  }
  return [...new Set(found)].slice(0, 6);
}

function buildCompanyBrief(item, services) {
  const text = `${item.title} ${item.summaryCandidate} ${item.bodyText || ""}`;
  const serviceText =
    services.length > 0
      ? `想定サービス領域: ${services.join("、")}`
      : "サービス領域は原文の製品・支援内容を確認";

  let highlight = "セキュリティ事業の強化・拡充に関する発表";
  if (/提携|協業|パートナー/.test(text)) {
    highlight = "他社との提携・協業によるサービス強化が焦点";
  } else if (/買収|子会社化/.test(text)) {
    highlight = "買収・組織再編によるケイパビリティ拡大が焦点";
  } else if (/サービス開始|提供開始|新サービス|発売/.test(text)) {
    highlight = "新サービス／新製品の投入によるメニュー拡充が焦点";
  } else if (/センター|拠点|SOC/.test(text)) {
    highlight = "運用拠点・SOC体制の整備が焦点";
  } else if (/認証|取得/.test(text)) {
    highlight = "認証取得など信頼性向上の取り組みが焦点";
  } else if (/生成AI|AI/.test(text)) {
    highlight = "AI活用／AIリスク対応を含むサービス展開が焦点";
  }

  return {
    companySummary: `${firstSentence(item.summaryCandidate || item.title, 100)}（${serviceText}）`,
    servicesText: `サービスメニュー: ${
      services.length
        ? services.join("、")
        : "公開要約からは特定しきれないため、原文のメニュー・対象領域を確認"
    }。`,
    highlightsText: `顕著な取り組み: ${highlight}。経営層は自社の空白領域（監視・診断・教育・インシデント対応など）と照合して活用可否を検討するとよい。`,
  };
}

function classify(item) {
  const text = `${item.title} ${item.summaryCandidate} ${item.bodyText || ""}`;

  // 機関・企業のAI対策／向上記事を優先分類
  if (looksLikeAiMeasure(text) || scoreCategory(text, "AIセキュリティ対策・向上") >= 3) {
    return "AIセキュリティ対策・向上";
  }

  // セキュリティ企業のサービス／取り組み記事
  if (
    looksLikeVendorInitiative(text) ||
    scoreCategory(text, "サイバーセキュリティ企業の取り組み") >= 4
  ) {
    return "サイバーセキュリティ企業の取り組み";
  }

  let best = "インシデント対応・被害拡大";
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    if (
      cat === "AIセキュリティ対策・向上" ||
      cat === "サイバーセキュリティ企業の取り組み"
    ) {
      continue;
    }
    const s = scoreCategory(text, cat);
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  }

  const ai = scoreCategory(text, "AIセキュリティ");
  const leak = scoreCategory(text, "個人情報漏洩");
  if (ai >= 2 && ai >= leak && ai >= bestScore) return "AIセキュリティ";
  if (leak >= 2 && leak > ai) return "個人情報漏洩";
  return bestScore > 0 ? best : "インシデント対応・被害拡大";
}

function isRelevant(item) {
  const text = `${item.title} ${item.summaryCandidate} ${item.bodyText || ""}`;
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
    "ガイドライン",
    "ガバナンス",
    "セーフティ",
    "SOC",
    "MDR",
    "EDR",
    "ソリューション",
    "サービス開始",
    "提供開始",
  ];
  return needles.some((n) => text.includes(n));
}

function extractCountHint(text) {
  const patterns = [
    /(\d{1,3}(?:,\d{3})+|\d+)\s*万\s*件/,
    /(\d{1,3}(?:,\d{3})+|\d+)\s*件/,
    /(\d{1,3}(?:,\d{3})+|\d+)\s*人/,
    /(\d{1,3}(?:,\d{3})+|\d+)\s*社/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

function inferCauses(text, category) {
  const causes = [];

  if (category === "AIセキュリティ対策・向上") {
    causes.push(
      "生成AIの急速な普及に伴い、誤情報・機密漏えい・悪用リスクへの対応が社会的・規制的に求められている"
    );
    if (text.includes("ガイドライン") || text.includes("指針")) {
      causes.push("既存の一般的なセキュリティ基準だけではAI固有リスクを十分にカバーできない");
    }
    if (text.includes("評価") || text.includes("レッドチーム")) {
      causes.push("モデルやサービスの安全性を事前に検証する仕組みが不足していた");
    }
    return causes;
  }

  if (category === "サイバーセキュリティ企業の取り組み") {
    causes.push("企業の防御需要の高まりを受け、ベンダー側がサービス／体制を拡充している");
    return causes;
  }

  const rules = [
    {
      keys: ["委託", "再委託", "取引先", "サプライ"],
      cause: "委託先・サプライチェーン管理（契約条項、監査、通知義務）の不備が疑われる",
    },
    {
      keys: ["メールアカウント", "メール", "なりすまし"],
      cause: "メールアカウント保護（多要素認証、異常検知、権限最小化）の不足が疑われる",
    },
    {
      keys: ["ランサム"],
      cause: "侵入経路対策・バックアップ分離・権限管理の不足により被害が拡大した可能性が高い",
    },
    {
      keys: ["不正アクセス"],
      cause: "認証・アクセス制御やログ監視の不備により、外部からの侵入を早期に抑えられなかった可能性",
    },
    {
      keys: ["脆弱性", "ゼロデイ", "CVE"],
      cause: "パッチ適用や脆弱性管理プロセスの遅れ・未対応が直接要因として疑われる",
    },
    {
      keys: ["フィッシング", "偽サイト", "なりすまし"],
      cause: "人的対策やメール／Web防御の不足により、初期侵入を許した可能性",
    },
    {
      keys: ["誤送信", "設定ミス", "公開設定", "権限設定"],
      cause: "運用手順・二重確認・権限設計の不備（ヒューマンエラー／設定ミス）が疑われる",
    },
    {
      keys: ["プロンプト", "生成AI", "ChatGPT", "LLM"],
      cause: "AI利用ポリシー、入力データの統制、出力監視の仕組み不足が疑われる",
    },
    {
      keys: ["ディープフェイク"],
      cause: "偽情報・なりすまし検知や本人確認プロセスの弱さが悪用された可能性",
    },
    {
      keys: ["クラウド", "SaaS"],
      cause: "クラウド／SaaSの設定管理や共有責任モデルの理解不足が疑われる",
    },
  ];

  for (const rule of rules) {
    if (rule.keys.some((k) => text.includes(k))) causes.push(rule.cause);
  }

  if (!causes.length) {
    if (category === "個人情報漏洩") {
      causes.push("アクセス制御、監視、データ取扱い手順のいずれか（または複合）に不備があった可能性");
    } else if (category === "AIセキュリティ") {
      causes.push("AIシステム固有のリスク管理（データ、モデル、利用統制）が追いついていなかった可能性");
    } else if (category === "規制・ガバナンス") {
      causes.push("制度変更や監督強化を受け、現行ガバナンスのギャップが顕在化した");
    } else if (category === "サプライチェーン／委託先") {
      causes.push("自社境界外の委託先・供給網における管理責任の不明確さが要因として疑われる");
    } else {
      causes.push("技術的対策と運用・ガバナンスの間にすき間があり、事象の発生または拡大を許した可能性");
    }
  }

  // 重複除去（最大3件）
  return [...new Set(causes)].slice(0, 3);
}

function inferSeverity(text, category) {
  let score = 1; // 1低 2中 3高
  const reasons = [];

  if (category === "AIセキュリティ対策・向上") {
    score = 2;
    reasons.push("対策の遅れは将来の規制対応・顧客信頼・事業継続に波及しうる");
    if (/必須|義務|罰則|規制|法/.test(text)) {
      score = 3;
      reasons.push("規制・義務化の文脈があり、未対応時のコンプライアンス影響が大きい");
    }
    return { level: score >= 3 ? "高" : "中", score, reasons };
  }

  if (category === "サイバーセキュリティ企業の取り組み") {
    score = 2;
    reasons.push("外部サービスの活用可否を検討する材料として影響度は中程度");
    if (/提携|買収|SOC|MDR|全国|24時間/.test(text)) {
      score = 3;
      reasons.push("体制・カバー範囲の拡大により、調達・委託先選定への影響が大きい");
    }
    return { level: score >= 3 ? "高" : "中", score, reasons };
  }

  const countHint = extractCountHint(text);
  if (countHint) {
    if (/万\s*件|万件/.test(countHint) || /,\d{3}/.test(countHint)) {
      score = 3;
      reasons.push(`影響規模の記載（${countHint}）があり、被害範囲が広い`);
    } else {
      score = Math.max(score, 2);
      reasons.push(`影響規模の記載（${countHint}）がある`);
    }
  }

  if (/ランサム|事業停止|サービス停止|金銭的な被害|身代金|クリティカル|緊急/.test(text)) {
    score = 3;
    reasons.push("事業継続や金銭被害、緊急対応を要する兆候がある");
  }
  if (/個人情報|顧客情報|会員情報|クレジットカード|マイナンバー|医療/.test(text)) {
    score = Math.max(score, 2);
    reasons.push("機微性の高い個人データが関与し、説明責任・報告義務のリスクが高い");
  }
  if (/委託|取引先|サプライ/.test(text)) {
    score = Math.max(score, 2);
    reasons.push("関係者が複数にまたがり、影響が自社外へ波及しやすい");
  }
  if (/脆弱性|ゼロデイ/.test(text) && !/個人情報|漏洩|漏えい/.test(text)) {
    score = Math.max(score, 2);
    reasons.push("未修正なら広範なシステムに波及しうる技術的リスク");
  }

  if (!reasons.length) {
    reasons.push("公開情報からは限定的だが、放置すれば信頼毀損や再発リスクにつながる");
  }

  const level = score >= 3 ? "高" : score === 2 ? "中" : "低";
  return { level, score, reasons: reasons.slice(0, 3) };
}

function buildAnalysis(item, category) {
  const text = `${item.title}。${item.summaryCandidate} ${item.bodyText || ""}`;

  if (category === "サイバーセキュリティ企業の取り組み") {
    const services = extractServiceMenu(text);
    const brief = buildCompanyBrief(item, services);
    const severity = inferSeverity(text, category);
    return {
      cause: brief.servicesText,
      impact: `${brief.highlightsText} 影響度: 【${severity.level}】${severity.reasons.join("／")}。`,
      severity: severity.level,
      insight: `${brief.servicesText} ${brief.highlightsText}`,
      companySummary: brief.companySummary,
      services: services,
      highlights: brief.highlightsText,
    };
  }

  const causes = inferCauses(text, category);
  const severity = inferSeverity(text, category);

  const causeLabel =
    category === "AIセキュリティ対策・向上" ? "背景・要因" : "原因・不備";
  const causeText = `${causeLabel}: ${causes.join("／")}。`;

  const impactLead =
    category === "AIセキュリティ対策・向上"
      ? `深刻度・影響度: 【${severity.level}】機関・企業の対策動向として注目度が高く、`
      : `深刻度・影響度: 【${severity.level}】`;

  const impactText = `${impactLead}${severity.reasons.join("／")}。`;

  return {
    cause: causeText,
    impact: impactText,
    severity: severity.level,
    insight: `${causeText} ${impactText}`,
  };
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

function balanceByPillar(items, limit = 48) {
  const ai = items.filter((i) => i.category === "AIセキュリティ");
  const leak = items.filter((i) => i.category === "個人情報漏洩");
  const measures = items.filter((i) => i.category === "AIセキュリティ対策・向上");
  const vendors = items.filter(
    (i) => i.category === "サイバーセキュリティ企業の取り組み"
  );
  const others = items.filter(
    (i) =>
      i.category !== "AIセキュリティ" &&
      i.category !== "個人情報漏洩" &&
      i.category !== "AIセキュリティ対策・向上" &&
      i.category !== "サイバーセキュリティ企業の取り組み"
  );

  const aiSlots = Math.floor(limit * 0.3);
  const leakSlots = Math.floor(limit * 0.3);
  const measureSlots = Math.max(3, Math.floor(limit * 0.12));
  const vendorSlots = Math.max(4, Math.floor(limit * 0.15));

  const pickAi = ai.slice(0, aiSlots);
  const pickLeak = leak.slice(0, leakSlots);
  const pickMeasures = measures.slice(0, measureSlots);
  const pickVendors = vendors.slice(0, vendorSlots);
  const used = new Set(
    [...pickAi, ...pickLeak, ...pickMeasures, ...pickVendors].map((i) => i.id)
  );
  const remaining = limit - used.size;
  const restPool = [...ai, ...leak, ...measures, ...vendors, ...others]
    .filter((i) => !used.has(i.id))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return [
    ...pickAi,
    ...pickLeak,
    ...pickMeasures,
    ...pickVendors,
    ...restPool.slice(0, remaining),
  ].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
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
      const analysis = buildAnalysis(item, category);
      const summary =
        analysis.companySummary ||
        item.summaryCandidate ||
        "公開情報に基づく速報です。詳細は出典をご確認ください。";
      return {
        id: makeId(item.url, item.title),
        title: item.title,
        summary,
        cause: analysis.cause,
        impact: analysis.impact,
        severity: analysis.severity,
        insight: analysis.insight,
        services: analysis.services || [],
        highlights: analysis.highlights || "",
        category,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
      };
    });

  const seen = new Set();
  const unique = [];
  for (const item of mapped) {
    const key = item.url.replace(/#.*$/, "").replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  unique.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

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
      aiMeasures: counts["AIセキュリティ対策・向上"] || 0,
      vendors: counts["サイバーセキュリティ企業の取り組み"] || 0,
      byCategory: counts,
    },
    sources: FEEDS.map((f) => ({ id: f.id, name: f.name, url: f.url })),
    errors,
    items,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${items.length} items -> ${OUT}`);
  console.log("byCategory:", counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
