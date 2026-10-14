# Phase 1 SEO baseline

Checked: 2026-10-14. Baseline release: 3f71539116dea34957db51b2833b0774a8651eae.

## Verified

- Remote main matches the local starting commit; no IDE changes were overwritten.
- Production home, robots.txt and sitemap.xml were retrieved successfully.
- Production robots allows crawling and points to the primary-domain sitemap.
- The starting sitemap has 21 URLs: 3 game languages, 10 character pages,
  4 information pages and 4 legal/support pages. The 404 page is not included.
- Local checks verify self-canonicals, reciprocal home-language alternates,
  internal links, JSON-LD syntax and sitemap coverage.
- Phase 1 adds /faq/ and /spinning-top-simulator/: 23 index pages plus 404.
- No analytics or Search Console verification script/tag was found in the
  retrieved home HTML. DNS-based verification and hosting-injected analytics
  cannot be ruled out from repository inspection alone.

## Not established

No authenticated Google Search Console dataset is available in this task.
Indexing status, Google-selected canonicals, impressions, clicks, country
distribution and query demand are therefore unknown. Crawl permission and
sitemap inclusion are not evidence of indexing. No new tracker was installed.

## Measurement after release

1. Record the release date and request inspection of both new canonical URLs
   in the existing Search Console property, if available.
2. Export page/query/country/device impressions, clicks, CTR and position for
   comparable 28-day periods. Note brand vs non-brand intent and small samples.
3. Check indexing and Google-selected canonical separately from traffic.
4. Desired product funnel: content visit -> arena visit -> successful launch
   -> completed battle. These events are NOT collected in this release;
   consent, tooling and privacy wording must be reviewed before adding tracking.
5. Review after enough impressions accumulate; do not infer failure from a
   few days without traffic or promise ranking from structured data.

## Content guardrails

Answers reflect game.js. Update FAQ and guide when mechanics change. Do not
publish invented win rates, elemental counters, guaranteed Boss builds,
school-filter bypass claims or official Beyblade affiliation. WebPage JSON-LD
describes the new pages; it is not a promise of FAQ rich results or PAA placement.
