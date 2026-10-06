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
  if (category === "規制・ガバナンス") return "reg";
  if (category === "インシデント対応・被害拡大") return "incident";
  if (category === "サプライチェーン／委託先") return "supply";
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
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-top">
        <span class="badge ${badgeClass(item.category)}">${item.category}</span>
        <span class="date">${formatDate(item.publishedAt)}</span>
      </div>
      <h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
      <p class="summary">${escapeHtml(item.summary)}</p>
      <p class="insight">${escapeHtml(item.insight)}</p>
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
