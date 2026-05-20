# SakeMenu

ホームパーティー用の日本酒メニューを GitHub Pages で公開するための静的サイトです。

データ本体は Google スプレッドシートから読み込みます。

公開URLは通常、以下になります。

`https://kerroggu.github.io/SakeMenu/`

## スプレッドシート設定

このURLのシートを読み込みます。

`https://docs.google.com/spreadsheets/d/1uYTCXtAmor6ZzrItT2POE25LvmWec1D75Eaco3ZaDFA/edit?gid=0#gid=0`

GitHub Pages から読めるように、少なくとも以下のどちらかが必要です。

1. `共有` で `リンクを知っている全員が閲覧可`
2. `ファイル` → `共有` → `ウェブに公開` でシートを公開

1行目は見出し行にしてください。対応している列名は以下です。

- `銘柄` または `name`
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

## 編集ポイント

- シートIDや列名の別名は `data.js` を編集
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
