#!/usr/bin/env python3
"""Publish a small, allowlisted GoatCounter snapshot; never publish API responses."""

import argparse
from collections import Counter
from datetime import date, datetime, time as day_time, timedelta, timezone
from html.parser import HTMLParser
import ipaddress
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen


BEIJING = timezone(timedelta(hours=8))
MAX_BYTES = 100000
PERIODS = (7, 30)
GROUPS = {"home", "blogs", "moments"}
PUBLIC_SNAPSHOT = "https://duguce.github.io/zhgyqc_site/stats/data.json"


class SnapshotError(Exception):
    pass


class Metadata(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.meta = {}
        self.feed(Path(path).read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and attrs.get("name", "").startswith("stats-"):
            self.meta[attrs["name"]] = attrs.get("content", "")


def catalog_from_build(directory):
    catalog = {}
    for path in sorted(Path(directory).rglob("*.html")):
        meta = Metadata(path).meta
        kind = meta.get("stats-scope")
        if kind not in GROUPS:
            continue
        relative = path.relative_to(directory).as_posix()
        route = quote("/" + (relative[:-10] if relative.endswith("index.html") else relative), safe="/%-._~")
        if not public_path(route):
            raise SnapshotError("Unexpected path in generated content catalog")
        catalog[route] = {"title": meta.get("stats-title", "")[:500], "kind": kind}
    if "/" not in catalog:
        raise SnapshotError("Generated content catalog is missing the homepage")
    return catalog


def public_path(path):
    if not isinstance(path, str) or len(path) > 1200 or re.search(r"[?#\\\s]", path):
        return False
    if path != "/" and not re.match(r"^/(blogs|moments)/(?!/)", path):
        return False
    return not any(re.fullmatch(r"(?:\.|%2e){1,2}", part, re.I) for part in path.split("/"))


def service_url(value):
    value = value.rstrip("/")
    if not re.fullmatch(r"https://[a-z0-9-]+\.goatcounter\.com", value):
        raise SnapshotError("Configure an HTTPS GoatCounter site URL")
    return value


def integer(value):
    if type(value) is not int or not 0 <= value <= 9007199254740991:
        raise SnapshotError("Statistics contain an invalid count")
    return value


def stamp(value):
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def source_name(value, scheme="", own_host="zhgyqc.site"):
    if not value:
        return "Direct or unknown"
    known = {"Google", "Bing", "DuckDuckGo", "Baidu", "Yahoo", "Yandex"}
    if scheme == "g" and value in known:
        return value
    if scheme == "c":
        return "Other"
    try:
        host = urlsplit(value if "://" in value else "https://" + value).hostname or ""
        host = host.lower().removeprefix("www.")
        try:
            ipaddress.ip_address(host)
            return "Other"
        except ValueError:
            pass
        if host == own_host:
            return "Direct or unknown"
        if len(host) <= 253 and re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*\.)[a-z0-9-]+", host):
            return host
    except ValueError:
        pass
    return "Other"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SnapshotError("Unexpected redirect from statistics API")


class GoatCounter:
    def __init__(self, site, token):
        self.site = service_url(site)
        self.token = token
        self.opener = build_opener(NoRedirect)
        self.requests = 0

    def get(self, endpoint, params):
        # Stay below the documented four requests/second limit.
        time.sleep(.35)
        query = urlencode(params, doseq=True)
        request = Request(self.site + "/api/v0/" + endpoint + "?" + query, headers={
            "Authorization": "Bearer " + self.token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        })
        for attempt in range(3):
            self.requests += 1
            if self.requests > 400:
                raise SnapshotError("Statistics refresh reached its request budget")
            try:
                with self.opener.open(request, timeout=25) as response:
                    raw = response.read(2000001)
                if len(raw) > 2000000:
                    raise SnapshotError("Statistics API response is too large")
                result = json.loads(raw)
                if not isinstance(result, dict):
                    raise SnapshotError("Statistics API returned an invalid object")
                return result
            except HTTPError as exc:
                if exc.code in (429, 500, 502, 503, 504) and attempt < 2:
                    time.sleep(2 ** (attempt + 1))
                    continue
                # Never log response bodies, request headers, or credentials.
                raise SnapshotError("Statistics API returned HTTP " + str(exc.code)) from None
            except (URLError, TimeoutError, json.JSONDecodeError, OSError):
                raise SnapshotError("Statistics API could not be read") from None

    def hits(self, start, end, allowed_paths=None):
        if end <= start:
            return []
        result, seen = [], set()
        for _ in range(20):
            # GoatCounter stores hourly buckets and uses an inclusive end.
            # Internally we use [start, end), so exclude the following hour.
            params = {"start": stamp(start), "end": stamp(end - timedelta(hours=1)), "limit": 100}
            if allowed_paths is not None:
                params.update(path_by_name="true", include_paths=",".join(allowed_paths))
            if seen:
                params["exclude_paths"] = ",".join(str(item) for item in sorted(seen))
            data = self.get("stats/hits", params)
            rows = data.get("hits")
            if rows is None and "hits" in data:
                rows = []
            if not isinstance(rows, list):
                raise SnapshotError("Statistics API is missing page data")
            for row in rows:
                path_id = row.get("path_id")
                if type(path_id) is not int or path_id < 1 or path_id in seen:
                    raise SnapshotError("Statistics page pagination did not advance")
                integer(row.get("count"))
                seen.add(path_id)
                result.append(row)
            if not data.get("more"):
                return result
            if not rows:
                break
        raise SnapshotError("Statistics exceed the page export limit")

    def referrers(self, path_id, start, end):
        if end <= start:
            return []
        result, offset = [], 0
        for _ in range(20):
            data = self.get("stats/hits/" + str(integer(path_id)), {
                "start": stamp(start), "end": stamp(end - timedelta(hours=1)), "limit": 100, "offset": offset,
            })
            rows = data.get("refs")
            if rows is None and "refs" in data:
                rows = []
            if not isinstance(rows, list):
                raise SnapshotError("Statistics API is missing referrer data")
            result.extend(rows)
            if not data.get("more"):
                return result
            if not rows:
                break
            offset += len(rows)
        raise SnapshotError("Statistics exceed the referrer export limit")


def collect(client, catalog, started_at, now):
    started = date.fromisoformat(started_at)
    local_now = now.astimezone(BEIJING)
    if started > local_now.date():
        raise SnapshotError("Tracking start date is in the future")
    # A fixed completed-hour cutoff makes all API queries use the same boundary.
    cutoff = local_now.replace(minute=0, second=0, microsecond=0)
    first = max(started, local_now.date() - timedelta(days=29))
    days, counts, path_ids = [], {}, {}
    current = first
    while current <= local_now.date():
        begin = datetime.combine(current, day_time(), BEIJING)
        end = min(begin + timedelta(days=1), cutoff)
        rows = client.hits(begin, end, list(catalog)) if end > begin else []
        day_counts = Counter()
        for row in rows:
            route = row.get("path")
            if row.get("event") or route not in catalog:
                continue
            day_counts[route] += integer(row.get("count"))
            path_ids[route] = row["path_id"]
        days.append(current)
        counts[current] = day_counts
        current += timedelta(days=1)
    periods = {}
    for window in PERIODS:
        begin_date = max(first, local_now.date() - timedelta(days=window - 1))
        selected = [day for day in days if day >= begin_date]
        page_counts = Counter()
        daily = []
        for day in selected:
            page_counts.update(counts[day])
            daily.append({"date": day.isoformat(), "visits": sum(counts[day].values())})
        total = sum(day["visits"] for day in daily)
        begin = datetime.combine(begin_date, day_time(), BEIJING)
        sources = Counter()
        for route, value in page_counts.items():
            if value == 0:
                continue
            for ref in client.referrers(path_ids[route], begin, cutoff):
                sources[source_name(ref.get("name", ""), ref.get("ref_scheme", ""))] += integer(ref.get("count"))
        if sum(sources.values()) > total:
            raise SnapshotError("Referrer counts exceed visits for the same time range")
        sources["Direct or unknown"] += total - sum(sources.values())
        pages = [{"path": path, "title": catalog[path]["title"], "kind": catalog[path]["kind"], "visits": value}
                 for path, value in sorted(page_counts.items(), key=lambda item: (-item[1], item[0])) if value > 0]
        periods[str(window)] = {
            "start": selected[0].isoformat(), "end": selected[-1].isoformat(),
            "coveredDays": len(selected), "total": total, "pageCount": len(pages),
            "daily": daily, "pages": pages[:5],
            "sources": [{"name": name, "visits": value} for name, value in sorted(sources.items(), key=lambda item: (-item[1], item[0]))[:5] if value > 0],
        }
    return {"version": 1, "state": "ready", "provider": "GoatCounter", "site": client.site,
            "timezone": "Asia/Shanghai", "startedAt": started.isoformat(),
            "generatedAt": stamp(now), "dataThrough": stamp(cutoff), "periods": periods}


def validate_snapshot(data, allow_demo=False):
    fields = {"version", "state", "provider", "site", "timezone", "startedAt", "generatedAt", "dataThrough", "periods"}
    if allow_demo:
        fields.add("demo")
    if not isinstance(data, dict) or set(data) - fields or data.get("version") != 1:
        raise SnapshotError("Unsupported public snapshot")
    if data.get("state") == "not_configured":
        if set(data) != {"version", "state"}:
            raise SnapshotError("Invalid unconfigured snapshot")
        return data
    if data.get("state") != "ready" or set(data) - {"demo"} != fields - {"demo"}:
        raise SnapshotError("Incomplete public snapshot")
    service_url(data["site"])
    if data["timezone"] != "Asia/Shanghai" or data["provider"] != "GoatCounter":
        raise SnapshotError("Unexpected statistics provider or timezone")
    date.fromisoformat(data["startedAt"])
    for key in ("generatedAt", "dataThrough"):
        if datetime.fromisoformat(data[key].replace("Z", "+00:00")).tzinfo is None:
            raise SnapshotError("Snapshot timestamps need an explicit timezone")
    generated = datetime.fromisoformat(data["generatedAt"].replace("Z", "+00:00"))
    through = datetime.fromisoformat(data["dataThrough"].replace("Z", "+00:00"))
    if through > generated:
        raise SnapshotError("Statistics cutoff is after snapshot generation")
    if set(data["periods"]) != {"7", "30"}:
        raise SnapshotError("Snapshot needs both date ranges")
    for window in PERIODS:
        item = data["periods"][str(window)]
        if set(item) != {"start", "end", "coveredDays", "total", "pageCount", "daily", "pages", "sources"}:
            raise SnapshotError("Unexpected public period fields")
        total = integer(item["total"])
        size = integer(item["coveredDays"])
        if not 1 <= size <= window or len(item["daily"]) != size:
            raise SnapshotError("Invalid coverage period")
        begin = date.fromisoformat(item["start"])
        if date.fromisoformat(item["end"]) != begin + timedelta(days=size - 1):
            raise SnapshotError("Invalid period boundaries")
        for index, day in enumerate(item["daily"]):
            if set(day) != {"date", "visits"} or day["date"] != (begin + timedelta(days=index)).isoformat():
                raise SnapshotError("Daily data is incomplete or out of order")
            integer(day["visits"])
        if sum(day["visits"] for day in item["daily"]) != total:
            raise SnapshotError("Daily and summary totals disagree")
        if not len(item["pages"]) <= integer(item["pageCount"]) <= total or len(item["pages"]) > 5 or len(item["sources"]) > 5:
            raise SnapshotError("Invalid ranking size")
        for page in item["pages"]:
            if set(page) != {"path", "title", "kind", "visits"} or not public_path(page["path"]) or page["kind"] not in GROUPS:
                raise SnapshotError("Unexpected public page")
            if not isinstance(page["title"], str) or len(page["title"]) > 500 or not 0 < integer(page["visits"]) <= total:
                raise SnapshotError("Invalid page title or count")
        for source in item["sources"]:
            if set(source) != {"name", "visits"} or not isinstance(source["name"], str) or len(source["name"]) > 253:
                raise SnapshotError("Unexpected public source")
            if source["name"] not in {"Direct or unknown", "Other", "Google", "Bing", "DuckDuckGo", "Baidu", "Yahoo", "Yandex"} and source_name(source["name"]) != source["name"]:
                raise SnapshotError("Public source contains more than a domain")
            if not 0 < integer(source["visits"]) <= total:
                raise SnapshotError("Invalid source count")
        if sum(page["visits"] for page in item["pages"]) > total or sum(source["visits"] for source in item["sources"]) > total:
            raise SnapshotError("Ranking exceeds total visits")
    if len(json.dumps(data).encode()) > MAX_BYTES:
        raise SnapshotError("Public snapshot is too large")
    return data


def write_snapshot(path, data):
    validate_snapshot(data)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, suffix=".tmp", delete=False, encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")
        temporary = handle.name
    os.replace(temporary, path)


def previous_snapshot(url, site, started_at):
    if url != PUBLIC_SNAPSHOT:
        raise SnapshotError("Unexpected fallback snapshot URL")
    with urlopen(url, timeout=15) as response:
        raw = response.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise SnapshotError("Fallback snapshot is too large")
    data = validate_snapshot(json.loads(raw))
    if data.get("state") != "ready" or data["site"] != site or data["startedAt"] != started_at:
        raise SnapshotError("Fallback snapshot belongs to different tracking settings")
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="A rendered canonical-domain build")
    parser.add_argument("output", type=Path)
    parser.add_argument("--strict", action="store_true", help="Fail refreshes instead of replacing data with an empty snapshot")
    parser.add_argument("--previous-url", default=PUBLIC_SNAPSHOT)
    args = parser.parse_args()
    meta = Metadata(args.directory / "stats/index.html").meta
    site, started_at = meta.get("stats-provider-site") or "", meta.get("stats-started-at") or ""
    token = os.environ.get("GOATCOUNTER_API_KEY", "")
    try:
        if meta.get("stats-enabled") != "true" or not site or not started_at or not token:
            raise SnapshotError("Analytics needs an enabled site, start date, and GitHub API secret")
        data = collect(GoatCounter(site, token), catalog_from_build(args.directory), started_at, datetime.now(timezone.utc))
        write_snapshot(args.output, data)
        print("Published a validated statistics snapshot through " + data["dataThrough"])
        return 0
    except (SnapshotError, ValueError, TypeError, KeyError, OSError) as exc:
        print("Statistics update: " + (str(exc) if isinstance(exc, SnapshotError) else "Invalid or unavailable statistics data"), file=sys.stderr)
        if args.strict:
            return 1
        try:
            data = previous_snapshot(args.previous_url, site, started_at) if site and started_at else None
        except (SnapshotError, ValueError, TypeError, KeyError, OSError):
            data = None
        write_snapshot(args.output, data or {"version": 1, "state": "not_configured"})
        print("Used previous valid snapshot." if data else "Used explicit not-ready state; no synthetic visit counts.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
