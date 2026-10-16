<h2 align="center">
    Qingchen Yu Personal Website
</h2>

<p align="center">
  <a href="https://zhgyqc.site/">
    <img src="https://img.shields.io/badge/%F0%9F%8C%90_Website-zhgyqc.site-2563eb?style=for-the-badge&amp;labelColor=1e3a5f" alt="Website">
  </a>
  <a href="https://gohugo.io/">
    <img src="https://img.shields.io/badge/Built_with-Hugo-FF4088?style=for-the-badge&amp;logo=hugo&amp;logoColor=white" alt="Built with Hugo">
  </a>
  <br>
  <a href="https://github.com/Duguce/zhgyqc_site/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-CC_BY--SA_4.0-059669?style=for-the-badge&amp;logo=creativecommons&amp;logoColor=white" alt="License">
  </a>
  <a href="https://vercel.com/">
    <img src="https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&amp;logo=vercel&amp;logoColor=white" alt="Deployed on Vercel">
  </a>
  <a href="https://github.com/Duguce/zhgyqc_site">
    <img src="https://img.shields.io/badge/Source-GitHub-181717?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Source Code">
  </a>
</p>

<p align="center">
  <em>
    This is 
    <a href="https://zhgyqc.site/" target="_blank">Qingchen Yu</a>'s 
    personal website powered by 
    <a href="https://gohugo.io/" target="_blank">Hugo</a> 
    and the 
    <a href="https://github.com/hongtaoh/hugo-ht" target="_blank">hugo-ht</a> 
    theme.
  </em>
</p>


### Requirements
- Hugo Extended (v0.120+ recommended)
- Git and Make (for the helper targets in `Makefile`)

### Quick Start

```bash
git clone https://github.com/Duguce/zhgyqc_site.git
cd zhgyqc_site
make check
make setup
make serve
```

`make serve` launches the live-reload Hugo server on `http://localhost:1313` so you can edit content under `content/` and preview changes instantly.

### Common Tasks
| Command | Purpose |
| --- | --- |
| `make build` | Produce the production-ready site in `public/` with minification enabled. |
| `make preview` | Build once with drafts, future, and expired entries for editorial review. |
| `make clean` | Remove generated artifacts (`public/` and `.hugo_build.lock`). |
| `make publish` | Commit and push source changes to `origin/master`; GitHub Actions builds and deploys. No local Hugo installation is needed. |
| `make deploy` | Run the local production build, then publish source changes. |

On macOS, run `make publish` from the project directory. You can also run the portable script directly, with an optional commit message:

```sh
sh ./update.sh "Update homepage"
```

Publishing requires the `master` branch and Git access to `origin`. The script also retries pushing existing commits when there are no new changes. `.gitignore` excludes Hugo output, build locks, local environment files, editor and agent settings, hosting metadata, caches, and preview screenshots. Keep shared site configuration (`config.toml`, `static/config/config.js`) and deployment workflows in version control.

### Project Layout
- `content/` holds Markdown pages for both Chinese and English sections.
- `themes/hugo-ht/` contains the upstream theme (managed as a git submodule).
- `static/` is served as-is for assets such as verification files or images.
- `config.toml` defines multilingual settings, menus, and global metadata.

Feel free to customize layouts or partials under `themes/hugo-ht/layouts/` when you need bespoke UI tweaks.

### Maintaining content and styles

- The homepage introduction and profile links live in `content/_index.md`.
- Edit `data/publications.yaml` to add or update papers, authors, venues, and paper links. Author flags `self`, `equal`, and `corresponding` control name emphasis and contribution marks. Entries appear in file order.
- Education, awards, and academic services live in `data/home.yaml`. `layouts/partials/home-records.html` renders these records using the existing homepage layout.
- Shared colors, fonts, spacing, and widths live in `assets/css/tokens.css`. Page styles live in `assets/css/scholar-list.css`, `scholar-article.css`, and the feature stylesheets. Hugo minifies and fingerprints these files and the scripts under `assets/js/`.

For a new Moment, store the original photo under `content/assets/` and set explicit cover fields in the post's front matter:

```yaml
cover: "my-photo.jpg"
cover_alt: "A description of the scene"
cover_caption: "A short caption"
```

Render photos with the `photo` shortcode instead of linking to GitHub's raw files:

```text
{{< photo src="my-photo.jpg" alt="A description of the scene" caption="A short caption" width="80" >}}
```

The shortcode preserves aspect ratios and generates WebP versions up to 1600 pixels wide. Listing thumbnails use versions up to 800 pixels wide. Width presets `60`, `75`, and `80` control the display size; originals load only when a reader opens the image preview. Add descriptive `alt` text even when a caption is present. A photo stored in a page bundle can also be referenced by its resource name.

Code highlighting happens at build time with Hugo; no Highlight.js is required. MathJax loads only on pages containing `\(...\)`, `\[...\]`, or `$$...$$` outside code samples. Front matter `math: true` or `math: false` overrides detection. Pages that need Vega may opt in with `vega: true`; initialize their charts after `DOMContentLoaded`.

### Licensing
- The root `LICENSE` (CC BY-SA 4.0) governs all original material published in this repository, including articles, media assets, and any custom configuration authored by me.
- The bundled theme retains its own `themes/hugo-ht/LICENSE.md` (MIT); any modifications or redistribution of the theme must comply with that MIT license in addition to the attribution requirements for my content.
