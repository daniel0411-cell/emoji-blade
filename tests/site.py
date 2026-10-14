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
        self.json_script = False
        self.schema = ''

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, ('duplicate id', a['id'])
            self.ids.add(a['id'])
        if tag == 'h1': self.h1 += 1
        if tag == 'a' and 'href' in a: self.links.append(a['href'])
        if tag == 'link' and a.get('rel') == 'canonical': self.canonicals.append(a['href'])
        if tag == 'link' and a.get('rel') == 'alternate':
            assert a['hreflang'] not in self.alternates
            self.alternates[a['hreflang']] = a['href']
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.json_script = True
            self.schema = ''

    def handle_data(self, data):
        if self.json_script: self.schema += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.json_script:
            json.loads(self.schema)
            self.json_script = False

pages = list(root.rglob('*.html'))
for file in pages:
    p = Page(); p.feed(file.read_text())
    assert p.h1 == 1, (file, 'expected one h1')
    for href in p.links:
        url = urlsplit(href)
        if url.scheme or url.netloc or not url.path: continue
        target = root / url.path.lstrip('/') if url.path.startswith('/') else file.parent / url.path
        if target.is_dir(): target /= 'index.html'
        assert target.exists(), (file, 'broken link', href)
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
print(f'PASS: {len(pages)} pages; links, h1, canonical, reciprocal languages, JSON-LD, sitemap')
