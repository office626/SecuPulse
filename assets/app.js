const state = {
  data: null,
  category: "すべて",
};

const els = {
  updatedAt: document.querySelector("#updatedAt"),
  total: document.querySelector("#statTotal"),
  ai: document.querySelector("#statAi"),
  leak: document.querySelector("#statLeak"),
  other: document.querySelector("#statOther"),
  filters: document.querySelector("#filters"),
  newsList: document.querySelector("#newsList"),
  catBars: document.querySelector("#catBars"),
  sourceList: document.querySelector("#sourceList"),
};

function badgeClass(category) {
  if (category === "AIセキュリティ") return "ai";
  if (category === "個人情報漏洩") return "leak";
  if (category === "AIセキュリティ対策・向上") return "measure";
  if (category === "サイバーセキュリティ企業の取り組み") return "vendor";
  if (category === "規制・ガバナンス") return "reg";
  if (category === "インシデント対応・被害拡大") return "incident";
  if (category === "サプライチェーン／委託先") return "supply";
  return "";
}

function severityClass(level) {
  if (level === "高") return "sev-high";
  if (level === "中") return "sev-mid";
  if (level === "低") return "sev-low";
  return "";
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function renderStats(data) {
  const by = data.stats.byCategory || {};
  const other =
    (by["AIセキュリティ対策・向上"] || data.stats.aiMeasures || 0) +
    (by["サイバーセキュリティ企業の取り組み"] || data.stats.vendors || 0) +
    (by["規制・ガバナンス"] || 0) +
    (by["インシデント対応・被害拡大"] || 0) +
    (by["サプライチェーン／委託先"] || 0);

  els.total.textContent = String(data.stats.total ?? data.items.length);
  els.ai.textContent = String(data.stats.aiSecurity ?? 0);
  els.leak.textContent = String(data.stats.personalData ?? 0);
  els.other.textContent = String(other);
  els.updatedAt.textContent = formatDate(data.updatedAt);
}

function renderFilters(categories) {
  const all = ["すべて", ...categories];
  els.filters.innerHTML = "";
  for (const cat of all) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `filter-btn${state.category === cat ? " active" : ""}`;
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      state.category = cat;
      renderFilters(categories);
      renderNews();
    });
    els.filters.appendChild(btn);
  }
}

function renderCatBars(data) {
  const total = Math.max(data.stats.total || 1, 1);
  const by = data.stats.byCategory || {};
  els.catBars.innerHTML = "";
  for (const cat of data.categories) {
    const count = by[cat] || 0;
    const row = document.createElement("div");
    row.className = "cat-row";
    row.innerHTML = `
      <div class="row-top"><span>${cat}</span><span>${count}</span></div>
      <div class="bar"><span style="width:${Math.round((count / total) * 100)}%"></span></div>
    `;
    els.catBars.appendChild(row);
  }
}

function renderSources(sources) {
  els.sourceList.innerHTML = "";
  for (const s of sources) {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a>`;
    els.sourceList.appendChild(li);
  }
}

function renderNews() {
  const items = (state.data?.items || []).filter((item) =>
    state.category === "すべて" ? true : item.category === state.category
  );

  els.newsList.innerHTML = "";
  if (!items.length) {
    els.newsList.innerHTML = `<div class="empty">該当するニュースがありません。</div>`;
    return;
  }

  for (const item of items) {
    const isVendor = item.category === "サイバーセキュリティ企業の取り組み";
    const cause =
      item.cause ||
      (item.insight ? item.insight.split(/(?=深刻度・影響度:|顕著な取り組み:)/)[0]?.trim() : "");
    const impact =
      item.impact ||
      (item.insight
        ? item.insight.match(/(?:深刻度・影響度:|顕著な取り組み:)[\s\S]*/)?.[0]
        : "") ||
      "";
    const severity = item.severity || "";
    const serviceTags =
      isVendor && Array.isArray(item.services) && item.services.length
        ? `<div class="service-tags">${item.services
            .map((s) => `<span class="service-tag">${escapeHtml(s)}</span>`)
            .join("")}</div>`
        : "";

    const card = document.createElement("article");
    card.className = `card${isVendor ? " card-vendor" : ""}`;
    card.innerHTML = `
      <div class="card-top">
        <span class="badge ${badgeClass(item.category)}">${item.category}</span>
        ${
          severity
            ? `<span class="badge severity ${severityClass(severity)}">${
                isVendor ? "注目度" : "深刻度"
              } ${escapeHtml(severity)}</span>`
            : ""
        }
        <span class="date">${formatDate(item.publishedAt)}</span>
      </div>
      <h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
      <p class="summary">${escapeHtml(item.summary)}</p>
      ${serviceTags}
      <div class="analysis">
        <p class="cause">${escapeHtml(cause || item.insight || "")}</p>
        <p class="impact">${escapeHtml(impact)}</p>
      </div>
      <div class="card-foot">
        <span>出典: ${escapeHtml(item.source)}</span>
        <a href="${item.url}" target="_blank" rel="noopener noreferrer">原文を読む →</a>
      </div>
    `;
    els.newsList.appendChild(card);
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function init() {
  const res = await fetch(`./data/news.json?t=${Date.now()}`);
  if (!res.ok) throw new Error("news.json の読み込みに失敗しました");
  state.data = await res.json();
  renderStats(state.data);
  renderFilters(state.data.categories || []);
  renderCatBars(state.data);
  renderSources(state.data.sources || []);
  renderNews();
}

init().catch((err) => {
  els.newsList.innerHTML = `<div class="empty">データの読み込みに失敗しました。<br>${escapeHtml(err.message)}</div>`;
});
