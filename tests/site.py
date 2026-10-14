from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import json
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
base = 'https://emojiblade.online'
alternates = {'x-default': base+'/', 'en': base+'/', 'zh-Hans': base+'/zh-hans/', 'ja': base+'/ja/'}

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.canonicals = []
        self.alternates = {}
        self.h1 = 0
        self.title = ''
        self.in_title = False
        self.description = ''
        self.social = {}
        self.json_script = False
        self.schema = ''

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, ('duplicate id', a['id'])
            self.ids.add(a['id'])
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self.in_title = True
        if tag == 'meta' and a.get('name') == 'description': self.description = a.get('content', '')
        if tag == 'meta' and a.get('property') in ('og:title', 'og:description'):
            self.social[a['property']] = a.get('content', '')
        if tag == 'a' and 'href' in a: self.links.append(a['href'])
        if tag == 'link' and a.get('rel') == 'canonical': self.canonicals.append(a['href'])
        if tag == 'link' and a.get('rel') == 'alternate':
            assert a['hreflang'] not in self.alternates
            self.alternates[a['hreflang']] = a['href']
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.json_script = True
            self.schema = ''

    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.json_script: self.schema += data

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'script' and self.json_script:
            json.loads(self.schema)
            self.json_script = False

pages = list(root.rglob('*.html'))
titles = set()
for file in pages:
    p = Page(); p.feed(file.read_text())
    assert p.h1 == 1, (file, 'expected one h1')
    assert p.title.strip(), (file, 'missing title')
    if file.name == 'index.html':
        assert p.description.strip(), (file, 'missing description')
    assert p.title not in titles, (file, 'duplicate title')
    titles.add(p.title)
    if 'og:title' in p.social:
        assert p.social['og:title'] == p.title, (file, 'share title differs from title')
    if 'og:description' in p.social:
        assert p.social['og:description'] == p.description, (file, 'share description differs from description')
    for href in p.links:
        url = urlsplit(href)
        if url.scheme or url.netloc or not url.path: continue
        target = root / url.path.lstrip('/') if url.path.startswith('/') else file.parent / url.path
        if target.is_dir(): target /= 'index.html'
        assert target.exists(), (file, 'broken link', href)
        if url.fragment and target.suffix == '.html':
            linked = Page(); linked.feed(target.read_text())
            assert url.fragment in linked.ids, (file, 'broken fragment', href)
    if file.name == 'index.html':
        route = file.parent.relative_to(root).as_posix()
        expected = base + '/' + (route + '/' if route != '.' else '')
        assert p.canonicals == [expected], (file, p.canonicals)
        if route in ('.', 'zh-hans', 'ja'): assert p.alternates == alternates

tree = ET.parse(root/'sitemap.xml')
ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls = [el.text for el in tree.findall('s:url/s:loc', ns)]
assert len(urls) == len(set(urls))
expected_urls = {base + '/' + (p.parent.relative_to(root).as_posix()+'/' if p.parent != root else '') for p in pages if p.name == 'index.html'}
assert set(urls) == expected_urls
assert (root/'404.html').exists()
for route in ('index.html', 'zh-hans/index.html', 'ja/index.html'):
    source = (root/route).read_text()
    assert 'class="player-info-grid"' in source, (route, 'missing shared information cards')
    assert source.count('class="footer-col"') == 4, (route, 'missing shared footer columns')
    assert 'href="/embed/"' in source, (route, 'missing embed navigation')
    assert 'id="embed-code-text"' not in source, (route, 'embed code must not be on homepage')
print(f'PASS: {len(pages)} pages; links, h1, canonical, reciprocal languages, JSON-LD, sitemap')
