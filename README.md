# SakeMenu

ホームパーティー用の日本酒メニューを GitHub Pages で公開するための静的サイトです。

見た目重視の軽い注文機能と星評価を載せられるようにしてあります。

データ本体はリポジトリ内の `menu.csv` から読み込みます。

新しい日本酒を追加するときは、次の手順書を参照してください。

- 人向け: [`docs/SAKE_UPDATE_GUIDE.md`](docs/SAKE_UPDATE_GUIDE.md)
- AI向け: [`AGENTS.md`](AGENTS.md)

公開URLは通常、以下になります。

`https://kerroggu.github.io/SakeMenu/`

## CSV設定

`menu.csv` を編集すると、そのままメニューに反映されます。

1行目は見出し行にしてください。最低限 `Name` か `銘柄` があれば表示対象になります。

おすすめ列は以下です。

- `id`
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
- `注文受付` または `orderEnabled`
- `売切れ` または `soldOut`

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

注文・評価用に追加できる列です。

- `id`
- `orderEnabled`
- `soldOut`
- `hidden`

`id` がない場合は、表示名から自動生成します。

`orderEnabled` は空欄または `true` 系なら注文可能、`false` `0` `stop` なら受付停止です。

`soldOut` は `true` `1` `売切れ` などで注文不可表示になります。

`hidden` は `true` にするとWebメニューから非表示になります。

ただし、現在のおすすめ運用では `soldOut`、`orderEnabled`、`hidden` はスプレッドシート側の `menu` シートで上書き管理します。

これらが空欄のときは、対応している銘柄について名前ベースの補完データを使います。

## CSV編集例

```csv
Id,Name,SearchName,Image,Price,Tsukuri,Hiire,Sakamai,Prefecture,Shuzou,Seimai,Status,Flavor,Temperature,Pairing,Alcohol,OrderEnabled,SoldOut
sentoku-dream,千徳 夢の中まで,夢の中まで With your Dream 純米大吟醸,labels/sentoku-yumenonakamade.jpg,2130円,純米大吟醸,,山田錦,宮崎,千徳酒造,50,1,,,,,true,false
kazenomori-alpha1,風の森 ALPHA 1,風の森 ALPHA 1 次章への扉,labels/kazenomori-alpha1.jpg,1980円,純米,菩提酛/無濾過生原酒,秋津穂,奈良,油長酒造,65,1,ラムネっぽくフレッシュ,よく冷やして,枝豆/前菜,14%,true,false
```

## 編集ポイント

- CSVパスや列名の別名は `data.js` を編集
- 銘柄データは `menu.csv` を編集
- 見出しや説明文は `index.html` を編集
- デザインは `styles.css` を編集
- GAS サンプルは `gas/Code.gs`

## 注文と評価

このサイトでは、各銘柄カードで以下を扱います。

- `注文する`
- `★1〜5` の評価
- `今夜の人気` ランキング

厳密な在庫管理や本人確認はしていません。ホームパーティー向けの軽い導線です。

## GAS / スプレッドシート

`gas/Code.gs` を Apps Script に貼り付けて Web アプリとして公開すると、注文と評価を保存できます。

必要なシートは以下です。存在しなければ自動で作成します。

- `menu`
- `orders`
- `ratings`

最初に手でシートを作っておきたい場合は、以下をそのままスプレッドシートに貼れます。

- [gas/menu.sample.csv](/home/jmdh/wk/SakeMenu/gas/menu.sample.csv)
- [gas/orders.sample.csv](/home/jmdh/wk/SakeMenu/gas/orders.sample.csv)
- [gas/ratings.sample.csv](/home/jmdh/wk/SakeMenu/gas/ratings.sample.csv)

`menu` シートは、売切れ・受付停止・非表示の管理用です。最低限これだけあれば動きます。

```csv
id,soldOut,orderEnabled,hidden
sentoku-dream,false,true,false
kazenomori-alpha1,true,true,false
```

`soldOut`、`orderEnabled`、`hidden` は GAS がチェックボックス列として整えます。スマホの Google スプレッドシートアプリから切り替えやすくなります。

- `soldOut` を `true` にすると、銘柄は表示したまま注文ボタンが無効化され、リスト下部へ移動します
- `orderEnabled` を `false` にすると、売切れではなく `受付停止` として表示します
- `hidden` を `true` にすると、銘柄をWebメニューから非表示にします

フロント側では `data.js` の `gasAppUrl` にデプロイした URL を設定します。

```js
const menuConfig = {
  ...
  gasAppUrl: "https://script.google.com/macros/s/xxxxxx/exec",
};
```

`gasAppUrl` が空欄のままでも、ローカル保存ベースの簡易デモとして UI は動きます。

Apps Scriptはコードを保存しただけでは公開中Webアプリへ反映されません。`デプロイを管理` から既存デプロイを `新しいバージョン` で更新してください。

新しいデプロイを作成してWebアプリURLが変わった場合は、`data.js` の `gasAppUrl` も変更する必要があります。`hidden` が効かないときは、`<gasAppUrl>?action=menuStatus` を開き、対象項目に `"hidden": true` が返るか確認してください。

## Discord 通知

注文が入ったら Discord に通知する実装を入れています。

Apps Script 側で `プロジェクトの設定` → `スクリプト プロパティ` に以下を追加してください。

- キー: `DISCORD_WEBHOOK_URL`
- 値: Discord の Incoming Webhook URL

Webhook を設定すると、注文のたびに Discord に以下が投稿されます。

- 参加名
- 銘柄
- 注文時刻

Webhook が未設定でも、注文・評価の保存自体は動きます。

通知は即時送信ではなく `notification_queue` シートに積み、Apps Script の定期トリガーで順番に配送します。

Apps Script 側で `トリガー` を開き、以下の time-driven trigger を追加してください。

- 実行する関数: `processNotificationQueue`
- 実行するデプロイ: Head
- イベントのソース: 時間主導型
- 時間ベースのトリガーのタイプ: 分ベースのタイマー
- 時間の間隔: 1分おき

`notifications` シートには送信結果ログ、`notification_queue` シートには配送待ちと再試行状態が残ります。`429` のときは `lastRetryAfterSeconds` と `lastPlannedRetryAt` を見れば、次回再試行予定を確認できます。

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
