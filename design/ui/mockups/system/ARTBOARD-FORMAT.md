# Artboard format brief

Every artboard is ONE self-contained file named `<Stem>.dc.html` in this
directory. It renders inside a sandboxed iframe with no network access, so
everything must be inline. Follow these rules exactly; violations fail
silently.

## Skeleton (static artboard, no script)

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
    a { color: #5b8ff9; } a:hover { color: #75a5f9; }
  </style>
</helmet>
<div style="width: 1440px; height: 900px; display: flex; flex-direction: column; background: #161b22; color: #d5d7da; overflow: hidden;">
  ... the whole screen ...
</div>
</x-dc>
</body>
</html>
```

Rules:

- Keep the `<script src="./support.js"></script>` line EXACTLY. Do not inline
  or remove it.
- Static artboards have NO `<script data-dc-script>` tag at all. Do not add
  one. No JavaScript anywhere.
- No `{{ }}` handlebars, no `<sc-for>`, no `<sc-if>`. Write every element
  literally.
- Canonical HTML: close every non-void element, quote every attribute.
- Use inline `style="..."` on every element for layout and color. Put only
  `body`, `a`, and `a:hover` rules in the `<helmet><style>` block. The
  editor's property panel edits inline styles, not classes.
- The root element has a fixed size that matches the frame in canvas.json:
  1440 by 900 for desktop, 1180 by 820 for iPad. Set `overflow: hidden` on
  it and give it a background.
- Layout with flex or grid plus `gap`, never with margins between siblings
  or whitespace. A row of buttons is `display: flex; gap: 8px`. A grid is
  `display: grid; grid-template-columns: repeat(N, minmax(0, 1fr)); gap: Xpx`.
- Icons: inline SVG only, stroke-based, 16 px grid, `stroke="currentColor"`,
  `fill="none"`, `stroke-width="1.5"`, `stroke-linecap="round"`,
  `stroke-linejoin="round"`. Never emoji, never dingbats, never icon fonts.
- No external images, fonts, or stylesheets. No `<img>` tags. Draw the graph
  in the canvas area as inline SVG (circles and lines).
- Plain ASCII in all text. Use -- instead of em dashes and straight quotes.
- Real copy, never lorem ipsum. Labels and values come from the spec and the
  named dataset.
- Write copy as literal text so a viewer can retype it in place.

## Frame sizes

| Kind | Root size |
|---|---|
| Desktop | width: 1440px; height: 900px |
| iPad | width: 1180px; height: 820px |
