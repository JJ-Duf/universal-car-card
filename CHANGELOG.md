# Changelog

## 2.3.0

- Add `display.aspect_ratio` in YAML and the visual editor; the default remains `1 / 1`.
- Reflow the internal card to the configured ratio, rather than clipping a square card with a fixed outer height.
- Preserve square image proportions inside rectangular cards with `object-fit: contain`.
- Calculate the masonry size from the configured ratio.
- Validate positive numeric ratios and provide English editor validation.
- Add compact Passat and wallpanel examples.
