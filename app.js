const menuList = document.querySelector("#menu-list");
const sakeCount = document.querySelector("#sake-count");
const siteLink = document.querySelector("#site-link");
const qrImage = document.querySelector("#qr-image");
const nicknameInput = document.querySelector("#nickname-input");
const nicknameSave = document.querySelector("#nickname-save");
const nicknameStatus = document.querySelector("#nickname-status");
const summaryList = document.querySelector("#summary-list");
const toast = document.querySelector("#toast");

const storageKeys = {
  nickname: "sake-menu-nickname",
  ratings: "sake-menu-ratings",
};

const state = {
  baseItems: [],
  items: [],
  summaryBySakeId: {},
  nickname: readStorage(storageKeys.nickname, ""),
  myRatings: readStorage(storageKeys.ratings, {}),
};

let toastTimer = null;
let liveRefreshTimer = null;

function csvUrl() {
  const separator = menuConfig.menuCsvPath.includes("?") ? "&" : "?";
  return `${menuConfig.menuCsvPath}${separator}v=${menuConfig.menuVersion}`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`storage read failed: ${key}`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`storage write failed: ${key}`, error);
  }
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      current += char;
      if (inQuotes && next === '"') {
        current += next;
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "\n" && !inQuotes) {
      rows.push(splitCsvLine(current.replace(/\r$/, "")));
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim() !== "") {
    rows.push(splitCsvLine(current.replace(/\r$/, "")));
  }

  return rows;
}

function columnIndexMap(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const indices = {};

  Object.entries(menuConfig.columns).forEach(([key, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    indices[key] = normalizedHeaders.findIndex((header) =>
      normalizedAliases.includes(header),
    );
  });

  return indices;
}

function isPublishedRow(value) {
  if (value == null || value === "") {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();
  return !["0", "false", "no", "off", "ng", "非表示"].includes(normalized);
}

function isEnabledValue(value, fallback = true) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return !["0", "false", "no", "off", "ng", "stop", "soldout", "売切れ", "売り切れ"].includes(
    normalized,
  );
}

function isSoldOutValue(value) {
  if (value == null || value === "") {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on", "soldout", "売切れ", "売り切れ"].includes(normalized);
}

function valueAt(row, index) {
  if (index < 0) {
    return "";
  }

  return String(row[index] || "").trim();
}

function pairingList(value) {
  return String(value || "")
    .split(/[\/、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSakeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[()（）\s]/g, "");
}

function slugify(value) {
  const ascii = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (ascii) {
    return ascii;
  }

  return normalizeSakeName(value).slice(0, 32) || `sake-${Date.now()}`;
}

function lookupByName(name) {
  const target = normalizeSakeName(name);

  return Object.entries(sakeLookup).find(([key, entry]) => {
    const candidates = [key, ...(entry.aliases || [])];
    return candidates.some((candidate) => normalizeSakeName(candidate) === target);
  })?.[1];
}

function ratingSummary(item) {
  const summary = state.summaryBySakeId[item.id];

  if (!summary || summary.count < 1) {
    return "未評価";
  }

  return `★${summary.average.toFixed(1)} (${summary.count}件)`;
}

function sortedItems(items) {
  return [...items].sort((left, right) => {
    if (left.soldOut !== right.soldOut) {
      return Number(left.soldOut) - Number(right.soldOut);
    }

    return left.sourceIndex - right.sourceIndex;
  });
}

function orderStateLabel(item) {
  if (item.soldOut) {
    return "売切れ";
  }

  if (!item.orderEnabled) {
    return "受付停止";
  }

  return "注文受付中";
}

function renderStars(itemId, myScore) {
  return [1, 2, 3, 4, 5]
    .map((score) => {
      const active = myScore >= score ? "is-active" : "";
      const current = myScore === score ? "aria-pressed=\"true\"" : "aria-pressed=\"false\"";
      return `
        <button
          class="star-button ${active}"
          type="button"
          data-action="rate"
          data-sake-id="${itemId}"
          data-score="${score}"
          ${current}
        >★</button>
      `;
    })
    .join("");
}

function renderMenuItem(item) {
  const pairingItems = item.pairing.map((food) => `<li>${escapeHtml(food)}</li>`).join("");
  const myScore = Number(state.myRatings[item.id] || 0);
  const orderDisabled = item.soldOut || !item.orderEnabled;
  const orderLabel = item.soldOut ? "売切れ" : item.orderEnabled ? "注文する" : "受付停止";

  return `
    <article class="menu-card ${item.soldOut ? "is-sold-out" : ""}" data-sake-id="${item.id}">
      <div class="label-media">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)} のラベル" loading="lazy" />
      </div>
      <div class="menu-copy">
        <div class="menu-head">
          <h3>${escapeHtml(item.name)}</h3>
          <span class="brewery">${escapeHtml(item.brewery)}</span>
        </div>
        <p class="flavor">${escapeHtml(item.flavor)}</p>
        <div class="detail-list">
          <span class="pill"><strong>タイプ</strong>${escapeHtml(item.type)}</span>
          <span class="pill"><strong>温度</strong>${escapeHtml(item.temperature)}</span>
          <span class="pill"><strong>度数</strong>${escapeHtml(item.alcohol)}</span>
          <span class="pill"><strong>精米歩合</strong>${escapeHtml(item.polish)}</span>
        </div>
        <div class="action-panel">
          <div class="order-box">
            <div class="action-copy">
              <span class="action-label">Order</span>
              <strong>${orderStateLabel(item)}</strong>
            </div>
            <button
              class="action-button action-button-primary"
              type="button"
              data-action="order"
              data-sake-id="${item.id}"
              ${orderDisabled ? "disabled" : ""}
            >
              ${orderLabel}
            </button>
          </div>
          <div class="rating-box">
            <div class="action-copy">
              <span class="action-label">Rating</span>
              <strong>${ratingSummary(item)}</strong>
            </div>
            <div class="stars" aria-label="${escapeHtml(item.name)} の評価">
              ${renderStars(item.id, myScore)}
            </div>
            <p class="rating-note">
              ${myScore > 0 ? `あなたの評価: ★${myScore}` : "飲んだら星を押してください。"}
            </p>
          </div>
        </div>
      </div>
      <aside class="pairing-box">
        <h3>合わせたいもの</h3>
        <ul>${pairingItems}</ul>
      </aside>
    </article>
  `;
}

function renderStatus(title, message) {
  menuList.innerHTML = `
    <article class="menu-card status-card">
      <div class="menu-copy">
        <h3>${escapeHtml(title)}</h3>
        <p class="flavor">${escapeHtml(message)}</p>
      </div>
    </article>
  `;
}

function renderSummaryCards() {
  const ranked = state.items
    .map((item) => ({
      item,
      summary: state.summaryBySakeId[item.id],
    }))
    .filter(({ summary }) => summary && summary.count > 0)
    .sort((left, right) => {
      if (right.summary.average !== left.summary.average) {
        return right.summary.average - left.summary.average;
      }

      return right.summary.count - left.summary.count;
    })
    .slice(0, 3);

  if (ranked.length === 0) {
    summaryList.innerHTML = `
      <article class="summary-card">
        <strong>評価待ち</strong>
        <p>最初のひと口を飲んだら、星を入れてみてください。</p>
      </article>
    `;
    return;
  }

  summaryList.innerHTML = ranked
    .map(
      ({ item, summary }, index) => `
        <article class="summary-card">
          <span class="summary-rank">#${index + 1}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <p>★${summary.average.toFixed(1)} / ${summary.count}件</p>
        </article>
      `,
    )
    .join("");
}

function renderNickname() {
  nicknameInput.value = state.nickname;
  nicknameStatus.textContent = state.nickname
    ? `${state.nickname} として参加中。`
    : "注文と評価の前に、名前だけ入れてください。";
}

function renderMenu() {
  if (state.items.length === 0) {
    renderStatus(
      "表示できる銘柄がありません",
      "CSVの1行目に見出しがあり、公開対象の行に銘柄名が入っているか確認してください。",
    );
    sakeCount.textContent = "0銘柄";
    renderSummaryCards();
    return;
  }

  menuList.innerHTML = state.items.map(renderMenuItem).join("");
  sakeCount.textContent = `${state.items.length}銘柄`;
  renderSummaryCards();
}

function renderAll() {
  renderNickname();
  renderMenu();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function updateNickname() {
  const nickname = nicknameInput.value.trim().slice(0, 20);
  state.nickname = nickname;
  writeStorage(storageKeys.nickname, nickname);
  renderNickname();
  showToast(nickname ? `${nickname} で保存しました` : "参加名をクリアしました");
}

function ensureNickname() {
  const nickname = nicknameInput.value.trim();

  if (!nickname) {
    nicknameInput.focus();
    showToast("先にニックネームを入れてください");
    return false;
  }

  if (nickname !== state.nickname) {
    updateNickname();
  }

  return true;
}

function upsertSummary(sakeId, average, count) {
  const existing = state.summaryBySakeId[sakeId] || {};
  state.summaryBySakeId[sakeId] = {
    ...existing,
    average: Number(average) || 0,
    count: Number(count) || 0,
  };
}

function gasUrl(action) {
  if (!menuConfig.gasAppUrl) {
    return "";
  }

  const separator = menuConfig.gasAppUrl.includes("?") ? "&" : "?";
  return `${menuConfig.gasAppUrl}${separator}action=${encodeURIComponent(action)}`;
}

function gasUrlWithParams(action, payload = {}) {
  const url = new URL(gasUrl(action));

  Object.entries(payload).forEach(([key, value]) => {
    if (value != null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function gasRequest(action, payload = null) {
  if (!menuConfig.gasAppUrl) {
    return mockGasResponse(action, payload);
  }

  const response = await fetch(payload ? gasUrlWithParams(action, payload) : gasUrl(action), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`gas request failed: ${response.status}`);
  }

  return response.json();
}

function mockGasResponse(action, payload) {
  if (action === "menuStatus") {
    return Promise.resolve({
      ok: true,
      items: [],
    });
  }

  if (action === "summary") {
    return Promise.resolve({
      ok: true,
      items: Object.entries(state.myRatings)
        .map(([sakeId, score]) => {
          const item = state.items.find((entry) => entry.id === sakeId);
          if (!item) {
            return null;
          }

          return {
            sakeId,
            sakeName: item.name,
            average: Number(score),
            count: 1,
          };
        })
        .filter(Boolean),
    });
  }

  if (action === "order") {
    return Promise.resolve({
      ok: true,
      orderId: `mock-${Date.now()}`,
      status: "new",
    });
  }

  if (action === "rating") {
    return Promise.resolve({
      ok: true,
      average: Number(payload.score),
      count: 1,
      myScore: Number(payload.score),
    });
  }

  return Promise.resolve({ ok: false, error: "unsupported_action" });
}

async function refreshSummary() {
  try {
    const result = await gasRequest("summary");

    if (!result.ok) {
      throw new Error(result.error || "summary_failed");
    }

    state.summaryBySakeId = {};
    result.items.forEach((item) => {
      upsertSummary(item.sakeId, item.average, item.count);
    });
  } catch (error) {
    console.warn("summary refresh failed", error);
  }
}

async function refreshMenuStatus() {
  try {
    const result = await gasRequest("menuStatus");

    if (!result.ok) {
      throw new Error(result.error || "menu_status_failed");
    }

    const statusById = Object.fromEntries(
      (result.items || []).map((item) => [
        String(item.sakeId || "").trim(),
        {
          soldOut: Boolean(item.soldOut),
          orderEnabled: item.orderEnabled !== false,
          hidden: Boolean(item.hidden),
        },
      ]),
    );

    state.items = sortedItems(
      state.baseItems
        .map((item) => {
          const remote = statusById[item.id];

          if (!remote) {
            return { ...item };
          }

          return {
            ...item,
            soldOut: remote.soldOut,
            orderEnabled: remote.soldOut ? false : remote.orderEnabled,
            hidden: remote.hidden,
          };
        })
        .filter((item) => !item.hidden),
    );
  } catch (error) {
    console.warn("menu status refresh failed", error);
    state.items = sortedItems(state.baseItems.map((item) => ({ ...item })));
  }
}

async function refreshLiveData(options = {}) {
  const { showRender = true } = options;
  await Promise.all([refreshSummary(), refreshMenuStatus()]);

  if (showRender) {
    renderMenu();
  }
}

function toMenuItems(rows) {
  if (rows.length < 2) {
    return [];
  }

  const [headers, ...body] = rows;
  const indices = columnIndexMap(headers);

  return body
    .filter((row) => valueAt(row, indices.name))
    .filter((row) => isPublishedRow(valueAt(row, indices.published)))
    .map((row, itemIndex) => {
      const name = valueAt(row, indices.name);
      const searchName = valueAt(row, indices.searchName);
      const lookup = lookupByName(name || searchName) || {};
      const image = valueAt(row, indices.image);
      const brewery = valueAt(row, indices.brewery);
      const prefecture = valueAt(row, indices.prefecture);
      const hiire = valueAt(row, indices.hiire);
      const sakamai = valueAt(row, indices.sakamai);
      const explicitFlavor = valueAt(row, indices.flavor);
      const explicitTemperature = valueAt(row, indices.temperature);
      const explicitAlcohol = valueAt(row, indices.alcohol);
      const explicitPairing = valueAt(row, indices.pairing);
      const flavorParts = [valueAt(row, indices.type), hiire, sakamai, prefecture].filter(Boolean);
      const id = valueAt(row, indices.id) || slugify(searchName || name || `sake-${itemIndex + 1}`);

      return {
        id,
        sourceIndex: itemIndex,
        name,
        image: image || "",
        brewery:
          [brewery || lookup.brewery, prefecture || lookup.prefecture]
            .filter(Boolean)
            .join(" / ") || "蔵元情報なし",
        flavor:
          explicitFlavor ||
          lookup.flavor ||
          (flavorParts.length > 0 ? flavorParts.join(" / ") : "コメント未設定"),
        temperature: explicitTemperature || lookup.temperature || "冷酒から常温",
        type: valueAt(row, indices.type) || lookup.type || "未分類",
        alcohol: explicitAlcohol || lookup.alcohol || "未設定",
        polish:
          (valueAt(row, indices.polish)
            ? `${valueAt(row, indices.polish)}%`
            : lookup.polish) || "未設定",
        pairing: explicitPairing
          ? pairingList(explicitPairing)
          : lookup.pairing || [hiire, sakamai].filter(Boolean),
        orderEnabled: isEnabledValue(valueAt(row, indices.orderEnabled), true),
        soldOut: isSoldOutValue(valueAt(row, indices.soldOut)),
      };
    });
}

async function loadMenu() {
  const response = await fetch(csvUrl(), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`menu fetch failed: ${response.status}`);
  }

  const csvText = await response.text();
  return toMenuItems(parseCsv(csvText));
}

function setQrCode(url) {
  const encoded = encodeURIComponent(url);
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encoded}`;
  siteLink.href = url;
  siteLink.textContent = url;
}

function findItemById(sakeId) {
  return state.items.find((item) => item.id === sakeId);
}

async function submitOrder(item) {
  if (!ensureNickname()) {
    return;
  }

  const result = await gasRequest("order", {
    nickname: state.nickname,
    sakeId: item.id,
    sakeName: item.name,
  });

  if (!result.ok) {
    throw new Error(result.error || "order_failed");
  }

  showToast(`${item.name} を注文しました`);
}

async function submitRating(item, score) {
  if (!ensureNickname()) {
    return;
  }

  const result = await gasRequest("rating", {
    nickname: state.nickname,
    sakeId: item.id,
    sakeName: item.name,
    score,
  });

  if (!result.ok) {
    throw new Error(result.error || "rating_failed");
  }

  state.myRatings[item.id] = score;
  writeStorage(storageKeys.ratings, state.myRatings);
  upsertSummary(item.id, result.average, result.count);
  renderMenu();
  showToast(`${item.name} に ★${score} を付けました`);
}

async function onMenuClick(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const { action, sakeId } = button.dataset;
  const item = findItemById(sakeId);

  if (!item) {
    return;
  }

  button.disabled = true;

  try {
    if (action === "order") {
      await submitOrder(item);
    }

    if (action === "rate") {
      await submitRating(item, Number(button.dataset.score));
    }
  } catch (error) {
    console.error(error);
    showToast("送信に失敗しました");
  } finally {
    renderMenu();
  }
}

async function init() {
  setQrCode(menuConfig.siteUrl);
  renderNickname();

  try {
    state.baseItems = await loadMenu();
    state.items = sortedItems(state.baseItems.map((item) => ({ ...item })));
    await refreshLiveData({ showRender: false });
    renderAll();
    liveRefreshTimer = window.setInterval(() => {
      refreshLiveData().catch((error) => {
        console.warn("live refresh failed", error);
      });
    }, 30000);
  } catch (error) {
    renderStatus(
      "スプレッドシートを読み込めませんでした",
      "menu.csv が存在し、GitHub Pages から取得できる状態か確認してください。",
    );
    sakeCount.textContent = "読込失敗";
    console.error(error);
  }
}

nicknameSave.addEventListener("click", updateNickname);
nicknameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    updateNickname();
  }
});
menuList.addEventListener("click", onMenuClick);

init();
