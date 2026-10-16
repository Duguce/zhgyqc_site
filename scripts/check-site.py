#!/usr/bin/env python3
"""Check a rendered site using only the Python standard library."""

import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.elements = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def attrs(self, tag):
        return [attrs for name, attrs in self.elements if name == tag]

    @property
    def is_redirect(self):
        return any(a.get("http-equiv", "").lower() == "refresh" for a in self.attrs("meta"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--base-url", help="Use the same override supplied to Hugo.")
    args = parser.parse_args()
    root = args.directory.resolve()
    project = Path(__file__).resolve().parents[1]
    config = project / "config.toml"
    configured_url = re.search(r'^baseURL\s*=\s*"([^"]+)"', config.read_text(), re.M)
    base_url = (args.base_url or configured_url.group(1)).rstrip("/") + "/"
    base = urlsplit(base_url)
    base_path = unquote(base.path)
    errors = set()
    documents = {}

    def check_url(value, origin, label):
        if not value or value.startswith(("#", "data:", "mailto:", "tel:", "javascript:")):
            return
        resolved = urlsplit(urljoin(origin, value))
        if resolved.scheme not in ("http", "https") or resolved.netloc != base.netloc:
            return
        path = unquote(resolved.path or "/")
        if not path.startswith(base_path):
            errors.add("{}: URL escapes the deployment path: {}".format(label, value))
            return
        target = root / path[len(base_path):]
        if target.is_dir():
            target /= "index.html"
        if not target.is_file():
            errors.add("{}: missing local target: {}".format(label, value))

    for path in sorted(root.rglob("*.html")):
        relative = path.relative_to(root).as_posix()
        doc = Document(path)
        if doc.is_redirect:
            continue
        documents[relative] = doc
        origin = urljoin(base_url, relative)
        for tag, attrs in doc.elements:
            if tag in ("img", "script", "video", "source", "iframe"):
                check_url(attrs.get("src"), origin, relative)
            if tag == "video":
                check_url(attrs.get("poster"), origin, relative)
            if tag == "img":
                check_url(attrs.get("data-full-src"), origin, relative)
                if attrs.get("srcset") and not attrs["srcset"].startswith("data:"):
                    for candidate in attrs["srcset"].split(","):
                        if candidate.strip():
                            check_url(candidate.split()[0], origin, relative)
            if tag in ("a", "link"):
                check_url(attrs.get("href"), origin, relative)

        if relative == "index.html" or relative.startswith(("blogs/", "moments/")):
            if not doc.attrs("h1"):
                errors.add("{}: missing page heading (h1)".format(relative))
            expected_language = "zh-CN" if relative.startswith("blogs/") else "en"
            if not doc.attrs("html") or doc.attrs("html")[0].get("lang") != expected_language:
                errors.add("{}: incorrect document language".format(relative))
            pagination = [
                (tag, attrs) for tag, attrs in doc.elements
                if "scholar-pagination__button" in attrs.get("class", "").split()
            ]
            if pagination:
                current = [a for _, a in pagination if a.get("aria-current") == "page"]
                if len(current) != 1:
                    errors.add("{}: pagination needs one current page".format(relative))
                if any(tag == "a" and a.get("href") == "#" for tag, a in pagination):
                    errors.add("{}: disabled pagination must not link to #".format(relative))

    for required in ("index.html", "blogs/index.html", "moments/index.html"):
        if required not in documents:
            errors.add("Missing critical page: " + required)
        elif len(documents[required].attrs("h1")) != 1:
            errors.add("{}: expected one page heading (h1)".format(required))
    if not (root / "robots.txt").is_file():
        errors.add("Missing robots.txt")
    sitemap = root / "sitemap.xml"
    if not sitemap.is_file():
        errors.add("Missing sitemap.xml")
    else:
        tree = ET.parse(sitemap)
        locations = [element.text for element in tree.findall(".//{*}loc")]
        if len(locations) != len(set(locations)):
            errors.add("sitemap.xml contains duplicate URLs")
        for location in locations:
            if urlsplit(location).netloc != base.netloc:
                errors.add("sitemap.xml uses a different host: " + location)
            check_url(location, base_url, "sitemap.xml")

    # Check asset references in emitted stylesheets as well as HTML.
    for path in root.rglob("*.css"):
        relative = path.relative_to(root).as_posix()
        origin = urljoin(base_url, relative)
        for match in re.finditer(r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)''', path.read_text()):
            value = next((part for part in match.groups() if part is not None), "")
            check_url(value, origin, relative)

    # Historical raw media must remain available after source files move.
    manifest = json.loads((project / "data/legacy_media.json").read_text())
    legacy_sources = {
        name: project / "assets" / src for name, src in manifest["shared"].items()
    }
    legacy_sources.update({
        name: project / "static" / src for name, src in manifest["static"].items()
    })
    for bundle in manifest["bundles"]:
        images = project / "content" / bundle.lstrip("/") / "images"
        if not images.is_dir():
            errors.add("Missing legacy media bundle: " + bundle)
        for source in images.glob("*"):
            if source.is_file():
                if source.name in legacy_sources:
                    errors.add("Conflicting legacy media filename: " + source.name)
                legacy_sources[source.name] = source
    for name, source in legacy_sources.items():
        target = root / "assets" / name
        if not source.is_file() or not target.is_file():
            errors.add("Missing legacy media source or output: /assets/" + name)
        elif hashlib.sha256(source.read_bytes()).digest() != hashlib.sha256(target.read_bytes()).digest():
            errors.add("Legacy media bytes changed: /assets/" + name)

    if errors:
        print("Site verification failed:", file=sys.stderr)
        for error in sorted(errors):
            print("  - " + error, file=sys.stderr)
        return 1
    print("Verified {} HTML pages and {} legacy media URLs: links, resources, sitemap, headings, language and pagination.".format(len(documents), len(legacy_sources)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
