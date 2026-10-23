# Pajek style corpus

Real styled files whose stated license allows redistribution, and inputs generated for this project, read by
graph-io's style tests (`test/styles/harness.test.ts`). The license is the one the source states: the GitHub
repository's license, an NDEx network's `rights` property, or the project's own license text. A file over 256 KB
is stored gzip-compressed (`.gz`); the tests read it decompressed, under its name without `.gz`.
Files under `generated/` were written for this project, MIT like the package: by seeded scripts, by hand, or by
graph-io's Pajek writer from `generated/shapes-and-lines.net` (`graphty-written.net` and its edited copies, which
`test/formats/pajek/styles.test.ts` writes again with `UPDATE_PAJEK_TAMPER=1`).

| File                                   | Source                                                           | License                          | What it is                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generated/b98-trailing-zero.net`      | Generated for this project by a seeded script                    | MIT (generated for this project) | Written the way Pajek writes a drawn network: aligned columns, CRLF line ends, a trailing `0` after each vertex's parameters, arcs and edges                                                |
| `generated/color-forms.net`            | Written for this project                                         | MIT (generated for this project) | Every color form Pajek documents (names, `GrayNN`, `RGBrrggbb`, `RGB(r,g,b)`, `CMYKccmmyykk`, `CMYK(c,m,y,k)`), one of Pajek's own names that dvips lacks (`LightYellow`), and an out-of-range channel |
| `generated/colors-mix.net`             | Generated for this project by a seeded script                    | MIT (generated for this project) | Shape keywords after the parameters, unknown colors, out-of-range size factors and line patterns                                                                                            |
| `generated/graphty-written.net`        | Written by graph-io's Pajek writer                               | MIT (generated for this project) | `shapes-and-lines.net` written with its styles: the parameters and the `% graphty.styles` comment line                                                                                      |
| `generated/nan-values.net`             | Generated for this project by a seeded script                    | MIT (generated for this project) | Lines whose value is `NaN`                                                                                                                                                                  |
| `generated/proto-color-names.net`      | Written for this project                                         | MIT (generated for this project) | Colors and patterns named `toString`, `constructor` and `valueOf`                                                                                                                           |
| `generated/shapes-and-lines.net`       | Written for this project                                         | MIT (generated for this project) | Every shape keyword, size factors, label colors and sizes, border width, line widths, colors and patterns, arcs and edges                                                                   |
| `generated/tamper-block-truncated.net` | Written by graph-io's Pajek writer, then edited                  | MIT (generated for this project) | `graphty-written.net` with its block cut in half                                                                                                                                            |
| `generated/tamper-native-edited.net`   | Written by graph-io's Pajek writer, then edited                  | MIT (generated for this project) | `graphty-written.net` with one vertex's `ic` changed                                                                                                                                        |
| `generated/tamper-node-added.net`      | Written by graph-io's Pajek writer, then edited                  | MIT (generated for this project) | `graphty-written.net` with one more vertex                                                                                                                                                  |
| `graphstream_gs-core__B.net`          | https://github.com/graphstream/gs-core/blob/950b87280075f92a85b564b47ce6522ced5ba53a/src-test/org/graphstream/stream/file/pajek/test/B.NET | LGPL-3.0-or-later OR CECILL-C | A drawn network in the form Pajek writes (a test file of GraphStream's Pajek reader; the repository's license): 111 vertices at stored coordinates, three shapes (ellipse, box, diamond), seven fill colors, size factors, label font sizes, border widths, 193 arcs with line widths and arrow positions |
| `kjhealy_kjhnet__iliad_killedby.net` | https://github.com/kjhealy/kjhnet/blob/d3e91422d853a32530fa6ad9963e88412cbf5d15/data-raw/iliad/iliad_killedby.net | MIT (the kjhnet repository; data from Rossman 2017, "Glory and Gore", https://osf.io/jasf4/) | Who killed whom in the Iliad: 311 labeled vertices colored by side (`ic Blue`, `ic Red`), 292 arcs, no coordinates, CRLF line ends |
| `SamTseng_CATAR__Pajek_format.net`     | https://github.com/SamTseng/CATAR/blob/HEAD/src/Pajek_format.net | MIT                              | Size factors, fill and border colors, line colors                                                                                                                                           |

## Style fidelity fixtures

Files scored against the drawing of the program that wrote them (`graph-io/test/fidelity/corpus-samples.ts`, reference
scenes in `graph-io/test/fidelity/scenes/<sample id>/`). Generated files were written by the seeded scripts in
`graph-io/test/fidelity/generators/`, MIT like the package.

On 2026-10-16 the owner chose to commit every file of the style fidelity corpus regardless of its license, so some files below state no license, or one that does not allow redistribution; each row gives the license its source states, or "none stated".

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `fidelity/synth-vertices.net` | generated by generators/gen_pajek.py (seeded) | MIT (generated) | 81 vertices: every shape keyword and vertex parameter, every color form |
| `fidelity/synth-lines.net` | generated by generators/gen_pajek.py (seeded) | MIT (generated) | 40 vertices: every line parameter, Bezier / oval / arc / double lines, negative values, loops, bidirected arcs, a second relation, *Arcslist / *Edgeslist |
| `fidelity/1crn.net` | http://mrvar.fdv.uni-lj.si/sola/info4/uvod/net/data.zip (1CRN.NET) | none stated (Pajek course data) | Crambin protein (PDB 1CRN) atoms: 327 vertices with 3D coordinates, x_fact/y_fact by element, ic RGB(r,g,b) fractions, one line with c r g b |
| `fidelity/c.net` | http://mrvar.fdv.uni-lj.si/sola/info4/uvod/net/data.zip (C.NET) | none stated (Pajek course data) | 65 vertices drawn as small ellipses (x_fact 0.4, fos 6, bw 0.5), edges with Bezier parameters |
| `fidelity/football.net` | http://mrvar.fdv.uni-lj.si/sola/info4/uvod/net/data.zip (FOOTBALL.NET) | none stated (Pajek course data) | Football player transfers between 35 countries: arcs with width and arrow size from the transfer count |
| `fidelity/kdorola.net` | http://mrvar.fdv.uni-lj.si/sola/info4/uvod/net/data.zip (kdorola.net) | none stated (Pajek course data) | Slovenian board interlocks: two-mode network (127 vertices, 59 people), lines colored Red / Blue by role, label radius and angle on two vertices |
| `fidelity/lin-rel4.net` | http://mrvar.fdv.uni-lj.si/sola/info4/uvod/net/data.zip (lin_rel4.NET) | none stated (Pajek course data) | Lindenstrasse TV-series relations: 234 vertices, five shapes, ic colors, time intervals, arcs and edges in three named relations |
