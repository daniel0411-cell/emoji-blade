# Release checklist

1. Start from the latest remote commit. Preserve IDE changes; never force-push.
2. Run `node --check game.js`, `node tests/regression.cjs`, and `python3 tests/site.py`.
3. Smoke-test 1P and 2P, countdown cancellation, touch dragging, audio and fullscreen on desktop and mobile.
4. Commit reviewed changes, then deploy the static site to the existing Cloudflare Pages project.
5. Verify production HTML and game.js, language canonicals, sitemap, and a random missing URL returning 404.

Character stats and mechanics in game.js are authoritative. Armor artwork does not change collision geometry. Do not advertise ring-outs, filter bypass guarantees, or AI behaviors that are not implemented.
