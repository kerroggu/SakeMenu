const menuList = document.querySelector("#menu-list");
const sakeCount = document.querySelector("#sake-count");
const siteLink = document.querySelector("#site-link");
const qrImage = document.querySelector("#qr-image");

function csvUrl() {
  return `https://docs.google.com/spreadsheets/d/${sheetConfig.sheetId}/export?format=csv&gid=${sheetConfig.gid}`;
}

function renderMenuItem(item) {
  const pairingItems = item.pairing
    .map((food) => `<li>${food}</li>`)
    .join("");

  return `
    <article class="menu-card">
      <div class="menu-copy">
        <div class="menu-head">
          <h3>${item.name}</h3>
          <span class="brewery">${item.brewery}</span>
        </div>
        <p class="flavor">${item.flavor}</p>
        <div class="detail-list">
          <span class="pill"><strong>タイプ</strong>${item.type}</span>
          <span class="pill"><strong>温度</strong>${item.temperature}</span>
          <span class="pill"><strong>度数</strong>${item.alcohol}</span>
          <span class="pill"><strong>精米歩合</strong>${item.polish}</span>
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
        <h3>${title}</h3>
        <p class="flavor">${message}</p>
      </div>
    </article>
  `;
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

  Object.entries(sheetConfig.columns).forEach(([key, aliases]) => {
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

function lookupByName(name) {
  const target = normalizeSakeName(name);

  return Object.entries(sakeLookup).find(([key, entry]) => {
    const candidates = [key, ...(entry.aliases || [])];
    return candidates.some((candidate) => normalizeSakeName(candidate) === target);
  })?.[1];
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
    .map((row) => {
      const name = valueAt(row, indices.name);
      const lookup = lookupByName(name) || {};
      const brewery = valueAt(row, indices.brewery);
      const prefecture = valueAt(row, indices.prefecture);
      const hiire = valueAt(row, indices.hiire);
      const sakamai = valueAt(row, indices.sakamai);
      const explicitFlavor = valueAt(row, indices.flavor);
      const explicitTemperature = valueAt(row, indices.temperature);
      const explicitAlcohol = valueAt(row, indices.alcohol);
      const explicitPairing = valueAt(row, indices.pairing);
      const flavorParts = [valueAt(row, indices.type), hiire, sakamai, prefecture].filter(Boolean);

      return {
        name,
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
      };
    });
}

async function loadMenu() {
  const response = await fetch(csvUrl());

  if (!response.ok) {
    throw new Error(`sheet fetch failed: ${response.status}`);
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

async function init() {
  setQrCode(sheetConfig.siteUrl);

  try {
    const items = await loadMenu();

    if (items.length === 0) {
      renderStatus(
        "表示できる銘柄がありません",
        "シートの1行目に見出しがあり、公開対象の行に銘柄名が入っているか確認してください。",
      );
      sakeCount.textContent = "0銘柄";
      return;
    }

    menuList.innerHTML = items.map(renderMenuItem).join("");
    sakeCount.textContent = `${items.length}銘柄`;
  } catch (error) {
    renderStatus(
      "スプレッドシートを読み込めませんでした",
      "シートを一般公開し、CSVとして取得できる状態か確認してください。",
    );
    sakeCount.textContent = "読込失敗";
    console.error(error);
  }
}

init();
