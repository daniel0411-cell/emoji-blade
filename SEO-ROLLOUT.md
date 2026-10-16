# Search rollout: October 16-30, 2026

## Baseline and scope

Baseline: e8ed7e81ba56c2ce27e1c5acea5fef0a11d11060, main = origin/main.
Production game.js matched the baseline SHA-256 during the October 16 audit.
All six core URLs returned 200, self-canonicals, crawl permission and sitemap
membership. The missing-page probe returned 404. These checks are not proof
of indexing. Run `python3 scripts/search-audit.py` to repeat them.

GSC had 0 clicks and 0 impressions with the 7-day filter selected, but its
daily table exposed only October 12-13. Bing's October 9-15 report had 0
clicks and 0 impressions, with only October 14 in the daily table. Neither
supports a meaningful week-over-week trend or keyword-demand conclusion.
GSC's aggregate indexing report was still processing. Google had discovered
63 sitemap URLs on October 16; Bing had discovered 19 on October 14.

## Core-page indexing ledger

Inspection results below are October 16 observations, not inferred from HTML.
"Not checked" must never be replaced with an assumed indexing result.

| URL path | Google inspection | Bing inspection | Next check |
| --- | --- | --- | --- |
| / | Indexed; successful mobile crawl October 16 | Discovered, not crawled; live test indexable | Bing crawl and canonical |
| /2-player-duel/ | Discovered, not indexed; no crawl yet | Not discovered | Crawl and index |
| /spinning-top-simulator/ | Indexed | Not discovered | New content crawl |
| /guide/ | Indexed | Discovered, not crawled | New content crawl |
| /characters/ | Indexed | Not discovered | Crawl and index |
| /tier-list/ | URL unknown to Google, despite sitemap and home links | Discovered, not crawled | Discovery, then crawl |

## Current release

- Shorten English home and simulator descriptions, keeping social/schema copy aligned.
- Add actual arena screenshots to the English duel, simulator and controls guides.
- Add matching-top and one-variable launch experiments; explain the actual Dash controls.
- Retain existing canonicals and reciprocal language links. No new search landing pages.
- Update sitemap lastmod only for the four materially changed pages.
- Deploy the public IndexNow verification file, then notify the six core URLs
  with `python3 scripts/search-audit.py --submit-indexnow`. Log response below.
- Request Google indexing for the core pages. Record accepted, blocked or
  unavailable results separately from actual indexing.

## Measurement dependency

No GA4 or other game-event collector is configured in the repository.
Requested the existing measurement platform/ID from the owner. Do not claim
events are being collected or publish an invented ID. When available, review
privacy wording and consent requirements, then record: arena visit, first
executed launch (not cancelled countdown), completed battle, replay and
mode selection. Send only fixed mode/outcome labels, not custom emoji inputs
or identifying information. Check the relevant CSP allowlist explicitly.

## Directory and embed listing materials

Name: Emoji Blade

URL: https://emojiblade.online/

Short description: A free browser spinning-top battle game. Pick emoji tops,
adjust launch power and angle, and play solo or share a device for local duels.

Category: Browser game / physics / local two-player.

Controls: Mouse or touch to aim, sliders for launch settings; Player 1 Dash
uses Space and Player 2 uses Enter during local battles. No remote matchmaking.

Media: /social-card.png, /images/launch-controls.png, /images/local-duel.png.

Embed instructions: https://emojiblade.online/embed/

Prioritize a small number of relevant game directories or publishers which
accept browser games or embedded games. Check submission rules and test
embedding first. Account access, licensing and final recipients still need
to be established before external outreach. No directory listing or outreach
has been represented as completed by preparing these materials.

## Day 7: October 23

1. Repeat six-page technical audit and individual URL inspection.
2. Record actual report dates; compare complete equal-length windows only.
3. Export query/page/device/country data if it exists; separate brand terms.
4. If no crawl: inspect discovery, request status and server access.
5. If crawled but not indexed: review duplication, usefulness and canonical.
6. If indexed but no impressions: validate search intent and competition.

## Day 14: October 30

Repeat the ledger and compare with October 16 and October 23. Prioritize
existing pages which gain relevant impressions. Improve titles/snippets only
when query, rank and sample size make CTR interpretable. Expand characters,
matchups or languages only when actual query demand supports the work.
No guaranteed indexing, rank or traffic targets.

## Follow-up schedule and release results

The chat heartbeat is scheduled for October 23 and October 30 at 15:00
Asia/Shanghai, with a total of two runs. Keep unchanged/non-actionable
results quiet; notify on meaningful changes, failure, required user action
or the completed two-week review. Actual release and submission receipts
are recorded in the accompanying chat after production verification.
