from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timedelta, timezone
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from stats_snapshot import (GoatCounter, SnapshotError, catalog_from_build, collect,
                            main, public_path, source_name, validate_snapshot, write_snapshot)


CATALOG = {'/': {'title': 'Home', 'kind': 'home'},
           '/blogs/example/': {'title': 'Public article', 'kind': 'blogs'}}
NOW = datetime(2026, 11, 8, 2, 27, tzinfo=timezone.utc)


class MemoryAPI(GoatCounter):
    """Exercise the real client against inclusive hourly buckets, without HTTP."""
    def __init__(self):
        super().__init__('https://example.goatcounter.com', 'test-secret-never-publish')
        self.events = [
            ('2026-11-06T16:00:00+00:00', 1, '/', 2, False, 'https://scholar.google.com/private?q=secret'),
            ('2026-11-07T15:00:00+00:00', 2, '/blogs/example/', 3, False, ''),
            ('2026-11-07T16:00:00+00:00', 2, '/blogs/example/', 5, False, ''),
            ('2026-11-08T01:00:00+00:00', 1, '/', 7, False, 'https://scholar.google.com/private?q=secret'),
            # The current, incomplete hour must not leak into the snapshot.
            ('2026-11-08T02:00:00+00:00', 1, '/', 11, False, ''),
            ('2026-11-07T15:00:00+00:00', 3, '/private/path?token=secret', 999, False, ''),
            ('2026-11-07T15:00:00+00:00', 4, '/blogs/example/', 50, True, ''),
        ]

    def get(self, endpoint, params):
        start = datetime.fromisoformat(params['start'].replace('Z', '+00:00'))
        end = datetime.fromisoformat(params['end'].replace('Z', '+00:00'))
        selected = [e for e in self.events if start <= datetime.fromisoformat(e[0]) <= end]
        if endpoint == 'stats/hits':
            groups = {}
            for _, identifier, path, count, event, _ in selected:
                row = groups.setdefault(identifier, {'path_id': identifier, 'path': path, 'count': 0, 'event': event,
                                                      'title': 'Raw API title <script> is not published'})
                row['count'] += count
            return {'hits': list(groups.values()) or None, 'more': False}
        identifier = int(endpoint.rsplit('/', 1)[-1])
        refs = {}
        for _, item_id, _, count, _, ref in selected:
            if item_id == identifier:
                refs[ref] = refs.get(ref, 0) + count
        return {'refs': [{'name': ref, 'count': count, 'ref_scheme': 'h'} for ref, count in refs.items()] or None,
                'more': False}


def example():
    return collect(MemoryAPI(), CATALOG, '2026-11-07', NOW)


class StatisticsTests(unittest.TestCase):
    def test_beijing_midnight_and_completed_hour(self):
        data = validate_snapshot(example())
        period = data['periods']['30']
        self.assertEqual(period['daily'], [{'date': '2026-11-07', 'visits': 5},
                                           {'date': '2026-11-08', 'visits': 12}])
        self.assertEqual(period['total'], 17)
        self.assertEqual(period['coveredDays'], 2)
        self.assertEqual(data['dataThrough'], '2026-11-08T02:00:00Z')
        self.assertEqual(data['periods']['7']['total'], 17)

    def test_private_paths_events_and_provider_titles_are_not_published(self):
        text = json.dumps(example())
        for private in ('999', 'private/path', '?q=', '<script>', 'test-secret-never-publish'):
            self.assertNotIn(private, text)
        self.assertIn('Public article', text)
        self.assertIn('scholar.google.com', text)

    def test_source_details_are_reduced_to_public_domains(self):
        self.assertEqual(source_name('https://name:password@www.example.org/private?token=secret'), 'example.org')
        self.assertEqual(source_name('127.0.0.1/private'), 'Other')
        self.assertEqual(source_name('https://[::1]/private'), 'Other')
        self.assertEqual(source_name('private campaign text', 'c'), 'Other')
        self.assertEqual(source_name('Google', 'g'), 'Google')
        self.assertEqual(source_name(''), 'Direct or unknown')

    def test_empty_period_is_valid_zero_data(self):
        client = MemoryAPI(); client.events = []
        data = validate_snapshot(collect(client, CATALOG, '2026-11-08', NOW))
        self.assertEqual(data['periods']['30']['total'], 0)
        self.assertEqual(data['periods']['30']['pageCount'], 0)
        self.assertEqual(data['periods']['30']['sources'], [])

    def test_export_rejects_extra_fields_demo_and_bad_totals(self):
        for mutate in (
            lambda d: d.update(api_key='private'),
            lambda d: d.update(demo=True),
            lambda d: d['periods']['30'].update(total=18),
            lambda d: d['periods']['30']['pages'][0].update(path='//example.com/'),
            lambda d: d['periods']['30']['sources'][0].update(name='https://example.com/private?token=secret'),
            lambda d: d['periods']['30']['daily'][0].update(date='2026-11-06'),
        ):
            data = example(); mutate(data)
            with self.assertRaises(SnapshotError):
                validate_snapshot(data)

    def test_path_rules_prevent_external_or_parent_links(self):
        for path in ('//example.com/', '/moments/../secret', '/blogs/%2e%2e/secret',
                     '/blogs/example/?secret=yes', '/private/', '/stats/'):
            self.assertFalse(public_path(path))

    def test_catalog_uses_only_explicit_public_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'index.html').write_text('<meta name="stats-scope" content="home"><meta name="stats-title" content="Home">')
            (root/'private.html').write_text('<h1>Private</h1>')
            self.assertEqual(catalog_from_build(root), {'/': {'title': 'Home', 'kind': 'home'}})

    def test_pagination_must_advance_and_counts_must_be_valid(self):
        client = MemoryAPI()
        with patch.object(client, 'get', return_value={'hits': [{'path_id': 1, 'count': 2}], 'more': True}):
            with self.assertRaisesRegex(SnapshotError, 'pagination'):
                client.hits(NOW - timedelta(days=1), NOW)
        with patch.object(client, 'get', return_value={'hits': [{'path_id': 1, 'count': -1}], 'more': False}):
            with self.assertRaises(SnapshotError):
                client.hits(NOW - timedelta(days=1), NOW)

    def test_inclusive_api_end_and_comma_separated_pagination(self):
        client = MemoryAPI()
        responses = [{'hits': [{'path_id': 1, 'count': 2}], 'more': True},
                     {'hits': [{'path_id': 2, 'count': 3}], 'more': False}]
        start = NOW.replace(minute=0) - timedelta(hours=2)
        end = start + timedelta(hours=1)
        with patch.object(client, 'get', side_effect=responses) as request:
            self.assertEqual(len(client.hits(start, end)), 2)
            self.assertEqual(request.call_args_list[0].args[1]['end'], start.isoformat(timespec='seconds').replace('+00:00', 'Z'))
            self.assertEqual(request.call_args_list[1].args[1]['exclude_paths'], '1')

    def test_referrer_pagination_handles_server_clamped_page_size(self):
        client = MemoryAPI()
        responses = [{'refs': [{'name': 'a.org', 'count': 1}, {'name': 'b.org', 'count': 1}], 'more': True},
                     {'refs': [{'name': 'c.org', 'count': 1}], 'more': False}]
        with patch.object(client, 'get', side_effect=responses) as request:
            self.assertEqual(len(client.referrers(1, NOW - timedelta(days=1), NOW)), 3)
            self.assertEqual(request.call_args_list[1].args[1]['offset'], 2)

    def test_new_site_does_not_require_unvisited_paths_to_exist(self):
        client = MemoryAPI()
        with patch.object(client, 'get', return_value={'hits': None, 'more': False}) as request:
            data = validate_snapshot(collect(client, CATALOG, '2026-11-08', NOW))
            self.assertEqual(data['periods']['30']['total'], 0)
            for call in request.call_args_list:
                self.assertNotIn('include_paths', call.args[1])
                self.assertNotIn('path_by_name', call.args[1])

    def test_failed_scheduled_refresh_does_not_overwrite_previous_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); (root/'stats').mkdir()
            (root/'stats/index.html').write_text('<meta name="stats-enabled" content="false">')
            output = root/'saved.json'; output.write_text('keep previous output')
            with patch.object(sys, 'argv', ['stats_snapshot.py', str(root), str(output), '--strict']), \
                    patch.dict('os.environ', {}, clear=True), redirect_stderr(io.StringIO()):
                self.assertEqual(main(), 1)
            self.assertEqual(output.read_text(), 'keep previous output')

    def test_normal_publish_can_use_previous_valid_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); (root/'stats').mkdir()
            (root/'stats/index.html').write_text('<meta name="stats-enabled" content="true">'
                '<meta name="stats-provider-site" content="https://example.goatcounter.com">'
                '<meta name="stats-started-at" content="2026-11-07">')
            prior = example(); output = root/'saved.json'
            with patch.object(sys, 'argv', ['stats_snapshot.py', str(root), str(output)]), \
                    patch.dict('os.environ', {'GOATCOUNTER_API_KEY': 'not-a-real-secret'}, clear=True), \
                    patch('stats_snapshot.GoatCounter.get', side_effect=SnapshotError('API temporarily unavailable')), \
                    patch('stats_snapshot.previous_snapshot', return_value=prior), \
                    redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
                self.assertEqual(main(), 0)
            self.assertEqual(json.loads(output.read_text()), prior)

    def test_unconfigured_state_and_atomic_write(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)/'stats/data.json'
            write_snapshot(output, {'version': 1, 'state': 'not_configured'})
            self.assertEqual(json.loads(output.read_text()), {'version': 1, 'state': 'not_configured'})
            self.assertEqual(list(output.parent.glob('*.tmp')), [])


if __name__ == '__main__':
    unittest.main()
