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
| `make deploy` | Run the production build and execute `update.sh` to publish. |

### Project Layout
- `content/` holds Markdown pages for both Chinese and English sections.
- `themes/hugo-ht/` contains the upstream theme (managed as a git submodule).
- `static/` is served as-is for assets such as verification files or images.
- `config.toml` defines multilingual settings, menus, and global metadata.

Feel free to customize layouts or partials under `themes/hugo-ht/layouts/` when you need bespoke UI tweaks.

### Licensing
- The root `LICENSE` (CC BY-SA 4.0) governs all original material published in this repository, including articles, media assets, and any custom configuration authored by me.
- The bundled theme retains its own `themes/hugo-ht/LICENSE.md` (MIT); any modifications or redistribution of the theme must comply with that MIT license in addition to the attribution requirements for my content.