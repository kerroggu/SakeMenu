const menuConfig = {
  siteUrl: "https://kerroggu.github.io/SakeMenu/",
  menuCsvPath: "./menu.csv",
  columns: {
    name: ["name", "銘柄", "銘柄名", "酒名", "brand", "label"],
    brewery: ["brewery", "酒蔵", "蔵元", "酒造", "醸造元", "shuzou", "breweryname"],
    flavor: ["flavor", "味わい", "コメント", "説明", "メモ", "description", "tastingnote", "note"],
    temperature: ["temperature", "温度", "おすすめ温度", "飲み方", "servingtemp", "recommendedtemp"],
    type: ["type", "タイプ", "分類", "系統", "tsukuri", "category", "style"],
    alcohol: ["alcohol", "度数", "アルコール度数", "abv", "alc"],
    polish: ["polish", "精米歩合", "seimai", "ricepolish"],
    pairing: ["pairing", "ペアリング", "合わせたいもの", "つまみ", "おすすめ料理", "foodpairing", "pairingnote"],
    published: ["published", "公開", "掲載", "表示", "status", "visible"],
    hiire: ["hiire", "火入れ"],
    sakamai: ["sakamai", "酒米", "rice"],
    prefecture: ["prefecture", "都道府県", "産地", "origin"],
  },
};

const sakeLookup = {
  冩樂: {
    aliases: ["写楽", "冩樂(写楽)"],
    brewery: "宮泉銘醸",
    prefecture: "福島",
    flavor:
      "甘味と酸味が綺麗に調和し、米の旨味も感じられる味わい。口の中にほのかに香る余韻が楽しめる定番の純米吟醸。",
    temperature: "雪冷え(5℃前後)",
    type: "純米吟醸",
    alcohol: "16%",
    polish: "50%",
    pairing: ["和食", "郷土料理", "松前漬"],
  },
};
