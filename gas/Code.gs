const SHEET_NAMES = {
  orders: "orders",
  ratings: "ratings",
};

function doGet(e) {
  const action = (e.parameter.action || "").trim().toLowerCase();

  if (action === "summary") {
    return jsonResponse({ ok: true, items: buildSummary_() });
  }

  return jsonResponse({
    ok: false,
    error: "unsupported_action",
  });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const action = String(payload.action || "").trim().toLowerCase();

  if (action === "order") {
    return jsonResponse(createOrder_(payload));
  }

  if (action === "rating") {
    return jsonResponse(saveRating_(payload));
  }

  return jsonResponse({
    ok: false,
    error: "unsupported_action",
  });
}

function createOrder_(payload) {
  const nickname = normalizeText_(payload.nickname);
  const sakeId = normalizeText_(payload.sakeId);
  const sakeName = normalizeText_(payload.sakeName);

  if (!nickname || !sakeId || !sakeName) {
    return { ok: false, error: "invalid_order" };
  }

  const sheet = getOrCreateSheet_(SHEET_NAMES.orders, [
    "id",
    "createdAt",
    "nickname",
    "sakeId",
    "sakeName",
    "status",
  ]);

  const orderId = Utilities.getUuid();
  sheet.appendRow([
    orderId,
    new Date(),
    nickname,
    sakeId,
    sakeName,
    "new",
  ]);

  return {
    ok: true,
    orderId,
    status: "new",
  };
}

function saveRating_(payload) {
  const nickname = normalizeText_(payload.nickname);
  const sakeId = normalizeText_(payload.sakeId);
  const sakeName = normalizeText_(payload.sakeName);
  const score = Number(payload.score);

  if (!nickname || !sakeId || !sakeName || !Number.isInteger(score) || score < 1 || score > 5) {
    return { ok: false, error: "invalid_rating" };
  }

  const sheet = getOrCreateSheet_(SHEET_NAMES.ratings, [
    "id",
    "createdAt",
    "updatedAt",
    "nickname",
    "sakeId",
    "sakeName",
    "score",
  ]);

  const values = sheet.getDataRange().getValues();
  let updatedRow = null;

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    if (normalizeText_(row[3]) === nickname && normalizeText_(row[4]) === sakeId) {
      updatedRow = rowIndex + 1;
      break;
    }
  }

  if (updatedRow) {
    sheet.getRange(updatedRow, 3).setValue(new Date());
    sheet.getRange(updatedRow, 7).setValue(score);
  } else {
    sheet.appendRow([
      Utilities.getUuid(),
      new Date(),
      new Date(),
      nickname,
      sakeId,
      sakeName,
      score,
    ]);
  }

  const summary = buildSummary_().find((item) => item.sakeId === sakeId) || {
    average: score,
    count: 1,
  };

  return {
    ok: true,
    average: summary.average,
    count: summary.count,
    myScore: score,
  };
}

function buildSummary_() {
  const sheet = getOrCreateSheet_(SHEET_NAMES.ratings, [
    "id",
    "createdAt",
    "updatedAt",
    "nickname",
    "sakeId",
    "sakeName",
    "score",
  ]);
  const values = sheet.getDataRange().getValues();
  const summaryMap = {};

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const sakeId = normalizeText_(row[4]);
    const sakeName = normalizeText_(row[5]);
    const score = Number(row[6]);

    if (!sakeId || !sakeName || !Number.isFinite(score)) {
      continue;
    }

    if (!summaryMap[sakeId]) {
      summaryMap[sakeId] = {
        sakeId,
        sakeName,
        total: 0,
        count: 0,
      };
    }

    summaryMap[sakeId].total += score;
    summaryMap[sakeId].count += 1;
  }

  return Object.values(summaryMap)
    .map((item) => ({
      sakeId: item.sakeId,
      sakeName: item.sakeName,
      average: Math.round((item.total / item.count) * 10) / 10,
      count: item.count,
    }))
    .sort((a, b) => {
      if (b.average !== a.average) {
        return b.average - a.average;
      }

      return b.count - a.count;
    });
}

function getOrCreateSheet_(name, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow(headers);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  return sheet;
}

function normalizeText_(value) {
  return String(value || "").trim();
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
