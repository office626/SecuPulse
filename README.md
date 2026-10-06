# SecuPulse

**AI時代の情報セキュリティ・個人情報漏洩ニュースサイト**

経営者・上級職向けに、AIセキュリティと個人情報漏洩を同比重で扱う速報ダッシュボードです。  
公開RSSを毎日1回自動収集し、タイトル・1行要約・経営示唆・出典リンクを掲載します。

## 公開URL

GitHub Pages 有効化後:

`https://office626.github.io/SecuPulse/`

## カテゴリ

- AIセキュリティ
- 個人情報漏洩
- 規制・ガバナンス
- インシデント対応・被害拡大
- サプライチェーン／委託先

## ローカル更新

```bash
npm run fetch
```

`data/news.json` が生成／更新されます。ブラウザで `index.html` を開くか、簡易サーバで確認してください。

```bash
npx --yes serve .
```

## 自動更新

`.github/workflows/daily-update.yml` が毎日1回（日本時間 21:00）実行され、`data/news.json` を更新して main に push します。  
手動実行は Actions タブの **Daily news update** から可能です。

## 注意

本サイトは公開情報のキュレーションであり、独自取材や完全な網羅を保証するものではありません。  
経営判断は必ず出典の原文をご確認ください。
