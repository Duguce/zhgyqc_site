<h1 align="center">Qingchen Yu</h1>

<p align="center">
  <a href="https://zhgyqc.site/">
    <img src="https://img.shields.io/badge/%F0%9F%8C%90_Website-zhgyqc.site-2563eb?style=for-the-badge&amp;labelColor=1e3a5f" alt="Website">
  </a>
  <a href="https://gohugo.io/">
    <img src="https://img.shields.io/badge/Built_with-Hugo-FF4088?style=for-the-badge&amp;logo=hugo&amp;logoColor=white" alt="Built with Hugo">
  </a>
  <br>
  <a href="https://github.com/Duguce/zhgyqc_site/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/License-CC_BY--SA_4.0-059669?style=for-the-badge&amp;logo=creativecommons&amp;logoColor=white" alt="License">
  </a>
  <a href="https://vercel.com/">
    <img src="https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&amp;logo=vercel&amp;logoColor=white" alt="Deployed on Vercel">
  </a>
  <a href="https://github.com/Duguce/zhgyqc_site">
    <img src="https://img.shields.io/badge/Source-GitHub-181717?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Source Code">
  </a>
</p>

<p align="center"><em>Personal academic website · Research, writing, and moments.</em></p>

## Development

Requires **Hugo Extended 0.128.0**, Git, Make, and Python 3. No npm dependencies.

```sh
git clone https://github.com/Duguce/zhgyqc_site.git
cd zhgyqc_site
make serve
```

<table align="center">
  <thead><tr><th align="left" width="240">Command</th><th align="left">Purpose</th></tr></thead>
  <tbody>
    <tr><td nowrap><code>make check</code></td><td>Check the pinned Hugo version</td></tr>
    <tr><td nowrap><code>make serve</code></td><td>Live preview at localhost:1313</td></tr>
    <tr><td nowrap><code>make build</code></td><td>Production output in <code>public/</code></td></tr>
    <tr><td nowrap><code>make verify</code></td><td>Build and validate the site</td></tr>
    <tr><td nowrap><code>make preview</code></td><td>Build unpublished content</td></tr>
    <tr><td nowrap><code>make clean</code></td><td>Clear generated output</td></tr>
    <tr><td nowrap><code>sh ./update.sh</code></td><td>Commit and push to <code>master</code></td></tr>
  </tbody>
</table>

Preview includes unpublished content; use `make serve DRAFTS=false` for published posts only. Override the Hugo binary with `HUGO=/path/to/hugo`.

## Content

<table align="center">
  <thead><tr><th align="left">Edit</th><th align="left">Source</th></tr></thead>
  <tbody>
    <tr><td>Profile and introduction</td><td><code>content/_index.md</code></td></tr>
    <tr><td>Publications and author marks</td><td><code>data/publications.yaml</code></td></tr>
    <tr><td>Education, awards, and service</td><td><code>data/home.yaml</code></td></tr>
    <tr><td>Chinese articles</td><td><code>content/cn/blogs/</code></td></tr>
    <tr><td>English photo journals</td><td><code>content/en/moments/</code></td></tr>
    <tr><td>Design tokens and page styles</td><td><code>assets/css/</code></td></tr>
    <tr><td>Site templates and shortcodes</td><td><code>layouts/</code></td></tr>
  </tbody>
</table>

<details>
<summary>New Moments &amp; media</summary>

```sh
hugo new content --kind moments en/moments/my-note
```

Edit the generated `index.md`, add images to its bundle, and set:

```yaml
url: /moments/my-note/
cover: images/cover.jpg
cover_alt: A description of the scene
draft: false
```

```text
{{< photo src="images/cover.jpg" alt="A description" caption="A short caption" width="80" >}}
```

- Photos generate responsive WebP automatically. Keep published URLs stable.
- Shared images: `assets/images/` · Downloads: `static/files/` · Videos: `static/media/video/`.
- Legacy media mappings: `data/legacy_media.json`.
- Optional front matter: `math: true` or `vega: true`. Code highlighting runs at build time.

</details>

## Deployment

Publish from `master`, with an optional commit message:

```sh
sh ./update.sh "docs: update site"
```

- **GitHub Pages** — Actions verifies both URL layouts; `.hugo-version` pins Hugo.
- **Vercel** — `make build` → `public/`; set `HUGO_VERSION=0.128.0`, `HUGO_EXTENDED=true`, and Node.js **24.x**.
- **URLs** — `config.toml` sets the canonical domain. Keep `relativeURLs` and `canonifyURLs` disabled.

<details>
<summary>Verification</summary>

```sh
make verify BUILD_DIR=.audit/root
make verify BASE_URL=https://duguce.github.io/zhgyqc_site/ BUILD_DIR=.audit/pages
python3 -m unittest discover -s tests -p 'test_*.py'
```

Checks cover local links, media, sitemap, headings, language, pagination, and statistics aggregation. Builds clear `BUILD_DIR`; use a dedicated output folder.

</details>

<details>
<summary>Visitor statistics</summary>

- **Page:** `/stats/`, accessible directly; no site-wide entry.
- **Collection:** GoatCounter on the production homepage, blogs, and Moments.
- **Setup:** `[params.analytics]` in `config.toml`; site-only, read-only token in the Actions secret `GOATCOUNTER_API_KEY`.
- **Refresh:** every six hours via Actions → Pages JSON → Vercel rewrite; no data commits.
- **Data:** per-page sessions, Beijing time, completed hours only; referrers reduced to domains. Missing data is never shown as zero.
- **Scheduling:** GitHub may pause scheduled runs after 60 days of repository inactivity.

Browser opt-out:

```js
localStorage.setItem('site-analytics-opt-out', 'true')
```

</details>

## License

Original work: [CC BY-SA 4.0](LICENSE). The bundled [hugo-ht](https://github.com/hongtaoh/hugo-ht) theme and derived files retain their [MIT license and attribution](themes/hugo-ht/LICENSE.md).
