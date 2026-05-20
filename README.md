# SakeMenu

ホームパーティー用の日本酒メニューを GitHub Pages で公開するための静的サイトです。

データ本体はリポジトリ内の `menu.csv` から読み込みます。

公開URLは通常、以下になります。

`https://kerroggu.github.io/SakeMenu/`

## CSV設定

`menu.csv` を編集すると、そのままメニューに反映されます。

1行目は見出し行にしてください。最低限 `Name` か `銘柄` があれば表示対象になります。

おすすめ列は以下です。

- `銘柄` または `name`
- `検索名` または `searchname`
- `画像` または `image`
- `価格` または `price`
- `酒蔵` または `brewery`
- `味わい` または `flavor`
- `温度` または `temperature`
- `タイプ` または `type`
- `度数` または `alcohol`
- `精米歩合` または `polish`
- `ペアリング` または `pairing`
- `公開` または `published`

`公開` 列は任意です。空欄または `true` 系なら表示し、`false` `0` `非表示` なら出しません。

`ペアリング` 列は `、` `/` `,` 改行区切りで複数指定できます。

今の `menu.csv` にはこの英字ヘッダを入れています。

- `Name`
- `Tsukuri`
- `Hiire`
- `Sakamai`
- `Prefecture`
- `Shuzou`
- `Seimai`
- `Status`

追加しておくと便利な列の例です。

- `Flavor` または `味わい`
- `Temperature` または `おすすめ温度`
- `Pairing` または `おすすめ料理`
- `Alcohol` または `アルコール度数`

これらが空欄のときは、対応している銘柄について名前ベースの補完データを使います。

## CSV編集例

```csv
Name,SearchName,Image,Price,Tsukuri,Hiire,Sakamai,Prefecture,Shuzou,Seimai,Status,Flavor,Temperature,Pairing,Alcohol
千徳 夢の中まで,夢の中まで With your Dream 純米大吟醸,labels/sentoku-yumenonakamade.jpg,2130円,純米大吟醸,,山田錦,宮崎,千徳酒造,50,1,,,,
風の森 ALPHA 1,風の森 ALPHA 1 次章への扉,labels/kazenomori-alpha1.jpg,1980円,純米,菩提酛/無濾過生原酒,秋津穂,奈良,油長酒造,65,1,ラムネっぽくフレッシュ,よく冷やして,枝豆/前菜,14%
```

## 編集ポイント

- CSVパスや列名の別名は `data.js` を編集
- 銘柄データは `menu.csv` を編集
- 見出しや説明文は `index.html` を編集
- デザインは `styles.css` を編集

## GitHub Pages 公開手順

1. GitHub の `SakeMenu` リポジトリを開く
2. `Settings` → `Pages`
3. `Build and deployment` の `Source` を `Deploy from a branch` にする
4. Branch を `main` / `/ (root)` にして保存
5. 数分待って `https://kerroggu.github.io/SakeMenu/` にアクセス

## QRコードについて

ページ下部に公開URLのQRコードを表示しています。

- 公開後にそのままスマホで読み取り可能
- 印刷したい場合はページ下部のQRを画像保存して使えます
