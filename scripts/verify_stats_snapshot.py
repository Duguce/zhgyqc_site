#!/usr/bin/env python3
"""Wait for the public endpoints to serve the validated build snapshot."""

import argparse
import hashlib
import re
import sys
import time
from urllib.request import Request, urlopen

from stats_snapshot import MAX_BYTES


def verify(urls, expected, timeout=960, interval=20):
    deadline = time.monotonic() + timeout
    pending = list(urls)
    while pending and time.monotonic() < deadline:
        for url in pending[:]:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            request = Request(url, headers={"Cache-Control": "no-cache"})
            try:
                with urlopen(request, timeout=min(10, remaining)) as response:
                    body = response.read(MAX_BYTES + 1)
            except OSError:
                continue
            if len(body) <= MAX_BYTES and hashlib.sha256(body).hexdigest() == expected:
                print(f"Verified public statistics at {url}", flush=True)
                pending.remove(url)
        if pending:
            time.sleep(max(0, min(interval, deadline - time.monotonic())))
    return pending


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sha256", help="SHA-256 of the snapshot in the deployment artifact")
    parser.add_argument("urls", nargs="+", help="Public stats/data.json endpoints")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-f0-9]{64}", args.sha256):
        parser.error("expected a lowercase SHA-256 digest")
    pending = verify(args.urls, args.sha256)
    for url in pending:
        print(f"Public statistics did not match the deployed snapshot at {url}", file=sys.stderr)
    return int(bool(pending))


if __name__ == "__main__":
    sys.exit(main())
