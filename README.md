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

- Hugo **Extended 0.128.0**, pinned in `.hugo-version`. Local builds and CI check this exact version, including the Extended edition.
- Git and Make. `make verify` also needs Python 3 (standard library only).
- The site has no npm dependencies. Vercel currently uses Node.js **24.x** for its hosting environment.

### Quick Start

```sh
git clone https://github.com/Duguce/zhgyqc_site.git
cd zhgyqc_site
make check
make serve
```

Install the release specified in `.hugo-version` from [Hugo releases](https://github.com/gohugoio/hugo/releases). If Hugo is outside your PATH, pass its location to Make, for example `make serve HUGO=/path/to/hugo`.

`make serve` opens the live-reload site at `http://localhost:1313`. It includes drafts, future-dated and expired posts for editing; use `DRAFTS=false` to hide them.

### Common Tasks

| Command | Purpose |
| --- | --- |
| `make check` | Check the Hugo version and Extended edition. |
| `make build` | Build production output in `public/`; fail on Hugo warnings, including duplicate output paths. |
| `make verify` | Build and check generated local links, resources, sitemap, critical page headings, language and pagination. |
| `make preview` | Build drafts, future-dated and expired posts once for review. |
| `make clean` | Remove `BUILD_DIR` (default `public/`) and the build lock. |
| `make publish` | Commit and push source changes to `origin/master`; hosting services build and deploy. No local Hugo installation is needed. |
| `make deploy` | Verify locally, then publish source changes. |

The canonical production URL comes from `config.toml`: `https://zhgyqc.site/`. A host can override it with `make verify BASE_URL=https://example.com/`. `BUILD_DIR` selects an alternative output directory. Build commands clean stale files from that directory, so use a dedicated generated-output folder.

On macOS, run `make publish` from the project directory, or use the portable script with an optional commit message:

```sh
sh ./update.sh "Update homepage"
```

Publishing requires the `master` branch and Git access to `origin`. The script retries pushing existing commits when there are no new changes. `.gitignore` excludes generated output, caches, local environment files, editor and agent settings, hosting metadata and preview screenshots. Shared site configuration and deployment workflows remain tracked.

### Project Layout

```text
.hugo-version                  # Hugo version used by local checks and CI
config.toml                    # Canonical URL, menus, content and output settings
Makefile                       # Shared build, verify, preview and publish commands
assets/
  css/                         # Tokens, base styles, fonts and page styles
  js/                          # Page scripts
  images/                      # Shared profile, publication and article images
content/
  _index.md                    # Homepage introduction and profile links
  cn/blogs/                    # Chinese articles
  en/moments/<entry>/           # Moment bundles: index.md + images/
data/                          # Homepage records, papers and legacy media mapping
layouts/
  index.html                   # Homepage layout
  _default/baseof.html         # Shared document shell
  blogs/                       # Blog list and article entry points
  moments/                     # Moments list and article entry points
  partials/site/               # Shared head, header, footer and language metadata
  partials/article/            # Shared listing and article rendering
  partials/media/              # Image resolution and historical URL publishing
  shortcodes/                  # Site shortcodes
scripts/                       # Version and rendered-site checks
static/
  files/                       # CV and publication posters
  media/video/                 # Directly served videos
  config/                      # Shared client configuration
  ...                          # Verification files and other public assets
themes/hugo-ht/                # Bundled base shortcodes, media and attribution
.github/workflows/hugo.yml     # Build, verify and deploy to GitHub Pages
vercel.json                    # Vercel uses the same make build entry point
```

Site-owned templates belong in root `layouts/`, and styles/scripts in root `assets/`. The theme is a **bundled, trimmed copy**, not a Git submodule. Its remaining shortcodes and media are runtime dependencies; retain its MIT license and attribution. The original upstream README is reference material, not this project's setup guide.

`cn` and `en` are content sections, not Hugo translation sites. Their existing routes stay `/blogs/` and `/moments/`. Section `_index.md` files declare `type`, `contentLanguage` and `menuKey` via `cascade`; templates use those values instead of testing filesystem paths. Keep explicit `url` values when moving published content into a bundle.

### Maintaining content and styles

- The homepage introduction and profile links live in `content/_index.md`. The `image-url` shortcode resolves the shared profile image.
- Edit `data/publications.yaml` to maintain papers. `image` paths are relative to `assets/`, such as `images/publications/xverify_framework.png`. Author flags `self`, `equal` and `corresponding` control name emphasis and contribution marks. Entries appear in file order.
- Education, awards and academic services live in `data/home.yaml`; `layouts/partials/home-records.html` renders these records.
- `assets/css/tokens.css` contains shared design values; `base.css` contains general rules; `fonts.css` selects fonts; `home.css`, `scholar-list.css`, `scholar-article.css` and `terms.css` contain page styles. Hugo minifies and fingerprints stylesheets and scripts through shared partials.
- `layouts/robots.txt` is the authoritative robots template. `layouts/_default/sitemap.xml` customizes Hugo's standard sitemap; do not add a second home sitemap output.

Create a Moment bundle using the supplied directory archetype:

```sh
hugo new content --kind moments en/moments/my-note
```

Put the cover at `content/en/moments/my-note/images/cover.jpg`, edit `index.md`, choose a stable `url` before publishing, then set `draft: false`. The surrounding section supplies the content type and language settings.

```yaml
url: /moments/my-note/
cover: "images/cover.jpg"
cover_alt: "A description of the scene"
cover_caption: "A short caption"
```

Render photos with the `photo` shortcode:

```text
{{< photo src="images/cover.jpg" alt="A description of the scene" caption="A short caption" width="80" >}}
```

The shortcode preserves aspect ratios and generates WebP versions up to 1600 pixels wide. Listing thumbnails use versions up to 800 pixels wide. Width presets `60`, `75` and `80` control display size; originals load only when readers open the image preview. Shared and bundled images use the same `media/image.html` lookup helper.

Shared images belong in `assets/images/`; downloadable PDFs in `static/files/`; videos in `static/media/video/`. The old `/assets/<filename>` addresses remain available: `data/legacy_media.json` maps historical images to their current sources, and narrowly scoped static mounts in `config.toml` retain the old PDF/video paths. These compatibility rules preserve external links without duplicating source files. New content should use its bundle or the new public directories.

Code highlighting runs at build time. MathJax loads only on pages containing `\(...\)`, `\[...\]` or `$$...$$` outside code samples. Front matter `math: true` or `math: false` overrides detection. Pages needing Vega may opt in with `vega: true`; initialize charts after `DOMContentLoaded`.

### Deployment contract

- **Local and GitHub Pages:** `.hugo-version` is the version source. Actions reads it to install Hugo Extended, then runs `make verify` with the Pages base URL. Checkout includes full Git history for article modification dates. The source needs no npm or Sass install step.
- **Vercel:** `vercel.json` runs `make build` and publishes `public/`. Set `HUGO_VERSION` to the value in `.hugo-version`, `HUGO_EXTENDED=true` and Node.js **24.x** in Vercel project settings. Vercel installs Hugo before running the build, so it does not automatically read `.hugo-version`; the build check rejects a mismatch. When changing Hugo versions, update that platform setting too.
- **Verification:** `scripts/check-site.py` uses no third-party Python packages. It also checks that the 30 historical raw-media URLs still return the exact source-file bytes. It validates local output only; external URLs and remote service availability are not part of this check.

### Licensing
- The root `LICENSE` (CC BY-SA 4.0) governs all original material published in this repository, including articles, media assets, and any custom configuration authored by me.
- The bundled theme retains its own `themes/hugo-ht/LICENSE.md` (MIT); any modifications or redistribution of the theme must comply with that MIT license in addition to the attribution requirements for my content.
- Templates and styles derived from the theme retain that MIT attribution after moving into root `layouts/` and `assets/`; their new location does not change their origin.
