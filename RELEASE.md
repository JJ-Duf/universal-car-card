# Release 2.3.0

Upload the contents of this package to the repository root. Keep existing unrelated files. Commit the changes and create a GitHub release with tag `v2.3.0`; attach `universal-car-card.js` as the release asset.

Suggested release title: v2.3.0 — Configurable card aspect ratio

Release description: Adds a configurable aspect ratio in YAML and the visual editor. Rectangular cards now use their actual internal height and preserve image proportions. The default square layout remains available. Includes compact Passat examples.

Validation: `node --check universal-car-card.js`, `node tests/aspect-ratio.test.cjs`.

After updating HACS, refresh the dashboard browser cache. Remove fixed-height card_mod overrides and add `display.aspect_ratio: "7 / 5"` for approximately 250 px height at 350 px width. Check both connected and disconnected previews; artwork position can be tuned independently.
