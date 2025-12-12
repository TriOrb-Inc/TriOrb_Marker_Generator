Online TriOrb markers generator
====

Generate markers online and save them to SVG and PDF with ease: https://triorb-inc.github.io/TriOrb_Marker_Generator/.

<img src="docs/triorbgen.webp" width="600px">

Markers dictionaries are taken from this URL:
https://raw.githubusercontent.com/opencv/opencv_contrib/master/modules/aruco/src/predefined_dictionaries.hpp.
Learn more about ArUco markers: https://docs.opencv.org/3.2.0/d5/dae/tutorial_aruco_detection.html.

## Versioned deployment with mike

The site is published to GitHub Pages using [mike](https://github.com/jimporter/mike) so that each release can be versioned. The current live version is **1.0**.

### Requirements

ドキュメントビルド用の依存関係は仮想環境上で管理します。リポジトリのルートで以下を実行してください。

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

以降の `mike` コマンドも仮想環境を有効化した状態で実行してください。

### Deploying a new version

初回セットアップ時は、`mike serve` でプレビューする前に少なくとも一度 `mike deploy` と `mike set-default` を実行し、バージョン付きビルドとデフォルトエイリアスを作成してください。これらを実行していない場合、`mike serve` のトップページで 404 が返されます。また、バージョン付けしたサイトをビルドすると、ヘッダー左上のサイト名の横にバージョン切り替えメニューが表示されます。

1. Build and publish the site to the `gh-pages` branch with the target version. For the current release this is `1.0` and uses the `latest` alias:
   ```bash
   mike deploy 1.0 latest -b gh-pages
   ```
2. Make sure visitors are directed to the latest version:
   ```bash
   mike set-default latest -b gh-pages
   ```
3. 変更内容を GitHub Pages 用のブランチに反映させます:
   ```bash
   git push origin gh-pages
   ```
4. To preview the versioned site locally before publishing:
   ```bash
   mike serve
   ```

The source files for the site now live under `docs/` so that `mkdocs` and `mike` can package them for GitHub Pages.
