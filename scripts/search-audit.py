"""Read-only core-page audit; --submit-indexnow explicitly notifies changed URLs."""
import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import urllib.error
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET

BASE = 'https://emojiblade.online'
CORE = ['/', '/2-player-duel/', '/spinning-top-simulator/', '/guide/', '/characters/', '/tier-list/']
KEY = '18550ac5f1541580aaa3344d2f70a385'


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = []
        self.robots = []
        self.description = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs.get('href'))
        if tag == 'meta':
            name = attrs.get('name', '').lower()
            if name in ('robots', 'googlebot', 'bingbot'):
                self.robots.append(attrs.get('content', '').lower())
            if name == 'description':
                self.description = attrs.get('content', '')


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'EmojiBladeReleaseCheck/1.0'})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.status, response.url, response.headers, response.read().decode('utf-8')


def audit():
    _, _, _, robots_text = fetch(BASE + '/robots.txt')
    robots = urllib.robotparser.RobotFileParser()
    robots.parse(robots_text.splitlines())
    _, _, _, xml = fetch(BASE + '/sitemap.xml')
    urls = {node.text for node in ET.fromstring(xml).findall('{*}url/{*}loc')}
    results = []
    for route in CORE:
        url = BASE + route
        status, final_url, headers, html = fetch(url)
        meta = Metadata()
        meta.feed(html)
        directives = ','.join(meta.robots + [headers.get('X-Robots-Tag', '').lower()])
        allowed = all(robots.can_fetch(bot, url) for bot in ('Googlebot', 'bingbot'))
        ok = (status == 200 and final_url == url and meta.canonical == [url]
              and 'noindex' not in directives and 'none' not in directives
              and allowed and url in urls and bool(meta.description))
        results.append({'url': url, 'status': status, 'final_url': final_url,
                        'canonical': meta.canonical, 'robots_allowed': allowed,
                        'index_directives': directives, 'in_sitemap': url in urls,
                        'description_length': len(meta.description), 'checks_passed': ok})
    missing = BASE + '/release-check-missing-20261016/'
    try:
        missing_status = fetch(missing)[0]
    except urllib.error.HTTPError as error:
        missing_status = error.code
    print(json.dumps({'checked_at': datetime.now(timezone.utc).isoformat(),
                      'sitemap_urls': len(urls), 'pages': results,
                      'missing_page_status': missing_status}, indent=2))
    if not all(page['checks_passed'] for page in results) or missing_status != 404:
        raise SystemExit('FAIL: core-page release checks')


def submit_indexnow():
    # The public verification file must already be deployed before notifying the engine.
    _, _, _, published_key = fetch(f'{BASE}/{KEY}.txt')
    if published_key.strip() != KEY:
        raise SystemExit('IndexNow key file is missing or does not match')
    local = (Path(__file__).resolve().parents[1] / f'{KEY}.txt').read_text().strip()
    if local != KEY:
        raise SystemExit('Local IndexNow verification file does not match')
    body = {'host': 'emojiblade.online', 'key': KEY, 'keyLocation': f'{BASE}/{KEY}.txt',
            'urlList': [BASE + route for route in CORE]}
    request = urllib.request.Request('https://www.bing.com/indexnow',
                                     data=json.dumps(body).encode(),
                                     headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(request, timeout=25) as response:
        print(json.dumps({'status': response.status, 'submitted_urls': body['urlList'],
                          'note': 'Notification received; key validation, crawling and indexing may still be pending.'}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--submit-indexnow', action='store_true')
    args = parser.parse_args()
    if args.submit_indexnow:
        submit_indexnow()
    else:
        audit()
