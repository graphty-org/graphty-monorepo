# Icon and string register, revision 1.5

Authority: this file closes the icon register that spec 6.8 declares closed and
VOCAB section 5 hosts. It resolves the 16 problems in SWEEP-1.5.md. Where this
file and an entry in ARTBOARD-CHANGES-1.5.md disagree, this file wins and the
checklist entry is the thing to correct.

Apply it verbatim. A glyph is copied character for character; a title is copied
character for character.

The rule, restated. Every verb has exactly one glyph and exactly one title. A
glyph may serve more than one verb only when the surrounding context makes it
unambiguous and the titles differ, and every such reuse is listed in section 8.
A reuse that is not in section 8 is a defect. The older phrasing, "one glyph,
one verb", was too strict: it flagged the two transports, the two pin targets
and the close X as drift when each is a legible, context-separated reuse.

Rows marked APPLIED were already written into all 39 artboards by
`tmp/register/normalize.cjs`. Rows marked TODO are for the next agents.

## 1. The verb register

Every icon drawn on the 39 artboards. The glyph column is the complete inner
markup of the SVG; the wrapper is always

`<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`

at 14px, or the same with `width="12" height="12"` for chevrons, X and the
info circle, `width="16" height="16"` for rail items, and `width="8" height="8"`
for the menu-affordance caret. Never any other size.

The title column is the exact `title` attribute string. A binding is spelled in
parentheses at the end. A disabled control keeps the same title and appends the
one reason, after a full stop.

### 1.1 Shell and top bar

| Verb | 16px stroke glyph (inner SVG) | Title |
|---|---|---|
| close (dialog, overlay, palette, strip) | `<line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line>` | `Close (Esc)` |
| close panel | `<line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line>` | `Close the panel (Cmd+B)` |
| toggle inspector | `<rect x="2" y="2.5" width="12" height="11" rx="1.5"></rect><line x1="10" y1="2.5" x2="10" y2="13.5"></line>` | `Toggle inspector (D)` |
| toggle panel (added 2026-09-12, section 18) | `<rect x="2" y="2.5" width="12" height="11" rx="1.5"></rect><line x1="6" y1="2.5" x2="6" y2="13.5"></line>` | `Toggle panel (Cmd+B)` |
| keep open (added 2026-09-12, section 18) | `<rect x="3.5" y="7" width="9" height="6.5" rx="1"></rect><path d="M5.75 7V5.25a2.25 2.25 0 0 1 4.5 0V7"></path>` | `Keep open` |
| collapse inspector (the inspector title row's own control, drawn at 12px) | `<polyline points="6,4 10,8 6,12"></polyline>` | `Toggle inspector (D)` -- see section 16 |
| compare | `<rect x="2" y="2.5" width="12" height="11" rx="1.5"></rect><line x1="8" y1="2.5" x2="8" y2="13.5"></line>` | `Compare two views` / disabled `Compare two views. Load data first` |
| undo | `<path d="M4 6h6.5a3 3 0 0 1 0 6H7"></path><polyline points="6.5,3.5 4,6 6.5,8.5"></polyline>` | `Undo (Cmd+Z)` / disabled `Undo (Cmd+Z). Nothing to undo yet` |
| redo | `<path d="M12 6H5.5a3 3 0 0 0 0 6H9"></path><polyline points="9.5,3.5 12,6 9.5,8.5"></polyline>` | `Redo (Shift+Cmd+Z)` / disabled `Redo (Shift+Cmd+Z). Nothing to redo yet` |
| share | `<circle cx="12" cy="3.5" r="1.75"></circle><circle cx="4" cy="8" r="1.75"></circle><circle cx="12" cy="12.5" r="1.75"></circle><line x1="5.6" y1="7.1" x2="10.4" y2="4.4"></line><line x1="5.6" y1="8.9" x2="10.4" y2="11.6"></line>` | `Share this view` / disabled `Share this view. Load data first` |
| export (also download; there is no separate download glyph and no floppy save glyph) | `<path d="M8 2v8"></path><polyline points="5,7.5 8,10.5 11,7.5"></polyline><path d="M2.5 12.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1"></path>` | `Export` / disabled `Export. Load data first` / object form `Export CSV`, `Export schema JSON` |
| views | `<path d="M8 2l5.5 3v6L8 14l-5.5-3V5z"></path><path d="M8 8l5.5-3M8 8v6M8 8L2.5 5"></path>` | `Views` |
| zoom in | `<circle cx="7" cy="7" r="4.5"></circle><line x1="10.5" y1="10.5" x2="14" y2="14"></line><line x1="7" y1="5" x2="7" y2="9"></line><line x1="5" y1="7" x2="9" y2="7"></line>` | `Zoom in (=)` |
| zoom out | `<circle cx="7" cy="7" r="4.5"></circle><line x1="10.5" y1="10.5" x2="14" y2="14"></line><line x1="5" y1="7" x2="9" y2="7"></line>` | `Zoom out (-)` |
| zoom to fit | `<path d="M2.5 6V2.5H6"></path><path d="M10 2.5h3.5V6"></path><path d="M13.5 10v3.5H10"></path><path d="M6 13.5H2.5V10"></path>` | `Zoom to fit (0)` |
| zoom to selection | `<path d="M2.5 6V2.5H6"></path><path d="M10 2.5h3.5V6"></path><path d="M13.5 10v3.5H10"></path><path d="M6 13.5H2.5V10"></path><circle cx="8" cy="8" r="2"></circle>` | `Zoom to selection (F)` / disabled `Zoom to selection (F). Select something first` |
| search | `<circle cx="7" cy="7" r="4.5"></circle><line x1="10.5" y1="10.5" x2="14" y2="14"></line>` | none: it sits inside the Cmd K pill and the search input, both of which carry visible text |
| settings | `<circle cx="8" cy="8" r="2.25"></circle><circle cx="8" cy="8" r="4.75"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"></path>` | `Settings`; object forms `Import settings`, `Time slider settings (T)`, `Animation settings` |
| help | `<circle cx="8" cy="8" r="6.5"></circle><path d="M6 6.3a2 2 0 0 1 3.9.5c0 1.3-1.9 1.6-1.9 2.7"></path><line x1="8" y1="11.75" x2="8" y2="12.25"></line>` | `Help and keyboard shortcuts (?)` |

Rail activities (Data, Explore, Analyze, Style, Present, AI) keep the glyphs in
VOCAB section 5 unchanged. Their title is the activity name alone (`Data`,
`Explore`, `Analyze`, `Style`, `Present`, `AI`); disabled it is the name plus
`. Load data first`.

### 1.2 Panel, section and row verbs

| Verb | 16px stroke glyph (inner SVG) | Title |
|---|---|---|
| more (overflow) | `<circle cx="8" cy="3.5" r="0.75"></circle><circle cx="8" cy="8" r="0.75"></circle><circle cx="8" cy="12.5" r="0.75"></circle>` | `More` |
| pin | `<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5" x2="8" y2="13.5"></line>` | inspector or panel title row: `Pin as A`, on every board that draws it (section 10.2). Layout node pin: `Pin selected` and `Unpin all`. Pop-out header: `Pin this open` (section 8) |
| edit | `<path d="M11.2 2.3l2.5 2.5-8 8-3.2.7.7-3.2z"></path><line x1="9.6" y1="3.9" x2="12.1" y2="6.4"></line>` | `Edit`, plus the object where the icon does not sit on it (`Edit layer`, `Edit binding`) |
| delete | `<path d="M3 4.5h10M6.5 4.5v-2h3v2M4 4.5l.8 9h6.4l.8-9"></path>` | `Delete`, plus the object (`Delete layer`, `Delete set`, `Delete this rule`) |
| show on canvas | `<path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z"></path><circle cx="8" cy="8" r="2"></circle>` | `Show on canvas` in every state; a toggle never renames itself |
| copy | `<rect x="5.5" y="5.5" width="8" height="8" rx="1"></rect><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"></path>` | `Copy`, plus the object (`Copy reading`, `Copy id`, `Copy as TSV`). The title-row control is `Copy reading` on every board, never `Copy the graph summary` and never a bare `Copy` (section 10.1) |
| recompute | `<path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"></path><polyline points="2.5,2.5 2.5,6 6,6"></polyline>` | `Recompute`. The one exception is Settings > Performance, where VOCAB 10 fixes the visible words `Recalibrate` and `Change` |
| locate | `<circle cx="8" cy="8" r="4.5"></circle><circle cx="8" cy="8" r="1.5"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2"></path>` | `Locate` |
| filter | `<path d="M2.5 3.5h11l-4.25 5v4.25l-2.5 1.25V8.5z"></path>` | `Filter to selection` |
| bookmark (a saved view, set, recipe or subgraph, as the leading glyph on a row that carries the verb in text) | `<path d="M4 2.5h8a1 1 0 0 1 1 1v10l-5-3-5 3v-10a1 1 0 0 1 1-1z"></path>` | none as a leading glyph, because the row carries the words (`Save as view...` on ViewsMenu, `Save as subgraph...` on FilterBuilderExpert, the saved-view history entry). It is not the drawing of an icon-only save verb: every `Save as <kind>...` control is the plus (section 10.6) |
| note | `<path d="M3 2.5h10v8H7l-3 3v-3H3z"></path>` | `Note this relationship`; on a node `Note` |
| add | `<line x1="8" y1="3" x2="8" y2="13"></line><line x1="3" y1="8" x2="13" y2="8"></line>` | the verb plus its object (`Add a style layer`) |
| check (a toggled menu row or a checked box) | `<polyline points="3.5,8.5 6.5,11.5 12.5,5"></polyline>` | none: it replaces a menu row's leading icon and the row carries text |
| list view | `<line x1="5.5" y1="4" x2="13.5" y2="4"></line><line x1="5.5" y1="8" x2="13.5" y2="8"></line><line x1="5.5" y1="12" x2="13.5" y2="12"></line><circle cx="3" cy="4" r="0.5"></circle><circle cx="3" cy="8" r="0.5"></circle><circle cx="3" cy="12" r="0.5"></circle>` | `List` |
| card view | `<rect x="2.5" y="2.5" width="11" height="4.5" rx="1"></rect><rect x="2.5" y="9" width="11" height="4.5" rx="1"></rect>` | `Cards` |
| link views | `<path d="M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5l-.75.75"></path><path d="M9.5 6.5a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5l.75-.75"></path>` | `Link views` |
| lock | `<path d="M2.5 5.5h11v8h-11z"></path><path d="M5.5 5.5v-2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"></path>` | `Lock` |
| caret, disclosure (12px) | open `<polyline points="4,6 8,10 12,6"></polyline>`, closed `<polyline points="6,4 10,8 6,12"></polyline>` | none on a section header, which carries text; on a select it is decoration |
| caret, menu affordance (8px, `stroke-width="2"`) | `<polyline points="3,6 8,11 13,6"></polyline>` | none while it trails a trigger that carries text, which is the common case. When the caret is drawn as its own separately clickable half of a split button it is a control in its own right, with its own hit area, and it carries its own title naming what that half opens: `History` on the top bar's Undo split button, `Choose which neighbors to expand` on Expand neighbors. That title never repeats the main half's words, is never a bare `More`, and never carries the main half's binding, which belongs to the half that acts |
| info circle (12px) | `<circle cx="8" cy="8" r="6.5"></circle><line x1="8" y1="7" x2="8" y2="11.5"></line><line x1="8" y1="4.5" x2="8" y2="4.75"></line>` | the explanation sentence itself, see section 4 |

### 1.3 Selection verbs

| Verb | 16px stroke glyph (inner SVG) | Title |
|---|---|---|
| select all visible | `<rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke-dasharray="2.5 2"></rect><polyline points="5.2,8.2 7.2,10.2 10.8,5.8"></polyline>` | `Select all visible (Cmd+A)` |
| invert selection | `<rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke-dasharray="2.5 2"></rect><rect x="5.5" y="5.5" width="5" height="5" rx="1"></rect>` | `Invert selection (I)` |
| clear selection | `<rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke-dasharray="2.5 2"></rect><path d="M6 6l4 4M10 6l-4 4"></path>` | `Clear selection (Esc)` |
| select neighbors | `<circle cx="5.5" cy="8" r="2.25"></circle><circle cx="12.5" cy="4.5" r="1.5"></circle><circle cx="12.5" cy="11.5" r="1.5"></circle><line x1="7.6" y1="7" x2="11" y2="5.3"></line><line x1="7.6" y1="9" x2="11" y2="10.7"></line>` | `Select neighbors (Shift+E)` |
| select edges between selected | `<circle cx="4" cy="12" r="1.75"></circle><circle cx="12" cy="4" r="1.75"></circle><line x1="5.3" y1="10.7" x2="10.7" y2="5.3"></line>` | `Select edges between selected` |
| select largest connected part | `<circle cx="5" cy="5.5" r="1.5"></circle><circle cx="10.5" cy="4.5" r="1.5"></circle><circle cx="7.5" cy="11" r="1.5"></circle><line x1="6.4" y1="5.3" x2="9.1" y2="4.7"></line><line x1="5.6" y1="6.9" x2="6.9" y2="9.6"></line><line x1="10" y1="5.9" x2="8.1" y2="9.6"></line>` | `Select largest connected part` |
| merge selected nodes | `<circle cx="5.5" cy="8" r="3.5"></circle><circle cx="10.5" cy="8" r="3.5"></circle>` | `Merge selected nodes...` |
| simulate removing | `<circle cx="8" cy="8" r="6"></circle><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"></path>` | `Simulate removing` |
| show in table | `<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"></rect><line x1="2.5" y1="6.5" x2="13.5" y2="6.5"></line><line x1="2.5" y1="10" x2="13.5" y2="10"></line><line x1="7" y1="6.5" x2="7" y2="13.5"></line>` | `Show in table (Shift+T)` |
| style selection | `<path d="M13.5 2.5l-6 6"></path><path d="M7.5 8.5c-1.5 0-2.5 1-2.5 2.5s-1 2-2.5 2c1.5 1 4.5 1 5.5-1 .5-1 .5-2-.5-3.5z"></path>` | `Style selection` |

IK-2, which DataTableDrawer's comment raises as "three glyphs are owed to
section 5", is closed by this table. All three verbs it names now have a 16px
stroke path. `Invert selection (I)` is
`<rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke-dasharray="2.5 2"></rect><rect x="5.5" y="5.5" width="5" height="5" rx="1"></rect>`
and `Simulate removing` is
`<circle cx="8" cy="8" r="6"></circle><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"></path>`;
both were already in the table above and are unchanged, so nothing that draws
them moves. `Merge selected nodes...` is the new row: two node circles
overlapped into one shape, which is the only drawing in the register that
overlaps two circles, so it cannot be misread as select neighbors (one node
and its two neighbours, joined by lines) or as compare (two rectangles). The
ellipsis is load-bearing per 6.3, because the verb opens a dialog that asks
which node survives. A row that draws one of these three keeps no empty 14px
leading slot; only `expand neighbors` (1.6) still does.

### 1.4 Transport verbs (time slider and layout)

One drawing per verb across both transports. The time transport and the layout
transport are two verbs sharing the play and step drawings; their titles name
which transport, and the reuse is listed in section 8.

| Verb | 16px stroke glyph (inner SVG) | Title |
|---|---|---|
| play | `<polygon points="5,3 13,8 5,13"></polygon>` | time transport `Play (Space)`; layout transport `Run the layout (Space)`; in a Style attribute list the same 12px glyph marks a metric that has not been run and the row carries its own sentence |
| pause | `<line x1="5.5" y1="3.5" x2="5.5" y2="12.5"></line><line x1="10.5" y1="3.5" x2="10.5" y2="12.5"></line>` | `Pause (Space)` |
| step forward | `<polygon points="4,3.5 10,8 4,12.5"></polygon><line x1="12" y1="3.5" x2="12" y2="12.5"></line>` | time transport `Step forward 7 days (.)`, unit-aware per VOCAB 10; layout transport `Step the layout once` |
| step back | `<line x1="4" y1="3.5" x2="4" y2="12.5"></line><polygon points="12,3.5 6,8 12,12.5"></polygon>` | `Step back 7 days (,)` |
| settle | `<polygon points="2.5,3 8,8 2.5,13"></polygon><polygon points="8,3 13.5,8 8,13"></polygon>` | `Settle` |
| reverse | `<path d="M2.5 5.5h11"></path><polyline points="10.5,2.5 13.5,5.5 10.5,8.5"></polyline><path d="M13.5 10.5h-11"></path><polyline points="5.5,7.5 2.5,10.5 5.5,13.5"></polyline>` | `Reverse` |
| stop listening (voice) | `<rect x="6" y="2" width="4" height="7" rx="2"></rect><path d="M3.5 7.5a4.5 4.5 0 0 0 9 0"></path><line x1="8" y1="12" x2="8" y2="14"></line><line x1="5.5" y1="14" x2="10.5" y2="14"></line>` | `Stop listening` |

### 1.5 Status indicators (drawn, not clickable verbs)

| Indicator | 16px stroke glyph (inner SVG) | Title |
|---|---|---|
| warning | `<path d="M8 2.5l6 11H2z"></path><line x1="8" y1="6.5" x2="8" y2="9.5"></line><line x1="8" y1="11.5" x2="8" y2="11.75"></line>` | the reason sentence |
| performance mode | `<path d="M9 1.5L3 9h4.5L7 14.5 13 7H8.5z"></path>` | the rule list, per VOCAB 10 `Status bar Performance chip` |

### 1.6 Verbs with no glyph

These keep their text label, per 6.8. Nothing in the 39 artboards draws them and
nothing may start.

`import`, `open`, `paste`, `save` (there is no project save and no floppy glyph;
saving is Export or the bookmark), `remove`, `run` in every form, `cancel`,
`sort` (a column sorts by its existing caret), `tag`, `unlock`, `eye-off`,
`duplicate`, `expand neighbors`, `column type`.

`expand neighbors` was drawn with the add plus on DataTableDrawer, which reads
as add rather than as expand. There is no expand-neighbors drawing, so the row
keeps its empty 14px leading slot and carries its text alone -- and it is now
the only row on that board that does, because Invert, Merge and Simulate are
all drawn from 1.3. `column type` was drawn with the
list-view glyph on TableJoin, which reads as List, not as a type; the type chip
carries its words (`List of text`) and no glyph.

VOCAB 10 names paste, eye-off, lock, unlock and tag as additions to section 5;
only lock is drawn anywhere, so only lock is registered above. The other four
stay text until a path is added to this table.

### 1.7 Field glyphs (an in-field label, not a verb)

Appended by section 17, which carries the argument. These are the glyphs
COMPACTION-1.6 Rule 3 puts in a field's 16px slot in place of a label line, and
VOCAB section 11 draws them under the field atom. VOCAB has called them
"additions to the closed register [that] must be copied from `REGISTER-1.5.md`
once appended there" since 1.6; they were never appended, so until this table
existed every field in the set failed Rule 4's first test on a missing copy
rather than on merit. Nothing outside this table may be drawn in a field slot.

A field glyph is not a verb, so section 1's rule reads here as **one concept,
one drawing, one word**. The word is the field's own `title` -- the label the
glyph replaced -- and where the field shows the value as well, the title is
`<word>: <value>`, the form `Size by attribute: Age (ageYears)` and
`Window size: 30 days` already carry. The wrapper is section 1's 14px wrapper
unchanged, drawn inside a 16px slot at `#7a828e`; the slot is the scrub handle,
`cursor: ew-resize`, which is what Rule 4's second test asks of a field. A
concept with no entry keeps its word, in the field, as its own scrub handle --
the `Granularity` form, VOCAB 12 -- and never gets an approximate drawing.

| Slot label | 14px stroke glyph (inner SVG) | Title |
|---|---|---|
| size, smallest | `<circle cx="5" cy="11" r="2.5"></circle><circle cx="10.5" cy="6.5" r="4"></circle>` | `Smallest node size` |
| size, largest | `<circle cx="4.5" cy="11.5" r="1.75"></circle><circle cx="10" cy="6" r="5"></circle>` | `Largest node size` |
| width (any extent) | `<line x1="2.5" y1="8" x2="13.5" y2="8"></line><polyline points="5,5.5 2.5,8 5,10.5"></polyline><polyline points="11,5.5 13.5,8 11,10.5"></polyline>` | the extent it measures, never a bare `Width`: `Outline width` (StyleLibrary, StylePanel), `Window size` (TimeSlider), `Edge length` (VOCAB 15.1). Section 17.3 |
| opacity | `<circle cx="8" cy="8" r="5.5"></circle><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none"></path>` | `Opacity`, plus the object where the field does not sit on it (`Node opacity`, `Edge opacity`). Where an RT-2 box holds the swatch and the number together the box carries `Node color and opacity`, which is the compound's title and not this glyph's |
| attribute binding | `<path d="M2.5 7.2V3.5a1 1 0 0 1 1-1h3.7l6.3 6.3-4.7 4.7z"></path><circle cx="5.5" cy="5.5" r="0.75"></circle>` | the property it binds: `Size by attribute`, `Color by attribute`, `Outline by attribute`, `Edge weight attribute`. Bound, it appends the attribute: `Size by attribute: Age (ageYears)` |
| scale, square root | `<path d="M2.5 13.5C4.5 5 8 2.5 13.5 2.5"></path>` | `Square root scale` |
| scale, linear | `<line x1="2.5" y1="13.5" x2="13.5" y2="2.5"></line>` | `Linear scale`; in a field whose value names the transform, the field form `Scale: linear` (RampPopout) |
| scale, log | `<path d="M2.5 13.5C8 13.5 11.5 11 13.5 2.5"></path>` | `Log scale`, or the named transform where the ramp draws one (`-log10 scale`, StyleDiverging) |
| colour | no SVG: the 14px swatch is the glyph | the thing it paints, in the drawn forms `Node color`, `Outline color`, `Canvas background color`, `Selected stop color`, `Missing value color`; bound, it appends the reading (`Node color: Groups (communities, Louvain), 4 groups`) |
| pull to centre | `<circle cx="8" cy="8" r="1.5"></circle><polyline points="6,3 8,5 10,3"></polyline><polyline points="6,13 8,11 10,13"></polyline><polyline points="3,6 5,8 3,10"></polyline><polyline points="13,6 11,8 13,10"></polyline>` | `Pull to center`; with the value, `Pull to center: -1.2`. Section 17.4 |

The three scale curves have a second home, and one title rule covers both. In a
field slot the field is the scale select and the title takes the field form
(`Scale: linear`). In an RT-4 trailing slot the glyph is a button that opens the
RT-3 group of three, and the title is the scale's name, which is also which of
the three is drawn (`Square root scale`, `-log10 scale`). Where that same
trailing slot is the ramp's **door** rather than its scale control, 14.1's door
form governs instead and the title is `Ramp options. <state>` -- StylePanel's
`Ramp options. Square root scale` and StyleDiverging's
`Ramp options. 3 options changed` are one form, not two.

Three state rules ride with the table, and no others:

- **Bound to an attribute.** The binding glyph is drawn filled and the value is
  an attribute chip (Rule 6). The filled form is
  `<path d="M2.5 7.2V3.5a1 1 0 0 1 1-1h3.7l6.3 6.3-4.7 4.7z" fill="currentColor" stroke="none"></path><circle cx="5.5" cy="5.5" r="0.75" fill="#2a3035" stroke="none"></circle>`.
  Its knockout circle carries the field background `#2a3035` literally rather
  than `currentColor`, so a filled binding glyph drawn on any other ground is
  wrong.
- **Set earlier but not in effect**: a 4px `#4a7ee8` square in the slot's
  lower-left corner. **Placeholder**: value ink `#5f6873`. Neither touches the
  glyph.
- **Rule 11's labels preference on**: the word returns beside the field and the
  glyph stays in the slot. A pair degrades to two singles; the glyph is never
  deleted to make room for its own word.

The closed set of letters VOCAB 11 admits in a slot in place of a glyph -- `N`
nodes, `E` edges, `W` weight, `D` depth, `K` k, at 11px `#7a828e` -- is type,
not a drawing, and is not registered here. It is unchanged.

## 2. Status bar layout chip

One visible string, one tooltip, on all 30 artboards that draw the chip (SettingsPerformance documents it in a comment only).

- Visible chip text: `Force directed - settled`. The other three states are
  `Force directed - step 120 of 1,000, Stop`, `Positions from file` and
  `Quick grid (Performance mode)`.
- The technical name goes in the chip's own `title`, and nowhere else on the
  status bar: `title="Force directed (ngraph) - settled"`.

That keeps 6.3's plain-then-technical pair reachable without spending 9
characters of a 24px-tall bar on it, and it is the only place `(ngraph)` may
appear in the status bar. The Style panel's layout list and its segmented
picker still render the pair inline, because they have the room.

The 13 entries in ARTBOARD-CHANGES-1.5.md that prescribe the `(ngraph)` form as
the visible chip text (ContextMenu item 5b and its twelve siblings) are wrong
and are superseded by this section.

## 3. Contiguous unshipped rows

Three or more contiguous unshipped rows in one list are one group, not N rows:

- every row in the run is `color: #5f6873` and disabled, with no hover;
- no row in the run carries a `Coming` tag, a key chip or an icon-only control;
- the group header or the divider immediately above the run carries one
  `Coming` tag and one info circle whose title is
  `Dimmed rows are not built yet.`;
- an isolated unshipped row, or a run of two, keeps the per-row tag.

## 4. Info circle

One geometry for the open popover, everywhere:

```html
<div style="position: absolute; left: 0; top: 20px; width: 250px; display: flex; flex-direction: column; gap: 2px; padding: 4px 8px; border-radius: 4px; background: #2a3035; border: 1px solid #48525c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); font-size: 11px; line-height: 1.4; color: #d5d7da; box-sizing: border-box; z-index: 15;">
  <span>Nodes with well-linked neighbors: a node scores high when the nodes pointing at it score high.</span>
  <span style="color: #5b8ff9; cursor: pointer;">Learn more</span>
</div>
```

The parent needs `position: relative`. One bounded deviation is allowed and no
other: where a left-anchored 250px bubble would leave its parent, swap `left: 0`
for `right: 0`. `top: 20px` and `padding: 4px 8px` never change, and the
deviation is horizontal only.

The sentence also rides in the circle's own `title` attribute:

```html
<div title="Percentile compares this node with every other node: 98th percentile means it scores above 98 per cent of them." style="width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; color: #a3a8b1; cursor: default;">
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"></circle><line x1="8" y1="7" x2="8" y2="11.5"></line><line x1="8" y1="4.5" x2="8" y2="4.75"></line></svg>
</div>
```

That is the whole reason the title is there. Spec 6.7 requires the same string
to be the control's accessible description; a static mock cannot open a popover,
so the title is how the mock demonstrates it, and a circle with no title is an
unfinished circle rather than a stylistic variant. Keep the HTML comment as well
wherever it also records a menu's contents.

## 5. ARIA

These are static design mockups. The decision, once:

- **In the artboards**, every icon-only control carries a `title` attribute and
  nothing else. The title is both the tooltip and the accessible name. There are
  no `aria-label`, `aria-hidden`, `aria-pressed`, `role` or `aria-expanded`
  attributes on any of the 39 files.
- **In production**, spec 6.8 point 1 still holds in full: an `aria-label` equal
  to the tooltip text with the key chip removed, `aria-hidden` on the glyph, and
  `aria-pressed` on a toggle. That is a build requirement recorded here, in
  VOCAB section 10 and in spec 6.8, not something the mocks draw.

The consequence is that TableJoin's 18 `aria-label`, 25 `aria-hidden` and 1
`aria-pressed` come out, along with CategoryTable's one stray `aria-hidden`, so
the set is consistent and a missing name reads as a missing `title` rather than
as a board that opted out. APPLIED.

## 6. Residual one-off fixes, keyed to artboard

Mechanical work already done is listed in section 7. What is left needs a human
decision about what a control does, so it is listed per board.

- **S01, 32 boards.** 227 icon-only controls still carry no `title`. Paste the
  section 1 titles onto the shell cluster (inspector toggle, compare, share,
  close, undo, redo, the zoom cluster) on every board except the seven
  Data/Import boards that already have them, then `title="Pin as A"` on the
  HistoryPopover and CategoryTable inspector pins -- this row said `Pin`, and
  section 10.2 supersedes it -- and `title="More"` on the
  eight untitled section-header overflows (ExplorePanel, ExplorerLargeGraph,
  ExplorerLoading, IpadPanel, CategoryTable, ExploreNotesList, StyleDiverging,
  FilterBuilderExpert).
- **S03.** Dim the contiguous unshipped runs to the section 3 form:
  ExplorePanel (the 8-chip selection-action block), Main (the 4-run
  Select all visible / Select / Filter builder / Saved filters, which sits in
  the same panel as a correctly formed group), ExploreNotesList,
  HistoryPopover, MultiSelection, SettingsPerformance (runs of 3). Correct
  HistoryPopover item 13 in ARTBOARD-CHANGES-1.5.md, which orders the per-row
  form.
- **S07.** Copy each explanation out of its HTML comment into its circle's
  `title` on the 15 bare-circle boards: SettingsPerformance (22 circles),
  ImportOptions (8), TableJoin (5), ImportAddToGraph (4), CompareSplit (2),
  ContextMenu (2), FilterBuilderExpert (2), HistoryPopover (2),
  SettingsShortcuts (2), and one each on AnalyzeSweep, ExploreNotesList,
  ShortcutsDialog, StyleDiverging, Settings, ImportRecognised.
- **S08.** Use the InspectorGenomics percentile sentence
  (`Percentile compares this node with every other node: 98th percentile means
  it scores above 98 per cent of them.`) on ExplorerExpert and IpadInspector
  too, and leave the reported half inline beside the value. In MultiSelection
  drop the leading `A: acct-4471.` from the card popover.
- **S10, pencil.** ExploreNotesList, ExplorerNotes, IpadInspector, StylePanel
  keep `Edit`; MultiSelection `Rename` and StyleDiverging `Rename layer` become
  `Edit` and `Edit layer`; SettingsShortcuts `Rebind` becomes `Edit binding`.
- **S10, eye.** StyleDiverging's `Hide layer` becomes `Show on canvas`.
  FilterBuilderExpert's `Disable this rule` is not visibility at all: give the
  rule row a text control or its own register entry, do not reuse the eye.
- **S11.** Cut four titles back to their verb and move the item list into the
  HTML comment beside the control: AnalyzePanel's history overflow (141
  characters) and its `Export top 20 (CSV), Export ranked list (CSV)`,
  InspectorGenomics's `More. Color by this, ...`, StylePanel's
  `Advanced: Stiffness (springCoefficient), ...`. Two more of the same shape:
  ImportAddToGraph's `Share. Export data or copy an image. NDEx upload comes
  later` and CompareSplit's nine-item row overflow. The nine `Run all (N)`
  titles on AnalyzePanel, IpadPanel and ExplorerAfterCard become `More`, with
  the count moving into the comment.
- **S12, Compare against the inspector toggle.** The two glyphs differ by a 2px
  divider offset and sit next to each other. Redraw Compare as two separate
  panes -- `<rect x="2" y="2.5" width="5.5" height="11" rx="1.5"></rect><rect x="8.5" y="2.5" width="5.5" height="11" rx="1.5"></rect>` --
  on all 39 boards, and record it in VOCAB section 5. Not applied by script
  because it is a new drawing, not a majority swap.
- **S13, HistoryPopover.** Delete the `Cmd+Z` and `Shift+Cmd+Z` chips from the
  History header row; the bindings belong in the Undo and Redo titles, which
  section 1 already fixes.
- **S14.** Delete the `Isolated nodes 0` row from AnalyzePanel's All statistics
  block. In ContextMenu replace the `Key attributes` sub-header with the 1px
  `#374047` hairline InspectorGenomics uses, and extend ContextMenu item 4.
- **S16.** ExplorerLargeGraph's warning still says `run the sampled version`;
  `sampled` is a retired cost-class word, so reword to
  `run the approximate version`. IpadPanel draws 15 open card parameters at
  `#2a3035` on a `#2a3035` card: give the field `#22272c` inside a card and add
  the rule to the VOCAB Compact select and Card snippets.
- **New, DataTableDrawer.** The control titled `Style selection` was drawn with
  a drifted diagonal path. It is a paintbrush, not a pushpin: SWEEP-1.5 S05
  counts it among the five diagonal pins, which is wrong. It has been corrected
  to the register paintbrush, not to the pin. APPLIED.
- **New, Welcome.** Four rail items carry the bare title `Load data first` with
  no activity name. They need `Explore. Load data first` and its siblings, in
  rail order.
- **New, ExplorePanel.** The gear's title read `More Explore actions. Everything
  here opens a dialog`; `Opens a dialog` is retired by VOCAB 10. Cut to
  `More Explore actions`. APPLIED.

## 7. What the normalization script applied

`tmp/register/normalize.cjs`, run once over all 39 files:

1. Layout chip: visible `(ngraph)` removed from the chip text on 13 boards;
   every chip's `title` set to `Force directed (ngraph) - settled`, including
   the 12 boards that had no chip title at all, so no board loses the technical
   name; the four comment variants of the other chip states de-`(ngraph)`ed.
2. Majority glyph swaps, listed in section 1: overflow dots, pushpin,
   paintbrush, list view, card view, locate, delete, filter, bookmark, play,
   step forward, select all visible.
3. Info circle popover geometry on ExplorePanel, ImportOptions and
   ImportRecognised; CommandPalette was already inside the one allowed
   horizontal flip.
4. All ARIA attributes removed from TableJoin and CategoryTable.
5. Whole-value title standardizations: close, close panel, toggle inspector,
   compare, share, export, undo, redo, zoom in, zoom to fit, zoom to selection,
   views, help, AI, settings, recompute.

It did not add a `title` to any control other than the layout chip, whose one
string this document fixes.

## 8. Glyphs that serve more than one verb

The closed list. A glyph is here only because the two verbs never appear in the
same cluster, so position and neighbours tell them apart, and because the titles
differ. Anything not on this list that shares a drawing is drift.

| Glyph | Verbs it serves | Titles | Why it reads |
|---|---|---|---|
| play triangle `<polygon points="5,3 13,8 5,13"></polygon>` | run the time transport; run the layout transport; mark an unrun metric | `Play (Space)` on the time slider (TimeSlider, DataTableDrawer); `Run the layout (Space)` on the layout run row (StylePanel, StyleDiverging); no title on the 12px marker in a Style attribute list, whose row carries its own sentence | the time transport sits on the slider under the canvas, the layout transport sits inside the Style panel's Layouts section, and the marker sits in a list of metric names. The three never share a row |
| step forward `<polygon points="4,3.5 10,8 4,12.5"></polygon><line x1="12" y1="3.5" x2="12" y2="12.5"></line>` | step the time transport; step the layout transport | `Step forward 7 days (.)`, unit-aware; `Step the layout once` | each sits beside its own play, so the transport it belongs to is the control next to it |
| pushpin `<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5" x2="8" y2="13.5"></line>` | pin a subject as a comparison anchor; pin nodes in place for the layout; pin a pop-out open | `Pin as A` in an inspector or panel title row; `Pin selected` and `Unpin all` on the layout run row; `Pin this open` in a pop-out header | the anchor sits in a 36px title row beside Copy reading and the inspector toggle; the layout pins sit on the Style panel's run row beside Run the layout, Step, Settle and Recompute; the pop-out pin sits in a floating 32px header (6.11) whose only other control is the close X, so the pair reads as keep-open against dismiss, and it is drawn that way on Main, GroupProfilePopout, ValidationPopout, FilterBuilderExpert, MultiSelection and TimeSlider. The three never share a row, and no title is a bare `Pin` (section 10.2) |
| close X `<line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line>` | close an overlay; close the panel; hide the suggestions strip; clear a binding | `Close (Esc)`; `Close the panel (Cmd+B)`; `Hide suggestions`; `Clear` | the first three sit in the top right of the thing they dismiss, at three different scales of container; `Clear` sits inline at the trailing edge of the select it empties, never in a header |
| plus `<line x1="8" y1="3" x2="8" y2="13"></line><line x1="3" y1="8" x2="13" y2="8"></line>` | add a style layer to the layer list; save the current thing as a new entry in a library list, in the per-kind forms of 6.3 | `Add a style layer` on the Layers header; `Save as style...` on the Styles library header, and its siblings on the other kinds' headers (`Save as recipe...`, `Save as filter...`, `Save as formula...`, `Save as report...`, `Save selection as set...`) | this is the one reuse whose two verbs share a board: StyleLibrary draws both headers, eight rows apart. They still never share a cluster -- each plus sits at the trailing edge of its own 32px section header, and that header names the list the plus adds to, so the plus reads as "add an entry to this list" and the list underneath says which list. The titles differ and neither is a bare `Add`. On a selection action row, where no list sits underneath, the save verb keeps the bookmark instead, which is section 10.6's accepted split and the reason 1.6's no-save-glyph rule is not breached |

The pair the list does not cover, and the one thing still to settle: `Toggle
inspector` carries two drawings across the 39 boards. That is the inverse defect
-- one verb, two glyphs -- and it is left as it stands until section 6's S12
redraw of Compare lands, because the two are resolved together.

## 9. Verification pass after 1.5, applied

Twelve residual items were re-read against this register; eight were accepted as
variation and four groups were corrected.

- **AiPanel.** The blue send button was untitled: `title="Send (Enter)"`.
- **StylePanel.** The 12px X that empties the Shape binding was untitled:
  `title="Clear"`, and it is listed in section 8.
- **DataTableDrawer.** The `Select neighbors (Shift+E)` row drew the share
  glyph; it now draws the section 1.3 select-neighbors glyph. The
  `Expand neighbors of all (E)` row drew the add plus; the verb has no glyph, so
  the row is now text with an empty leading slot (section 1.6).
- **TableJoin.** The `List of text` type chip drew the list-view glyph; the chip
  is now its words alone (section 1.6).
- **MultiSelection.** `Select matching filter` became
  `Select nodes matching the filter`, so the funnel names its object rather than
  the verb. `Save as set` became `Save as set...`, matching section 1.2's
  bookmark rule and the DataTableDrawer and FilterBuilderExpert rows.
- **Glyph drift.** `Clear selection (Esc)` on FilterBuilderExpert drew a plain
  close X and now draws the section 1.3 dashed rectangle with an X.
  `Show in table (Shift+T)` on MultiSelection drew a drifted table and now draws
  the section 1.3 path, which DataTableDrawer already had.
- **SettingsPerformance.** The info circle sentence
  `Sampled centrality above the threshold; top ranks are reliable.` used the
  retired cost-class word; it now reads `Approximate centrality above the
  threshold; top ranks are reliable.`, matching ExplorerLargeGraph's
  `run the approximate version`.
- **Transport.** The layout run row on StylePanel and StyleDiverging read `Play`
  and `Step`; it now reads `Run the layout (Space)` and `Step the layout once`.
  The time transport keeps `Play (Space)` and `Step forward 7 days (.)`.

Accepted as variation, deliberately not changed: the `Hide suggestions` title
on the Insights strip X, the two drawings behind `Toggle inspector`, the caret
size variance, and the one untitled info circle on ImportAddToGraph whose
sentence is already set beside it in visible copy. The `Pin` / `Pin as A` split
was on that list too, and has since been settled: see section 10.2.

## 10. Verification pass after COMPACTION-1.6, applied

The 1.6 pass rebuilt every board on the ten row types and cut the activity
panel and inspector columns by 42 per cent. The verification that followed it
found ten breaches of the floor (spec 6.10, COMPACTION-1.6 section 4), two
title verbs that had drifted across the set, and two mechanical defects. The
set is now 40 boards, not 39: AnalyzePicker joined it when Decision A moved the
Analyze catalogue off AnalyzePanel. Every count below is out of 40.

The two settled strings are the substance of this section. A drafter needs
1.2 and 8 above to agree with them, and they now do.

### 10.1 The title-row copy button is `Copy reading`, everywhere

Before: `Copy reading` on 18 boards, `Copy the graph summary` on 8, and a bare
`Copy` on CategoryTable. 27 boards draw the control; 22 of the 27 drew a title
that was wrong or vague.

Settled on **`Copy reading`**. The control sits in a 36px inspector or panel
title row and copies whatever reading that surface is currently showing -- a
node, an edge, a multi-selection, a result card, or the graph summary when
nothing is selected. `Copy the graph summary` is true only in the last of those
five states, so on the boards that carried it the title named the wrong object:
CategoryTable's surface is a category result, TableJoin's is a join preview,
SettingsShortcuts' is a shortcut list. `Copy reading` is also the name every
board's own menu comment already gives the first item of that control's menu
(`Copy reading / Copy as TSV / Copy methods text`), so the tooltip and the menu
now agree.

Applied: `title="Copy the graph summary"` -> `title="Copy reading"` on
DataPanelLoaded, ExploreNotesList, ExplorerLargeGraph, ExplorerLoading,
SettingsPerformance, SettingsShortcuts, ShortcutsDialog and TableJoin; and
CategoryTable's title-row `title="Copy"` -> `title="Copy reading"`. Two HTML
comments that named the old string were corrected with it (DataPanelLoaded,
ExplorerLoading). `Copy the graph summary` now appears nowhere in the set.

Unchanged, and deliberately: a copy control that sits on a row rather than in a
title row keeps its object -- `Copy id`, `Copy ids`, `Copy value`,
`Copy all attributes`, `Copy node ids`, `Copy member ids`, `Copy list`,
`Copy as TSV`, `Copy as commands`, `Copy id (account id)`. A bare `Copy` in a
result-card or attribute-row action cluster (CategoryTable's group card,
CompareSplit, ExplorerExpert, ExplorerLargeGraph, HistoryPopover,
InspectorGenomics, IpadInspector) also stays bare: section 1.2's base form
governs those, and none of them is the title-row control.

### 10.2 The title-row pin is `Pin as A`, everywhere; the layout pin keeps its own words

Before: `Pin as A` on 7 boards, a bare `Pin` on 4, and one each of
`Pin this selection`, `Pin this selection as a card`, `Pin this card` and
`Pin selection` -- six strings for one control across 15 boards.

Settled on **`Pin as A`** for the control in an inspector or panel title row.
Spec 5.4 defines that control once and defines it as an anchor: "a pin icon
appears whenever a node, edge, selection or result is shown. Pinning freezes a
copy of the current content as card A above the live content." Every title-row
pin in the set does that, so the anchor form is not a special case for compare
surfaces -- it is the verb. Naming the slot in the title is what tells a reader
that a second thing will be compared against this one, which a bare `Pin` never
says. Section 8's reuse note is amended to match: the pushpin's two verbs are
the comparison anchor and the layout's node pin, not "pin" and "pin as A".

The active state does not rename the control. MultiSelection draws its pin
already engaged, with card A pinned above the live content, and the title stays
`Pin as A` -- the same rule that keeps `Show on canvas` from becoming `Hide`.

Applied: `title="Pin as A"` on AiPanel, AnalyzeSweep, CategoryTable,
ExplorePanel, FilterBuilderExpert, HistoryPopover, IpadInspector and
MultiSelection, joining the 7 boards that already had it. Section 6's S01 row,
which ordered `title="Pin"` on the HistoryPopover and CategoryTable pins, is
superseded.

The second pushpin verb is untouched and stays distinct, which is what
section 8 licenses. StylePanel and StyleDiverging draw the layout run row --
`Run the layout (Space)`, `Step the layout once`, `Settle`, `Recompute`, then
`Pin selected` and `Unpin all`. Those two pin nodes in place so the force
layout will not move them; they name their object, they sit in a transport
cluster rather than a title row, and they are the reason the bare string `Pin`
is now used nowhere in the set. Two verbs, two titles, one drawing, context
apart -- the condition section 8 sets.

### 10.3 `px` is never written, in visible copy or in a title

Rule 5 of COMPACTION-1.6 makes `px` implied. SettingsPerformance wrote it out
twice: in the visible Rules-in-force line and in the status bar Performance
chip's title, both reading `1 px edges hidden until zoomed`. Both now read
**`thin edges hidden until zoomed`**, which keeps the departure (edges are
hidden until you zoom in) and drops the unit that the rule bans. `1px` would
have been the same defect spelled tighter.

Two chip titles elsewhere carried the same slip and were corrected with it, so
that the rule holds set-wide rather than on one board: ExplorerLoading's
`uniform node size, 1 px edges, hover and tooltips off` and IpadInspector's
`note markers clustered, edges 1 px, positions from file` both now say
`thin edges`. After this, no visible string and no `title` in the 40 boards
contains `px`.

`N px` still appears inside HTML comments, where drafters record geometry
("the drawer docks the bottom 260 px"). That is drafting notation about the
mockup, not interface copy, and it stays.

### 10.4 ExplorerExpert: no content outside its own frame

ExplorerExpert was the only board in the set with a laid-out box below its own
artboard: the Analyze panel's RT-8 History header and its `5 runs today` count
sat at y 912 to 945 on a 900px board. The panel's scroll region clips at y 835,
so the row could not be seen; it was still counted in the board's word total,
which is the one thing a word count must never do.

The History block was removed rather than something visible being cut. Nothing
that could be read was lost: the row was already below the clip. History stays
reachable from the top bar's undo caret, which carries `title="History"`, and
HistoryPopover.dc.html draws the surface open; AnalyzeSweep and AnalyzePicker
draw no History section in the Analyze panel either, so the omission has
precedent. The verification had suggested cutting the Find a path card's fourth
step or the Groups card's modularity row instead; both are floor content -- the
fourth step is the path's destination and modularity is the result -- so
neither was touched.

Two whitespace changes finish it: the scroll region's gap goes 6px to 4px and
its top padding 8px to 4px, which lifts the last card's box to y 896, inside
the frame. 4px gaps are already in use on two other panel scroll regions, so
this is not a new value. The four cards still run past the bottom of the region
by design (about 790px of content in a 727px window); the region now carries
the same 32px scroll-edge fade ExplorerLargeGraph uses, so a half-drawn line at
the clip reads as more content below rather than as a broken board, and the
drawn scrollbar thumb was resized to match the new content height.

### 10.5 The ten floor breaches, restored and verified

All ten were put back before this pass closed and were re-checked here by
rendering each board and reading the visible text out of the DOM, not by
grepping the source. Each is on screen, in words:

1. StylePanel, StyleDiverging -- the layout run's scope. `Apply to: All visible`
   is drawn as an RT-3 hybrid on the run block, `Selection only` beside it in
   the dim ink with `. Coming` in its title. Floor 4.
2. StylePanel, StyleDiverging -- the five preset names.
   `Default / High contrast / Print / Colorblind safe / Presentation`, an RT-3
   word set on two rows under a live Presets header. Floor 6.
3. IpadInspector -- `Radial layout around this node` and its ring caption
   `3 rings; 11,900 nodes beyond collapsed`, both back on the board. Floor 2
   and 6. The caption's live string is now
   `3 rings hold 29,300; 11,900 collapsed`: adversarial round 2 (R2-M20) found
   11,900 sitting 45 px under an expansion warning that said 12,412, with
   nothing to reconcile the two, so the caption states what the rings hold as
   well as what they leave out -- 29,300 + 11,900 is the 41,200 the status bar
   carries, and the node's 12,412 neighbours are ring 1, inside the 29,300.
   Same row, same type, same one line; the restoration this item records
   stands.
4. IpadInspector -- `1 selected of 41,200 visible` in the status bar. The
   denominator is what makes the count mean anything. Floor 4.
5. TimeSlider -- the reading's type composition:
   `Showing 120 of 200 nodes: 58 of 96 accounts, 29 of 48 devices, 20 of 34
   phone numbers and 13 of 22 merchants, connected by 340 of 612 transactions.
   The largest of 3 parts holds 88%.` Floor 1.
6. DataTableDrawer -- the rank key `rank, 1 to 200 in each method` under the
   three metric columns, one key for three columns. Floor 5: a legend is not a
   hover.
7. PresentPanel -- the export-video record `10 s, Orbit once, WebM`. Floor 4.
8. PresentPanel -- `first 100 rows each` on the Data tables row, back out of
   the title and into the row. Floor 2.
9. StylePanel -- the match preview's named matches,
   `2 nodes: The_Vet, Mrs_Henderson`. Floor 6.
10. AnalyzeSweep -- the run record `Louvain, seed 42, max passes 20, all 200`,
    with `max passes 20` restored as the non-default parameter it is. Floor 3.

None of the ten came back as a label above a field. Each was restored inside
the row type that already holds it -- RT-3 for the scope and the presets, RT-6
for the preset names and the matched ids, RT-10 for the readings, the departure
lines and the run records, the RT-6 column caption for the rank key -- which is
why the ten restorations cost about 40 words against the 3,100 the pass cut.

### 10.6 The set-save verb is `Save selection as set...`, everywhere

Before: `Save selection as set...` on five drawn controls -- ExplorePanel's
`Selection sets and actions` header, Main's disabled header plus (which appends
`. Select something first`), MultiSelection's library header plus, the same
board's inspector action row, and DataTableDrawer's selection action row -- and
`Save as set...` on one, ExplorePanel's own selection action row. One kind of
saved thing with two save verbs, and both of them on one board.

Settled on **`Save selection as set...`**, which is the string five of the six
already carried, and applied to the sixth. The reason is the one MultiSelection
already writes down for SAV-2: `selection` names the source of the set. A set is
made out of what is selected right now, so the verb that names the source is the
verb that says what will be in the thing you are about to name, which is floor
item 4 -- what a control will do, before it does it. `Save as set...` names only
the destination kind, which the section it sits under already names.

The two controls are the same verb reached two ways -- the library section's
resident plus (SAV-1's amendment to RT-7's hover split) and the selection action
row's bookmark -- so one string is what makes them legible as one verb.

**AMENDED: one verb, one drawing, and the drawing is the plus.** The paragraph
this replaces accepted one verb with two drawings, on the reasoning that a
header plus means "add to this list" and an action-row bookmark means "keep this
one". Section 9 named that shape as a defect and the exception did not survive
being drawn: on ExplorePanel and on MultiSelection both drawings sit on one
board, four sections apart, and a reader who has learned the plus on ten library
headers has no reason to read a bookmark two rows below one of them as the same
verb. Every other saved kind spends a plus on its own save verb -- `Save as
style...` on four boards, `Save as recipe...` on three, `Save as report...` on
one, `Save as view...` in the Views section -- so the set was eleven pluses
against three bookmarks for one family of verbs, and the set is now fourteen
pluses. Applied to the three action-row controls: ExplorePanel's bottom actions
row, MultiSelection's inspector Selection row and DataTableDrawer's inspector
Selection row. Spec 6.3's saved-thing-verbs paragraph, which had let the
bookmark keep the inline case, is amended with it. The bookmark keeps every use
where a text label carries the verb beside it -- ViewsMenu's `Save as view...`
row, FilterBuilderExpert's `Save as subgraph...` row, HistoryPopover's
saved-view entry -- so the glyph is not retired, only removed from icon-only
save controls.

The kind's own noun is unchanged: the library section is `Selection sets`, the
overflow is `Import set...` and `Export set (JSON)`, and the set row's own menu
is Replace / Union / Intersect / Subtract / Filter to set.

Applied: `title="Save as set..."` -> `title="Save selection as set..."` on
ExplorePanel's bottom action row. MultiSelection's comment citation of the
retired string was corrected with it. Section 1.2's bookmark row above now
carries the settled form, superseding the `Save as set...` it recorded, and
section 9's record of the 1.5 pass (`Save as set` became `Save as set...`) is
history rather than the live string. `Save as set...` now appears on no drawn
control in the set.

Two residuals this pass did not touch, both outside its two boards, both now
citing a string the register no longer carries:

- `ContextMenu.dc.html` line 407, in the 1.7 menu-variant register comment:
  "The MULTI-SELECTION menu: `Save as set` becomes `Save as set...`". The board
  draws the one-node menu, so nothing visible is wrong; the prescription for the
  undrawn multi-selection menu should read `Save selection as set...`.
- `VOCAB.md` line 708, in the multi-selection action list: `Save as set`.

The sibling verbs are untouched and keep their own objects, because each names a
different kind and none of them is made out of the selection in the same way:
`Save as subgraph...`, `Save as recipe`, `Save as filter...`, `Save as style...`.

## 11. Set-wide naming pass: the Schema door, the library kinds, and the stubs

Three consistency jobs, closed here. Section 1 is unchanged: nothing below adds
a glyph or a verb. Everything below is a string, and every string named here is
now the only string the set carries for that thing. The set is 48 boards.

### 11.1 The Schema section is a POP-6 door, on all 18 boards that draw it

Before: three treatments. Fourteen boards drew the door -- a closed
right-pointing chevron, the name, and a state mark. AnalyzePanel, AnalyzePicker
and PresentPanel drew the section OPEN, with node-type, edge-type, completeness
and type-pair rows inline and, on the first two, three verbs on the header.
CommandPalette drew the door with no state mark at all.

Settled on **the door**, which is the majority treatment and the only one 6.11
allows: Schema is a named pop-out in 6.11's worked examples ("pop-out, 480, from
the inspector row -- the type-pair matrix cannot be drawn honestly in a 256 px
band"), and RT-8's door clause fixes its shape. The door is exactly this, and
nothing else:

```html
<div style="flex: 0 0 auto; display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div title="Schema. 4 node types, 3 edge types" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 32px; cursor: pointer;">
    <div style="display: flex; align-items: center; gap: 4px; min-width: 0;">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
      </div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Schema</span>
    </div>
    <span style="flex: 0 0 auto; font-size: 11px; line-height: 1.2; color: #7a828e; white-space: nowrap;">4 node types, 3 edge types</span>
  </div>
</div>
```

Four clauses, and they are the whole rule.

1. **The chevron is the closed right-pointing form, permanently.** POP-13b. A
   door never renders an open chevron, because it never opens inline.
2. **The state mark is `N node types, M edge types`**, singular where the count
   is 1 (`1 node type, 1 edge type`, TableJoin). It is 11px `#7a828e`. The two
   abbreviations in the set -- `4 node, 3 edge` on ExploreNotesList and
   `4 node, 6 edge types` on ExplorerLargeGraph -- are gone, and so is the third,
   `3 node, 7 edge types`, which CommandPalette had adopted in 1.7 as a Rule 9
   abbreviation citing ExplorerLargeGraph as its precedent. The full string is
   151 px against the 156 that are free in the narrowest row that draws it, so
   the abbreviation bought nothing and cost the set one string per board. Node
   types and edge types are two counts of two different things and never add, so
   the mark is a pair and never a total.
3. **The row's own title is `Schema. <state mark>`**, the section's name, a full
   stop, then the mark -- the form DataPanelLoaded, InsightsWide, Main,
   SettingsShortcuts, TimeSlider, ValidationPopout and ViewsMenu already
   carried. Added to the eleven boards that had none, and ExplorerLargeGraph's
   `4 node types, 6 edge types` gained the missing `Schema. ` prefix.
   ExploreNotesList's mark had carried its own `title` on the span because the
   visible string was abbreviated; the span title is gone with the abbreviation.
4. **A door over lazily computed content reports the computation.**
   ExplorerLoading's mark is `measuring...` and its title `Schema. Measuring...`,
   which is 6.11's stub obligation, not an exception to it.

What went behind the door on the three converted boards: the node type names and
counts, the seven edge type names, the per-type completeness, the type-pair
matrix, and -- on AnalyzePanel and AnalyzePicker -- the three verbs
`Filter to type`, `Select all of type` and `Export schema JSON`. Every one of
them is drawn in the 480 pop-out on Main, which is where the set draws that
surface once. The verbs travelled with the list because 6.10's second clause
forbids separating a control from the thing it acts on; a Filter-to-type button
on a header whose type list is behind a door acts on nothing the reader can see.
Nothing was deleted: on AnalyzePanel and AnalyzePicker the open section was
96 px of ellipsised, `+4`-badged type lists, and the door names its own contents
in full.

PresentPanel, SavedItems, Settings, TimeSlider, InsightsWide and CommandPalette
keep an `Export schema JSON` glyph drawn on the door row. That is RT-7's hover
split drawn revealed, not a second treatment: the door's identity is clauses 1
to 4, and a header may carry actions under RT-8's own anatomy. InsightsWide's
copy of it had drifted to a bare `title="Export"`; it now reads
`Export schema JSON`, and the bare `Export` on that board's
`Most connected (Degree)` header -- a different control, exporting a ranked list
-- keeps section 1.1's base form.

### 11.2 The library kinds: one primary name, one second name, one place each

SavedItems draws all ten kinds side by side and is the surface that fixes the
pairs. It is authoritative because it is the only board where a reader sees
every kind at once, and because at 349 px per column it is the one surface with
room to render every pair inline.

| Primary (the kind noun) | Second name |
|---|---|
| Styles | Style templates |
| Filters | Saved filters |
| Subgraphs | Saved subgraphs |
| Sets | Selection sets |
| Views | View bookmarks |
| Patterns | Search patterns |
| Recipes | Analysis recipes |
| Formulas | Computed attributes |
| Reports | Report configurations |
| Mappings | Import mappings |

**The primary name is what a section header renders.** Five kinds had the second
name standing in for the primary somewhere in the set, and those are corrected:

- `Saved filters` -> `Filters` on ExplorePanel (the empty Coming section),
  Main (the unbuilt row in the Coming run) and TimeSlider (same).
- `Selection sets` -> `Sets` on Main and MultiSelection, and
  `Selection sets and actions` -> `Sets and actions` on ExplorePanel, where the
  section is a library plus the selection verbs and both halves are capability
  names (floor 6).
- `Saved reports` -> `Reports` on PresentPanel.
- `Import mappings` -> `Mappings` on DataPanelLoaded and TableJoin.
- `Saved recipes` -> `Recipes` on Welcome.
- `Bookmarks` -> `Views` on ExplorePanel, ExploreNotesList, Main and TimeSlider,
  the last kind whose second name was standing in for the primary. SavedItems
  fixes the pair as `Views` / `View bookmarks`, ViewsMenu's row is
  `Save as view...`, spec 5.3 Explore calls the section "a Views library section
  for bookmarks", and only the Explore panel still headed it `Bookmarks`.
  HistoryPopover's history entry went with them: `Bookmark "Ring core" saved` ->
  `View "Ring core" saved`, because a history line names the kind it saved. The
  word bookmark survives in the second name, in the glyph's register entry, and
  in `Bookmark this node`, which is a different verb on a different object.
- Styles was already primary everywhere; only its second name needed settling
  (below).

**Where the second name renders, per 6.3.** A library section header is the
first occurrence of that concept on its surface, so the pair binds there. Two
placements, and only two:

- **On a wide surface the pair renders inline**: the primary at 12px 500
  `#d5d7da`, the second name beside it at 11px `#7a828e`, baseline aligned,
  6px gap. SavedItems draws all ten this way, and Welcome now draws
  `Recipes  Analysis recipes` this way -- 6.3 names the Welcome screen as a
  surface where both names always render, and the block is 600 px wide.
- **In a 280 px activity panel or inspector the second name leads the section
  header's info circle**, and the header renders the primary alone. AMENDED: the
  first form of this clause put the second name in the header row's own `title`,
  which is neither of the two forms 6.3 allows. 6.3 names the info circle, and
  only the info circle, as the fallback where a pair will not fit at 280 px, and
  the reason is 6.4: a title has no visible affordance, so it does not exist on
  iPad, does not exist by keyboard, and does not exist for a reader who never
  hovers. The circle is a 12 px glyph in a 14 px box with the sentence in its own
  `title` (section 4), and the second name is the head of that sentence:
  `Style templates: saved in this browser on this computer. Export a file to
  move it.` -- the form TimeSlider's `Subgraph search: find every place a small
  pattern of nodes and edges repeats.` already used. Applied on twenty rows over
  sixteen boards: `Style templates` on StyleDiverging, StyleFromAnalysis,
  StyleLibrary and StylePanel; `Saved filters` on ExplorePanel,
  FilterBuilderExpert, MultiSelection and SettingsPerformance; `Selection sets`
  on ExplorePanel, Main and MultiSelection; `Report configurations` on
  PresentPanel; `Import mappings` on DataPanelLoaded and TableJoin;
  `Analysis recipes` on AnalyzePanel, HistoryPopover and IpadPanel;
  `Computed attributes` on DataPanelLoaded. Fourteen of the twenty already drew
  a circle carrying SAV-3's destination line and the name goes in front of it;
  six had none and now do.
- **Two rows take the third form, because neither of the two is available to
  them.** Main's `Filters` and TimeSlider's `Filters` are members of a dimmed
  unshipped run, and section 3 lets no row in a run carry an icon-only control,
  which an info circle is. They render the pair inline instead, the primary at
  12 px and the second name right-aligned at 11 px chrome ink -- exactly what
  Main's own `Find a pattern  Subgraph search` row in the same run already did.
  Main's `Views` row joins them.

StyleFromAnalysis had written its header title as `Styles (Style templates)`,
restating the visible name; the header now carries no title at all and its info
circle leads with `Style templates`, matching the other three Style boards. The
circle carries the half the row does not show, never both.

**One collision, settled by hand.** TimeSlider drew a live `Filters` section
holding the active time-window chip AND an unbuilt `Saved filters` row one run
below. Renaming the second to `Filters` would have put two sections of the same
name in one panel. The live section is now **`Active filters`** and the library
row is `Filters`. The 1.6 pass had dropped `Active` on the reasoning that "the
section names itself, so Active goes -- a section holding no filter would be
dim, which is how none active is said"; that reasoning assumes one Filters
section per surface, and this panel has two. `Active` costs one word and no
height, and it is the only board in the set that needs it.

### 11.3 Verbs and strings settled by the sweep

Each row below was one verb or one kind carrying two strings across boards.

| Settled string | What it replaced | Where |
|---|---|---|
| `Open file` | `Open File` | 12 primary buttons on DataPanelLoaded, ImportLargeFile, ImportOptions, ImportParseError, ImportRecognised, ValidationPopout and Welcome. Sentence case is the set's only case convention for a control label; no other Title Case label in the set has a lowercase twin |
| `Export CSV` | `Export (CSV)` | TableJoin's data-table link and its two comments. Section 1.1 fixes `Export CSV` as the object form and eleven boards already drew it; the parenthesised form belongs to `Export <kind> (JSON)`, which is 6.3's saved-thing verb and a different string |
| `Add attributes from a table... (Table join)` | `Add attributes from a table (Table join)`, `Add attributes from a table (table join)` | ImportAddToGraph, ImportRecognised (which keeps its `. Load data first`) and TableJoin. Table join is a 3b dialog (6.11), so 6.3's ellipsis belongs, and it sits on the plain half, before the pair |
| `Add a note on all 3 selected nodes (N)` | `Add a note to these 3 nodes (N)` | ExplorePanel, joining DataTableDrawer. Floor item 4 wants the scope a control will act on, and `all 3 selected` names it where `these 3` only points |
| `Add a case note` | `Add a case note (N)` | TableJoin, joining 16 boards. N adds a note on the selection; a case note is graph-level and takes no binding |
| `Around the selection` | `Around the selection...` | ExplorePanel, joining TimeSlider. The ellipsis means a dialog and the ego network is an Analyze card |
| `Zachary 1977` | `Zachary, 1977` | ImportLargeFile and ImportRecognised, joining ImportOptions, ImportParseError and Welcome |
| `risk_score: 0.87, high` | `risk_score 0.87, high` | ContextMenu, joining ExplorerNotes. An attribute reading in a title is `name: value`, which is the form `amount: number, 98% filled` and `indoorOutdoor: outdoor` already use |
| `Zoom in, zoom out`, `Toggle minimap, toggle legend` | the same two with a semicolon | SettingsShortcuts, joining ShortcutsDialog. The two boards draw one shortcut list |
| `N nodes, M edges, <date>` | `N nodes, M edges  --  <date>` | Welcome's two Recent files rows, joining the four Import boards. One separator for one meta line, and the doubled spaces went with it |
| `Export schema JSON` | `Export` | InsightsWide's Schema door export, per 11.1 |

### 11.4 Two findings left open, because each needs a rule that does not exist yet

Recorded here so the next pass does not rediscover them. Neither was changed.

**A. The Attributes door's state mark has five forms.** The Attributes section is
the Schema door's sibling and drifts worse than Schema did. Across 24 boards:
a bare total (`12` on DataPanelLoaded, ExplorerExpert, ExplorerNotes,
ImportAddToGraph and ValidationPopout, `11` on SavedItems and Settings, `9` on
ContextMenu and TableJoin, `34` on InspectorGenomics, `52` on IpadInspector);
a split (`7 node, 4 edge` on ExploreNotesList, `9 node, 5 edge` on
ExplorerLargeGraph, `6 node, 4 edge` on InsightsWide, `8 node, 3 edge` on
PresentPanel, SettingsShortcuts and ShortcutsDialog); a labelled split
(`Nodes 4, Edges 3` on TimeSlider); and no mark at all on AnalyzePanel,
AnalyzePicker, CommandPalette, CompareSplit, Main and ViewsMenu, which breaches
6.11's stub obligation. Settling the form is easy -- the bare total is the
majority at 11 boards of 18 that draw a mark, and attributes are one kind of
thing whose counts do add, which is the argument that keeps Schema's mark a pair
-- but the numbers themselves disagree underneath it: DataPanelLoaded's comment
derives `12` from 8 node plus 4 edge attributes and ExploreNotesList draws
`7 node, 4 edge` for the same cat dataset. One of the two is wrong about the
data. A form pass that carries the wrong numbers forward is worse than the
drift, so the counts must be reconciled first.

**B. The technical half of a 6.3 pair has no case rule, and the set is split.**
Nine concepts carry both a capitalized and a lowercase parenthetical:
`(Betweenness centrality)` x2 against `(betweenness centrality)` x6;
`(Communities, Louvain)` x5 against `(communities, Louvain)` x11;
`(Components)` x2 against `(components)` x2; `(Degree centrality)` x5 against
`(degree centrality)` x1; `(Degree)` x6 against `(degree)` x47;
`(Ego network)` x1 against `(ego network)` x1; `(Shortest path)` x1 against
`(shortest path)` x2; `(Subgraph search)` x2 against `(subgraph search)` x3;
`(Table join)` x4 against `(table join)` x1. Around them sit about forty more
that carry only one case and are therefore not drift: lowercase for short terms
and code identifiers (`(ngraph)` x41, `(padj)` x6, `(mean degree)` x5,
`(sugiyama)`, `(springLength)`), capitalized for multi-word method and surface
names (`(Closeness centrality)`, `(Node and edge table)`, `(Cleaning steps)`,
`(Style templates)`, `(Layout)`). Two candidate rules point opposite ways -- the
set's dominant practice says lowercase, spec 6.3's own pair table spells every
technical name with an initial capital -- and picking either one moves about
seventy strings, most of which are not currently drift. A third variant is
tangled into it: the pair renders sometimes as `Most connected (degree)` with
parentheses and sometimes as `Most connected  Degree centrality` with the second
half merely dimmed. 6.3 says the technical name is carried "in muted text or
parentheses" and does not choose. **Spec correction wanted**: 6.3 should say
which of muted-text and parentheses is the rendering, and what case the
technical half takes, before the artboards are swept. A second, smaller 6.3
correction goes with it: the section's fallback for a pair that will not fit at
280 px sends the technical name "to the info circle", but the info circle's
title is already spent on its one explanation sentence (6.7, and section 4
above), so the artboards put it in the row's own `title` instead -- which is the
home 6.3 already names for the repeat-occurrence case. 6.3 should name the row
title in the will-not-fit clause too.

## 12. Adversarial review 1.8: the action block, and the comparison marker

Two findings from the review by Figma designers, novice users and expert users.
Both were open conflicts between this register and the spec, and both are
settled here so the next drafter copies a rule rather than re-deriving one.

### 12.1 F-09. The pinned inspector action block is labelled rows; the spec wins

The conflict, stated plainly. Spec 6.8's five-homes table gives
`Footer or action bar` a maximum of **0** icons, and the paragraph under it
names the block: "The pinned inspector action block and dialog button rows take
no icon-only controls, because that is where the destination and destructive
actions live." Its never list covers "every selection and filter verb". Section
1.3 above grants a glyph to eleven of exactly those verbs, and the boards
followed section 1.3, so five or six bare glyphs sat in a block the spec says
takes none -- in an order that differed at every slot after the first:

| Board | Order drawn before this section |
|---|---|
| ExplorePanel | zoom, show in table, style, save as set, copy ids, More |
| MultiSelection | style, simulate removing, remove selected, zoom, filter, save as set, show in table, clear |
| FilterBuilderExpert | zoom, filter, show in table, style, invert, copy ids, clear, More |
| ExplorerExpert, InspectorGenomics | three or four of the same, in two more orders |

Position teaches a verb only when the position is fixed, and `Style selection`
was a text row on MultiSelection and a bare brush on ExplorePanel, so the set
was teaching two things at once.

**Settled: the spec wins, and the block becomes labelled rows on every board
that draws it.** Three clauses point one way and none points the other. 6.8's
homes table sets the maximum at 0. 6.8's never list covers the verbs by name.
And 6.9 Rule 2 question 8 -- the routing table the ten row types run on, which
governs -- routes a verb to "a text button when it is not [in the register], or
when 6.8's never list covers it". 6.8 also calls this block "exempt by
construction ... every one of their labels is a verb plus the object the user is
checking before the click", which is a description of a block of labelled rows,
not of a glyph strip. The register cannot outvote three clauses of the document
it serves.

**Section 1.3 is not retired and no glyph is deleted.** The eleven drawings keep
every home where an icon is legal and a word sits beside them or the home allows
icons: the canvas toolbar (6.8 "Toolbar icons are always visible"), section
headers (2 plus overflow), row hover slots (3), menu rows, and any control whose
text label is drawn next to the glyph. They lose one use: icon-only, in the
pinned inspector action block. Nothing else moves.

**The frozen order.** A board draws the members it has, in this sequence, and
never reflows the survivors into the gaps -- a hidden verb collapses its slot:

1. Zoom to selection (F)
2. Show in table (Shift+T)
3. Style selection
4. Filter to selection
5. Save selection as set...
6. Copy ids
7. Select neighbors (Shift+E)
8. Invert selection (I)
9. Clear selection (Esc)
10. Simulate removing
11. Remove selected
12. More

R2-M28. Slot 10 carried `(N)` in this list and in the 1.3 title table until the
second adversarial round, and both are corrected above. 5.6 owns every binding
and gives `N` to "Add a note to the selection", which eleven artboards draw;
nothing in 5.6 binds simulate removing at all, so the register was teaching a
collision to every board that copied a title from it. The glyph, the position
and the words are unchanged -- only the parenthesis is gone. ContextMenu,
ExplorerExpert, ExplorePanel, CompareSplit and HistoryPopover draw the corrected
form; a board still writing `Simulate removing (N)` is drifted, not the register.

Look first, then change the view, then keep it, then take it away, then the
destructive pair, then the overflow. 6.8 point 3's "a delete icon is always last
in its cluster" is why 10 and 11 sit where they do, and it still holds when the
control is a word.

**Shape, and what it costs.** Two buttons to a row across the 256 px band
(each `flex: 1 1 0`, 4 px gap, 24 px high, radius 4, 11 px/500, a 1 px `#48525c`
outline, the lead verb tinted `#28364e` with a `#4a7ee8` border), a long label
taking the row alone with `More` right-aligned beside it as a borderless subtle
button. The unshipped run keeps its one dimmed row, its one `Coming` tag and its
one info circle (section 3): a circle carries an explanation, not a verb, so the
0-icon maximum does not reach it.

Against the compaction: on ExplorePanel this is 24 words and 56 px, in an
inspector column using 297 of its 800 px. It is not decoration. Floor item 4
wants what a control will do before it does it, and a brush beside a table glyph
does not say "restyle the three cats you have selected". COMPACTION-1.6 cut
3,100 words by changing the shape of rows, never by deleting the name of a verb.

The More menu still carries every verb in the block, shipped and unshipped, in
full text. That was the twin for a hidden label under 6.8 point 4; with the
labels resident it is now simply the overflow.

Applied to ExplorePanel. The five sibling boards -- MultiSelection,
FilterBuilderExpert, ExplorerExpert, InspectorGenomics and DataTableDrawer --
take the same shape and the same order.

### 12.2 F-20. The comparison marker sits on the value compared, never on the baseline

A direction arrow in a two-column statistics row belongs to the number that is
above or below the average, which is the Selection column. The Graph column is
the baseline the arrow is measured against and carries no marker, ever, in any
row, on any board.

ExplorePanel drew the up arrow inside the Graph column's span, immediately
before `2.9`, on the `Average links per node` row -- so the drawing asserted the
graph average was the elevated one, against the row's own title ("3.3 across the
selection, 2.9 across the graph") and against the section's info circle
("Arrows show above or below the graph average"). That is the row an analyst
quotes to say a cluster is denser than the network, inverted.

The marker is the 10 px arrow, 2 px before the value, inside the value's own
column: `display: inline-flex; align-items: center; justify-content: flex-end;
gap: 2px`, stroke `#4a7ee8`, up
`<line x1="8" y1="13" x2="8" y2="3"></line><polyline points="4,7 8,3 12,7"></polyline>`
and down the same path mirrored. MultiSelection, FilterBuilderExpert and
DataTableDrawer already draw it this way; ExplorePanel now matches them.


## 16. The inspector title row's collapse control (INSPECTOR-TITLE-1.9)

The inspector title row's trailing control collapses the inspector column to the
right. It is drawn on 39 boards with the **12px closed disclosure caret** and
titled `Toggle inspector (D)`. Section 1.1's `toggle inspector` row carries the
*rect* glyph, which is the top bar's drawing, so the drawing this row actually
uses had no register entry. It has one now, above.

    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>

One verb, two positions, one binding, and section 8's condition is met because
context tells them apart:

- The **top bar's rect** is the switch. It says whether the inspector is shown
  and is drawn active (`background: #28364e; color: #4a7ee8`) when it is.
- The **title row's right-pointing caret** is the surface's own collapse
  affordance and only ever appears inside the thing it collapses -- the same
  relationship the rail and the activity panel's `Close the panel (Cmd+B)`
  already have.

Both carry `Toggle inspector (D)`, because 5.6 binds D to one verb and 6.8
requires the binding in an icon-only control's tooltip. Whether the title-row
control should read `Close the inspector (D)` instead, matching the activity
panel, is left open: it is a naming question for VOCAB, and no board is changed
by this entry.

On the iPad the inspector is an overlay (5.2), so IpadInspector takes section
1.1's `close (dialog, overlay, palette, strip)` X and `Close (Esc)` in this
slot instead. That is the one state difference in the slot, and it is unchanged
by this pass.

The other three verbs this row can draw were already registered and are
unchanged: `Copy reading` (1.2 copy, 10.1), `Pin as A` (1.2 pin, 10.2) and
`Close (Esc)` (1.1 close). The row's full inventory, order and state gates live
in INSPECTOR-TITLE-1.9.md.

## 17. The field glyphs enter the register (VOCAB 11 and 15.1)

VOCAB section 11 has said since the 1.6 compaction that its field glyphs "are
additions to the closed register and must be copied from `REGISTER-1.5.md` once
appended there". They were never appended. VOCAB 15.1 then drew one more -- four
chevrons pointing inward at a centre dot, for the layout `Parameters` block's
`Pull to center` field -- and declared it owed on the same terms rather than
adding it. This section pays all of it. Section 1.7 above is the table; what
follows is why each row is admitted, which is the argument the rest of section 1
runs on.

Section 1.1 to 1.6 are unchanged. No verb gains a glyph here, no verb loses one,
no title in sections 1 to 16 changes, and no artboard is changed by this section.

### 17.1 What was missing: the whole table, and one drawing VOCAB does not list

Checked against this file before the append: **none of the eight rows in VOCAB
section 11's field-glyph table was in the register.** Not one of the eight paths
appears anywhere in this document, and the words "field glyph" appeared nowhere
in it either. The debt was never the one new glyph. It was the whole table,
three revisions old, and with it Rule 4's first test, which had been circular
since 1.6: a field glyph is legal only if it is in `REGISTER-1.5.md`, and none
of them was.

A ninth drawing came out of the check. VOCAB's table has eight rows -- size
smallest, width, opacity, attribute binding, the three scale curves, colour --
but its own RT-1 pair snippet draws a **second size glyph** for the
`Largest node size` field,
`<circle cx="4.5" cy="11.5" r="1.75"></circle><circle cx="10" cy="6" r="5"></circle>`,
which is in no row. It is drawn, it is distinct from the smallest form in both
circles, and a table that omits a drawing it uses in its own worked example is
not the closed list it claims to be. It is registered above as `size, largest`,
and VOCAB section 11's table should gain the row.

What the set draws today. Counts are per board rather than as a fraction of the
set, because `design/ui/mockups/artboards` now holds 62 `.dc.html` files against
section 11's stated 48:

| Entry | Drawn on |
|---|---|
| attribute binding | 17 fields over 6 boards: StyleLibrary 6, StylePanel 5, StyleDiverging 2, RampPopout 2, StyleFromAnalysis 1, TimeSlider 1 |
| width | 3 fields over 3 boards: `Outline width` on StyleLibrary and StylePanel, `Window size: 30 days` on TimeSlider |
| scale, square root | 2: StyleLibrary, StylePanel |
| scale, linear | 1: RampPopout, `Scale: linear` |
| scale, log | 1: StyleDiverging, `-log10 scale` |
| colour | the swatch, across the Style boards |
| size smallest, size largest, opacity | nowhere yet. VOCAB draws all three, and 15.1's grid needs them the moment a Size or an Effects section is drawn open |
| pull to centre | nowhere yet. VOCAB 15.1 is its first drawing |

Being undrawn is not a bar. Section 1.3 registered `Merge selected nodes...`
before any board drew it, for the reason this register exists: so that the first
board to draw a thing copies it instead of inventing it.

### 17.2 Why they are admitted: Rule 4, both tests, one row at a time

COMPACTION-1.6 Rule 4 admits an in-field glyph only if **both** hold: (i) the
glyph is in this file, and (ii) the control is draggable, a field whose glyph
scrubs, or a verb, a button whose title names it. Test (i) is what this section
supplies, and it supplies nothing else -- a glyph is not admitted here because
it is already drawn somewhere. Test (ii) holds for every row: a field slot
scrubs at `cursor: ew-resize`, and the two rows that can sit in an RT-4 trailing
slot rather than a field, the scale curves, are buttons that open the RT-3 group
of three and carry their own title.

Rule 4's veto is the half that decides the table: "A concept ... never becomes a
glyph, because an arbitrary symbol is learnable only by someone who already
knows the concept." VOCAB spends that veto on granularity, resolution, damping
and tolerance, and keeps all four as words. Every row admitted above draws what
the value **does to the picture**, not what the value is called:

- **size, smallest** and **size, largest** -- two circles, the small one lit in
  the first and the large one in the second. A reader sees which end of the
  range the field sets.
- **width** -- a span between two arrowheads. It is an extent, and it is the one
  row that serves more than one word (17.3).
- **opacity** -- a circle with half its ink gone, which is what the number does
  to the thing.
- **attribute binding** -- a tag. It is the only row that draws a mechanism
  rather than an effect, and it earns that because it is the drawing the whole
  `Fixed | By attribute` segmented control collapsed into under Rule 6: hollow
  is a literal, filled is data, and the two states are read against each other
  on the same board, five times over on StylePanel.
- **the three scale curves** -- the transform's own shape, drawn. A reader who
  does not know the words "square root" still sees one curve bend early, one run
  straight and one bend late.
- **colour** -- the swatch is the value. There is no symbol to learn.

None of these is a concept in the sense the veto means. Betweenness has no
picture, and neither has damping; a half-filled circle is a picture of half.

The weakest drawing in the table is **scale, linear**, a bare diagonal line and
the least distinctive mark in this register. It is admitted because it is never
read alone -- it is one of three curves in an RT-3 group, or the slot glyph of a
field whose value reads `linear` -- and because retiring it would leave the other
two curves with no third member to be read against. The collision it does have
is 17.5 B, and it is not with another field glyph.

### 17.3 The one reuse: `width` is every extent

Section 8 is the closed list of glyphs serving more than one **verb**, and it is
unchanged: nothing in 1.7 is a verb, so nothing in 1.7 enters it. The
field-glyph analogue is one row, and this is it.

The width glyph serves three slot labels: `Outline width` on StyleLibrary and
StylePanel, `Window size` on TimeSlider, and `Edge length` from VOCAB 15.1. That
is section 8's condition, met the same way it is met there. The drawing means
one thing -- an extent between two ends -- and the three never share a row: an
outline width sits in a Style effects field, a window size sits on the time
slider, an edge length sits in the layout `Parameters` block. Each field's title
carries the extent's own word, and no title is a bare `Width`. VOCAB 15.1
licenses the third use in exactly these terms and cites the second as its
precedent.

The attribute-binding glyph looks like a second reuse and is not one. It says
one thing -- this property is bound to an attribute -- and the title names which
property: `Size by attribute`, `Color by attribute`, `Outline by attribute`,
`Edge weight attribute`. A property name is the object of one concept, not a
second concept, the same way `Delete layer` and `Delete set` are one verb in
section 1.2.

### 17.4 `Pull to center` is admitted, and here is what it is not

The new row. VOCAB 15.1 draws it in the layout `Parameters` block, in the left
half of an RT-1 pair, on the `gravity` parameter whose plain name VOCAB section 9
fixes as `Pull to center`.

**Why a glyph at all: the word does not fit.** The half-field is 108px. After
the 16px slot, 8px of padding at each edge and the 4px gap, 76px of text room is
left, and `Pull to center` plus its value is 98px -- StylePanel's own R2-M27 note
measures it. The alternatives are all worse. Abbreviating repeats the mistake
11.1 named, where an abbreviation "bought nothing and cost the set one string per
board". Giving the row the full 224px body span spends a whole 32px row on a
parameter sitting at its shipped default. Dropping the row breaks D3, which is
the decision that put these three rows back on the panel. So the field is 108px,
and a 108px field labels itself with a glyph or not at all.

**Rule 4, both tests.** (i) is satisfied by section 1.7 above and by nothing
else -- this entry is what makes every board that draws the field legal. (ii)
holds on the first of its two branches: `gravity` is a continuous number, the
field is draggable, and the slot is the scrub handle at `cursor: ew-resize`,
which is the case Rule 4 names first. The glyph is not a verb and nothing
happens when it is clicked, so the second branch is not needed and is not
claimed.

**The veto does not reach it.** Pull to center is a spatial relation, not a
rate: every node moves toward one point. Four chevrons whose apexes point at a
centre dot is a picture of that motion, which is exactly why it is admissible
where `Damping` and `Granularity` are not -- a rate has no picture, and VOCAB
keeps damping a word two rows away, behind the same gear.

**What it must not be confused with.** Three drawings in this register put marks
around a centre, and the new one is none of them:

- **`locate` (1.2)**,
  `<circle cx="8" cy="8" r="4.5"></circle><circle cx="8" cy="8" r="1.5"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2"></path>`.
  A crosshair: an **outer ring** around the dot, and four **straight ticks**
  standing outside that ring, pointing nowhere. It says "here is the thing, on
  the canvas". The new glyph has no ring at all, and its four marks are chevrons
  aimed at the dot. Ring or no ring is the tell and it survives 14px.
- **`zoom to fit` (1.1)**, four corner brackets on the **diagonals**, opening
  **outward**, with no centre dot. It says "make the frame hold everything" --
  the opposite motion, drawn in the opposite direction, with nothing in the
  middle.
- **`zoom to selection` (1.1)**, those same four corner brackets plus
  `<circle cx="8" cy="8" r="2"></circle>`. This is the closest thing in the
  register, because it too is four marks arranged around a centre. Two facts
  separate them: a bracket is a right angle sitting on a diagonal and opening
  away from the centre, a chevron is a V sitting on an orthogonal axis and
  closing on the centre; and the circle there is a hollow r=2 that reads as the
  selection, against an r=1.5 dot that reads as the point being pulled to.

Home settles whatever the drawing leaves. All three of those are verbs: a click
moves the camera or the selection, and each is drawn as an icon button in the
top bar or the canvas toolbar, never inside a field. The new glyph is only ever
drawn in a 16px field slot with its number beside it in the same 108px box, at
`cursor: ew-resize`, and it does nothing when clicked. That is section 8's own
test -- position and neighbours tell them apart -- satisfied without being
needed, since these are four different drawings rather than one reused.

One more adjacency, because 15.1 draws it. The **settings gear** sits 32px
above this field, in the same section's header, and it is also a dot inside
marks arranged radially. The gear is two concentric rings with eight straight
spokes; the new glyph has no ring, four marks, and they are chevrons. The pair
is legible as drawn, but a drafter who shortens the chevrons toward the dot
drifts toward the gear, so the four polylines keep VOCAB 15.1's coordinates
verbatim and are not "tidied".

**The title.** `Pull to center`, and where the field shows the number too, as it
does in 15.1, `Pull to center: -1.2`. Not `Gravity`, and not
`Pull to center (gravity)`: the field atom's rule is a title equal to **the word
the glyph replaced**, and the word the field would otherwise have carried is the
plain half. VOCAB section 9 makes `gravity` the technical half of that pair, and
where the pair is wanted it rides on the row or the section that has room for it,
under 6.3 -- whose open case question is 11.4 B and is not touched here.

### 17.5 Three findings the check turned up, and none is settled here

Recorded so the next pass does not rediscover them. Nothing below is admitted
above, and nothing below changes a board.

**A. The spelling is `center`, and VOCAB 15.1 writes `centre` inside a drawn
string.** VOCAB section 9's plain/technical table -- the naming authority for
this parameter -- reads `Pull to center | gravity`, and every other citation
follows it: SHELL-DELTAS-1.3 S5, ARTBOARD-CHANGES-1.5, three times in
ARTBOARD-CHANGES-1.8, and nine artboard comments -- five on StylePanel, three on
StyleLibrary, one on StyleFromAnalysis. The set's convention is sharper than a
majority. Drafting prose is British and drawn strings are American: `colour`
appears 130 times in the artboards and **all 130 are inside HTML comments, none
outside one**, while `color` appears in 21 drawn `title` attributes. `Pull to
centre` is that same British form, but in VOCAB 15.1 it sits inside a `title`
attribute, which makes it a drawn string in the wrong dialect. Two residuals, both in files this
register does not own:

- `VOCAB.md` section 15.1: the snippet's `title="Pull to centre: -1.2"`, and the
  two prose mentions above it, should read `center`.
- `SECTIONS-1.9.md` section 5.1: `**Pull to centre -1.2**` in the Resident line.

Section 1.7 carries `Pull to center`. A board that draws `centre` is drifted, and
none does yet.

**B. `Unpin all` draws a glyph that has no register entry, and the linear scale
is one of its strokes.** Checking the linear curve turned up
`<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5" x2="8" y2="13.5"></line><line x1="2.5" y1="13.5" x2="13.5" y2="2.5"></line>`
on StylePanel, StyleLibrary, StyleDiverging, StyleFromAnalysis and RampPopout,
titled `Unpin all`: the register pushpin with a strike through it. Section 1.2
lists `Unpin all` among the pushpin's titles, which says the drawing is the plain
pushpin, and five boards draw a struck one instead. That is one verb with two
drawings, the defect section 16 closed for the inspector title row's caret, and
it wants the same treatment -- register the struck pin or correct the five
boards. It also means the strike is the `scale, linear` glyph stroke for stroke,
so StylePanel and StyleLibrary each draw that line twice in two unrelated senses.
Neither use is wrong on its own, one being a whole glyph and the other one stroke
of a compound, but whoever moves either should know about the other.

**C. ExplorerExpert's size wedge is a third two-circle drawing.** ExplorerExpert
draws `<circle cx="4" cy="11.5" r="1.5"></circle><circle cx="10.5" cy="6.5" r="4"></circle>`
at 14px in an RT-7 left slot, titled
`Node size: Bridges, 0 to 0.41, square root scale`, directly under a comment
reading "Every glyph carries its register title". It matches neither registered
size form: the small circle is a third radius at a third position. Either it is
`size, smallest` mis-drawn, in which case the board copies 1.7's path, or it is a
fourth concept -- the size **channel**, rather than the smallest or the largest
value on it -- in which case it needs its own row and its own argument. It is not
settled here because the answer changes the title as well as the path, and this
section's remit is the field-glyph debt.

## 18. Two entries added after the register closed (2026-09-12)

The register is closed, so an addition is an event and is dated. Both of these
come from the product owner, through design 5.1 and 6.12 revision 1.11, and
both are already drawn in the build -- `toggle panel` in the top bar's glyph
table, `keep open` in `@graphty/compact-mantine`'s `UiGlyph` register, where it
is the first entry added since that module was transcribed. A register audit
that finds either drawing and not this section should read it as drift; with
this section it is an amendment.

**`toggle panel`, the second region switch.** 1.1 already registers `toggle
inspector` as a rect with its divider on the right edge. The panel's switch is
the exact mirror -- the same rect, the divider on the LEFT -- because the two
say the same thing about opposite sides of the canvas and the only fact that
separates them is which side the column is drawn on. They are always drawn as a
pair, panel then inspector, in the order the regions sit on screen. The title
takes the binding the panel header's X already carries, `Cmd+B` on an Apple
platform and `Ctrl+B` elsewhere, and it never renames itself when it is on
(section 10.2). This does not disturb the note under section 8 about `Toggle
inspector` carrying two drawings: the top bar's rect and the title row's caret
are still the pair that section leaves open, and this is a third verb, not a
third drawing of that one.

**`keep open`, a padlock, and why it is not the pushpin.** The activity panel
and the inspector each gained one latch control titled `Keep open`, which holds
its surface on screen against every close the shell performs on its own (design
6.12, "The latch"). Section 8 already assigns the pushpin three verbs and rules
that "the three never share a row"; one of those three is a keep-open, `Pin this
open` in a pop-out header. A fourth pushpin verb would have had to share a row
with `Pin as A` in the inspector's own title row, which is exactly what section
8 forbids and exactly what a reader could not tell apart. So the latch spends
one new drawing instead of one more reuse: a padlock at the register's 16px box
and 1.5 stroke, a body and a shackle, drawn at 14px in both title rows. One
verb, one word, one drawing, in two regions. The pushpin's three verbs and its
`never share a row` rule are unchanged.
