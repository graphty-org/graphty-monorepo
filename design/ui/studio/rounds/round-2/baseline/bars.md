# Bars 8 (axe) and 9 (app words at rest) on the round 2 build

Measured 2026-10-07 on build `4a7a1a7fbdba graphty@0.8.53` (commit 4a7a1a7fb, the build round 2
ran on), from a copy of `graphty/dist` taken before any round 3 fix was built, with
`node tool/bars.mjs <out> --dist <copy>`. Every violation, with the elements it names, is in
`bars.json`. This is the first time either bar has been measured.

## Bar 9: 42 app words at rest (target <= 50): PASS

Les Miserables loaded, nothing selected, 1440 x 900. Counted words, in page order:

> Les Miserables Local only Graph Data Graph Les Miserables Selection Everything Analyze in the
> toolbar Shift+A to add results here Graph From Les Miserables Style Values Overview Nodes Edges
> Direction Undirected from the file directed Density Components Edges per node to mean

Six of the 42 are the dataset's title, "Les Miserables", three times (project button, place
header, inspector source line). The rule leaves out data values and node names but not the
dataset's title; counted without it, 36. Left out: 9 numbers and data words. Round 3 may not go
above 42 under the same script (criteria, "How a fix is accepted", item 2).

## Bar 8, axe part: FAIL, one cause

Tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`. Serious or critical / all violations per screen:

| Screen                             | Serious or critical             | All |
| ---------------------------------- | ------------------------------- | --- |
| Start screen with the usage card   | 1 (color-contrast, 12 elements) | 1   |
| Start screen                       | 1 (color-contrast, 11)          | 1   |
| Loaded Graph place                 | 0                               | 0   |
| Analyze open                       | 1 (color-contrast, 10)          | 1   |
| A finished run row                 | 0                               | 0   |
| Style tab with a label line        | 1 (color-contrast, 1)           | 1   |
| Find box with results open         | 1 (color-contrast, 1)           | 1   |
| A node's Values with its neighbors | 1 (color-contrast, 1)           | 1   |
| Export, Image                      | 1 (color-contrast, 4)           | 1   |
| Export, Data                       | 1 (color-contrast, 3)           | 1   |
| Data page                          | 0                               | 0   |
| Save as                            | 0                               | 0   |
| Refusal of a broken file           | 1 (color-contrast, 11)          | 1   |

Every violation is the same pair of colors: dimmed text `#8c8c8c` on the dark panel `#2c2c2c`,
4.15:1 where WCAG 1.4.3 asks 4.5:1, at 9 px and 11 px. `#8c8c8c` is shade 2 of
compact-mantine's dark ramp (`compactDarkColors` in `compact-mantine/src/theme/colors.ts`), which
Mantine uses for dimmed text in the dark scheme, so the fix is one color in compact-mantine, not
one per screen. No other rule fails.

Not measured here (bar 8's other parts): shared accessible names, focus drops, focus visibility,
announcements.
