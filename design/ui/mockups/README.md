# App shell mockups

Static mockups for the app shell design. The specification is
`design/ui/app-shell-progressive-disclosure-design.md`.

## artboards/

62 screens, one file each, plus `canvas.json` giving their order and grouping.
Each file is self-contained static HTML at a fixed size (1440x900, or 1180x820
for the two iPad screens). Open one directly in a browser.

The `<script src="./support.js">` line and the `<x-dc>` wrapper are the
design-canvas format; the files render correctly without them.

## system/

The design system these screens are drawn from. Read these before changing a
screen, and update these rather than a screen when a rule changes.

| File | What it governs |
|---|---|
| `VOCAB.md` | Palette, type ramp, control sizes, component snippets, canvas ink |
| `REGISTER-1.5.md` | One glyph and one tooltip string per verb |
| `COMPACTION-1.6.md` | The ten row types and the routing rules |
| `FIXTURES.md` | Canonical numbers for the three sample datasets |
| `LEGEND-1.8.md` | The legend component |
| `DECISIONS-1.5/1.7/1.8.md` | Why each revision decided what it did |
| `ARTBOARD-FORMAT.md` | The file format every artboard must follow |

## Rebuilding the canvas

The screens are published as one pan-and-zoom canvas at
https://claude.ai/code/artifact/52b64d25-6ec8-4a35-aeab-06bce8c7f379
