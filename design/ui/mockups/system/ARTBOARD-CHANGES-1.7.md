
## ImportOptions

File: `ImportOptions.dc.html`. State: Import options over the Empty shell, nothing loaded,
`fraud-ring-synthetic.csv`, 38 KB, one guessed type column. Dialog frame 720.

1. **Canvas toolbar (TB-1, TB-4, A1): nothing to draw here, one word to correct.** Region: the file
   comment, line 34. Current: `"No data loaded". No navigation cluster, minimap or legend (nothing is
   loaded yet).` New: `"No data loaded". No canvas toolbar, minimap or legend (nothing is loaded yet).`
   TB-1 deletes the 56 px left-edge cluster on all 36 boards that draw it and renames every occurrence
   of "navigation cluster"; this board draws the Welcome block on an empty canvas and has no cluster,
   so **do not add a toolbar** -- there is nothing to navigate. Collision resolved: TB-1's global swap
   does not fire on the three Empty-state Import boards. No VOCAB snippet.

2. **IMP-2: replace the freeform OPENS paragraph with the decision-table extract.** Region: file
   comment, lines 17-20 (`OPENS: a delimited text file was dropped on the Welcome drop zone. Reopens
   from any Change link ... command palette (new in 1.5).`). Delete all four lines and write:
   ```
   INPUTS: no graph loaded; format class delimited; header signature unknown; one guessed type column;
     size below both numbers; "Always show import options" off.
   CLAUSE: guessed column. Evaluated from the end, first match wins -- it beats "delimited file",
     which also matched. This board was mislabelled "delimited file" before 1.7.
   RENDERS: item 2 recognition banner no; item 3 picker no; item 6 Load defaults to Everything;
     no departure line.
   PRIMARY: Import.
   ```

3. **IMP-6: replace the copy-pasted seven-path reopen sentence with this state's four-line form.**
   Region: the same comment block, immediately after item 2's replacement. Write:
   ```
   IN: a delimited file dropped on the Welcome drop zone; one column's type was guessed.
   REOPENS AS: a mapping field on a Loaded data line -> that role's column header, its Role chip
     focused; the palette -> "Import options" at the dialog top, or "Change the column mapping"
     scrolled to the grid.
   OUT: Import -> Loaded, then the NAV-4 completion toast (already recorded below).
   CANCEL: Cancel, Escape and the title-row X are one action. Nothing is loaded, so Cancel abandons
     the file: the shell returns to Empty, the status bar reading line clears, and the file does not
     enter Recent -- a file the user declined is not a file they opened. A menu open inside the dialog
     takes Escape first.
   ```

4. **POP-3: record that this board is the drawn proof of the pop-out exception.** Region: file comment,
   after the REVISION 1.6 block. Add: `REVISION 1.7, POP-3: the Validation report becomes a 360 pop-out
   in the Data panel, but inside the Import options dialog the validation issues stay INLINE -- 6.11
   forbids a pop-out opening from inside a 3b dialog, and errors here gate the Import button. This
   board and ImportRecognised are the drawn proof; nothing on them collapses to a stub.` No change on
   screen.

5. **POP-11: record that the import policies were considered for a pop-out and refused.** Region: same
   comment block. Add: `REVISION 1.7, POP-11: the three applied policies stay exactly as drawn -- noun
   label, behaviour in the field, full sentence on the info circle. A control whose home is a dialog
   may not acquire a second home as a pop-out (6.4, one behaviour one home).` No change on screen.

6. **SAV-10: record that the remembered mapping now has a visible home.** Region: same comment block.
   Add: `REVISION 1.7, SAV-10: the footer line "Mapping is remembered for files with these columns."
   is unchanged, and is no longer the only trace -- the mapping this dialog creates becomes a named,
   renameable, exportable row in Data > Import mappings (drawn on DataPanelLoaded and TableJoin).`
   The footer note keeps its exact current wording; add no words to the dialog.

7. **IMP-1: restore the entry clause to the title row (label change).** Region: the dialog title row,
   line 410. Current: `<span style="font-size: 11px; line-height: 1.2; color: #7a828e; white-space:
   nowrap; overflow: hidden; text-overflow: ellipsis;">fraud-ring-synthetic.csv, 38 KB</span>`. New
   text, same span, same styles: `fraud-ring-synthetic.csv, 38 KB -- guessed column`. VOCAB: section 12
   "Import state banner", the title-row snippet at VOCAB.md lines 2604-2612, which is drawn for exactly
   this file and this clause -- copy it verbatim and keep this board's existing 40 px row height and
   `padding: 0 12px 0 16px`. The clause is protected by **floor item 6, names**, not by floor item 4,
   and Rule 8 may not delete it: "delimited file" is why the dialog opened, "98% confidence" 40 px below
   is what the parser found. Add a one-line comment beside the span recording that `guessed column`
   beat `delimited file` on the from-the-end tie-break.

8. **IMP-8: retitle the board in the file comment (label change, and it must land after item 7).**
   Region: file comment, lines 21-22. Current: `Canvas title for this stem: Import options -- delimited
   file, nothing loaded. canvas.json is shared and is not edited here.` New: `CANVAS TITLE: Import
   options -- guessed column.` Delete the "canvas.json is shared and is not edited here" hedge: 1.7
   makes one deliberate coordinated edit to canvas.json (eight new entries, the four Import retitles,
   group-2 annotation count 7 -> 9), so the hedge is now false. **Do not edit canvas.json from this
   file.** Ordering: IMP-8 must not land before IMP-1 -- if the tie-break correction is not applied
   first, this title reverts to "delimited file" and stops matching its own screen.

## ImportRecognised

File: `ImportRecognised.dc.html`. State: Import options over the Empty shell, nothing loaded,
`ovarian_de_string.tsv`, 212 KB, a recognised STRING export. Dialog frame 1120 (12 columns).

1. **IMP-4: the recognition banner leaves the interpretation row and becomes a full-width RT-7 run
   record.** Region: item 2's field group, lines 466-471 -- the banner currently sits as the last flex
   child of the `Format / Import as / Direction` row, 24 px tall, `flex: 1 1 auto`, inside a
   `#2a3035` box with a 1 px border. Delete it from that row entirely (Format, Import as and Direction
   stay where they are and simply stop being stretched). Insert a new row **directly beneath** that
   field group, spanning the dialog body width, using VOCAB.md lines 2623-2634 ("The recognition banner
   is the other half of the same decision") **verbatim**, with one adaptation: drop the snippet's
   `padding: 0 12px 0 20px`, because this dialog's body already pads 16. Measured at this dialog's
   1088 px body width the row is **28.00 px** tall. Its content, verbatim from the snippet:
   green check glyph; `Recognized a STRING export -- 12 columns mapped, combined_score as weight,
   1 saved filter installed`; a 24 px `Details` chevron; the text button `Map it myself`.
   The old nine-word string `Recognized a STRING export; columns mapped` and its bare `Change` link are
   deleted. Rationale to put in the adjacent comment: a recognition is an automatic edit to the user's
   mapping -- twelve column roles, the weight, the identifier system, a named saved filter -- and it is
   a **floor item 3 run record**, which no compaction may shrink to nine words; `Change` named no object.

2. **IMP-4, second half: record the reverse state, which is not drawn.** Region: a comment beside the
   new banner row. Write: `Pressing "Map it myself" clears every pre-assignment, leaves detection-only
   guesses, and flips this row to "STRING mapping cleared -- 4 columns guessed. Review" with "Use the
   STRING mapping" in place of "Map it myself". Reversible in both directions, no confirm, without
   leaving the dialog. Details holds the full per-column record.`

3. **IMP-4 x floor collision, resolved: delete the saved-filter line where it stands.** Region: lines
   756-763, the whole `Installed saved filter: High confidence (score >= 0.7)` block with its bookmark
   glyph, its `Coming` tag and its `title="Find it in Explore after import."`. Delete the block. The
   fact rises to the row that caused it (Rule 9), where it now reads `1 saved filter installed`.
   **The collision:** the 1.6 comment lists "the installed saved filter and its name" as floor kept in
   full, and the filter's own name is the user's data. **Resolution: the name moves behind `Details`,
   which is legal** -- precedence rule 2 of DECISIONS-1.7 says a door is not a deletion and a circle is,
   and IMP-4 puts the full per-column record behind exactly this chevron. Update the 1.6 floor list
   (line 69) to read `the recognition run record with its column count, weight column and saved-filter
   count; the filter's own name in the Details record`.

4. **IMP-5: delete the duplicate footer button.** Region: line 771, the footer's
   `Load a subset<Coming>` button. Delete the whole div. It duplicates the `Load` control four rows
   above it (lines 726-738, currently at `Everything`), and item 9's button list drops `Load a subset`.
   The footer then holds three slots: `Cancel` at the left, and `Import` as the primary. Update the
   comment on line 766 (`9. footer: Cancel left, Load a subset and Import right`) to
   `9. footer: Cancel left, Import right` and drop `Load a subset` from the floor list on line 71.

5. **Canvas toolbar (TB-1, TB-4, A1): nothing to draw here.** Region: the Welcome underlay behind the
   scrim. This board is the Empty state (deltas W1 to W8) and draws no navigation cluster, no minimap
   and no legend, so **no toolbar is drawn**. Add one line to the comment: `REVISION 1.7, TB-1: the
   navigation cluster is retired app-wide for the bottom-centre canvas toolbar; neither is drawn on
   this board, because nothing is loaded.`

6. **IMP-2: replace the freeform OPENS paragraph with the decision-table extract.** Region: file
   comment lines 18-21. Delete and write:
   ```
   INPUTS: no graph loaded; format class delimited; header signature matches a known export (STRING);
     nothing guessed -- roles were pre-assigned; size below both numbers; "Always show import
     options" off.
   CLAUSE: delimited file. Evaluated from the end, first match wins; nothing later in the list matched,
     because a recognised export leaves no guessed column.
   RENDERS: item 2 recognition banner YES; item 3 picker no; item 6 Load defaults to Everything;
     no departure line.
   PRIMARY: Import.
   ```

7. **IMP-6: replace the seven-path reopen sentence with this state's four-line form.** Region: same
   comment block. Write:
   ```
   IN: a delimited file dropped while nothing was loaded, whose column signature matched a known export.
   REOPENS AS: a mapping field on a Loaded data line -> that role's column header, its Role chip
     focused; the "Mapped as before" toast -> the grid, top; the palette -> "Import options".
   OUT: Import -> Loaded, with the recognition's mapping and its one saved filter applied.
   CANCEL: Cancel, Escape and the title-row X are one action. Nothing is loaded, so Cancel abandons the
     file: the shell returns to Empty, the status bar reading line clears, the file does not enter
     Recent, and the pre-assigned roles and the saved filter are discarded with it.
   ```

8. **POP-3: record the pop-out exception, as on ImportOptions.** Region: file comment. Add: `REVISION
   1.7, POP-3: validation issues inside the Import options dialog stay INLINE. 6.11 forbids a pop-out
   opening from inside a 3b dialog and errors here gate Import. On this board Rule 7c already keeps the
   Validation report section from rendering at all (nothing is loaded), and that stays true.` No change
   on screen.

9. **SAV-10: record that the remembered mapping now has a visible home.** Region: file comment. Add:
   `REVISION 1.7, SAV-10: the header signature this recognition matched becomes a named row in
   Data > Import mappings ("ovarian_de_string.tsv columns"), renameable, deletable and exportable --
   see DataPanelLoaded and TableJoin. Nothing on this board changes for it.`

10. **IMP-1 then IMP-8 (label changes, in this order).** (a) Title row, line 420. Current span text:
    `ovarian_de_string.tsv, 212 KB`. New: `ovarian_de_string.tsv, 212 KB -- delimited file`. Use VOCAB
    section 12 "Import state banner", title-row snippet at VOCAB.md lines 2604-2612; this board's span
    is 12 px where the snippet is 11 px -- **take the snippet's 11 px**, so the five Import boards agree.
    (b) File comment lines 22-23. Current: `CANVAS TITLE (recorded here only; canvas.json is not
    edited): Import options -- recognised export, nothing loaded.` New: `CANVAS TITLE: Import options --
    delimited file (recognised export).` Drop the "canvas.json is not edited" hedge; 1.7 makes that edit
    once, coordinated, and **not from this file**.

## ImportLargeFile

File: `ImportLargeFile.dc.html`. State: Import options over the Empty shell, nothing loaded,
`netflow-2026-q2.csv`, 3.2 GB, above the render ceiling. Dialog frame 720.

1. **IMP-5 (1): give the Everything option the same arithmetic Busiest nodes has.** Region: lines
   614-619, the one-line Everything radio row. Current: a 22 px flex row holding the radio, the word
   `Everything`, and one dimmed trailing sentence `Edges beyond 500,000 are hidden until zoomed in.`
   New: the same two-part block Busiest nodes uses at lines 621-644, minus the selected state --
   `<div style="display: flex; flex-direction: column; gap: 2px; padding: 2px 6px 5px; border-radius:
   4px; box-sizing: border-box;">` (no `#28364e` background, no `#4a7ee8` border, unselected radio),
   holding a 24 px header row with the radio and the word `Everything`, then
   `<div style="display: flex; flex-direction: column; gap: 2px; padding-left: 24px;">` with two lines:
   - line 1, `font-size: 11px; line-height: 1.4; color: #d5d7da`:
     `Draws 1.0M nodes and 10M edges. Edges beyond 500,000 are hidden until zoomed in.`
   - line 2, `font-size: 11px; line-height: 1.4; color: #7a828e`, preceded by the board's own 12 px
     warning triangle (`stroke="#f7b731"`, `flex: 0 0 auto`, in a flex row with `gap: 6px`):
     `About 2.4 GB. May be slow or run out of memory.`
   Rationale for the comment: floor item 4 puts a cost estimate at the control it is the cost of, and
   the option the user is being steered **away** from is exactly the one whose cost must be legible.
   No VOCAB snippet -- copy the Busiest nodes block on this board and strip its selected state.

2. **IMP-5 (2): rewrite the warning line and take the third Everything door off it.** Region: line 428.
   Current: `Too big to draw everything at once: about 2.4 GB of memory. Busiest nodes is selected
   below; the whole file still loads. <span style="color: #5b8ff9; cursor: pointer;">Import everything
   anyway</span>`. New, one span, no link: `Above the render ceiling -- about 200,000 nodes on this
   machine. Busiest nodes is selected below; the whole file still loads.` Keep the box, the warning
   glyph and the row's existing `title="Render ceiling: about 200,000 nodes, measured on this machine.
   Settings > Performance"`. The 2.4 GB figure is not deleted -- it moved to the Everything option in
   item 1, which is where floor 4 wants it.

3. **IMP-5 (3): delete the second Everything door from the footer.** Region: line 703, the
   `Import everything anyway` button (`border: 1px solid #f7b731; color: #f7b731`). Delete the whole
   div. The footer becomes the same three slots as every other state: `Cancel` and the note
   `Mapping is remembered for files with these columns.` in the left group, `Import` as the sole
   primary at the right. Add to the comment: `The primary follows the Load selection: Busiest nodes is
   chosen, so it reads Import; it would read "Import everything anyway" if Everything were chosen. The
   Everything path is offered once, as the Everything option (item 6). No inline link and no second
   button duplicates it.` Update the two stale guard lines that name the deleted button -- line 31
   (`IK-8 guard: ... Cancel, Import and "Import everything anyway" keep their text`) and line 37
   (the floor list) -- to name only `Cancel` and `Import`.

4. **Canvas toolbar (TB-1, TB-4, A1): nothing to draw here, one word to correct.** Region: file comment
   line 43. Current: `... no inspector; no navigation cluster, minimap or legend; status bar "No data
   loaded" with no AI slot (MIN-8).` New: `... no inspector; no canvas toolbar, minimap or legend;
   status bar "No data loaded" with no AI slot (MIN-8).` The shell behind the scrim is Empty, so **no
   toolbar is drawn**. Do not add one.

5. **IMP-3: fix the stale exit reference.** Region: file comment lines 21-22. Current: `Importing from
   here lands on ExplorerSubset.dc.html (new in 1.5): 50,000 of 1,000,000 nodes and 410,000 of
   10,000,000 edges on the quick grid in Performance mode.` `ExplorerSubset.dc.html` does not exist in
   the canvas directory. New: `Importing from here lands on the subset state -- 50,000 of 1,000,000
   nodes and 410,000 of 10,000,000 edges on the quick grid in Performance mode. NOT DRAWN: no board in
   the set draws it, and ImportFlow's WAYS OUT column may not cite ExplorerSubset.dc.html until one
   exists.`

6. **IMP-2: replace the freeform OPENS paragraph with the decision-table extract, and settle which of
   the two numbers applies.** Region: file comment lines 16-20. The board currently contradicts itself:
   the STATE line says "above the large-graph threshold" and the canvas-title line says "above the
   render ceiling". Delete lines 16-20 and write:
   ```
   INPUTS: no graph loaded; format class delimited; header signature unknown; some columns guessed;
     estimated size above BOTH numbers; "Always show import options" off.
   CLAUSE: above the render ceiling. Evaluated from the end, first match wins -- it beats "above the
     large-graph threshold", "guessed column" and "delimited file", all of which also matched.
   THE TWO NUMBERS: crossing the large-graph threshold opens the dialog and turns on Performance mode
     after import. Crossing the render ceiling ADDITIONALLY pre-selects a subset, draws the departure
     line, and relabels the primary when Everything is chosen. Both fired here; the ceiling wins the
     clause and names the board.
   RENDERS: item 2 recognition banner no; item 3 picker no; item 6 Load pre-selects Busiest nodes
     50,000; the departure line renders.
   PRIMARY: Import (it follows the Load selection).
   ```

7. **IMP-6: replace the seven-path reopen sentence with this state's four-line form.** Region: same
   comment block. Write:
   ```
   IN: a file whose estimated size crosses the render ceiling, dropped while nothing was loaded.
   REOPENS AS: the Insights card "Load the full graph" -> the Load control, Everything focused;
     a mapping field on a Loaded data line -> that role's column header; the palette -> "Import options".
   OUT: Import -> Loaded on the drawn 50,000-node subset, Performance mode on. NOT DRAWN (see the
     stale-reference note).
   CANCEL: Cancel, Escape and the title-row X are one action. Nothing is loaded, so Cancel abandons the
     file: the shell returns to Empty, the status bar reading line clears, and the file does not enter
     Recent.
   ```

8. **SAV-10: record that the remembered mapping now has a visible home.** Region: file comment. Add:
   `REVISION 1.7, SAV-10: "Mapping is remembered for files with these columns." is unchanged and is no
   longer the only trace -- the mapping becomes a named row in Data > Import mappings, renameable,
   deletable and exportable (drawn on DataPanelLoaded and TableJoin).` No change on screen.

9. **IMP-1: restore the entry clause to the title row (label change).** Region: line 409, and the
   comment at lines 407-408 that justifies its absence. Current span text: `netflow-2026-q2.csv, 3.2 GB`.
   New: `netflow-2026-q2.csv, 3.2 GB -- above the render ceiling`. Delete the two comment lines that
   read `"-- above the large-graph threshold" is deleted by Rule 8: the departure line 40px below states
   the same fact, louder and with the number.` and replace with: `The entry clause is the dialog's name
   for its state (floor item 6), not an explanation of a control. Rule 8 gained: "A trigger is not an
   explanation. Naming the condition that caused a surface to appear does not restate the controls it
   contains, even when the two share a word."` VOCAB: section 12 "Import state banner", title-row
   snippet at VOCAB.md lines 2604-2612 -- same 11 px dimmed span, same order.

10. **IMP-8: retitle the board in the file comment (label change, after item 9).** Region: lines 23-24.
    Current: `Canvas title for this stem: Import options -- above the render ceiling, nothing loaded.
    canvas.json is shared and is not edited here.` New: `CANVAS TITLE: Import options -- above the
    render ceiling.` Drop the hedge; **do not edit canvas.json from this file.**

## ImportAddToGraph

File: `ImportAddToGraph.dc.html`. State: Import options at step 3 over a loaded graph,
`devices-batch2.csv`, 8 KB. Canvas 832 x 836 behind a full-frame scrim at z-index 20.

1. **Canvas toolbar (TB-1, TB-2, TB-4, A1): delete the left-edge cluster, draw the bar at bottom
   centre.** Region: lines 576-598, the `<!-- NAVIGATION CLUSTER (5.6), verbatim from
   SHELL-SKELETON.html -->` comment and the `position: absolute; left: 12px; bottom: 120px; width: 56px`
   div with its 2D/3D pair, Zoom to fit, Zoom to selection, Zoom in, Zoom out and Views. Delete both.
   In their place, as the last overlay child of the same canvas div, paste VOCAB.md lines 2466-2494
   ("Canvas toolbar (5.6, 5.1)") **verbatim**. Board-specific values:
   - **Bottom offset 12.** This board draws no time slider and no Data table drawer, so the canvas
     floor is the canvas rect itself. Keep the snippet's `bottom: 12px`.
   - **Centred on the canvas rect, not the window.** The snippet's `left: 50%; transform:
     translateX(-50%)` is measured against the 832 px canvas div, giving a left edge of 293. Measured
     privately from the snippet at a file:// URL: **246.00 x 36.00**.
   - **Zoom to selection stays drawn and disabled** -- the item set is fixed, and nothing appears or
     disappears with selection. The snippet already carries `color: #5f6873; cursor: default` and the
     register's exact disabled title `Zoom to selection (F). Select something first`, which is right
     for this board: no node is selected. Floor item 4, the reason a disabled control is disabled.
   - **Order changes from the vertical stack:** the segmented control stays at the head, and **Zoom out
     now precedes Zoom in** (horizontally, magnitude increases rightward). The snippet is already in
     the right order -- do not re-sort it to match the old column.
   - **Views caret flips to point up** (the snippet's `polyline points="3,10 8,5 13,10"`), and its menu
     opens upward. The old cluster's down-caret is deleted with the cluster.
   - **The collision on this board:** the modal scrim (line 1207, `rgba(13, 17, 23, 0.6)`, z-index 20)
     covers the whole frame, so the toolbar renders **dimmed under the scrim like the rest of the
     shell** -- it is drawn, not omitted, and it takes no hover or focus state. Give it the same
     treatment the minimap and legend already get on this board.
   - **Minimap and legend do not move.** Minimap `left: 12px; bottom: 12px` (172 from the left edge),
     legend `right: 12px; bottom: 12px` (172 from the right). On an 832 canvas that leaves
     832 - 172 - 172 = 488 px for a 246 px bar with 16 px minimum clearance each side, so the two-line
     rule (below 622 px of canvas) **does not fire**. Do not raise them.
   - Update the comment on line 33 and line 44, which name the cluster as a copied shell piece and as
     untouched, to say `canvas toolbar` in its place.

2. **IMP-2: replace the freeform OPENS paragraph with the decision-table extract.** Region: file comment
   lines 18-21. Delete and write:
   ```
   INPUTS: a graph IS loaded; format class delimited; header signature unknown; device_id guessed as
     the node id; size below both numbers; "Always show import options" off.
   CLAUSE: second file, data already loaded. Evaluated from the end, first match wins -- it beats
     "delimited file", which also matched.
   RENDERS: item 2 recognition banner no; item 3 picker YES, and the dialog opens at it with "Add to
     current graph" selected; item 6 Load defaults to Everything; no departure line.
   PRIMARY: Add (the primary follows the item 3 picker: Add / Replace / Add attributes / Open
     comparison; Replace keeps its full text as a destructive verb).
   ```

3. **IMP-6: replace the seven-path reopen sentence with this state's four-line form.** This is the one
   board in the group where a graph is already loaded, so Cancel is a different action. Region: same
   comment block. Write:
   ```
   IN: a second file dropped on the canvas while data is loaded.
   REOPENS AS: Import as "Add attributes from a table" -> the picker, Attach selected; step 3
     "Compare with current graph" -> the picker, Compare selected; a mapping field on a Loaded data
     line -> that role's column header; the palette -> "Import options".
   OUT: Add -> the new nodes and attributes land as a Cleaning step, undoable from History.
   CANCEL: Cancel, Escape and the title-row X are one action. A graph IS loaded, so Cancel closes and
     changes nothing: no re-apply, no re-parse, no re-run, no new Cleaning step, no history entry.
     Reopening never re-reads the file. On a REOPEN where a role, type, policy or Load option was
     changed without pressing the primary, Cancel confirms once -- "Discard the changes to the
     mapping?" with Discard and Keep editing -- because the dialog is showing the mapping of a graph
     already on screen and a silent discard is indistinguishable from a silent apply. That confirm is
     not drawn on this board; it appears only after an edit.
   ```

4. **IMP-1: restore the entry clause to the title row (label change).** Region: line 1214. Current span
   text: `devices-batch2.csv, 8 KB`. New: `devices-batch2.csv, 8 KB -- second file, data already
   loaded`. VOCAB: section 12 "Import state banner", title-row snippet at VOCAB.md lines 2604-2612 --
   14 px primary `Import options`, then the 11 px dimmed clause span, then the 24 px `Close (Esc)` X,
   all of which this row already has. Only the span's text changes.

5. **IMP-8: retitle the board in the file comment (label change, after item 4).** Region: lines 22-23.
   Current: `Canvas title becomes "Import options -- second file, data already loaded" (canvas.json is
   not edited here).` New: `CANVAS TITLE: Import options -- second file, data already loaded.` Drop the
   hedge; **do not edit canvas.json from this file.** The title and the on-screen clause now agree word
   for word.

## TableJoin

File: `TableJoin.dc.html`. State: Loaded, `ovarian_de_string.tsv` (318 nodes, 1,104 edges), the Table
join dialog open over the whole frame on the modal scrim, joining `expression.tsv` (340 rows, 5
columns). Canvas 832 x 836.

1. **SAV-10: add the `Import mappings` library section to the Data panel.** Region: the panel's tier 2
   run, immediately **after** the `Cleaning steps` section (which closes at line 343) and **before**
   the `Run a recipe...` row. Copy the library header from VOCAB.md lines 2521-2544 ("Save and load
   control pair") and change:
   - the name `Styles` -> `Import mappings`;
   - the trailing count -> `1` (this dataset has one remembered signature);
   - **delete the 24 px `+` div.** SAV-10 is the one kind with no `+` on its header: the entry is
     created by the import, so creation stays implicit;
   - **delete the 24 px `More` div too.** It is hover-revealed under RT-7 and this board draws no hover
     on this section; record its one item in the adjacent comment: `Section overflow (6.8 full-text
     twin): Import mapping...`;
   - the info circle's title. **Collision, resolved:** SAV-3 wants the destination sentence as the
     circle's first line, SAV-10 wants the remembered-mapping sentence. Both, destination first:
     `Saved in this browser on this computer. Export a file to move it. Mappings are remembered when
     you import a file whose columns graphty has seen before.`
   Then one RT-6 row beneath it, from VOCAB.md lines 2553-2574 (the un-selected, un-dimmed middle
   form -- no `built-in` word): name `ovarian_de_string.tsv columns`, trailing dimmed value `12`, row
   `title="node1 and node2 as source and target, combined_score as weight, preferredName as label"`.
   Row hover gives rename and delete; the context menu adds `Apply to current file` and
   `Export mapping (JSON)` -- record both in the comment, do not draw them. **Do not draw a row for
   `expression.tsv`:** its mapping does not exist until Join is pressed, and this board is the state
   before that. Measured height of the header at a 256 px panel content band: **33.00 px**.

2. **Canvas toolbar (TB-1, TB-2, TB-4, A1): delete the left-edge cluster, draw the bar at bottom
   centre.** Region: lines 402-425, the `<!-- NAVIGATION CLUSTER (5.6), copied from
   SHELL-SKELETON.html -->` comment and its `left: 12px; bottom: 120px; width: 56px` div. Delete both
   and paste VOCAB.md lines 2466-2494 verbatim as the last overlay child of the canvas div.
   Board-specific values:
   - **Bottom offset 12**: no time slider (this dataset has no time attribute -- the file comment
     already says so) and no Data table drawer, so the canvas floor is the rect. Keep `bottom: 12px`.
   - Centred on the 832 px canvas rect, left edge 293; measured **246.00 x 36.00**.
   - **Zoom to selection stays drawn and disabled**, with the register's disabled title
     `Zoom to selection (F). Select something first` -- nothing is selected on this board. The item set
     is fixed; it never shrinks.
   - **The collision on this board:** the Table join dialog sits on a full-frame modal scrim, so the
     toolbar draws **dimmed under the scrim**, exactly as the minimap, legend and Insights strip
     already do. It is drawn, not omitted.
   - **The Insights strip does not collide**: it is at `top: 12px`, centred, so the two centred
     overlays sit on opposite edges of the canvas.
   - Minimap (`left: 12px; bottom: 12px`) and legend (`right: 12px; bottom: 12px`) stay put:
     832 - 172 - 172 = 488 px of room for a 246 px bar, so the two-line rule (below 622) does not fire.
   - Line 23-24 of the file comment lists `navigation cluster` among the untouched canvas parts.
     Rewrite that clause: `the canvas -- graph drawing, Insights strip, minimap, canvas toolbar,
     legend -- ` and add `the cluster was replaced by the bottom-centre toolbar in 1.7 (TB-1)`.

3. **POP-0: record that this dialog is tier 3b and stays one.** Region: file comment, after the
   REVISION 1.6 block. Add: `REVISION 1.7, POP-0: 6.2's tier 3 splits into 3a (pop-out: no scrim, no
   focus trap, canvas live) and 3b (dialog: scrim, focus trap, canvas frozen, one commit point). Table
   join is named in 6.11's question 1 as a true 3b dialog -- it commits a change to the data before
   anything else can proceed -- so the scrim, the focus trap and the single commit point all stay.
   6.11 also forbids a pop-out opening from inside a dialog, so nothing in this dialog pops out; the
   Role and Type chip menus stay menus (POP-12, "one choice from a closed list is a menu").`

4. **IMP-7 does not fire here, and the reason must be written down.** Region: the comment above the
   Loaded data block (lines 225-233). Add: `REVISION 1.7, IMP-7: Loaded data lines must carry a visible
   reopen door of their own -- Rule 9 raises a repeated word to a header, not a repeated affordance.
   This panel already complies: Rule 7b's per-row pencil is that door (the Weight row is drawn hovered
   to show it), so the rows are unchanged here. The chevron-in-field form IMP-7 prescribes lands on
   DataPanelLoaded, whose fields render as flat text with no per-row affordance at all.` No change on
   screen.

5. **SAV-2, one label to normalise (label change, last).** Region: the panel tier 2 row at lines 345-355, `Run a recipe...` with its `Coming` tag. **No change** -- A5 names it as the one deliberate
   exception: `Run a recipe...` stays in Data tier 1/2 and on Welcome, because it is the front door of
   an empty app and the one place where the list is not on screen. Record that in the comment so a
   later pass does not rename it: `REVISION 1.7, SAV-2/A5: "Load" is retired from the saved-thing
   vocabulary and the three verbs are "Save as <kind>...", "Import <kind>..." and "Export <kind>
   (JSON)", with apply being the row click. "Run a recipe..." is the named exception and keeps its
   wording; "Import and replay" is retired in favour of "Import recipe...".`

## DataPanelLoaded

File: `DataPanelLoaded.dc.html`. State: Loaded, `fraud-ring-synthetic.json` (200 nodes, 612 edges,
directed, weighted by amount, timed by ts), Data panel open, 4 open validation warnings (27 issues).
Canvas 832 x 836, no scrim.

1. **POP-3: the Validation report section collapses to a 32 px stub.** Region: lines 344-414 -- the
   whole `<!-- SECTION Validation report, OPEN ... -->` block, from its comment through the collapsed
   `Info 3` group. Delete the section body entirely: the four warning cards, the hovered card's four
   verbs, the example-id lines, the `8 mixed-form ids. Fixed by step 2` line and the Info group.
   Replace the whole section with VOCAB.md lines 2429-2447 (the stub block under "The stub the pop-out
   leaves behind") **verbatim** -- it was written for this board: divider, right-pointing 12 px chevron,
   `Validation report` at 12 px `#d5d7da`, and a trailing slot holding the warning triangle
   (`#f7b731`) and the count `4`, with `title="Validation report. 4 issues"`. Measured at a 256 px
   panel content band: **33.00 px** including its divider, down from about 282.
   - **The chevron never opens.** It is permanently in the closed right-pointing form; do not draw an
     open state anywhere on this board.
   - **The name stays primary** (`#d5d7da`) because issues are open; it dims only once all are fixed
     or ignored.
   - **`Re-ran after step 2` leaves the header's trailing slot** and reappears dimmed beside the title
     in the pop-out header (drawn on the new `ValidationPopout` board). It is not deleted, and it is
     not a floor breach: precedence rule 2 -- a door is not a deletion, a circle is -- and the reading,
     the consequences and the user's ids all travel with it into the same pop-out, so precedence rule 3
     holds too. Correct the file comment's IC-3 list (line 29), which currently pins
     `"Re-ran after step 2"` inline: it now reads `pinned inside the Validation report pop-out, never
     behind an info circle`.
   - **Not a repeat of the status bar chip**: 5.1's `4 data issues` is a global alarm, the stub's `4`
     is the door's state mark required by 6.11. Both stay.
   - Add a comment recording that the pop-out opens at 360, left edge `x = 336`, and coexists with the
     Data table drawer along the canvas bottom -- which is the whole argument for 3a over 3b, and is
     drawn on `ValidationPopout`, not here.

2. **SAV-10: add the `Import mappings` library section.** Region: the panel's tier 2 run, immediately
   after the `Cleaning steps` section (which closes at line 456) and before the panel column's closing
   div. Build it exactly as on TableJoin: VOCAB.md lines 2521-2544 for the header, name
   `Import mappings`, trailing count `1`, **no `+`**, **no `More`** (record `Import mapping...` in the
   comment), info-circle title `Saved in this browser on this computer. Export a file to move it.
   Mappings are remembered when you import a file whose columns graphty has seen before.` Then one RT-6
   row from VOCAB.md lines 2553-2574 (middle form): name `devices-batch2.csv columns`, trailing dimmed
   value `5`, `title="device_id as node id, 4 node attributes"` -- that is the joined table's own
   mapping, and it is the one delimited file on this board with a header signature to remember.
   Header measured at 256 px: **33.00 px**. Add to the comment: `SAV-10: the app has been saving this
   on the user's behalf since 1.0 with no list, no name, no delete and no export. Making it visible is
   the point; the row is named after the file that created it so that a header-signature collision is
   visible rather than silent.`

3. **SAV-9: add the `Formulas` library section, empty.** Region: immediately **after** the `Columns`
   section (which closes at line 325) and before the `Data table` section comment at line 326 -- SAV-9 places it under
   Columns, below `Add computed attribute`, and `Add computed attribute` lives inside Columns, which is
   collapsed on this board. Copy VOCAB.md lines 2521-2544 and change: name `Formulas`, dimmed
   (`#7a828e`) because the section is empty; **no count**; keep the resident 24 px `+` with
   `title="Save as formula..."` (SAV-1: the `+` is resident whether the section is empty or full,
   because saving your first one is a first-visit verb -- SAV-10 is the only kind that drops it);
   **delete the `More` div** and record its two items in the comment: `Import formula...`,
   `Export formula (JSON)`; info-circle title `Saved in this browser on this computer. Export a file to
   move it.` **No content rows, no `Not set`, no empty-state sentence** -- Rule 7c's one-row empty form,
   so the whole section is **33.00 px**. Comment: `A computed attribute is authored in a dialog and
   attached to a column of the current dataset, so an expression that took ten minutes to get right is
   gone the moment the dataset closes. A formula carries its name, its [name]-grammar expression, its
   output type and its fill policy -- not the computed values, which are recomputed on apply. A click
   on a row adds the computed column to the current dataset.`

4. **Canvas toolbar (TB-1, TB-2, TB-4, A1): delete the left-edge cluster, draw the bar at bottom
   centre.** Region: lines 752-774, the `<!-- NAVIGATION CLUSTER (5.6), copied from
   SHELL-SKELETON.html -->` comment and its `left: 12px; bottom: 120px; width: 56px` div. Delete both
   and paste VOCAB.md lines 2466-2494 verbatim as the last overlay child of the canvas div.
   Board-specific values:
   - **Bottom offset 12**: this board draws neither the time slider nor the Data table drawer, so the
     canvas floor is the rect. Keep `bottom: 12px`.
   - Centred on the 832 px canvas rect, left edge 293; measured **246.00 x 36.00**.
   - **Zoom to selection stays drawn and disabled**, with the register's disabled title
     `Zoom to selection (F). Select something first` -- nothing is selected on this board.
   - **The collision on this board:** there is **no scrim**, so this is the one board in the group where
     the toolbar draws at full strength, and it is the reference drawing for the group. The Insights
     strip is at `top: 12px` centred, so the two centred overlays sit on opposite edges.
   - Minimap (`left: 12px; bottom: 12px`, height 84) and legend (`right: 12px; bottom: 12px`) share the
     toolbar's 12 px baseline and do not move: 832 - 172 - 172 = 488 px of room for a 246 px bar, so
     the two-line rule (below 622 px of canvas) does not fire.
   - **The zoom percentage does not join the bar** (TB-7). It stays in the status bar, 12 px below the
     Zoom in and Zoom out buttons and therefore already adjacent to them; a numeric readout would change
     the bar's width as the graph is zoomed. Record that in the comment in the style of the existing
     MIN- and NAV- notes, so the next agent does not add one.
   - Correct the two comment references to the cluster: line 18 (`5.6 navigation cluster`) and lines
     33-34 (`the navigation cluster ... are untouched`), plus line 776's minimap note
     (`Fit link removed, it lives in the cluster` -> `it lives in the canvas toolbar`).

5. **IMP-7: give the four Loaded data mapping fields their own visible door.** Region: lines 260-292,
   the two RT-1 pair rows holding `weight | amount`, `time | ts`, `label | id`, `ids | account id`.
   Each field is currently a flat `#2a3035` box with a dim role word and a right-aligned value and
   **no mark that it is a control at all**. To each of the four field boxes, append as the last child
   the RT-1 select chevron, verbatim from VOCAB.md line 1981:
   `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5"
   stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><polyline points="4,6 8,10
   12,6"></polyline></svg>`
   The chevron sits **inside** the box after the value, never in the 24 px trailing slot (the trailing
   slot on these rows stays empty). **Measured fit, at the 108 px field width these rows use:** with
   the fields' current `gap: 6px; padding: 0 8px` the value `account id` clips (57 px needed, 50.22 px
   available). Change all four fields to `gap: 4px; padding: 0 6px` -- measured, `account id` then has
   58.22 px for 58 px of text and does not clip, and the other three have room to spare. **Do not widen
   the field, do not delete the role word, and do not truncate `account id`** (floor item 7). If your
   own render still clips, the one permitted fallback is the register's 12 px caret form
   (`width="12" height="12"`), measured at 60.22 px available.
   Then set each field's `title` to name its target verbatim:
   - `weight | amount` -> `Weight column: amount. Change in Import options`
   - `time | ts` -> `Time column: ts. Change in Import options`
   - `label | id` -> `Label column: id. Change in Import options`
   - `ids | account id` -> `Identifier system: account id. Change in Import options`
   The `Import settings` gear on the Open file section header (line 203) **stays** as the general door.
   Comment to add: `Reopen path 1 -- "any Change link on a Loaded data line, scrolled to its own
   control" -- is the first and most-used of the seven, and 1.6 raised all four of those links onto one
   section gear under Rule 9. Rule 9 raises a repeated WORD to a header; it does not raise a repeated
   AFFORDANCE, because one gear on a header cannot scroll to the weight column. Zero width, zero
   height, zero words added.`

6. **POP-11: two decisions land on the deleted policy rows; here is the resolution.** Region: the
   comment block at lines 174-190. POP-11 says the three import policies should be compacted into noun
   fields on this board; IMP-7 says the 1.6 deletion of `Repeated edges: combined, 5 pairs. Change` and
   `Self-loops: kept, 2. Change` under Rule 8 is sound and **stands**. **Chosen: nothing is re-added.**
   The policies are not drawn on this panel at all -- 1.6 deleted them because the validation cards
   below carried the same Change, and those cards are themselves moving behind POP-3's door in item 1,
   where their policy words (`5 repeated pairs, combined`, `2 self-loops, kept`) travel with them. The
   compacted noun-and-value form POP-11 prescribes is already drawn where the policies live, in the
   Import options dialog (ImportOptions, ImportRecognised). Write that into the comment as:
   `REVISION 1.7, POP-11 x IMP-7: the import policies get no pop-out and no second home -- a control
   whose home is a dialog may not acquire one. On this panel they are not drawn at all; the 1.6
   deletion stands, and the two policy words ride with their validation rows into the Validation report
   pop-out. The noun/value form (Repeats | Combine + sum) is drawn in the Import options dialog.`

7. **POP-6: mark the inspector's Schema row as a door.** Region: lines 1345-1358, the collapsed
   `Schema` RT-8 header carrying `4 node types, 3 edge types`. The row already draws the closed
   right-pointing chevron, so **the only edits are semantic**: give the row
   `title="Schema. 4 node types, 3 edge types"` and change the section comment (lines 1345-1346) from
   `RT-8, collapsed: node types with counts, edge types with counts, type pairs; the header's verbs are
   Filter to type, Select all of type and Export schema JSON.` to `RT-8 door (POP-6): the chevron is
   permanently in the closed form and never renders the open form. The summary "4 node types, 3 edge
   types" is the door's state mark; when SchemaExtractor has not finished it reads "measuring...", or
   the door would hide the fact that the data is not there yet. Behind it is a 480 pop-out -- node type
   table, edge type table, the type-pair list drawn as a MATRIX, and the three verbs as one RT-7 row --
   drawn once, on Main. 480 is the ladder's ceiling and is justified here because a type-pair list is a
   two-dimensional relationship that cannot be drawn honestly in a 256 px band.`

8. **Record the 1.7 net for this panel.** Region: the `REBUILT UNDER COMPACTION-1.6` block, lines
   33-39, whose word counts (281 -> 194; panel 217 -> 139) are now stale. Do **not** re-walk the word
   count. Append: `REVISION 1.7 (DECISIONS-1.7.md). Removed from the panel: the open Validation report
   section, about 282 px, replaced by a 33 px stub (POP-3). Added: Formulas 33 px empty (SAV-9), Import
   mappings 33 px plus one 28 px row (SAV-10), four field chevrons at zero width and zero words
   (IMP-7). Net about -160 px and about -60 words on the panel; the 1.6 counts above are superseded and
   are kept only as the record of that pass.`

9. **Label pass, last.** No visible string on this board is renamed by 1.7. Confirm, and record it:
   `SAV-2's "Load" retirement does not touch this panel -- "Load data first", "Loaded data" and the
   Loading state are the data vocabulary the retirement was made to protect, and they all stay.`

## DataTableDrawer

File: `DataTableDrawer.dc.html`. State: Result plus Selected, no activity panel, the Data table drawer
docked along the canvas bottom at 260, the time slider docked above it, three nodes selected. Canvas
1112 x 836 (rail 48 + inspector 280).

1. **A1 + TB-4: normalise the slider to 70 px and rebuild the bottom stack.** Region: line 424, the
   time slider container. Current: `position: absolute; left: 0; right: 0; bottom: 260px; height: 72px;
   ... padding: 6px 12px 2px; ... z-index: 5;`. New: `height: 70px` and `padding: 6px 12px 1px`;
   everything else unchanged, including `bottom: 260px`. **The collision, resolved:** TimeSlider.dc.html
   draws 70 and this board draws 72; A1 rules that the slider's own board is authoritative, so this
   board loses 2 px. The whole bottom stack, bottom to top, is then: canvas rect; the drawer (a **dock**
   -- it shortens the rect) at 260; the slider (an **overlay**) docked to the drawer's top edge at
   bottom 260, 70 tall, ending at 330; the toolbar riding 12 px above that, at **bottom 342**.
   Update the arithmetic in the comment on line 395 from `(drawer 260 + slider 72 + 12)` to
   `(drawer 260 + slider 70 + 12 = 342)`.

2. **TB-1, TB-2, TB-4: delete the left-edge cluster, draw the bar at bottom centre, offset 342.**
   Region: lines 395-418 -- the `<!-- NAVIGATION CLUSTER (5.6) ... -->` comment and the
   `position: absolute; left: 12px; bottom: 344px; width: 56px; ... z-index: 6;` div with its 2D/3D
   pair, Zoom to fit, Zoom to selection, Zoom in, Zoom out and Views. Delete both. Paste VOCAB.md lines
   2466-2494 ("Canvas toolbar") verbatim as an overlay child of the canvas div, with these
   board-specific changes:
   - **`bottom: 12px` becomes `bottom: 342px`** -- the both-open case in A1's table. Note that 344 was
     this board's old number and it was arithmetically wrong by the 2 px of item 1; do not carry it over.
   - Keep `z-index: 6` (the slider is 5, the drawer is 5), and keep `left: 50%; transform:
     translateX(-50%)` measured against the **1112 px** canvas rect -- left edge 433. Measured
     privately from the snippet at a file:// URL: **246.00 x 36.00**.
   - **`Zoom to selection` is ENABLED here** -- three nodes are selected. Replace the snippet's disabled
     form with the live one: `color: #a3a8b1; cursor: pointer;` and `title="Zoom to selection (F)"`
     (drop the `. Select something first` half). This is the only board in the group where that item is
     live, and the item set is fixed either way -- it disables, it never disappears.
   - **Views caret flips to point up** (the snippet's `polyline points="3,10 8,5 13,10"`) and its menu
     opens upward: bottom edge 4 px above the bar, centred on the Views button, clamped 12 px inside the
     canvas edges. The menu is not drawn here; record the clamp in the comment, because with the drawer
     and slider both open this is the board where an unclamped menu would run off the canvas top.
   - **The collision on this board, and it is the one the whole bottom stack exists for:** the drawer is
     open, so **the minimap and the legend are not drawn at all** (5.1 hides them while the drawer is
     open) and the toolbar has the bottom band to itself -- no two-line rule, no 622 px threshold, no
     clearance arithmetic. The band above it belongs to the slider, 12 px down.
   - **The second collision: two centred controls on one screen.** `Graph / Table` is at `top: 12px;
     left: 50%` (line 389) and the toolbar is at bottom centre. That is accepted -- opposite edges, only
     one of them conditional. **Graph / Table never enters the toolbar**, because the bar's item set is
     fixed and a centred container that changes width moves every item under the pointer. Write that
     into the comment where the next drafter will find it, next to the Graph / Table control.
   - **The one state where the toolbar is not drawn**, to record in the same comment: when Graph / Table
     maximises the drawer to the full canvas height there is no canvas left to navigate, so the toolbar
     hides with the minimap and the legend and returns when the drawer is restored. Graph / Table stays
     at top centre and is the way back. That is not the state drawn here.
   - Rewrite the comment on line 395 to name the toolbar rather than the cluster, and re-point the
     MIN-1/MIN-15 note on line 394 if it names the cluster.

3. **POP-1: the time slider's gear now opens a pop-out, not the Explore panel.** Region: the comment at
   lines 419-423 and the gear at line 436. The comment currently says the gear `opens the Explore "Step
   through time" section`. New comment text for that clause: `a gear that opens the Time slider settings
   pop-out -- a 280 3a surface about 232 tall, 8 px above this bar with right edges aligned, holding the
   time attribute select, the Window 30 days / Step 7 days RT-1 pair, the Cumulative / Sliding RT-3
   pair, Speed 1x, the "Recompute results on each step" toggle and "Compare with another window". The
   pop-out is drawn open on TimeSlider, not here -- one pop-out per region. Everything that is SCRUBBED
   stays on this bar: transport, track, sparkline, playhead, the Viewing readout and "opened". 6.2
   forbids making the slider a dialog; it never forbade giving its settings a non-modal surface.`
   The bar itself does not change.

4. **POP-13 (a) / REGISTER-1.5 defect: the gear loses a key chip it does not own (label change, but do
   it with item 3 while you are in the row).** Region: line 436. Current: `title="Time slider settings
   (T)"`. New: `title="Time slider settings"`. 5.6 binds `T` to **toggling** the slider, not to opening
   its settings, and under 5.6's own rule a control may not print a binding it does not own. The
   neighbouring `title="Hide the time slider (T)"` at line 437 is correct and **does not change** -- it
   is the control that owns `T`.

5. **POP-9: Selection statistics stays inline; record the condition that would move it.** Region: the
   comment at lines 765-771 and the section at lines 773-812. **No change on screen** -- the section is
   in its two-column `selection / graph` form and no pin is active. Append to the comment: `REVISION
   1.7, POP-9: Selection statistics stays INLINE in this two-column form. It becomes a stub opening a
   360 pop-out (attribute, A, B, graph, difference, with Export CSV) only when a pin is active or the
   selection is above the cap, because a third column does not fit the 256 px band. That state is drawn
   on MultiSelection, together with the pin that produces it. The attribute profile does NOT pop out
   under any condition -- nine rows of the user's own attribute names and top values is a scan surface
   made of floor-7 data, and a reader comparing five attributes cannot open five doors.`

6. **POP-12: record what stays a menu.** Region: the drawer's tab-row comment (lines 515-521) or beside
   the column headers. Add: `REVISION 1.7, POP-12: the Data table column header menu stays a MENU. One
   choice from a closed list is a menu; a pop-out is for parameters and reports. The same ruling turns
   the selection-set verbs (Replace, Union, Intersect, Subtract, Filter to set) into the set row's
   context menu rather than a pop-out -- five verbs on one row is a menu, matching SAV-7's row
   treatment.` No change on screen.

7. **SAV-2: normalise one saved-thing verb (label change, last).** Region: line 859, the bookmark glyph
   in the inspector's pinned action row. Current: `title="Save as set..."`. New:
   `title="Save selection as set..."` -- SAV-2 keeps this one in its longer form, because "selection"
   names the source and the floor's scope clause wants it. The glyph does not change: REGISTER-1.5
   section 1.6 has no save glyph, this is the bookmark glyph being reused, and 1.7 **adds no glyph**.
   In the same pass, in the block comment's `More menu, full text (6.8 twin, mandatory)` list at lines 840-842, leave `Save as subgraph...` exactly as written (it already matches
   `Save as <kind>...`) and add one line beneath the list: `SAV-2: the three verbs are "Save as
   <kind>...", "Import <kind>..." and "Export <kind> (JSON)"; applying is the row click and gets no
   verb; "Load" is retired from this vocabulary because the word is spent on data.`

## ViewsMenu

Screen group: nav. Canvas 1112 x 836, no activity panel, nothing selected, 3D.
No time slider and no Data table drawer on this board, so the canvas floor is the
canvas rect itself.

1. **Canvas toolbar replaces the navigation cluster (TB-1, TB-2, TB-4).**
   Region: canvas overlay layer, the block headed `<!-- NAVIGATION CLUSTER (5.6),
   copied from SHELL-SKELETON.html: ... -->` (lines 237-266): a 56px wide vertical
   stack at `left: 12px; bottom: 120px` holding [2D | 3D], Fit, Zoom to selection,
   Zoom in, Zoom out and the Views trigger.
   New content: delete that comment and the whole `<div style="position: absolute;
   left: 12px; bottom: 120px; width: 56px; ...">` element it heads, and in its place
   put the **Canvas toolbar** snippet from VOCAB.md section 12 ("### Canvas toolbar
   (5.6, 5.1)"), copied verbatim. Order left to right is fixed: `[2D | 3D]`,
   divider, `Zoom out (-)`, `Zoom in (=)`, `Zoom to fit (0)`,
   `Zoom to selection (F)`, divider, `Views`. Keep `bottom: 12px` -- this board
   draws neither the time slider (82) nor the drawer (272/342). Keep the snippet's
   `3D` half selected (`background: #374047`) and its **disabled** Zoom to selection
   (`color: #5f6873; cursor: default;` with `title="Zoom to selection (F). Select
   something first"`), both of which are this board's state. The item set is fixed:
   nothing is added, removed or reordered per board.
2. **The Views item is drawn toggled (this board's state).** Region: the new
   toolbar's last item. Current content: the deleted cluster drew its Views trigger
   with `background: #28364e; color: #4a7ee8;` because the menu is open.
   New content: after pasting the VOCAB snippet, change only the Views item's style
   from `color: #a3a8b1;` to `background: #28364e; color: #4a7ee8;`, keeping
   `title="Views"`. This is POP-13(b)'s rule applied to a menu opener: the opener
   carries the selected fill while its surface is open. Do not change the caret --
   the snippet already ships the up form `<polyline points="3,10 8,5 13,10">`.
3. **Re-anchor the Views menu so it opens upward (TB-8).** Region: the block headed
   `<!-- VIEWS MENU (5.6), open. Anchored to the right of its trigger with a 4px gap
   (cluster left 12 + width 56 + 4), bottom aligned with the cluster. ... -->`.
   Current content: `position: absolute; left: 72px; bottom: 120px; width: 248px;`.
   New content: `position: absolute; left: 533px; bottom: 52px; width: 248px;`,
   everything else unchanged (`z-index: 15` stays, so the menu paints over the bar's
   `z-index: 6`). The arithmetic, to put in the comment: the 246px bar is centred on
   an 1112px canvas, so its left edge is at x = 433; inside the bar the Views item
   starts at 1 + 3 + 60 + 12 + (28*4 + 2*3) + 12 = 206 and is 36 wide, so its centre
   is x = 433 + 224 = 657, and a 248px menu centred on it starts at 533. Bottom
   edge = toolbar bottom 12 + toolbar height 36 + 4 = 52. With the new Toolbar row
   the menu is about 341 tall, so its top lands at y = 443 in an 836-tall canvas and
   TB-8's "clamped 12px inside the canvas edges" does not fire on this board -- say
   so in the comment so a later resize is checked against it.
4. **Add the `Toolbar` row to the Show group (TB-8).** Region: the Views menu, the
   group that currently holds `Minimap` `M` and `Legend` `L`.
   Current content: two rows, Minimap then Legend.
   New content: three rows, `Minimap` `M`, `Toolbar`, `Legend` `L`, in that order.
   Copy the existing Minimap row markup and change only the label to `Toolbar` and
   delete its key chip `<div ...>M</div>` -- TB-8 gives the toolbar **no binding,
   deliberately**, because it is the only canvas overlay whose toggle can hide its
   own front door, and its way back is the palette row `Show canvas toolbar`. The
   row is checked (toolbar visible), so it keeps the leading check glyph
   `<polyline points="3.5,8.5 6.5,11.5 12.5,5">` at `stroke="#4a7ee8"` and the label
   carries no verb (RT-5 verbs-out, exactly as Minimap and Legend already do). The
   row's snippet is the "Dropdown menu" block in VOCAB.md section 4 ("### Dropdown
   menu (top bar Export, Views menu, header menus, row menus)"), toggled-row form.
5. **The Schema row becomes a door and gains its state mark (POP-6).** Region:
   inspector, the block headed `<!-- RT-8: Schema, collapsed and live (5.4). ... -->`
   (lines 524-536). Current content: a 32px header with the closed chevron and the
   bare word `Schema` (`padding-left: 4px`) and **no trailing value at all**.
   New content: give the header row `justify-content: space-between;`, wrap the
   chevron and the name in a `<div style="display: flex; align-items: center; gap:
   4px; min-width: 0;">` left group, and add as its second child the trailing state
   mark `<span style="flex: 0 0 auto; font-size: 11px; line-height: 1.2; color:
   #7a828e; white-space: nowrap;">3 node types, 7 edge types</span>` with
   `title="3 node types: cat 17, human 2, dog 1. 7 edge types by interactionType."`
   on the header row. Both strings are copied verbatim from Main.dc.html, which
   draws the same inspector on the same dataset; this board was missing the summary,
   and POP-6 makes the summary the door's state mark, so it can no longer be absent.
   The chevron keeps its closed right-pointing form `<polyline points="6,4 10,8
   6,12">` **permanently** and never renders the open form. Snippet: the RT-8 door
   stub in VOCAB.md section 12, "### Pop-out container, anchored form (6.11, 6.2
   tier 3a)", second code block.
6. **Rename the save verb (SAV-2, A5).** Region: the Views menu, the row between the
   two dividers. Current content: `Save view...` with the bookmark glyph and a
   `Coming` tag. New content: `Save as view...`, same glyph, same `Coming` tag
   (SAV-2 renames the verb, it does not ship the capability). `view` is one of
   SAV-2's kind nouns and the pattern is `Save as <kind>...`; the ellipsis means a
   dialog that asks for a name. `Load` is retired from this vocabulary and must not
   appear anywhere on this board.
7. **Comment: re-point every "navigation cluster" reference (TB-1).** Region: the
   file comment at the top (lines 17-18, "5.6 (view modes, navigation cluster, Views
   menu)" and "The navigation cluster is copied from SHELL-SKELETON.html") and the
   overlay comment you rewrite in item 1. New content: "canvas toolbar" in both
   places, plus one sentence recording that 5.6's navigation cluster paragraph is now
   the canvas toolbar paragraph and that the bar is centred on the live canvas rect,
   never on the window.
8. **Comment: record the two decisions this board is the drawn proof of.** Region:
   the Views menu comment. Add: (a) the menu opens upward from a bottom-centre
   trigger and its caret points up; (b) the `Toolbar` row makes the toolbar the third
   canvas overlay with a visibility toggle, joining 6.5's existing "minimap and legend
   visibility" memory rather than adding a new clause, and hiding it hides this menu,
   so `Show canvas toolbar` in the command palette is the way back. Keep the existing
   COMPACTION-1.6 paragraph as it stands.

## ContextMenu

Screen group: nav. Canvas 1112 x 836, no activity panel, one node selected
(acct-4471), 3D, node context menu open at `left: 622px; top: 330px`.
No time slider and no drawer, so the canvas floor is the canvas rect.

1. **Canvas toolbar replaces the navigation cluster (TB-1, TB-2, TB-4).**
   Region: canvas overlay layer, the block headed `<!-- NAVIGATION CLUSTER (5.6),
   copied from SHELL-SKELETON.html; Zoom to selection is enabled because a node is
   selected -->` (lines 463-485), a 56px vertical stack at `left: 12px; bottom:
   120px`. New content: delete the comment and the element it heads and paste the
   **Canvas toolbar** snippet from VOCAB.md section 12 ("### Canvas toolbar (5.6,
   5.1)") verbatim, at `bottom: 12px` -- this board draws neither the slider (82) nor
   the drawer (272/342). Order left to right is fixed: `[2D | 3D]`, divider,
   `Zoom out (-)`, `Zoom in (=)`, `Zoom to fit (0)`, `Zoom to selection (F)`,
   divider, `Views`. The snippet's `3D` half is already selected, which is this
   board's state.
2. **Zoom to selection is ENABLED on this board.** Region: the new toolbar's fourth
   glyph. Current content (in the snippet as shipped): `color: #5f6873; cursor:
   default;` with `title="Zoom to selection (F). Select something first"`.
   New content: `color: #a3a8b1; cursor: pointer;` with `title="Zoom to selection
   (F)"` -- acct-4471 is selected, and this board and ExplorerNotes are the only two
   in this group where the control is live. The glyph itself does not change.
3. **Collision check, to record rather than to draw:** the open node menu occupies
   x 622-886, y 330-692 in canvas coordinates; the centred 246px bar occupies
   x 433-679, y 788-824. They share x but not y, so the menu does not need moving and
   the toolbar does not need an offset. Put those two rectangles in the toolbar
   comment so a later menu-length change is checked against them.
4. **Comment: the 1.7 menu-variant register (TB-6, SAV-2, SAV-7, POP-12a).**
   Region: the file comment headed `<!-- CONTEXT MENU (5.6, 5.4 one-node actions),
   opened by right-click on acct-4471 ... -->`. Current content: it describes only
   the one-node menu it draws. New content: keep every drawn row exactly as it is and
   append a paragraph recording the four variants 1.7 touches, none of which is the
   node menu:
   - **Empty canvas** gains `Select a region` (TB-6). It arms the next drag on empty
     canvas as a marquee and disarms on release: one shot, no persistent mode, no
     status chip, no glyph, no key binding. Full order: `Fit` `0`, `Reset view`
     `Shift+0`, `Select all visible` `Cmd+A`, `Select a region`, `Paste data`
     `Cmd+V`, `Switch to 2D` `5`.
   - **Multi-selection**: `Save as set` becomes `Save as set...` (SAV-2: the ellipsis
     means a dialog that asks for a name), and the set row's own menu is
     `Replace, Union, Intersect, Subtract, Filter to set` (POP-12a, cut from a
     pop-out and reclassified as a menu: a pop-out is for parameters and reports, a
     menu is for verbs).
   - **A library row** (new, SAV-7): `Rename, Duplicate, Update from current, Export
     JSON, Delete` -- the touch twin of the hover-revealed row verb triple.
   **Resolution of the collision, state it in the comment:** TB-6's spec-text line
   says "CommandPalette and ContextMenu gain one row", but 5.6 scopes `Select a
   region` to the *empty-canvas* menu and this board draws the *one-node* menu, whose
   every row acts on acct-4471. The drawn menu therefore gains no row; the register
   above is where the addition lands, and CommandPalette carries the drawn proof.
   Adding a canvas-scoped selection verb to a node menu would be the defect, not the
   fix.
5. **Comment: re-point the "navigation cluster" reference (TB-1).** Region: the
   overlay comment you rewrite in item 1. New content: "CANVAS TOOLBAR (5.6, 5.1)",
   plus the sentence that the bar is centred on the live canvas rect and rides 12px
   above the canvas floor.

## ShortcutsDialog

Screen group: nav. Canvas 832 x 836 (Explore panel open), nothing selected, 3D.
The whole frame carries a 60% scrim with the shortcuts dialog centred over it; the
canvas overlays render beneath the scrim and the bottom band below the dialog is
visible, so the toolbar is a **visible** change on this board.

1. **Canvas toolbar replaces the navigation cluster (TB-1, TB-2, TB-4).**
   Region: canvas overlay layer, the block headed `<!-- NAVIGATION CLUSTER (spec
   5.6): canvas overlay on the left edge above the minimap, 24px rows, top to bottom:
   ... -->` (lines 337-369). New content: delete the comment and the
   `left: 12px; bottom: 120px; width: 56px` element it heads and paste the
   **Canvas toolbar** snippet from VOCAB.md section 12 ("### Canvas toolbar (5.6,
   5.1)") verbatim at `bottom: 12px` -- no slider, no drawer on this board. Keep the
   snippet's selected `3D` half and its **disabled** Zoom to selection (`color:
   #5f6873`, `title="Zoom to selection (F). Select something first"`): nothing is
   selected here. Canvas is 832 wide, which is above TB-3's 622px two-line threshold
   (172 + 16 + 246 + 16 + 172), so the minimap and the legend stay on the toolbar's
   12px baseline and nothing reflows -- record the clearance, (832 - 246) / 2 - 172 =
   121px a side, in the comment.
2. **Add one row to the shortcuts table (SAV-11).** Region: the dialog's right-hand
   reading order -- the **Edit and files** group in the left column, which currently
   holds `Undo, redo` `Cmd+Z` `Shift+Cmd+Z`, `Open file` `Cmd+O`, `Paste data (canvas
   or drop zone focused)` `Cmd+V`. New content: insert one row **between `Open file`
   and `Paste data`**, reading `Save as...` with a single key chip `Cmd+S`. Copy the
   `Open file` row's markup and change only the label and the chip text. No `Coming`
   tag: the binding is live even where an individual kind is not, because Cmd+S opens
   the command palette scoped to Save and a kind that cannot apply right now is drawn
   dimmed and reasoned inside that palette. The ellipsis is load-bearing and matches
   SAV-2's `Save as <kind>...` family.
   **Resolution of the collision, state it in the comment:** POP-13(d) says
   "SettingsShortcuts and ShortcutsDialog gain no new bindings" -- that is scoped to
   the seven pop-outs, which get command-palette rows and no keys. SAV-11 is a
   different decision, names this board explicitly, and its direction line reads "One
   row in two shortcut tables". So exactly one row is added, and it is Cmd+S.
3. **Update the status bar drop order (TB-7).** Region: the status-bar slot comments.
   Current content: `<!-- ZOOM (drops 2nd). ... -->` and `<!-- VIEWING SLOT (drops
   4th), EMPTY. ... -->`. New content: `ZOOM (drops last)` and `VIEWING SLOT (drops
   3rd)`. The percentage stays in the status bar and never enters the toolbar (a
   numeric readout would change the bar's width as the graph is zoomed, which a
   centred bar cannot tolerate); now that zoom is the only camera fact in the bar it
   moves to the end of the drop order, which becomes AI status, layout name, Viewing,
   zoom.
4. **Comment: the three deliberate refusals, so a later pass does not add them.**
   Region: the dialog's own comment, `<!-- KEYBOARD SHORTCUTS DIALOG (5.3 Help,
   5.6): ... -->`. Add: (a) the seven 1.7 pop-outs -- `Time slider settings`,
   `Validation report`, `Group profile`, `Run record`, `Schema`, `All statistics`,
   `Filter expression` -- are reachable by opener, by home-panel row and by command
   palette, and **carry no key binding**, so no row appears here (POP-13d); (b) the
   canvas toolbar's visibility toggle has **no binding, deliberately** (TB-8), so
   there is no Toolbar row; (c) `Select (V)` and `Pan (H)` pointer modes are
   **rejected** (TB-6) and `Select a region`, the verb that replaces them, is a
   context-menu row and a palette row with no key, so none of the three appears in
   this table.
5. **Comment: re-point the "navigation cluster" reference (TB-1).** Region: the
   overlay comment you rewrite in item 1, which currently reads "canvas overlay on
   the left edge above the minimap, 24px rows, top to bottom". New content: a bar
   centred on the live canvas rect, 246 x 36 at desktop, riding 12px above the canvas
   floor, items 28 x 28 on a 3px pad with a concentric 7px radius, and the only
   canvas overlay carrying the tooltip shadow.

## SettingsShortcuts

Screen group: nav. Canvas 832 x 836, nothing selected, 3D. The Settings overlay
covers the whole body row right of the rail (scrim plus a panel inset 12px), so the
canvas overlays are **occluded**. Make the swap anyway: the shell beneath must be
identical to every other board in the set, and the cluster it replaces is equally
occluded today.

1. **Canvas toolbar replaces the navigation cluster (TB-1, TB-2, TB-4).**
   Region: canvas overlay layer, the block headed `<!-- NAVIGATION CLUSTER (spec
   5.6): canvas overlay on the left edge above the minimap, 24px rows, top to bottom:
   ... -->` (lines 290-322). New content: delete the comment and the `left: 12px;
   bottom: 120px; width: 56px` element it heads and paste the **Canvas toolbar**
   snippet from VOCAB.md section 12 ("### Canvas toolbar (5.6, 5.1)") verbatim at
   `bottom: 12px` -- no slider, no drawer. Keep the snippet's selected `3D` half and
   its disabled Zoom to selection (nothing is selected). Add one line to the comment
   saying the bar renders beneath the Settings overlay and is occluded by it, so the
   board is not evidence about the bar's appearance -- CanvasToolbar is.
2. **Add one row to the shortcuts table (SAV-11).** Region: the **Edit and files**
   group, which holds `Undo; redo (Ctrl+Y on Windows and Linux)` `Cmd+Z`
   `Shift+Cmd+Z`, `Open file` `Cmd+O`, `Paste data (canvas or drop zone focused)`
   `Cmd+V`. New content: insert one row **between `Open file` and `Paste data`**
   reading `Save as...` with the chip `Cmd+S`. Copy the `Open file` row wholesale so
   it keeps this table's three-column grid `minmax(0, 1fr) 160px 24px` and its
   third-column rebind affordance; change only the label and the chip. No `Coming`
   tag (see the ShortcutsDialog resolution: the binding is live, the kinds behind it
   may not be). Both tables must end up with the same row, in the same group, in the
   same position.
   **Resolution of the collision:** POP-13(d)'s "gain no new bindings" is about the
   seven pop-outs; SAV-11 names this board and adds exactly one row.
3. **The Schema row becomes a door, and its summary is corrected (POP-6).**
   Region: inspector, the collapsed `Schema` RT-8 header (line 378) whose trailing
   value currently reads `1 node type, 1 edge type`.
   New content: `3 node types, 7 edge types`, with `title="3 node types: cat 17,
   human 2, dog 1. 7 edge types by interactionType."` on the header row -- both
   copied verbatim from Main.dc.html, which draws the same Graph summary inspector on
   the same cat-social-network.json. The chevron is already the closed right-pointing
   form `<polyline points="6,4 10,8 6,12">` and now keeps it **permanently**: the row
   is a door onto the 480 Schema pop-out (drawn on Main), not a section that expands
   in place. This board is not on POP-6's artboard list, but it draws the row, and
   POP-6 turns the summary into the door's state mark -- a state mark that disagrees
   with the same dataset on another board is a defect once it is load-bearing.
   Snippet: the RT-8 door stub in VOCAB.md section 12, "### Pop-out container,
   anchored form (6.11, 6.2 tier 3a)", second code block.
4. **Update the status bar drop order (TB-7).** Region: the status-bar slot comments.
   Current content: `ZOOM (drops 2nd)`, `LAYOUT SLOT (name drops 3rd)`,
   `VIEWING SLOT (drops 4th)`, `AI STATUS (drops 1st)`.
   New content: `ZOOM (drops last)`, `LAYOUT SLOT (name drops 2nd)`,
   `VIEWING SLOT (drops 3rd)`; `AI STATUS (drops 1st)` is unchanged. The order is now
   AI status, layout name, Viewing, zoom, because zoom is the only camera fact in the
   bar and the toolbar's four zoom controls would otherwise have no readout.
5. **Comment: re-point every "navigation cluster" reference (TB-1).** Region: four
   places -- the file comment (line 21, "5.6 (navigation cluster, zoom percentage,
   mode chip)"; line 28, "the canvas gains the navigation cluster above the minimap
   (5.6)"), the panel comment at line 192 ("'Zoom to selection' is gone from the
   panel: the canvas navigation cluster owns it"), and the overlay comment you
   rewrite in item 1. New content: "canvas toolbar" in all four. Line 192's argument
   survives intact -- the control still lives on the canvas, at the bottom centre
   rather than the left edge -- so re-point it, do not delete it.
6. **Comment: the deliberate refusals (POP-13d, TB-8, TB-6).** Region: the Keyboard
   shortcuts section comment. Add the same three sentences as ShortcutsDialog item 4,
   with one difference this board must state: an unshipped binding lives **here**
   with its `Coming` tag and never appears in the read-only dialog (the existing
   `Focus console  Coming  Shift+backtick` and `Toggle time slider  Coming  T` rows
   are the precedent), whereas `Cmd+S` carries no tag and therefore appears in both.

## ExplorerNotes

Screen group: nav. Canvas 1112 x 836, no activity panel, acct-4471 selected, 3D,
note markers on the canvas. No time slider and no drawer.

1. **Canvas toolbar replaces the navigation cluster (TB-1, TB-2, TB-4).**
   Region: canvas overlay layer, the block headed `<!-- NAVIGATION CLUSTER (5.6).
   Zoom to selection is enabled because acct-4471 is selected. -->` (lines 386-408).
   New content: delete the comment and the `left: 12px; bottom: 120px; width: 56px`
   element it heads and paste the **Canvas toolbar** snippet from VOCAB.md section 12
   ("### Canvas toolbar (5.6, 5.1)") verbatim at `bottom: 12px` -- this board draws
   neither the slider (82) nor the drawer (272/342). Order left to right is fixed:
   `[2D | 3D]`, divider, `Zoom out (-)`, `Zoom in (=)`, `Zoom to fit (0)`,
   `Zoom to selection (F)`, divider, `Views`. The snippet's `3D` half is already
   selected. Canvas 1112 is far above TB-3's 622 threshold, so the minimap and the
   legend stay on the 12px baseline and nothing reflows.
2. **Zoom to selection is ENABLED on this board.** Region: the new toolbar's fourth
   glyph. Change the snippet's `color: #5f6873; cursor: default;` to `color:
   #a3a8b1; cursor: pointer;` and its title from `Zoom to selection (F). Select
   something first` to `Zoom to selection (F)`. acct-4471 is selected. Do not delete
   or hide the item in either state -- the bar's item set is fixed, and a disabled
   item carries the reason in its title (floor 4).
3. **Comment: re-point both "navigation cluster" references (TB-1).** Region: (a) the
   overlay comment you rewrite in item 1; (b) the status-bar comment at line 1125,
   `<!-- No mode chip: the 2D/3D control is always visible in the canvas navigation
   cluster (MIN-8). ... -->`. New content: "canvas toolbar" in both. (b) is the
   load-bearing one: it is the justification for the deleted status-bar 3D chip, and
   it must be **re-pointed, not deleted** -- the 2D/3D control is still always
   visible, now at the bottom centre of the canvas rect.
4. **Leave the inspector Notes section exactly as drawn (POP-10).** Region:
   inspector, the block headed `<!-- Notes (5.7, 5.4). RT-6: the note body, author,
   time, mark and tag are all the user's own strings ... -->`, including the
   add-a-note input, the hovered Assistant note with its edit and delete glyphs, the
   Done box, the resting user note and its Dictated chip.
   New content: none. POP-10 is a deliberate **no**: a note's text is the user's own
   data (floor 7) and the list exists to be scanned, so it does not go behind a door,
   and its artboard line names ExplorerNotes as one of the three boards that "keep
   their inspector Notes sections inline and unchanged". The 280 note-editor pop-out
   POP-10 grants applies to the Explore panel's notes list on ExploreNotesList, not
   to the inspector. Record the refusal in the section comment so the next pass does
   not read it as an oversight.

## ExploreNotesList

Screen group: nav. Canvas 832 x 836, Explore panel open with the Notes section
expanded, nothing selected, 3D. No time slider and no drawer.

1. **The four note filter chips become one filter door on the section header
   (POP-10).** Region: activity panel, the Notes section, the block headed `<!-- The
   four filters. "Open" is active, which is the departure from all 14 notes and stays
   (floor 2). ... -->` and the 20px flex row it heads holding `Open` (active,
   `background: #28364e; border: 1px solid #4a7ee8`), `Done`, `Mine`, `Assistant`.
   New content: **delete that comment and that row** (-20px on this board; POP-10's
   -64 figure counts a tag picker and a sort control this board never drew, so record
   the honest number). In its place the RT-8 Notes header gains a resident 24px
   filter door in its trailing slot, immediately **before** the existing `More`
   glyph: `<div title="Filter notes" style="width: 24px; height: 24px; flex: 0 0
   auto; display: flex; align-items: center; justify-content: center; border-radius:
   4px; color: #d5d7da; cursor: pointer;">` holding the register's existing filter
   path `<path d="M2.5 3.5h11l-4.25 5v4.25l-2.5 1.25V8.5z"></path>` at
   `width="14" height="14"`. It is drawn at value ink `#d5d7da`, not dimmed `#7a828e`,
   because a non-default filter is active -- that is 6.11's stub obligation in the
   form POP-5 states it ("the gear draws in the primary colour whenever any hidden
   option deviates from its default"), and it matches this board's own eye glyph,
   which is at value ink because markers are on. Wrap the two trailing glyphs in
   `<div style="display: flex; gap: 4px; flex: 0 0 auto;">`. The search field row
   stays inline and unchanged. **Do not draw the pop-out open**: section H of
   DECISIONS-1.7 assigns each pop-out one drawing board and the notes filter is not
   among them.
2. **The Notes header count names the departure (POP-10 against floor 2).**
   Region: the same RT-8 header. Current content: `Notes` then the trailing count
   `14`. New content: `Notes` then `Open, 6 of 14` in the same 11px dimmed span.
   **Resolution of the collision, put it in the comment:** POP-10 writes the header
   form as "`Notes 14` or `8 of 14 visible`", but the deleted `Open` chip was carrying
   floor item 2 -- every departure named -- and "6 of 14 visible" says that a filter
   is on without saying which. Precedence rule 1 (the floor vetoes) settles it: the
   filter's name rides in the resident count string, and the door's title carries only
   `Filter notes`. A floor item may not retreat into a title.
3. **Canvas toolbar replaces the navigation cluster (TB-1, TB-2, TB-4).**
   Region: canvas overlay layer, the block headed `<!-- NAVIGATION CLUSTER (spec
   5.6): canvas overlay on the left edge above the minimap, 24px rows, top to bottom:
   ... -->` (lines 665-697). New content: delete the comment and the `left: 12px;
   bottom: 120px; width: 56px` element it heads and paste the **Canvas toolbar**
   snippet from VOCAB.md section 12 ("### Canvas toolbar (5.6, 5.1)") verbatim at
   `bottom: 12px`. This board draws the Explore panel's `Step through time` row but
   **not** the time slider bar itself, so the 82 offset does not apply; there is no
   drawer, so 272 and 342 do not apply either. Keep the snippet's selected `3D` half
   and its disabled Zoom to selection (nothing is selected). Canvas 832 is above the
   622 two-line threshold, so the minimap and the legend stay on the 12px baseline.
4. **The Schema row becomes a permanent door (POP-6).** Region: inspector, the block
   headed `<!-- SECTION: Schema, collapsed and live. The header's count takes the same
   shape as the Attributes header below it ... -->`. Current content: the closed
   chevron, `Schema`, and the trailing `4 node, 3 edge` with `title="4 node types, 3
   edge types"`. New content: the markup is unchanged -- chevron `<polyline
   points="6,4 10,8 6,12">`, name, trailing value -- but the comment now says the
   chevron stays in that closed form **permanently and never renders the open form**,
   and that the row opens the 480 Schema pop-out (drawn on Main), whose contents are
   the node type table, the edge type table, the type-pair **matrix** and the three
   actions. The trailing summary is now the door's state mark, so it may not be
   dropped by any later compaction pass.
5. **Update the status bar drop order (TB-7).** Region: the status-bar slot comments.
   Current content: `ZOOM (drops 2nd)`, `LAYOUT SLOT (name drops 3rd)`,
   `VIEWING SLOT (drops 4th)`. New content: `ZOOM (drops last)`, `LAYOUT SLOT (name
   drops 2nd)`, `VIEWING SLOT (drops 3rd)`. The zoom percentage stays in the status
   bar and never enters the toolbar.
6. **Comment: `Step through time` and `Filter builder` are already in their 1.7 form
   (POP-1, POP-2).** Region: the panel comment for the dimmed unshipped group, `<!--
   Six contiguous unshipped rows are one dimmed group under one label ... -->`.
   Current content: `Step through time` and `Filter builder` are each one 24px dimmed
   row inside that group, with their reasons in their titles.
   New content: no markup change. Add one sentence: POP-1 collapses the Explore
   panel's Step through time section from 169px to a 32px RT-8 row carrying an On
   switch and a settings gear, and POP-2 cuts the filter builder from 567px to about
   180 with one rule pop-out -- **neither has anything to remove here**, because both
   are unshipped rows in the dimmed run and an unshipped row carries no switch, no
   gear and no key chip (5.8, register section 3). Do not add a gear to a dimmed row.
7. **Comment: the note editor becomes a pop-out (POP-10).** Region: the note-row
   comment, `<!-- RT-6 list: 6 open notes whose targets are in the graph, newest
   first, 4 in view ... -->`. Current content: the first row is drawn hovered with
   mark-done, `Edit` and delete revealed. New content: the rows and the three glyphs
   are unchanged and the `Edit` title stays `Edit`; add that it now opens a 280
   note-editor pop-out anchored to its row rather than growing the row in place, that
   the opener stays hover-revealed on desktop (hover reveals the opener, never opens
   the pop-out), that Escape closes it and returns focus to the opener, and that Up
   and Down re-target it without closing it. The pop-out is not drawn on this board.
8. **Comment: no library section is added to this panel (SAV-1).** Region: the panel
   content comment. Add one line: SAV-1's five library sections land on the boards its
   artboard list names, which does not include this one; the Explore panel here keeps
   the `Bookmarks` row inside the dimmed unshipped run. Recording the omission stops a
   later pass reading it as a miss.

## ExplorerLoading

Screen group: nav. Canvas 832 x 836, Analyze panel open mid-load (48,000 of 120,000
nodes), nothing selected, 3D. No time slider and no drawer.

1. **The Schema section collapses to a door whose stub reports the computation
   (POP-6).** Region: inspector, the block headed `<!-- SECTION: Schema. "so far" on
   the header reports the load state and is kept. ... -->` (lines 2939-2972).
   Current content: a 32px header reading `Schema` plus a dimmed `so far`, drawn with
   the **open** chevron `<polyline points="4,6 8,10 12,6">`, over an inline column of
   four 22px type rows -- `process 27,900`, `host 9,400`, `user 6,200`, `ip 4,500` --
   and an 8px spacer.
   New content: **delete the whole rows container** (the `<div style="display: flex;
   flex-direction: column;">` holding the four rows and the spacer, lines 2953-2971):
   -96px in the inspector column. Change the header chevron to the closed
   right-pointing form `<polyline points="6,4 10,8 6,12">`, which it now keeps
   permanently. Change the name span from `Schema <span style="color:
   #7a828e;">so far</span>` to plain `Schema`, and add as the header row's second
   child the trailing state mark `<span style="flex: 0 0 auto; font-size: 11px;
   line-height: 1.2; color: #7a828e; white-space: nowrap;">measuring...</span>` (the
   header already has `justify-content: space-between`).
   **Resolution of the collision, put it in the comment:** POP-6 makes the stub carry
   `measuring...` mandatory, because the schema numbers come from SchemaExtractor and
   are not always ready and a door must not hide the fact that the data is not there;
   the existing dimmed `so far` says the same thing on the same row, and Rule 8 and
   Rule 9 forbid saying it twice. `measuring...` is the more precise of the two and
   wins; `so far` goes. Nothing is lost from the floor -- the load state is still
   named, resident, in words. Snippet: the RT-8 door stub in VOCAB.md section 12,
   "### Pop-out container, anchored form (6.11, 6.2 tier 3a)", second code block.
2. **Canvas toolbar replaces the navigation cluster (TB-1, TB-2, TB-4).**
   Region: canvas overlay layer, the block headed `<!-- NAVIGATION CLUSTER (spec
   5.6): canvas overlay on the left edge above the minimap, 24px rows, top to bottom:
   ... -->` (lines 2668-2700). New content: delete the comment and the `left: 12px;
   bottom: 120px; width: 56px` element it heads and paste the **Canvas toolbar**
   snippet from VOCAB.md section 12 ("### Canvas toolbar (5.6, 5.1)") verbatim at
   `bottom: 12px` -- no slider, no drawer on this board. Keep the snippet's selected
   `3D` half and its disabled Zoom to selection (nothing is selected). Canvas 832 is
   above the 622 two-line threshold, so the density-heatmap minimap and the legend
   stay on the 12px baseline. The bar is drawn in full even while the graph is still
   building: the item set is fixed and the bar leaves only when the Data table drawer
   is maximised to the full canvas height, which is not this board's state.
3. **Update the status bar drop order (TB-7).** Region: the status-bar slot comments.
   Current content: `ZOOM (drops 2nd)`, `LAYOUT SLOT (name drops 3rd)`,
   `VIEWING SLOT (drops 4th)`. New content: `ZOOM (drops last)`, `LAYOUT SLOT (name
   drops 2nd)`, `VIEWING SLOT (drops 3rd)`. The Building-phase layout chip and its
   Cancel are untouched.
4. **Comment: re-point every "navigation cluster" reference (TB-1).** Region: three
   places -- the file comment at line 19 ("the canvas, minimap, legend, navigation
   cluster, top bar and status bar are unchanged"), the status-bar comment at line
   3027 ("The 2D / 3D state lives on the canvas navigation cluster, which is where it
   is changed"), and the overlay comment you rewrite in item 2. New content: "canvas
   toolbar" in all three. Line 3027 is the justification for having no mode chip and
   must be **re-pointed, not deleted**. Line 19's claim that the canvas is unchanged
   is no longer true and becomes "the canvas gains the bottom-centre toolbar in place
   of the left-edge cluster; the minimap, legend, top bar and status bar are
   otherwise unchanged".

## ExplorerLargeGraph

Screen group: nav. Canvas 832 x 836 in Performance mode (120,418 nodes), Analyze
panel open with a pinned Bridges result, nothing selected, 3D. No time slider and no
drawer. Two centred canvas overlays already exist -- the Insights strip at `top:
12px` and the filter strip at `top: 140px` -- both at the **top**, so neither
collides with the bar.

1. **Canvas toolbar replaces the navigation cluster (TB-1, TB-2, TB-4).**
   Region: canvas overlay layer, the block headed `<!-- NAVIGATION CLUSTER (5.6),
   copied from SHELL-SKELETON.html. Zoom to selection disabled: nothing is selected.
   -->` (lines 2818-2840). New content: delete the comment and the `left: 12px;
   bottom: 120px; width: 56px` element it heads and paste the **Canvas toolbar**
   snippet from VOCAB.md section 12 ("### Canvas toolbar (5.6, 5.1)") verbatim at
   `bottom: 12px`. Keep the snippet's selected `3D` half and its **disabled** Zoom to
   selection with `title="Zoom to selection (F). Select something first"` -- floor 4,
   the reason a disabled control is disabled, and the reason the item is drawn
   permanently rather than appearing with the selection. Canvas 832 is above the 622
   two-line threshold, so the heatmap minimap and the legend stay on the 12px
   baseline. Record in the comment that the filter strip `Drawing 500k of 1.1M edges
   (highest weight first). Show all` stays at `top: 140px` and is not moved: it is a
   report about the render set, not a navigation control, and the bar's item set is
   fixed.
2. **The Schema row becomes a permanent door (POP-6).** Region: inspector, the block
   headed `<!-- RT-8, collapsed: node types with counts, edge types, type pairs. Rule
   9 lifts the repeated word "types" out of the first half of the summary; the header
   title keeps it in full. -->`. Current content: the closed chevron `<polyline
   points="6,4 10,8 6,12">`, `Schema`, the summary `4 node, 6 edge types`, and
   `title="4 node types, 6 edge types"` on the header row. New content: markup
   unchanged; the comment now says the chevron keeps the closed form **permanently
   and never renders the open form**, that the row opens the 480 Schema pop-out
   (drawn on Main) whose type-pair list is drawn as a matrix, and that the summary is
   now the door's state mark and may not be compacted away.
3. **Comment: the run record's Details opens a 360 pop-out (POP-7).** Region: the
   activity panel, PINNED LATEST RESULT, the floor-3 run record row `2026-09-04
   14:12, 41 s` with its 12px `Details` chevron, and the comment above it that lists
   what Details holds. Current content: the comment describes Details as a
   disclosure inside the card. New content: **nothing is removed from the panel** --
   the one-line record stays exactly as drawn, dimmed, and the chevron keeps its
   title `Details`. Add to the comment: Details now opens a 360 3a pop-out headed
   with the result's own title, anchored as an activity-panel pop-out (opens right,
   left edge at `x = 336`, 8px clear of the panel's 328 edge), holding the weight
   attribute and its meaning, direction, every parameter including seed and sample
   size, scope with counts, timestamp, duration, the algorithms package version, and
   the copy control whose menu holds Copy as JSON, Copy as command and Copy methods
   text; opening it no longer pushes the shape body and the action block off screen.
   The sentence that must survive verbatim: the run record is never placed behind an
   info circle, because a pop-out is disclosure by tier and a circle is disclosure by
   explanation. One pop-out per region, so this one and any inspector pop-out are
   mutually exclusive. The pop-out is not drawn on this board.
4. **Comment: what POP-2 changes and does not change here.** Region: the Insights
   strip card `Filter builder (Explore)` / `Filter by type, attribute, or a result you
   have already run.` Current content: the card's copy. New content: the card's copy
   is unchanged. Add one sentence recording that the surface it opens is now the
   compacted builder -- scope, Hide others / Select matches, Match all / Match any,
   one 32px row per rule with its own match count in the trailing slot and an X to
   remove it, the neighbors row, `+ Rule` and the live `38 of 318 would match` line --
   with the per-rule editing controls in a 360 pop-out anchored to the rule row, and
   the Builder / Expression door moved to the section header. This board draws none
   of it; the note keeps the card honest about its destination.
5. **Comment: re-point the "navigation cluster" reference (TB-1).** Region: the
   overlay comment you rewrite in item 1. New content: "CANVAS TOOLBAR (5.6, 5.1)",
   with the bottom offset ladder (12 / 82 / 272 / 342) and this board's value, 12.

## SettingsPerformance

Screen group: nav. Canvas 832 x 836 (security-events-120k.csv, Performance mode on),
nothing selected, 3D. The Settings overlay covers the whole body row right of the
rail, so the canvas overlays are **occluded**. Make the swap anyway: the shell
beneath must be identical to every other board.

1. **Canvas toolbar replaces the navigation cluster (TB-1, TB-2, TB-4).**
   Region: canvas overlay layer, the block headed `<!-- NAVIGATION CLUSTER (spec
   5.6): canvas overlay on the left edge above the minimap, 24px rows, top to bottom:
   ... -->` (lines 192-224). New content: delete the comment and the `left: 12px;
   bottom: 120px; width: 56px` element it heads and paste the **Canvas toolbar**
   snippet from VOCAB.md section 12 ("### Canvas toolbar (5.6, 5.1)") verbatim at
   `bottom: 12px` -- no time slider and no drawer on this board. Order left to right
   is fixed: `[2D | 3D]`, divider, `Zoom out (-)`, `Zoom in (=)`, `Zoom to fit (0)`,
   `Zoom to selection (F)`, divider, `Views`. Keep the snippet's selected `3D` half
   and its disabled Zoom to selection. Add one line to the comment saying the bar
   renders beneath the Settings overlay and is occluded by it, exactly as the cluster
   it replaces was, so this board is not evidence about the bar's appearance.
2. **Update the status bar drop order (TB-7).** Region: the status-bar slot comments.
   Current content: `ZOOM (drops 2nd)`, `LAYOUT SLOT (name drops 3rd), one 16px chip
   with a caret (NAV-12 item 1)`, `VIEWING SLOT (drops 4th)`, `AI STATUS (drops
   1st)`. New content: `ZOOM (drops last)`, `LAYOUT SLOT (name drops 2nd)`,
   `VIEWING SLOT (drops 3rd)`; `AI STATUS (drops 1st)` unchanged. The order is now AI
   status, layout name, Viewing, zoom. The zoom percentage stays in the status bar and
   never enters the toolbar: the bar sits 12px above the status bar so the number is
   already adjacent to the buttons that change it, and a numeric readout would change
   a centred bar's width as the graph is zoomed.
3. **Comment: re-point every "navigation cluster" reference (TB-1).** Region: three
   places -- the file comment at line 20 ("5.6 (navigation cluster, zoom percentage,
   mode chip)") and line 27 ("the canvas gains the navigation cluster above the
   minimap (5.6)"), and the status-bar comment at line 424 (`<!-- MODE CHIP deleted
   (MIN-8): 2D and 3D are canvas controls, not a status report; the navigation cluster
   owns them. ... -->`). New content: "canvas toolbar" in all three. Line 424 is the
   justification for the deleted mode chip and must be **re-pointed, not deleted**:
   the 2D / 3D segmented control is still a canvas control, now at the head of the
   bottom-centre bar, and the VR or AR chip still fills that slot during a session.
4. **Comment: `Import everything anyway always stays.` keeps its words and changes
   its referent (IMP-5).** Region: the Thresholds and loading block, the 11px line
   under `Measured 4 Sep 18:02 on Apple M2 Pro, 8 cores, 8 GB.`
   Current content: `Import everything anyway always stays.` New content: the
   sentence is unchanged -- do not edit or delete it. Add one line to the block's
   comment: IMP-5 deletes ImportLargeFile's separate `Import everything anyway`
   footer button and its inline link, so the affordance this sentence promises is now
   the **Everything option** in the dialog's Load control plus the primary button,
   which relabels to `Import everything anyway` when Everything is chosen. The
   capability survives, offered once rather than three times, so the escape clause
   remains true and remains floor item 4.
5. **Comment: the ask and warn limits now gate a second entry point (STY-6).**
   Region: the two rows `Ask before runs estimated over  10  s` and `Warn on exact
   runs estimated over  30  min`. Current content: unchanged, both numbers stay.
   New content: no markup change. Add one line to the section comment: a parameter
   row in an analysis-backed style layer's `Source` section is live, and a re-run
   started from it uses **these same three bands** -- under 2s it starts on release
   with no button, from 2s to this ask limit it draws one line and two verbs
   (`Granularity 3.0 takes about 8 s. Colors still show granularity 2.5. / Run and
   use it / Cancel`), above the ask limit the estimate moves onto the verb, and above
   this warn limit the section carries the section 3 warning line. Same queue, same
   progress row, same history entry, same cost model as a run started in Analyze;
   only the entry point differs. Above the large-graph threshold the existing
   batched-style-edit Apply button and `Run and use it` must be **one gate, not two
   buttons in sequence**.

## CompareSplit

Board: `CompareSplit.dc.html`, 1440x900, Analyze panel (Results tab) + split canvas 832x836 + inspector.
Decisions landing here: TB-1, TB-2, TB-3, TB-4, TB-8, POP-7, POP-13b.

1. **Canvas overlays, bottom band -- delete the navigation cluster.** Region: canvas, line ~878-900, the block commented `NAVIGATION CLUSTER (spec 5.6), one cluster because the views are linked`. Current content: a 56 px wide vertical column at `left: 12px; bottom: 120px` holding the 2D/3D segmented pair, Zoom to fit, Zoom to selection, Zoom in, Zoom out, Views (caret down). New content: delete the whole block. Nothing replaces it in the left edge; the freed 56x160 column becomes canvas (TB-3).

2. **Canvas overlays, bottom band -- insert the canvas toolbar.** Region: canvas, in place of the deleted cluster. New content: the VOCAB.md section 12 snippet **"Canvas toolbar (5.6, 5.1)"**, copied verbatim, at `left: 50%; bottom: 12px; transform: translateX(-50%)`, 246x36. The bottom offset is **12**: this board draws no time slider and no Data table drawer, so it is the plain case of A1's four offsets. Two edits to the snippet as copied: (a) **Zoom to selection is ENABLED** here -- acct-4471 is selected in both halves -- so that item's `color` becomes `#a3a8b1`, its `cursor` becomes `pointer`, and its title becomes `Zoom to selection (F)` with no second sentence; (b) leave 3D as the selected half of the segmented pair, which is what the board already draws.

3. **Canvas overlays, bottom band -- the three-box collision, resolved.** Region: canvas, the minimap (line ~904, `left: 12px; bottom: 12px`, 160 wide), LEGEND A (line ~1053, `left: 244px; bottom: 12px`, 160 wide) and LEGEND B (line ~1087, `right: 12px; bottom: 12px`, 172 wide). This is the one board in the set with **three** boxes on the 12 px baseline, and a centred 246 px bar spans canvas x 293..539, which runs straight through LEGEND A at 244..404. TB-3's arithmetic for two boxes (`172 + 16 + 246 + 16 + 172 = 622`) becomes `172 + 16 + 160 + 16 + 246 + 16 + 184 = 810` here, against 832 of canvas, and LEGEND A cannot move left without hitting the minimap. **Resolution chosen: TB-3's two-line rule fires on this board.** Change `bottom: 12px` to `bottom: 60px` on all three boxes -- minimap, LEGEND A and LEGEND B -- so they share one raised baseline and the bottom band belongs to the toolbar alone. Do not move the toolbar and do not shrink or hide a legend: the legend is floor item 5. Record the trigger in the file comment: three boxes, not canvas width, is what fires the rule here.

4. **Analyze panel, result card A -- the run record Details becomes a pop-out opener.** Region: line ~208-213, the RT-10 run record row reading `Resolution 0.5, seed 42` with the 16 px `Details` chevron. Current content: the chevron's comment says Details "holds" the full record inline. New content: the line itself is unchanged (floor 3 keeps it exactly as drawn); the chevron now opens a **360 px activity-panel pop-out** headed with the result's own title `Groups` and `Communities (Louvain)` dimmed beside it, at `left: 336px`, top aligned to the run record row, per the VOCAB.md section 12 **"Pop-out container, anchored form"** snippet. Do **not** draw the pop-out open on this board (the shell is drawn at 360 on ValidationPopout and GroupProfilePopout; POP-7's pop-out is drawn nowhere). Keep the chevron in the closed right-pointing form permanently (POP-13b). Update the comment above the row from "Details holds:" to "Details opens a 360 pop-out holding:", keeping the same content list.

5. **Analyze panel, result card B -- same change.** Region: line ~259-266, the run record row reading `Resolution 1.5, seed 42` and its `Details` chevron, plus the comment above it that begins "Details holds: Louvain, resolution 1.5, seed 42." Same edit as item 4, with card B's own record. Add one sentence to the comment: only one pop-out may be open in the activity panel at a time, so opening card B's record closes card A's (POP-0, one per region).

6. **Views trigger -- caret flips up.** Region: inside the toolbar inserted at item 2. The VOCAB snippet already carries the up-caret (`polyline points="3,10 8,5 13,10"`); verify the deleted cluster's down-caret (`points="3,6 8,11 13,6"`) does not survive anywhere. The menu opens **upward**, bottom edge 4 px above the bar, clamped 12 px inside the canvas edges (TB-8). This board prints no Views menu list, so no menu row is added here.

7. **File comment -- rename the mechanism.** Region: the head comment, line 20: `5.6 (navigation cluster, mode chip)`. New content: `5.6 (canvas toolbar, mode chip)`. Same rename in the item-2 region comment: `NAVIGATION CLUSTER (spec 5.6), one cluster because the views are linked` becomes `CANVAS TOOLBAR (5.6, TB-1). One bar, centred on the full two-view canvas, because the views are linked (TB-1 names this board).`

8. **File comment -- record the 1.7 pass.** Region: the head comment, after the "Compaction 1.6" paragraph. New content: one paragraph naming what 1.7 changed on this board -- the navigation cluster became the bottom-centre canvas toolbar at offset 12 (TB-1, TB-2, TB-4); the minimap and both legends rose to `bottom: 60` because three boxes share this board's baseline (TB-3); both cards' run-record Details now open a 360 pop-out rather than expanding inline, and neither is drawn open (POP-7). State that no word on the canvas, in the compare toolbar, in the diff legend or in the status bar changed.

## MultiSelection

Board: `MultiSelection.dc.html`, 1440x900, Explore panel + canvas 832x836 + inspector with pinned card A.
Decisions landing here: POP-9, POP-12a/A3 cut 2, SAV-7, SAV-1, SAV-2, POP-3, POP-1, POP-10, TB-1..TB-4, TB-7, TB-8.

1. **Inspector, Selection statistics -- the numeric table pops out; the shared rows stay.** Region: line ~1236-1305, the section headed `Selection statistics` with its Export CSV icon, the `Selection | A | Graph` column headings, the four aggregate rows (Nodes, Edges, Average links, Average amount) and, below them, the `shared` caption with the `country RO 7/7` and `risk_flag true 6/7` rows. POP-9 fires on this board because the pin is active and the third column is drawn. **Collision, and how it is resolved:** POP-9 would take the whole section behind a door, but the two `shared` rows are the user's own attribute names and values, and A3's cut 1 (POP-9b) forbids putting a scan surface made of floor-7 data behind a door. So the section **splits**: the four aggregate rows and their column headings go into the pop-out; the `shared` caption and its two rows **stay inline**, directly under the stub. New content in the inspector column, replacing the header + headings + four rows: the RT-8 **door stub** from the VOCAB.md section 12 "Pop-out container, anchored form" snippet (the second code block), with the name `Selection statistics` at value ink, the chevron in the permanently closed right-pointing form, and the trailing slot carrying the count `4` (the four aggregate rows behind the door). Title on the stub row: `Selection statistics. 4 rows, compared with acct-4471 and the whole graph`. Delete the hover-revealed Export CSV icon from this header -- it moves into the pop-out (item 2).

2. **Inspector -- draw the 360 selection-statistics pop-out.** Region: a new last child of the artboard root div. First add `position: relative;` to the root `<div style="width: 1440px; height: 900px; ...">` at line ~44, which the board does not currently have and which the pop-out's absolute positioning needs. New content: the VOCAB.md section 12 "Pop-out container, anchored form" 360 shell, at `left: 792px; top: 203px; width: 360px` (an inspector pop-out opens left with its right edge 8 px clear of the inspector's 1160 edge: 1160 - 8 - 360 = 792; the top aligns to the stub row). Header: `Selection statistics` with `7 nodes and 4 edges` dimmed beside it, the pin toggle and the close X titled `Close (Esc)`. Body: one heading row `attribute | Selection | A | Graph | difference` and the four aggregate rows carried over verbatim -- Nodes 7 / 1 / 200, Edges 4 / -- / 612, Average links 9.4 (up arrow) / 37 / 6.1, Average amount 4,600 (up arrow) / 2,910 / 1,880 -- plus a `difference` column, and one resident action `Export CSV` at the foot. Actions inside a pop-out are **resident, not hover-revealed** (the VOCAB snippet's own override of RT-7). While it is open the stub row carries the selected-row background `#28364e`. Height about 184.

3. **Explore panel, Selection sets -- the four combine verbs leave the row for its context menu.** Region: line ~340-380, the hovered `Mule candidates` card. Current content: a 28 px name row with the hover triple Edit / Show on canvas / Delete set, and beneath it a 22 px second line of four blue text links `Replace  Union  Intersect  Subtract`. New content: **delete the entire second line**. A3's cut 2 reclassifies the five set verbs as the row's context menu, because a pop-out is for parameters and reports and a menu is for verbs. The card becomes a single 28 px row and loses 22 px plus its bottom padding.

4. **Explore panel, Selection sets -- the row triple takes SAV-7's fixed form.** Region: the same hovered card, the three 22 px glyphs. Current content: Edit (pencil), Show on canvas (eye), Delete set (trash). New content: **rename the first to `Rename`, leave the middle slot EMPTY, keep the trash** -- SAV-7's application-wide triple is rename, nothing, delete, which is exactly what the VOCAB.md section 12 "Save and load control pair" **library row** snippet draws (`<div style="width: 24px; height: 24px; flex: 0 0 auto;"></div>` in the middle). `Show on canvas` moves into the context menu with the combine verbs. **Collision named:** the board's 1.6 comment asserts "the fixed triple appears in the order edit, visibility, delete"; SAV-7 supersedes it for library rows, and the library-row snippet is the drawing.

5. **Explore panel, Selection sets -- print the new context menu.** Region: the comment above the sets rows, line ~340-347, which currently lists "Edit, Show on canvas, Delete set, Replace, Union, Intersect, Subtract, Filter to set". New content: the same list re-ordered to SAV-7 plus A3 cut 2, in full text and as the touch twin: `Rename / Duplicate / Update from current / Show on canvas / Replace / Union / Intersect / Subtract / Filter to set / Export set (JSON) / Delete set`. Add one sentence: on a touch pointer the row's verbs are resident, per RT-7.

6. **Explore panel, Selection sets -- the header becomes a library header.** Region: line ~321-338, the 28 px sub-header row `Selection sets` with the bookmark glyph titled `Save as set...` and the More glyph. New content: rebuild it from the VOCAB.md section 12 "Save and load control pair" **library header** snippet -- name `Selection sets` at value ink, an info circle titled `Saved in this browser on this computer. Export a file to move it.` (SAV-3), then the trailing pair: the section **overflow** (three dots) and a resident 24 px **`+`** titled `Save selection as set...`. **Collision named:** SAV-2 says the save verbs keep their text and notes the bookmark glyph's existing reuse; SAV-1 and the VOCAB library-header snippet both draw a `+` whose verb text lives in its title. The `+` wins -- it means "add to this list", not "save", so REGISTER-1.5 1.6's no-save-glyph rule is not breached -- and the bookmark glyph is deleted from this header. SAV-2 keeps the longer form `Save selection as set...` because "selection" names the source.

7. **Explore panel, Selection sets -- the overflow verbs are renamed.** Region: the same header's More menu, listed in the comment at line ~322-325 as `Import sets (JSON)` and `Export sets (JSON)`. New content: `Import set...` and `Export set (JSON)`, the two text items SAV-1 puts in a library section overflow, in the kind noun SAV-2 registers (`set`). Keep them as text, never glyphs.

8. **Inspector, actions -- one title follows the same rename.** Region: line ~1370, the bookmark glyph in the pinned action row titled `Save as set...`. New content: title becomes `Save selection as set...`, so the two paths to one verb print one string.

9. **Explore panel, Step through time -- no gear, and say why.** Region: line ~256-267, the `Step through time` switch row inside the first "Coming soon" run. POP-1 collapses this section to a 32 px RT-8 row carrying the On switch and a settings gear -- this board already draws the 32 px row, so only the gear is at issue. **Collision, resolved: the gear is NOT drawn here.** REGISTER-1.5 section 3 forbids an icon-only control inside a contiguous unbuilt run, and this row is the third member of one. Leave the row exactly as drawn, including its title `Step through time (T). Temporal navigation. Not built yet` -- the `T` there is 5.6's toggle binding, which the row does own, so POP-13a's removal of the key chip from the *settings* glyph does not touch it. Record the reason in the region comment.

10. **Inspector, Notes -- explicitly unchanged.** Region: line ~1307-1337, the Notes section with its scoped placeholder and the one note on acct-4471. POP-10 names this board: its inspector Notes section stays **inline and unchanged**. Do not add a filter door, do not move the note row into an editor pop-out, do not touch the note text or the eye glyph. Add one clause to the section comment recording that POP-10 declined the 380 px removal on principle: note text is floor item 7 and the list exists to be scanned.

11. **Canvas -- delete the navigation cluster, insert the canvas toolbar.** Region: line ~696-729, the block commented `NAVIGATION CLUSTER (spec 5.6): canvas overlay on the left edge above the minimap ... Bottom offset = minimap bottom 12 + minimap height 100 + 8 gap = 120`. New content: delete the whole block and its offset arithmetic; insert the VOCAB.md section 12 **"Canvas toolbar"** snippet at `left: 50%; bottom: 12px; transform: translateX(-50%)`. Bottom offset **12** -- no time slider (the Viewing slot is empty) and no Data table drawer on this board. **Zoom to selection is ENABLED**: seven nodes and four edges are selected, so that item takes `color: #a3a8b1`, `cursor: pointer` and the bare title `Zoom to selection (F)`.

12. **Canvas -- confirm no reflow.** Region: minimap at `left: 12px; bottom: 12px` (160 wide) and legend at `right: 12px; bottom: 12px` (160 wide). The centred 246 px bar spans canvas x 293..539; the minimap ends at 172 and the legend begins at 660, giving 121 px of clearance each side against TB-3's 16 px minimum. Leave both at `bottom: 12px` -- the two-line rule does not fire at 832 px of canvas (its threshold is 622). Record the two clearances in the region comment so a later resize does not silently eat them.

13. **Canvas -- the Views menu gains a Toolbar row.** Region: line ~723, the comment `Views menu trigger: Reset view, Top, Front, Side, Isometric, Follow selection, Save view..., Show minimap, Show legend, Enter VR, Enter AR`. New content: insert `Toolbar` between `Show minimap` and `Show legend`, checked, following RT-5's verbs-out form (TB-8). Add one sentence: hiding the toolbar hides its own Views menu, so the way back is the command palette row `Show canvas toolbar`; the toolbar takes no key binding.

14. **Status bar -- zoom moves later in the drop order.** Region: line ~1389 and the three slot comments. Current content: `Overflow order (5.1): slots drop from right to left as AI status, then zoom, then layout name, then Viewing`, with `ZOOM (drops 2nd)`, `LAYOUT SLOT (name drops 3rd)` and `VIEWING SLOT (drops 4th)`. New content: `Overflow order (5.1): slots drop from right to left as AI status, then layout name, then Viewing, then zoom`, with `ZOOM (drops 4th)`, `LAYOUT SLOT (name drops 2nd)` and `VIEWING SLOT (drops 3rd)`. TB-7: zoom is now the only camera fact in the bar and the toolbar shows four zoom controls with no readout, so it may not be the second thing to go. No pixel changes.

15. **Status bar -- the issues chip points at the pop-out.** Region: line ~1430-1431, the comment `Clicking opens Data with the report expanded`. New content: `Clicking opens Data with the Validation report pop-out open (POP-3).` Add the sentence POP-3 requires: the status bar chip is a global alarm and the stub row's count is the door's state mark, so the two are not a repeat.

16. **File comment -- rename the mechanism and record the 1.7 pass.** Region: the head comment, lines 19, 26 and 37, each of which says "navigation cluster". New content: "canvas toolbar" in all three, and the sentence at line 26 becomes "the canvas gains the bottom-centre canvas toolbar (5.6, TB-1)". Then add a 1.7 paragraph: Selection statistics split -- four aggregate rows into a 360 inspector pop-out, the two shared-attribute rows kept inline on floor 7 (POP-9 with A3 cut 1); the set row's combine verbs became its context menu (A3 cut 2) and its triple took SAV-7's rename / empty / delete form; the sets sub-header became a library header with a resident `+` (SAV-1, SAV-2, SAV-3); the navigation cluster became the toolbar at offset 12 (TB-1..TB-4); zoom moved later in the status bar drop order (TB-7). Note the two deliberate no-changes: Notes stays inline (POP-10) and Step through time gains no gear (register 3).

## HistoryPopover

Board: `HistoryPopover.dc.html`, 1440x900, Analyze panel (Results tab, History expanded) + canvas 832x836 + inspector + the 440 px History popover.
Decisions landing here: SAV-8, SAV-1, SAV-2, POP-7, STY-1, TB-1..TB-4, TB-8.

1. **Analyze panel -- add a Recipes library section directly under History.** Region: after the History section's `12 entries / Clear history...` RT-7 row at line ~397-406, inside the same scroll region. New content: a new RT-8 library section built from the VOCAB.md section 12 "Save and load control pair" **library header** snippet, in Rule 7c's one-row empty form: a 1 px divider, then a 32 px header whose name `Recipes` is at **chrome ink** `#7a828e` (the library holds nothing yet), an info circle titled `Saved in this browser on this computer. Export a file to move it.`, and the trailing pair -- the section overflow (three dots) and a resident 24 px **`+`** titled `Save as recipe...`. No content rows, no `Not set`, no empty-state sentence. Total cost 33 px, which is exactly SAV-8's Direction line. In the region comment record the row form for when the library fills: name, step count, date in the trailing slot, click replays on the current data; and the section overflow's two text items `Import recipe...` and `Export recipe (JSON)`.

2. **Analyze panel, History header -- the recipe verbs leave.** Region: line ~275-283, the History section header's trailing glyph row. Current content: Export history (JSON), **Save as recipe** (bookmark glyph), Copy as commands, More. New content: **delete the bookmark glyph** -- SAV-8 moves creation to the `+` one section down, because a recipe is created where the steps are and listed where the kind lives. The header keeps Export history (JSON), Copy as commands and More, in that order.

3. **Analyze panel, History overflow -- retire `Import and replay`.** Region: the comment at line ~258-262, `More menu, full text (6.8 twin, mandatory): Replay all on current data (Coming) / Export as script (Coming) / Copy as methods text / Import and replay... (Coming)`. New content: drop `Import and replay... (Coming)` -- SAV-2 retires the phrase in favour of `Import recipe...`, which now lives in the Recipes section overflow. The menu becomes `Replay all on current data (Coming) / Export as script (Coming) / Copy as methods text`. History keeps Replay all, Export history, Export as script, Copy as commands, Copy as methods text and Clear history and nothing else (SAV-8).

4. **Inspector -- the open run-record Details block closes and becomes a pop-out.** Region: line ~835-853, the run record line with its Details chevron drawn **OPEN** and the disclosed block beneath it (the full record plus the Copy menu). This board is the only one in the set that draws that block expanded inline. New content: **close the chevron** and delete the disclosed block from the inspector column; the one-line run record above it stays exactly as drawn (floor 3). The chevron now opens a **360 px inspector-region pop-out** headed with the result's own title, at `right edge 1152 / left: 792px`, per the VOCAB.md section 12 "Pop-out container, anchored form" snippet, holding the weight attribute and its meaning, direction, every parameter including seed and sample size, scope with counts, timestamp, duration, the algorithms package version, and the copy control whose menu holds Copy as JSON / Copy as command / Copy methods text. Move the disclosed block's text verbatim into the region comment as the pop-out's contents. **Do not draw the pop-out open:** the History popover already occupies x 554..994 from y 44 downward and a pop-out at 792..1152 anchored to a run-record row about y 200 would sit on top of it; POP-7's shell is drawn nowhere in the set by design (the Rejected table). Keep the chevron in the permanently closed right-pointing form (POP-13b). **Note in the comment that this board's 1.6 claim -- "the one board in the set that shows what is behind that chevron" -- is retired by POP-7, and that the height it releases is the push-down POP-7 exists to remove.** POP-7 does not name this board in its artboard list; it is applied here because this is the only board where the difference is visible, and leaving it open would contradict POP-7 on the one screen that shows it.

5. **Canvas -- delete the navigation cluster, insert the canvas toolbar.** Region: line ~663-686, the block commented `NAVIGATION CLUSTER (5.6)` at `left: 12px; bottom: 120px`. New content: delete it; insert the VOCAB.md section 12 **"Canvas toolbar"** snippet at `left: 50%; bottom: 12px; transform: translateX(-50%)`. Bottom offset **12** -- no time slider, no drawer. **Zoom to selection stays DISABLED**: nothing is selected on this board, so keep the snippet's own disabled form, `color: #5f6873`, `cursor: default`, title `Zoom to selection (F). Select something first` -- which is the string the deleted cluster already carried, so nothing changes but the position.

6. **Canvas -- the preview banner collides with the toolbar; raise the banner.** Region: line ~655-662, the preview banner at `position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%)`, 28 px tall, drawn because a History row is hovered. The canvas toolbar is now also bottom-centre at `bottom: 12px`, so the two occupy the same point. **Resolution chosen: the banner rises, the toolbar does not.** Change the banner to `bottom: 60px` -- 12 (toolbar offset) + 36 (toolbar height) + 12 (gap). The toolbar keeps its 12 px offset because A1 fixes that offset to four states (12 / 82 / 272 / 342) and a transient hover banner is not one of them; the banner is the conditional object and therefore the one that moves. Record the arithmetic in the banner's comment, and change its comment from `preview banner, bottom center between the minimap and the legend` to `preview banner, bottom centre, riding 12 px above the canvas toolbar`.

7. **Canvas -- confirm no reflow.** Region: minimap `left: 12px; bottom: 12px` (160 wide, line ~688) and legend `right: 12px; bottom: 12px` (160 wide, line ~762). The 246 px bar spans canvas x 293..539; clearances 121 px each side. Both stay at `bottom: 12px`; the two-line rule does not fire (threshold 622, canvas 832). Record the two clearances in the region comments.

8. **History popover -- the two Style entries name their new destination.** Region: line ~1045 (`3 (undone): Style layer "Hubs" edited, Style`) and line ~1062 (`5: Encoded Groups as style, Style`), and their row titles. New content: STY-1 amends the History row rule -- "opens the step's home panel" now has two candidate homes, and an encoding change opens **Style with its layer selected** while a run opens Analyze at its card. Add that destination to each of the two rows' titles (for example `Encoded Groups as style. Opens Style with the Groups layer selected`) and to the entries at 4 and 6 (`Ran Bridges (betweenness). Opens Analyze at its card`). No pixel change, no new row. Add one sentence to the popover's head comment: a History row still never re-runs anything.

9. **Views menu -- caret and the Toolbar row.** Region: the toolbar inserted at item 5. The VOCAB snippet carries the up-caret already; the menu opens upward, bottom edge 4 px above the bar, clamped 12 px inside the canvas edges (TB-8). This board prints no Views menu list, so no list edit is needed; record the upward anchoring in the toolbar's region comment.

10. **File comment -- rename the mechanism and record the 1.7 pass.** Region: the head comment at line 29 ("the canvas drawing, the minimap, the legend and the status bar are untouched") and line 949 (`no mode chip (MIN-8): 3D is the default and the navigation cluster already shows the 2D / 3D toggle`). New content: line 949 becomes `... and the canvas toolbar already shows the 2D / 3D toggle`. Add a 1.7 paragraph: the navigation cluster became the bottom-centre canvas toolbar at offset 12 and the preview banner rose to 60 to clear it (TB-1..TB-4); a `Recipes` library section arrived under History in its empty 33 px form and History gave up `Save as recipe` and `Import and replay` (SAV-8, SAV-2); the inspector's run-record Details block closed and now opens a 360 pop-out, which is why this board no longer shows the disclosed record (POP-7). State the word delta honestly: the popover, the canvas, the minimap, the legend and the status bar are otherwise untouched.

## AnalyzeSweep

Board: `AnalyzeSweep.dc.html`, 1440x900, Analyze panel (Run tab, Advanced open on Run as sweep) + canvas 832x836 + inspector (Sweep summary).
Decisions landing here: POP-5, STY-2, STY-5, POP-7, POP-12c, TB-1..TB-4, TB-8, POP-13b.

1. **Analyze panel, Groups run card -- the Advanced block leaves the card for a 280 pop-out.** Region: line ~230-256, the block commented `The Advanced block, open on Run as sweep`, drawn inline inside the card with a border and holding: the `Run as sweep` title with the Values / Range segmented pair, the `Resolution` parameter select with the `0.5, 1.0, 1.5` values field, and the `3 runs` / `Run sweep` RT-7 row. New content: **delete the inline block from the card.** Its first two rows -- `Run as sweep` + Values/Range, and Resolution + values -- move into a **280 px 3a pop-out** anchored to the RT-1 Method/Scope row (POP-5), built from the VOCAB.md section 12 "Pop-out container, anchored form" snippet narrowed to 280, at `left: 336px`, top aligned to that row, headed `Advanced` with `Communities (Louvain)` dimmed beside it. **The `3 runs` / `Run sweep` RT-7 row does NOT go with it:** it stays resident on the card as its own action row, because floor item 4 puts the estimate and the verb at the control they belong to and A3's POP-5 row says the cost estimate stays at the Run control. Card height falls by about 110 px, which is the "Advanced stops pushing Run below the fold" POP-5 is for. Do not draw the pop-out open -- POP-5's shell is drawn nowhere in the set.

2. **Analyze panel, Groups run card -- the Advanced gear becomes the door's opener and reports deviation.** Region: line ~223-226, the 24 px gear in the RT-1 row's trailing slot, currently drawn active (`background: #28364e; color: #4a7ee8`) because the block below it is open. New content: keep the gear in that slot as the pop-out's opener; it stays in the **primary colour** `#4a7ee8` because a hidden option deviates from its default -- Resolution is being swept over three values rather than left at 1.0 (POP-5's stub obligation). Retitle it `Advanced parameters. Run as sweep is on`. Drop the `background: #28364e` unless the pop-out is drawn open; the opener carries the selected-row fill only while its pop-out is open (POP-13b).

3. **Analyze panel, Sweep summary card -- the applied state moves onto the card (STY-5, STY-2).** Region: line ~338-348, the card's RT-7 action row holding `Compare two views` and `More`. New content: insert a new 24 px state row **above** that action row, carrying, left to right: the resident three-stripe state swatch showing the seven-group palette, titled `Node color: Groups (resolution 1.0), 7 groups`; the layer name `Groups (resolution 1.0)` at 11 px `#7a828e`; and, right-aligned, `Change encoding` at 11 px `#5b8ff9`, which opens Style with that layer selected. The existing glyph row keeps `Compare two views` and `More` unchanged. This is STY-5's applied form: no card holds a palette, a scale or a domain.

4. **Analyze panel, Sweep summary card -- draw the batch limit, and say what painted.** Region: the three RT-6 run rows at line ~312-337, in particular the green brush glyph on the `1.0` row titled `Encoded as style: colors show this run`. **Collision, and how it is resolved:** STY-2's limit 3 says a batch "applies the first and lands the rest un-applied", while the same decision's boards paragraph says AnalyzeSweep draws "three per-value cards land un-applied and the Sweep summary card carries the applier". Taken together on this board, **nothing auto-applied**: all three per-value runs landed un-applied, and the picture on the canvas came from the user pressing the summary card's own applier and choosing resolution 1.0. Keep the brush glyph on the `1.0` row -- it is the resident state mark saying which run the layer reads -- and retitle it `Encoded as style from the Sweep summary: colors show resolution 1.0`. Do **not** move the paint to the `0.5` row and do **not** recolour the canvas, the legend or the result chip. Record the reasoning in the card's region comment so the board reads as the rule rather than as an inconsistency: six runs never paint six times, and a sweep paints only when the user picks.

5. **Analyze panel, Sweep summary card -- the run record Details becomes a pop-out opener.** Region: line ~301-311, the run record line `Louvain, seed 42, max passes 20` with its `Details` chevron, and the comment above it listing what the chevron opens. New content: the line is unchanged (floor 3); the chevron opens a **360 px activity-panel pop-out** at `left: 336px`, top aligned to the row, headed `Sweep summary` (POP-7). Change the comment's "which is what the Details chevron opens" to "which is what the Details chevron opens, in a 360 pop-out at x = 336 (POP-7)". Chevron stays permanently closed (POP-13b). Not drawn open.

6. **Inspector -- the run record Details becomes a pop-out opener.** Region: line ~783-797, the RT-10 run record in the inspector with its own Details chevron. New content: same edit as item 5, but as an **inspector-region** pop-out -- 360 wide, `left: 792px` (right edge 1152, 8 px clear of the inspector's 1160 edge). Add one sentence to the comment: only one pop-out may be open per region, so the panel card's record and the inspector's record are separate doors in separate regions and may both be open, while opening either one twice in its own region closes the other (POP-0).

7. **Inspector -- record POP-12c as an audit, and change nothing.** Region: the comment above the runs table / sparkline block at line ~798 and the pairwise agreement block at line ~833. POP-12 lists the sweep run table with its sparkline and pairwise agreement as a legal 480 pop-out from the Sweep summary card, but its Direction line is explicit: "Neutral. An audit, not a change", and it names no artboards. **Resolution chosen: nothing moves.** Add one sentence to each block's comment recording that 6.11's worked-examples table lists this as a legal 480 inspector pop-out and that it is not drawn as one in 1.7, together with the tension POP-12 itself names -- Compare two metrics and the sweep table both want 480 in the inspector region, which at 1440 leaves 344 px of canvas.

8. **Canvas -- delete the navigation cluster, insert the canvas toolbar.** Region: line ~627-650, the block commented `NAVIGATION CLUSTER (5.6)` at `left: 12px; bottom: 120px`. New content: delete it; insert the VOCAB.md section 12 **"Canvas toolbar"** snippet at `left: 50%; bottom: 12px; transform: translateX(-50%)`. Bottom offset **12** -- the viewing slot is empty (time slider off) and no drawer is open, which is A1's plain case. **Zoom to selection stays DISABLED** (nothing is selected): keep the snippet's `color: #5f6873`, `cursor: default` and title `Zoom to selection (F). Select something first`.

9. **Canvas -- confirm no reflow, and the one adjacency to note.** Region: minimap `left: 12px; bottom: 12px` (160 wide, line ~653), legend `right: 12px; bottom: 12px` (160 wide, line ~666), and the result chip at `left: 12px; top: 12px` (line ~621). The 246 px bar spans canvas x 293..539; clearances 121 px each side, so both boxes stay at `bottom: 12px`. The result chip is on the **top** edge and does not collide. Record both clearances in the region comment.

10. **Views menu -- upward anchoring.** Region: the toolbar inserted at item 8. The VOCAB snippet carries the up-caret; the menu opens upward, bottom edge 4 px above the bar, clamped 12 px inside the canvas edges (TB-8). No Views list is printed on this board; record the anchoring in the toolbar's region comment.

11. **File comment -- rename the mechanism and record the 1.7 pass.** Region: the head comment at line ~202 (`5.1, 5.6, 6.3, 6.7, 6.8, 5.8`) and the region comment `NAVIGATION CLUSTER (5.6)`. New content: the region comment becomes `CANVAS TOOLBAR (5.6, TB-1)`. Add a 1.7 paragraph: the Advanced block left the card for a 280 pop-out and the gear stayed in the primary colour because a hidden option deviates (POP-5); the sweep summary card gained the applied state row -- swatch, layer name and `Change encoding` -- and lost nothing (STY-5); the batch limit is drawn as three un-applied per-value runs with the picture coming from the summary card's applier (STY-2); both run records now open 360 pop-outs (POP-7); the navigation cluster became the bottom-centre toolbar at offset 12 (TB-1..TB-4). Note the audit that changed nothing: POP-12c.

## FilterBuilderExpert

Board: `FilterBuilderExpert.dc.html`, 1440x900, Explore panel (Filter builder open, three rules and one group) + canvas 832x836 + inspector (38 nodes).
Decisions landing here: POP-2 (this board draws the pop-out), POP-9/A3 cut 1, SAV-1, SAV-2, SAV-3, TB-1..TB-4, TB-8, POP-13b.

1. **Explore panel, Filter builder -- collapse the three rule cards into read-back rows.** Region: line ~254-478, the three bordered rule cards -- RULE 1 (Confidence, hovered, with its 64 px histogram and dual-handle slider), RULE 2 (Adjusted p-value, with its attribute popover drawn open and its RT-4 log ramp) and the GROUP (Match any, 2 px accent left border, two node rules). Current height: about 400 px of the section's 567. New content: **five 32 px read-back rows**, in order, each carrying its element letter in the 16 px slot, the rule in plain form, its own match count in the trailing slot, and a hover-revealed X to remove it:
   - `E` `Confidence between 0.7 and 0.99` -- trailing `597`
   - `N` `Adjusted p-value below 0.05` -- trailing `60`
   - a group row `Any of` carrying the 2 px accent left border and its own X, no count
   - `N` `Fold change over 1` -- trailing `44`, indented one step inside the group border
   - `N` `GO terms contains apoptosis` -- trailing `63`, indented one step
   The per-rule match counts **stay on these rows and do not move into the pop-out** -- POP-2's amendment against floor item 4: the rule row is the control the count belongs to. Delete every editing control from the panel column: the attribute selects, the NOT toggles, the operator selects, the value fields, the histogram, both sliders, the log-scale glyph and the enable checkboxes. They live in the rule pop-out (item 3). **Collision named:** the group's two members would be two more read-back rows under POP-2's "one 32 px row per rule"; nesting them under a group row rather than inventing a union count for the group is the resolution, because a union of 44 and 63 is not derivable from what the board states.

2. **Explore panel, Filter builder -- the section's remaining rows.** Region: the section body between the RT-8 header (line ~207) and the section's closing divider (line ~508). New content, top to bottom, all at the 256 px content band: a new RT-3 pair `Nodes | Edges` (32 px) with **Nodes** selected, because the section's live count and the selection are node counts and the pair governs what `+ Add a rule` adds; the existing RT-3 pair `Hide others | Select matches` (32 px, unchanged, `Select matches` active); the existing RT-1 join `Match all` (32 px, unchanged); the five read-back rows from item 1 (160 px); the existing neighbors row (32 px, unchanged -- checkbox, `Neighbors`, the `1 step` scrub field); and the live count line, whose text changes from `38 nodes match` to **`38 of 318 would match`** (POP-2's exact string, and the string the Expression tooltip on this board already prints). **Do not add a body `+ Rule` row:** POP-2 lists one, but the RT-8 header already carries `Add a rule` as a resident `+` and Rule 9 forbids the second copy. Resulting section: 33 px header + 292 px body = 325, down from 567, which is **-242 rather than POP-2's -387** -- POP-2's figure assumes a two-rule example, and this board carries three rules and a group. State that arithmetic in the region comment rather than claiming the larger number. The edge rule under a `Nodes` scope keeps its `E` letter and its title explains that it restricts which nodes survive through their edges.

3. **Explore panel -- draw the 360 rule pop-out (this is the board that draws it).** Region: a new last child of the artboard root div; first add `position: relative;` to the root `<div style="width: 1440px; height: 900px; ...">` at line ~35, which the board does not have. New content: the VOCAB.md section 12 "Pop-out container, anchored form" 360 shell at `left: 336px; top: 309px; width: 360px` -- an activity-panel pop-out opens right with its left edge 8 px clear of the panel's 328 edge, and the top aligns to the first read-back row. Header: `Confidence between 0.7 and 0.99` with `combined_score` dimmed beside it, the pin toggle, the close X titled `Close (Esc)`. Body, in order: the attribute picker as an RT-1 select field showing `E Confidence combined_score`; a row holding the `NOT` toggle, the `between` operator select and the RT-2 pair of value fields `0.7` / `0.99`; then the **full-width histogram** across the whole 336 px content band with the dual-handle quantile slider under it, both handles labelled and **both axis endpoints legible** (`0.4` and `1`) -- this is the drawing problem POP-2 exists to fix, since 224 px cannot hold two handles and two legible numbers; then the per-rule detail line. **No transform glyph is drawn**: linear is combined_score's default and Rule 7a deletes a control at its default. **The match count `597` is not in the pop-out** (POP-2 amendment). Height about 220. While it is open the `Confidence between 0.7 and 0.99` read-back row carries the selected-row background `#28364e`.

4. **Explore panel -- the attribute picker becomes a menu inside the pop-out, and retires from the panel.** Region: line ~352-395, RULE 2's attribute select drawn with its popover open (search field, `Node attributes` group, `Metrics` group with Bridges / Influence / Hubs and authorities and their play glyphs and disabled reason). **Collision, and how it is resolved:** POP-2 nests the attribute picker inside the rule pop-out **as a menu, not a second pop-out**, and POP-0 forbids a pop-out opening a second pop-out. Drawing that menu open over the rule pop-out would cover the histogram, which is the one thing this board exists to prove. So: **delete the open popover from the drawing**, and move its rows verbatim into the pop-out's region comment as the picker menu's printed contents, which is the 6.8 full-text twin convention this board already uses for every other menu. Keep every DEF-7 fact in that comment -- an unrun metric is still an attribute you can pick, the play glyph says so, and `Hubs and authorities` carries `directed only` as its reason. The board keeps two pointer states at once: the rule pop-out open, and the Expression door hovered with its portal tooltip.

5. **Explore panel, section header -- the Expression door opens a pop-out.** Region: line ~217-220, the `Edit as an expression` glyph in the RT-8 header's trailing group, drawn hovered with the active `background: #374047`. New content: the glyph is unchanged in place and treatment; what changes is its target -- it opens a **separate 360 px pop-out** holding the JMESPath field (POP-2), not a switch of the section into an expression view. Retitle it `Edit as an expression. Opens the expression pop-out`. Add one sentence to the header comment: one pop-out per region, so the expression pop-out and the rule pop-out cannot both be open; the rule pop-out is the one drawn, and the Expression door is only hovered.

6. **Explore panel -- add a Filters library section under the builder.** Region: after the Filter builder section's closing divider at line ~508. New content: an RT-8 library section from the VOCAB.md section 12 "Save and load control pair" **library header** snippet -- name `Filters` at value ink (it holds one entry), an info circle titled `Saved in this browser on this computer. Export a file to move it.` (SAV-3), and the trailing pair: the section overflow (three dots) and a resident 24 px **`+`** titled `Save as filter...`. Under it, one RT-6 library row at 28 px from the **library row** snippet: name `High confidence`, trailing dimmed word `installed`, row title `Installed with the STRING mapping. Confidence at least 0.7.`, hover-revealing the SAV-7 triple rename / empty / delete. Clicking the row applies the filter -- apply is the row click and takes no verb (SAV-2). Section overflow, in the comment: `Import filter...` and `Export filter (JSON)`. Total 61 px. Record the cross-reference: this row is the "1 saved filter installed" that ImportRecognised's recognition run record reports for this same STRING export, so the two boards agree.

7. **Explore panel, Filter builder overflow -- `Save as filter...` leaves it.** Region: the header comment at line ~202-204, `[...] More, full text: Add a group / Duplicate rule / Clear all rules / Save as filter... / Paste an expression`. New content: drop `Save as filter...` -- SAV-1 puts a saved-thing verb on the section that lists the kind, and it is now the `+` on the Filters header. The menu becomes `Add a group / Duplicate rule / Clear all rules / Paste an expression`.

8. **Inspector, Attribute profile -- explicitly unchanged.** Region: line ~1218-1250, the `Attribute profile` RT-8 section and its RT-6 rows of the user's own attribute names and top values. A3's **cut 1** rejects POP-9b: nine rows of the user's own attribute names is a scan surface made of floor-7 data, and a reader comparing five attributes cannot open five doors. Do not add a door, do not add a count-only stub, do not move any row. Add one clause to the section comment recording the cut and its reason, so a later pass does not re-propose it.

9. **Inspector, Selection statistics -- unchanged on this board.** Region: line ~1251-1303. POP-9 fires only where a pin is active or the selection cap is exceeded and a third column appears; this board's card A is **not** pinned (the pin glyph in the title row is the affordance, not the state), so the section stays inline in its two-column form. No stub, no pop-out. Record the condition in the section comment.

10. **Canvas -- delete the navigation cluster, insert the canvas toolbar.** Region: line ~1031-1054, the block commented `NAVIGATION CLUSTER (spec 5.6). Zoom to selection is enabled because 38 nodes are selected.` at `left: 12px; bottom: 120px`. New content: delete it; insert the VOCAB.md section 12 **"Canvas toolbar"** snippet at `left: 50%; bottom: 12px; transform: translateX(-50%)`. Bottom offset **12**. **Zoom to selection is ENABLED** -- 38 nodes are selected -- so that item takes `color: #a3a8b1`, `cursor: pointer` and the bare title `Zoom to selection (F)`.

11. **Canvas -- clearances, including the pop-out.** Region: minimap `left: 12px; bottom: 12px` (160 wide, line ~1056), legend `right: 12px; bottom: 12px` (160 wide, line ~1158), the Expression tooltip at canvas-relative `left: 8px; top: 113px` (268 wide, line ~1021), and the rule pop-out from item 3. The 246 px bar spans canvas x 293..539; the minimap ends at 172 and the legend begins at 660, so both stay at `bottom: 12px` and the two-line rule does not fire. The rule pop-out occupies artboard x 336..696, y 309..529: its top must clear the Expression tooltip's bottom edge (about y 270) by at least 8 px, and its bottom must clear the minimap's top edge (about y 764) -- both hold at the stated position. Record all four numbers in the pop-out's region comment.

12. **Views menu -- upward anchoring.** Region: the toolbar inserted at item 10. The VOCAB snippet carries the up-caret; the menu opens upward, bottom edge 4 px above the bar, clamped 12 px inside the canvas edges (TB-8). No Views list is printed on this board; record the anchoring in the toolbar's region comment.

13. **File comment -- rename the mechanism and record the 1.7 pass.** Region: the head comment, line 17 (`5.1, 5.3 Explore tier 2, 5.4 (multiple nodes), 5.6, 5.8, 6.3, 6.6`), line 29 ("Canvas, rail, top bar, minimap, legend and status bar are untouched") and the "TWO POINTER STATES AT ONCE" paragraph. New content: the region comment `NAVIGATION CLUSTER (spec 5.6)` becomes `CANVAS TOOLBAR (5.6, TB-1)`. Rewrite the two-pointer-states paragraph: the two states are now the **rule pop-out drawn open** and the Expression door hovered with its portal tooltip; rule 2's attribute popover is retired to the pop-out's comment as the picker menu's contents. Add a 1.7 paragraph: the builder dropped from 567 to 325 px by collapsing three rules and a group into five read-back rows with their counts kept resident (POP-2 and its floor-4 amendment); one rule's editing controls now live in a 360 pop-out drawn open at x = 336; the Expression door moved target rather than place; a `Filters` library section arrived with one installed row and a resident `+` (SAV-1, SAV-2, SAV-3); the attribute profile stayed inline on floor 7 (A3 cut 1); the navigation cluster became the bottom-centre toolbar at offset 12 (TB-1..TB-4).

## CategoryTable

Board: `CategoryTable.dc.html`, 1440x900, Analyze panel (Results tab) + canvas 832x836 + inspector (Category table result).
Decisions landing here: STY-5, STY-1, STY-4, POP-4, POP-7, SAV-9, TB-1..TB-4, TB-8, POP-13b.

1. **Analyze panel, Groups card -- the applied card takes STY-5's form.** Region: line ~239-259, the RT-7 action row holding the three-stripe state swatch (titled `Node color: Groups, 6 groups, Okabe-Ito`), `Show in table`, `Copy` and `More`. New content: split into two rows. **Row A**, 24 px, resident state: the existing three-stripe swatch on the left, then the layer name `Groups` at 11 px `#7a828e`, then right-aligned `Change encoding` at 11 px `#5b8ff9`, which opens Style with that layer selected. **Row B**, 32 px: the existing glyph cluster minus the swatch -- `Show in table`, `Copy`, `More`. This is STY-5's applied form: the resident state swatch, the layer name and `Change encoding`, and no card holds a palette, a scale or a domain. Note in the comment that `Change encoding` becoming a cross-panel link is deliberate: encoding has one home and that home is Style.

2. **Analyze panel, Groups card -- the More menu loses one item and gains two.** Region: the menu list in the comment at line ~233-238, which currently reads `Run again with changes / Compare categories (enrichment) / Label group by top value / Compare with... / See all 6 groups / Select members (Coming) / Filter to this group (Coming) / Pin to report (Coming) / Change encoding / Copy member ids / Copy as TSV / Export groups (CSV)`. New content: **delete `Change encoding`** -- it is now resident on row A and a verb gets one home. **Add STY-5's two delete verbs**, both undoable by toast: `Delete layer` (removes the picture, leaves the run; the card reverts to its un-applied form) and `Remove result` (deletes the run and every layer that reads it, naming the count before the act -- the toast reads `Removed Groups. Removes 1 style layer. Undo`). Put them at the end of the list, after `Export groups (CSV)`.

3. **Analyze panel, Groups card -- the six group swatches become pop-out openers (POP-4).** Region: line ~224-232, the 16 px row of six coloured swatch-and-count chips (118, 71, 52, 38, 24, 15). New content: each chip's click now opens the **360 px group profile pop-out** anchored to that chip, headed with the group's own name and `Communities (Markov clustering)` dimmed beside it, holding over-represented values as a four-column table, internal hubs as RT-6 rows, edges to other groups as RT-9 micro-bars, and the group-scoped actions. Retitle each chip accordingly, for example `Group 1: 118 members. Open its profile`. **Resolution to state:** POP-4 removes a 228 px `Group 1` block from the inspector on the boards that draw one; **this board draws no such block**, so POP-4 removes nothing here and only adds the door. Record that in the region comment, together with POP-4's capability point -- the profile is anchored to the clicked group rather than fixed to one -- and the re-target rule: Up and Down on the group list re-target an open profile rather than closing it. Do not draw the pop-out open; GroupProfilePopout is the board that draws it.

4. **Analyze panel, Groups card -- the run record Details becomes a pop-out opener.** Region: line ~217-222, the run record line `MCL, granularity 2.5` with its `Details` chevron and the comment listing what Details holds. New content: the line is unchanged (floor 3); the chevron opens a **360 px activity-panel pop-out** at `left: 336px`, top aligned to the row, headed `Groups` with `Markov clustering` dimmed beside it (POP-7). Change the comment's "Details holds the full string" to "Details opens a 360 pop-out holding the full string". Chevron stays permanently closed (POP-13b). Not drawn open.

5. **Inspector -- the run record Details becomes a pop-out opener.** Region: line ~902-914, the RT-10 run record `Table join, go_terms.tsv, key group_id` with its `Details` chevron and the comment listing the full record. New content: same edit, as an **inspector-region** pop-out -- 360 wide, `left: 792px` (right edge 1152, 8 px clear of the inspector's 1160 edge), headed `Which categories stand out`. Keep the comment's closing sentence verbatim: the record is provenance, never help, so it is never moved behind an info circle -- that is precedence rule 2 and it must survive.

6. **Inspector, actions -- `Encode as style` stays, and is annotated (STY-4, STY-5).** Region: line ~1012-1016, the filled primary `Encode as style` in the pinned action block. New content: the button is **unchanged** -- this Category table result is un-applied, and STY-5 says the un-applied form keeps the full `Encode as style` button. Add STY-4's one action-row annotation to the comment above it: Category table is one of the six shapes that writes a value per node or per edge, so a run of it creates an **encoding layer**; three of the thirteen shapes write nothing on the drawn graph and four write a set rather than a value, so seven of thirteen never produce an encoding layer, which is why the Results tab stays.

7. **Inspector, actions -- `Remove result` keeps its bare form here.** Region: line ~1018-1021, the destructive `Remove result` text link. New content: unchanged. STY-5 requires `Remove result` to name the layer count before the act, but this result drives no layer, so there is no count to name and Rule 7's corollary draws nothing. Record that condition in the comment: the count clause renders only when a layer reads the run.

8. **File comment and region comments -- STY-1's run naming, recorded not renamed.** Region: the Groups card title row (line ~206) and the head comment. STY-1 makes the run the object and gives it one name everywhere -- result card title, layer row, legend block, History row, Compare label chip. On this board there is **one** Groups run, so the name is the card's plain name alone: `Groups`, with no parenthesised parameter. Do not rename it to `Groups (granularity 2.5)`; the parameter joins the name only once a sibling run exists. Record the rule and the condition in the card's comment.

9. **SAV-9 -- comment only, and say why.** Region: the head comment. SAV-9 names this board in its artboard list, but the two kinds it homes have no surface here: `Saved reports` goes above Present's report sections checklist and `Formulas` goes under Columns in Data, and this board draws neither the Present panel nor the Data panel. **Resolution chosen: no drawn change.** Add one sentence to the head comment recording that a saved report configuration and a saved formula are library kinds whose sections live in Present and Data, and that this board's category table is joined from go_terms.tsv rather than computed by a formula, so nothing here is affected.

10. **Canvas -- delete the navigation cluster, insert the canvas toolbar.** Region: line ~672-695, the block commented `NAVIGATION CLUSTER (5.6)` at `left: 12px; bottom: 120px`. New content: delete it; insert the VOCAB.md section 12 **"Canvas toolbar"** snippet at `left: 50%; bottom: 12px; transform: translateX(-50%)`. Bottom offset **12** -- no time slider, no drawer. **Zoom to selection stays DISABLED** (nothing is selected): keep `color: #5f6873`, `cursor: default`, title `Zoom to selection (F). Select something first`.

11. **Canvas -- confirm no reflow.** Region: minimap `left: 12px; bottom: 12px` (160 wide, line ~697) and legend `right: 12px; bottom: 12px` (160 wide, line ~804). The 246 px bar spans canvas x 293..539; clearances 121 px each side; both stay at `bottom: 12px` and the two-line rule does not fire at 832 px of canvas. Record the two clearances in the region comments.

12. **Views menu -- upward anchoring.** Region: the toolbar inserted at item 10. The VOCAB snippet carries the up-caret; the menu opens upward, bottom edge 4 px above the bar, clamped 12 px inside the canvas edges (TB-8). No Views list is printed here; record the anchoring in the toolbar's region comment.

13. **File comment -- rename the mechanism and record the 1.7 pass.** Region: the head comment and the region comment `NAVIGATION CLUSTER (5.6)`, which becomes `CANVAS TOOLBAR (5.6, TB-1)`. Add a 1.7 paragraph: the Groups card's action row became the resident swatch, the layer name and `Change encoding`, and gained `Delete layer` and `Remove result` in its menu (STY-5); each group swatch opens the 360 group profile pop-out (POP-4); both run records open 360 pop-outs (POP-7); `Encode as style` stayed because this result is un-applied, annotated with what a Category table writes (STY-4); the navigation cluster became the bottom-centre toolbar at offset 12 (TB-1..TB-4). State the two no-changes and their reasons: SAV-9 draws nothing here, and the run keeps the bare name `Groups`.

## StyleDiverging

Board: `StyleDiverging.dc.html`, 1440x900, Style panel + canvas 832x836 + inspector (the Expression style layer).
Decisions landing here: SAV-5, SAV-1, SAV-2, SAV-3, SAV-6, POP-5, POP-2, STY-6, STY-8, TB-1..TB-4, TB-8, POP-13b.

1. **Style panel -- the Presets section becomes the Styles library.** Region: line ~347-397, the `Presets` RT-8 header (with its info circle and `Coming` tag) and the two 32 px rows of chips: `Default` (active), `High contrast`, `Print`, `Colorblind safe`, `Presentation`. New content: **delete both chip rows** and rebuild the section from the VOCAB.md section 12 "Save and load control pair" snippets. Header, from the **library header** snippet: name `Styles` at value ink with `Style templates` dimmed beside it, an info circle whose first line is `Saved in this browser on this computer. Export a file to move it.` (SAV-3) followed by the existing caveat `Presets never change which labels show.`, then the trailing pair -- the section overflow (three dots) and a resident 24 px **`+`** titled `Save as style...`. Body, from the **library row** snippet: five RT-6 rows at 28 px, the built-ins first and dimmed with the trailing word `built-in` -- `Default`, `High contrast`, `Print`, `Colorblind safe`, `Presentation` -- with `Default` carrying the selected background `#28364e` because it is the style in force. No user rows on this board. **The section is drawn expanded, not collapsed:** the board's own 1.6 comment records that the five preset names are floor item 6, and floor item 6 vetoes hiding them behind a count. Height: 33 + 140 = 173, replacing about 105, a **+68 px** addition on this panel; state that number honestly in the region comment rather than claiming SAV-5's "roughly neutral", and note the offset -- the Parameters section becomes a 33 px door stub at item 3. Keep the `Coming` tag on the header.

2. **Style panel -- the panel header overflow gives up the style verbs.** Region: line ~132-134, the comment listing the panel title row's overflow: `Import style..., Export style (JSON), Expand all sections, Collapse all sections, Reset styles to defaults`. New content: `Expand all sections, Collapse all sections, Reset styles to defaults`. `Import style...` and `Export style (JSON)` move to the **Styles section overflow** -- 6.8 gains "no saved-thing verb may live in the panel header or its overflow; it lives on the section that lists the kind" (SAV-1), which reverses the half of the 1.5 decision IK-6 that put them there. **Collision named:** SAV-5 lists `Reset styles to defaults` in *both* the section overflow and the panel header overflow. **Resolution chosen:** it stays on the **panel header** only, because it resets the whole panel's styling rather than the library, and Rule 9 forbids the second copy; the Styles section overflow holds `Import style...` and `Export style (JSON)` and nothing else. Record that choice in the header comment. Add a superseding note pointing at DECISIONS-1.5 IK-6 and ARTBOARD-CHANGES-1.5 items 1416 and 4478, so the reversal is not read as a silent contradiction.

3. **Style panel, Parameters -- the section becomes a door stub.** Region: line ~325-346, the collapsed `Parameters` RT-8 header with its dimmed name, its closed chevron and a 24 px gear in the trailing slot titled `Advanced`, whose comment lists six hidden options (Start from current arrangement, Stiffness, Speed vs accuracy, Damping, Time step, Random seed). New content: six options is **more than four rows**, so POP-5's threshold fires and the section becomes a **280 px 3a pop-out** opened from this row, headed `Parameters` with `Force directed` dimmed beside it. On the resident row: **delete the gear**; the RT-8 header row is itself the opener, its chevron stays in the permanently closed right-pointing form and never renders the open form (POP-13b, A2), and the trailing slot is reserved for the door's state mark. **Every parameter here sits at its engine default**, so the trailing slot draws nothing and the name stays at chrome ink `#7a828e` -- which is RT-8's own rule and also POP-5's stub obligation working in the negative. Retitle the header row `Parameters. Every value is at its default`. Height unchanged at 33; the height that leaves is the pop-out's body, which was never resident. Record in the comment that POP-5's own worked case -- Force directed's three visible parameters staying inline -- is the *other* branch, and that this section fires because six options is over the threshold.

4. **Inspector, Which nodes -- the Expression door opens a pop-out.** Region: line ~1068-1071, the 24 px `Expression` glyph in the trailing slot of the `Which nodes` RT-1 row. New content: the glyph is unchanged in place and treatment; its target becomes a **360 px pop-out** holding the JMESPath field, the same door POP-2 gives the filter builder's section header. Retitle it `Edit as an expression. Opens the expression pop-out`. Add one sentence to the section comment: this is the layer selector's copy of the same door, and one pop-out per region means it and any other inspector pop-out cannot both be open. No pixel change.

5. **Inspector, Size -- the cost gate is relabelled in a comment only (STY-6).** Region: line ~1258-1265, the block reading `Bridges takes about 40 s. Size still shows Significance (padj).` with `Run and use it` and `Cancel`. New content: **the drawing does not change**. Add to the section comment that this is the exact construction a re-run from a style layer's Source row reaches from the other direction -- the same three Analyze cost bands, because it is the same run; under 2 s it starts on release with no button, from 2 s to the ask limit it is this one line and these two verbs, above the ask limit the estimate moves onto the verb, above the warn limit the section carries the section 3 warning line. Add the sentence about what the canvas does meanwhile: the canvas keeps the completed run's picture and never shows a half-computed state.

6. **Inspector -- no Source section on this board, and say why.** Region: the inspector's head comment at line ~1038. STY-3 adds a 164 px `Source` section only to a layer **created by a run**. The `Expression` layer here is hand-authored -- Color by log2FoldChange, Size by padj, both joined attributes -- so it carries no run, no reading, no caveats line, no run record and no `Open result`. Do not add one. Record the condition in the comment so a later pass does not add a Source section to a hand-authored layer, and point at StyleFromAnalysis as the board that draws one.

7. **Style panel, Layers -- record the export and import consequences (STY-8).** Region: line ~157-232, the `Layers` section comment. New content: add STY-8's three facts as comment text, all carrying the `Coming` tag convention this board already uses. (a) A calculatedStyle's inputs name `algorithmResults.<ns>.<type>.<field>` and carry no parameters, so an exported analysis-backed layer binds to whatever run shares that path, or to nothing; the fix is a `source` object -- algorithm key, parameters, seed, scope descriptor -- carried under `metadata.source` on the **layer**, because `StyleLayer` is a strictObject an older element would reject while `StyleLayerMetadata` is `.loose()`. (b) Import has three defined outcomes: the run exists and the layer binds; the run does not exist but can be run, and the layer imports with its Source gate showing the estimate under the same three bands; it cannot run on this data, and the layer imports **disabled with the reason in its tooltip** rather than being dropped, because a silently missing layer is worse than a disabled one. (c) The three layers drawn here are hand-authored and none of this fires on them. No pixel change.

8. **Style panel, Styles -- record SAV-6's apply report.** Region: the Styles section comment from item 1. New content: applying a library entry always writes one line saying what did not bind, which is floor item 2 extended to the apply path -- for example `Applied Publication style. 2 of 5 layers matched nothing: they need logFC and padj.` -- and nothing when everything bound. Add SAV-6's Rule 7c carve-out: a library row for a saved thing that cannot apply to the current dataset renders **dimmed with its reason in the title**, never absent, because floor item 7 outranks Rule 7c for a name the user typed; the library row snippet's third row (`#5f6873` with `Saved for cats-social. Open that dataset to apply it.` in its title) is the drawing of that state. No such row is drawn here -- all five entries are built-ins that apply to any graph.

9. **Style panel, Styles -- record the Save dialog's two checkboxes.** Region: the Styles section comment. New content: `Save as style...` opens a dialog carrying the destination line `Saved in this browser on this computer. Export a file to move it.` under its name field, and two checkboxes **off by default**, each with its consequence on an info circle: `Also save the column roles (id, source, target, weight, time)` and `Also save which analyses to run on open`. The skybox field is dropped on write with a one-line note. `Save as <kind>...` always **creates**; replacing is `Update from current` on a named row, or a Save dialog whose primary relabels to `Replace "<name>"` with that entry's date beneath the name field. StyleLibrary is the board that draws the dialog; this board records it only.

10. **Canvas -- delete the navigation cluster, insert the canvas toolbar.** Region: line ~848-871, the block commented `NAVIGATION CLUSTER (spec 5.6)` at `left: 12px; bottom: 120px`. New content: delete it; insert the VOCAB.md section 12 **"Canvas toolbar"** snippet at `left: 50%; bottom: 12px; transform: translateX(-50%)`. Bottom offset **12** -- no time slider, no drawer. **Zoom to selection stays DISABLED**: a style layer is selected, which is not a selection of nodes, so keep `color: #5f6873`, `cursor: default` and the title `Zoom to selection (F). Select something first`.

11. **Canvas -- confirm no reflow.** Region: minimap `left: 12px; bottom: 12px` (160 wide, 86 tall, line ~873) and legend `right: 12px; bottom: 12px` (160 wide, line ~982). The 246 px bar spans canvas x 293..539; clearances 121 px each side; both stay at `bottom: 12px` and the two-line rule does not fire. The legend's three blocks (Color, Size, Edge width) are floor item 5 and may not be dropped or shortened to make room. Record the clearances in the region comments.

12. **Views menu -- upward anchoring.** Region: the toolbar inserted at item 10. The VOCAB snippet carries the up-caret; the menu opens upward, bottom edge 4 px above the bar, clamped 12 px inside the canvas edges (TB-8). No Views list is printed here; record the anchoring in the toolbar's region comment.

13. **File comment -- rename the mechanism and record the 1.7 pass.** Region: the head comment, line 17 (`5.6 (navigation cluster)`) becomes `5.6 (canvas toolbar)`, and the region comment `NAVIGATION CLUSTER (spec 5.6)` becomes `CANVAS TOOLBAR (5.6, TB-1)`. Add a 1.7 paragraph: the preset chip row became a `Styles` library section with a resident `+`, five built-in rows and the destination line on its info circle, at a measured +68 px (SAV-5, SAV-1, SAV-3); the panel header overflow gave up Import and Export and kept Reset (SAV-1, with the SAV-5 duplication resolved in favour of the panel header); the Parameters section became a door stub over a 280 pop-out and lost its gear (POP-5, POP-13b); the Which nodes Expression glyph now opens a 360 pop-out (POP-2); the Size cost gate is unchanged and is now named as the shared construction a Source re-run reaches (STY-6); StyleTemplate's export and import consequences are recorded as comments (STY-8); the navigation cluster became the bottom-centre toolbar at offset 12 (TB-1..TB-4). Name the one thing deliberately not added: no Source section, because this layer is hand-authored.

## InspectorGenomics

Board: `InspectorGenomics.dc.html`, 1440x900, no activity panel, canvas 1112x836 + inspector (TP53 selected).
Decisions landing here: TB-1, TB-2, TB-3, TB-4, TB-8, POP-10, POP-13b.

1. **Canvas -- delete the navigation cluster.** Region: line ~670-693, the block commented `NAVIGATION CLUSTER (5.6). Zoom to selection is enabled because TP53 is selected.` Current content: the 56 px vertical column at `left: 12px; bottom: 120px` holding the 2D/3D pair, Zoom to fit, Zoom to selection, Zoom in, Zoom out and Views (caret down). New content: delete the whole block. The freed 56x160 column at the canvas's left edge becomes canvas (TB-3); nothing replaces it there.

2. **Canvas -- insert the canvas toolbar.** Region: in place of the deleted cluster. New content: the VOCAB.md section 12 **"Canvas toolbar (5.6, 5.1)"** snippet, copied verbatim, at `left: 50%; bottom: 12px; transform: translateX(-50%)`, 246x36, with the 7 px radius and the `0 8px 24px rgba(0,0,0,.45)` shadow that make it the only canvas overlay with lift. Bottom offset **12**: this board draws no time slider (the Viewing slot is empty) and no Data table drawer, so it is the plain case of A1's four offsets (12 / 82 / 272 / 342). One edit to the snippet as copied: **Zoom to selection is ENABLED** -- TP53 is selected -- so that item takes `color: #a3a8b1`, `cursor: pointer` and the bare title `Zoom to selection (F)`, replacing the snippet's disabled form.

3. **Canvas -- the 1112 px case, with its own arithmetic.** Region: minimap `left: 12px; bottom: 12px` (160 wide, line ~697) and legend `right: 12px; bottom: 12px` (160 wide, line ~711). This board has **no activity panel**, so the canvas is 1112 rather than 832 and the centred 246 px bar spans canvas x **433..679**. The minimap ends at 172 and the legend begins at 940, giving **261 px** of clearance on each side against TB-3's 16 px minimum -- the widest margin of any board in the group. Both boxes stay at `bottom: 12px`; the two-line rule (threshold 622 px of canvas) does not come close to firing. Record the two clearances and the 1112 figure in the region comments, so a later resize or a panel opening does not silently eat them; note that with an activity panel open the canvas would be 832 and the clearances 121 px each, which still does not reflow.

4. **Canvas -- the Views trigger's caret flips up.** Region: the Views item inside the toolbar inserted at item 2. The VOCAB snippet already carries the up-caret (`polyline points="3,10 8,5 13,10"`); verify that the deleted cluster's down-caret (`points="3,6 8,11 13,6"`) survives nowhere on the board. Record in the toolbar's region comment that the menu opens **upward**, bottom edge 4 px above the bar, centred on the Views button and clamped 12 px inside the canvas's left, right and top edges, and that the menu's Show group now carries a checked `Toolbar` row between Minimap and Legend whose way back, once unchecked, is the command palette row `Show canvas toolbar` (TB-8). This board prints no Views menu list, so the note is the whole of the change.

5. **Inspector, Notes -- explicitly unchanged.** Region: line ~996-1011, the `Notes` section drawn in RT-8's empty-section form as exactly one 32 px row, because TP53 has no notes. POP-10 names this board: its inspector Notes section stays **inline and unchanged**. Do not give it a filter door, do not give the empty row a pop-out opener, do not add a count. Add one clause to the section comment recording POP-10's reasoning -- note text is the user's own data (floor item 7) and a notes list exists to be scanned, so size alone is never a trigger for a door -- and that the header filter and editor pop-outs POP-10 does allow belong to ExploreNotesList, which is the board with fourteen notes.

6. **Inspector -- no other section becomes a door.** Region: the inspector head comment at line ~782. New content: one sentence recording that none of this board's sections -- Attributes, Computed metrics, Neighbors, Notes -- takes a pop-out in 1.7: Attributes and Neighbors are scan surfaces of the user's own strings (floor item 7, the same ground as A3's cut 1), Computed metrics is one RT-9 row per metric and is not a report read once, and this board draws no Schema row, no validation report, no All statistics section and no run record, so POP-3, POP-6, POP-7 and POP-8 all pass over it. State it so a later pass does not read the absence as an oversight.

7. **File comment -- rename the mechanism and record the 1.7 pass.** Region: the head comment, line 16 (`5.1, 5.4 (One node), 5.6, 5.7, 5.8, 6.3, 6.7 ..., 6.8`) and line 24 ("the canvas drawing, the legend, the minimap, the rail, the top bar and the status bar are untouched"); and the region comment `NAVIGATION CLUSTER (5.6)`, which becomes `CANVAS TOOLBAR (5.6, TB-1)`. New content: line 24 gains "except that the navigation cluster left the canvas's left edge". Add a 1.7 paragraph: the 56 px vertical cluster became the 246x36 bottom-centre canvas toolbar at offset 12, with Zoom to selection enabled because TP53 is selected, and the freed left-edge column became canvas (TB-1..TB-4); the minimap and legend stayed on the 12 px baseline with 261 px of clearance each at this board's 1112 px canvas (TB-3); the Views menu now opens upward and carries a `Toolbar` row (TB-8); Notes stayed inline and unchanged (POP-10). State that no panel, inspector or status bar word changed on this board -- it is a pure canvas-chrome pass.

## Welcome

State after the edit: unchanged Empty state, 1440 x 900, Data panel open, Welcome
block centred on the canvas. Welcome is the cold-start board and revision 1.7
deliberately leaves almost all of it alone (SAV-8: "Welcome and Data tier 1 are
unchanged"). Four items, three of which are confirmations that must be written
into the file comment so the next pass does not "fix" them.

1. **Canvas, bottom band (line 273, the CANVAS container; file comment line 34).**
   Current: `No navigation cluster, minimap or legend in Empty.` New (TB-1, TB-4):
   **no canvas toolbar either.** This is the one board in the core group that
   draws a canvas and draws no toolbar: 6.1's Empty state renders no canvas
   overlays, and TB-1 replaces the navigation cluster with the toolbar rather
   than adding a new overlay class, so a state with no cluster has no toolbar.
   Do not paste the VOCAB 12 "Canvas toolbar" snippet here. Rewrite both comment
   occurrences to read `No canvas toolbar, minimap or legend in Empty (6.1); the
   toolbar arrives with the first graph.` (line 34 and line 273).
2. **Data panel, Open file section, the `Run a recipe...` RT-7 row (lines
   208-216).** Current: one RT-7 action row reading `Run a recipe...`. New
   (A5, SAV-8): **unchanged, and now protected.** A5 names this the one exception
   to SAV-2's rule that applying is the row click: it is the front door of an
   empty app and the one place the list is not on screen. Add to the row's
   comment: `A5 / SAV-8: Run a recipe... is the cold-start route and keeps its
   verb. It is not renamed to Import recipe... (that verb reads a JSON file into
   the library and lives on the Recipes section in Analyze) and it does not
   become a library section here.`
3. **Canvas Welcome block, Saved recipes block (lines 422-440) and Sample
   datasets block (lines 311-319).** Current: the Saved recipes block lists
   `Fraud ring triage / 3 steps -- Groups, Bridges, Filter above threshold /
   Aug 28` as a clickable row; the Sample datasets block carries the hint
   `Click one to load it`. New (SAV-2): **both stay verbatim.** Record the two
   reasons in the block comments, because SAV-2 retires the word `Load` and a
   later reader will hunt for it here: (a) the recipe row already applies on
   click and gains no verb, which is exactly the convention SAV-2 sets; (b)
   `Click one to load it` sits on *data*, and SAV-2 retires `Load` only from the
   saved-thing vocabulary -- "the word is spent on data".
4. **Top bar (lines 112-141) and file comment line 23.** Current: `Top bar: no
   saved indicator`. New (SAV-3): keep the top bar exactly as drawn and extend
   the comment sentence to `Top bar: no saved indicator, and none arrives with
   1.7's Save verbs -- SAV-3 keeps the top bar unchanged and puts the honesty in
   the destination line on each Save dialog instead ("Saved in this browser on
   this computer. Export a file to move it.").`
5. **File comment header (lines 15-36).** Current: `Spec revision 1.5: sections
   6.1 Empty row, 7.1, 5.1, 5.3 Data, 5.5.` New: add a 1.7 line naming the
   decisions checked on this board and their outcome, in the style of the
   existing revision lines: `Revision 1.7: TB-1 (no canvas toolbar in Empty),
   A5 / SAV-8 (Run a recipe... kept), SAV-2 (row click applies; "load" here is
   about data), SAV-3 (no dirty indicator). Nothing on this board changes
   visually.`

---

## Main

State after the edit: unchanged Loaded state, Explore panel open, nothing
selected, canvas 832 x 836 -- plus the canvas toolbar and the Schema pop-out
drawn open over the canvas. Main is the reference shell, so its toolbar drawing
is the one every other board copies (SHELL-SKELETON inherits it under POP-0).

1. **Inspector Schema row (lines 635-649) plus a new canvas overlay.** Current:
   the Schema section is a collapsed RT-8 row -- chevron, `Schema`, trailing
   `3 node types, 7 edge types` with the long title -- and its contents have
   nowhere to render. New (POP-6): the row becomes a permanent **door** and Main
   is the board that draws the 480 pop-out open.
   - Stub row: keep the row exactly as drawn, keep the summary `3 node types,
     7 edge types` (it is the door's state mark), keep the chevron in its
     current closed right-pointing form and note in the comment that it never
     renders the open form (POP-13b). Add the selected-row background
     `background: #28364e;` to the row while its pop-out is open, and change the
     row's title to `Schema. 3 node types, 7 edge types`.
   - Pop-out: use the VOCAB.md section 12 snippet "Pop-out container, anchored
     form", changing only the width, the position and the body. Width **480**,
     inspector-region anchor so it opens **left**: inside the 832-wide canvas
     container use `left: 344px;` (canvas right edge 832 minus 8 clear of the
     inspector, minus 480), `top` aligned to the top of the Schema stub row as
     rendered, `max-height` capped at the body row height minus 32, and
     `z-index: 8`. Header: `Schema` at 12px/500 `#d5d7da`, no dimmed second
     name (Schema has no technical twin in 6.3), the pin toggle and the close X
     titled `Close (Esc)` exactly as the snippet draws them.
   - Pop-out body, in this order: a node-type table (columns type, count,
     completeness) with `cat 17 / 100%`, `human 2 / 100%`, `dog 1 / 100%`; an
     edge-type table with the seven interactionType values and their counts,
     `social 8`, `play 5`, `territorial 4`, `medical 4`, `feeding 4`,
     `romantic 2`, `hunting 2` (these are the real values in
     `graphty/src/data/sampleGraphs.ts` `CAT_SOCIAL_NETWORK`, which is where
     every other cat string on this board comes from -- read them there, do not
     invent; this cited `AppLayout.tsx` TEST_GRAPH_DATA until that shell was
     deleted 2026-09-12, which only aliased this same object); then **the type-pair list drawn as a matrix**, node types on
     both axes, edge counts in the cells: cat-cat 19, cat-human 8, cat-dog 2,
     and 0 in the human-human, human-dog and dog-dog cells (29 total, computed
     from the same file); then one RT-7 row carrying `Filter to type`,
     `Select all of type` and `Export schema JSON` as resident 11px `#5b8ff9`
     text actions (inside a pop-out actions are resident, not hover-revealed --
     VOCAB 12, and floor 4 wants their full text).
   - Add to the comment: `The stub carries "measuring..." in the trailing slot
     instead of the counts while SchemaExtractor is still running (POP-6);
     drawn here in the ready state.`
2. **Canvas, left edge: delete the navigation cluster (lines 446-480).** Current:
   the 56 px vertical cluster at `left: 12px; bottom: 120px`. New (TB-1): delete
   the whole container and its six children. The freed 56 x 160 column becomes
   canvas (TB-3); nothing moves left to fill it.
3. **Canvas, bottom centre: add the toolbar.** New (TB-1, TB-2, TB-4): paste the
   VOCAB.md section 12 "Canvas toolbar" snippet verbatim as the last canvas
   overlay child, **bottom offset 12** -- Main draws no time slider and no Data
   table drawer, so this is A1's "nothing else on" state. Desktop geometry:
   246 x 36, `left: 50%; transform: translateX(-50%)`, radius 7, shadow
   `0 8px 24px rgba(0,0,0,.45)`, `z-index: 6`. Item order left to right:
   `[2D | 3D]` with 3D selected (this board is in 3D), divider, `Zoom out (-)`,
   `Zoom in (=)`, `Zoom to fit (0)`, `Zoom to selection (F). Select something
   first` drawn **disabled** at `#5f6873` (nothing is selected on Main and the
   item set is fixed, so it disables rather than disappearing -- TB-1, floor 4),
   divider, `Views` with the caret pointing **up**.
4. **Canvas, bottom band collision (this board's specific case).** The minimap
   keeps `left: 12px; bottom: 12px` (160 wide) and the legend keeps
   `right: 12px; bottom: 12px` (160 wide); all three now share one 12 px
   baseline. Centred on 832 the bar spans x 293 to 539, so it clears the minimap
   (ends at 172) by 121 px and the legend (starts at 660) by 121 px. The canvas
   is 832 wide, well above TB-3's 622 px two-line threshold, so **nothing
   reflows and neither overlay rises**. Record those two numbers in the toolbar's
   comment. Second collision on this board: the Schema pop-out of item 1 hangs
   over the canvas from x 344 to 824; cap its height so its bottom edge stops at
   least 8 px above the toolbar's top edge (that is, no lower than 56 px from the
   canvas floor), which is the same clamp TimeSlider uses. The Insights strip is
   at the top of the canvas and does not interact with the bar.
5. **Explore panel, `Selection sets` section header (lines 271-280).** Current: a
   collapsed RT-8 header, chevron plus `Selection sets`, no trailing control; the
   comment says neither this nor `Selection actions` carries a `+` "because with
   nothing selected there is no sensible default to commit to". New (SAV-1): the
   library section's `+` is **resident whether the section is empty or full**,
   so draw the 24 px plus glyph in the trailing slot -- but with nothing selected
   it is drawn **disabled** at `#5f6873`, `cursor: default`, titled
   `Save selection as set... Select something first`. That is the register's
   disabled-control form and floor 4's reason-in-the-title, and it is the same
   resolution the toolbar's Zoom to selection gets two overlays away.
   **Collision resolved:** SAV-1's "resident even when empty" and the 1.6 comment's
   "no + with nothing selected" both survive -- the control is present and says
   why it cannot act. Rewrite that half of the comment accordingly. Use the
   library header snippet in VOCAB.md section 12 ("Save and load control pair")
   for the plus glyph and its geometry.
6. **Explore panel, `Saved filters` row (lines 262-266) and `Bookmarks` row
   (lines 302-305).** Current: both are dimmed members of a `Coming soon` run,
   name only, no chevron, no controls. New (SAV-1): **no change to the pixels**;
   add one line to the run's comment: `SAV-1 gives each saved kind a library
   section with a resident + on its header. Saved filters and Bookmarks are
   unbuilt, and an unbuilt row keeps its name alone -- a + that cannot act is a
   false affordance, the same reason this run carries no chevrons. The + lands
   with the section.`
7. **Status bar, zoom slot (lines around 740-760) plus a new comment.** Current:
   the `Zoom 100%` slot, unchanged. New (TB-7): keep it, and add a comment in the
   style of the board's existing MIN- and NAV- notes so the next agent does not
   move the percentage into the bar: `TB-7: the zoom percentage stays in the
   status bar. One fact, one region; the bar sits 12px above the status bar so
   the number is already adjacent to the buttons that change it; and a numeric
   readout would change a centred bar's width as the graph is zoomed. The
   overflow drop order moves zoom later, since it is now the only camera fact in
   the bar.`
8. **File comment, every occurrence of "navigation cluster" (lines 21, 25, 28,
   446, 734).** New (TB-1): rename to `canvas toolbar` and re-point the sense.
   Line 21's list of untouched things must drop the cluster (it is deleted) and
   name the toolbar as new; line 25's spec reference stays `5.6` but reads
   `5.6 (canvas toolbar)`; line 28's shell-copy list reads `rail, top bar, canvas
   toolbar, status bar`; line 446's block comment is replaced by the toolbar's
   own comment (item 3); line 734's XR sentence reads `...replaces the canvas
   toolbar for the duration of the session`.
9. **File comment header (lines 16-36).** Add the 1.7 line: `Revision 1.7:
   TB-1/TB-2/TB-4 (canvas toolbar, bottom 12), TB-3 (121px clearance each side,
   no reflow at 832), TB-7 (zoom stays in the status bar), TB-8 (Views opens
   upward), POP-6 (the Schema row is a door and the 480 pop-out is drawn here),
   POP-13b (a door chevron never opens), SAV-1 (the Selection sets +, disabled
   with its reason).`

---

## ExplorerAfterCard

State after the edit: unchanged Result state -- Analyze panel on Run with the
Groups card highlighted, the Community result in the inspector -- with the group
profile moved out of the inspector, the result action row rebuilt as a style
face, and the canvas toolbar drawn. Panel and inspector both get shorter.

1. **Inspector, the whole `Group 1` profile section (lines 754-812).** Current:
   an RT-8 header `Group 1` with its swatch and More, the four-column
   over-represented values table, the internal hubs rows, the "Edges to other
   groups" row and the two group verbs -- 228 px fixed to one group while the
   table above lists four. New (POP-4): **delete the entire section from the
   inspector.** It becomes a 360 pop-out anchored to the clicked row of the
   Groups by size table, drawn on the new `GroupProfilePopout` board, not here.
   No stub row is added: the table row *is* the opener (6.11 question 2 -- a
   pop-out about one member of a list this surface already shows), and the
   `Group 1` row already carries the selected-row fill `#28364e` that acts as the
   tether. Add to the Groups by size comment: `POP-4: clicking a row opens its
   profile as a 360 inspector pop-out (over-represented values, internal hubs,
   edges to other groups as RT-9 micro-bars, and the group verbs). Up and Down
   re-target the open pop-out rather than closing it. Drawn on
   GroupProfilePopout.dc.html. The inspector keeps the reading, the caveats line,
   the run record and the full table by construction -- floor items 1, 2, 3 and 7
   never travel behind the door.`
2. **Inspector action block, the result action row (lines 823-841).** Current:
   the left slot is the 2x2 colour swatch titled `Node color: Groups
   (communities, Louvain), 4 groups`; `Change encoding` is buried in the More
   menu's comment list; the right slot holds `Run again with changes` and More.
   New (STY-1, STY-5): this row becomes the run's **style face** in miniature --
   keep the swatch, and add `Change encoding` as a resident 11px `#5b8ff9` text
   action immediately after it, opening Style with that layer selected. Remove
   `Change encoding` from the More menu comment list and add `Delete layer` in
   its place (STY-5's two delete verbs: `Delete layer` removes the picture and
   leaves the run; `Remove result` removes both). **Collision resolved:** STY-5's
   applied form is "the resident state swatch plus the layer name plus Change
   encoding", but the layer name here is `Groups`, which the identity row at the
   top of the same inspector already prints, so Rule 8 deletes the repeat and the
   swatch's title carries the binding. Add to the comment: `The layer name
   renders in this slot only once the user renames the layer, because a typed
   name is floor 7 and no longer re-derives from the run.`
3. **Inspector action block, `Remove result` (lines 853-856).** Current: the
   destructive verb with no title. New (STY-5, floor 4): add
   `title="Remove result. Deletes this run and the 1 style layer that reads it."`
   and record the toast string in the comment: `Removed Groups. Removes 1 style
   layer. Undo`.
4. **Canvas: delete the navigation cluster (lines 506-537) and add the toolbar.**
   New (TB-1, TB-2, TB-4): delete the 56 px cluster at `left: 12px; bottom:
   120px`; paste the VOCAB.md section 12 "Canvas toolbar" snippet as the last
   canvas overlay child at **bottom 12** (no slider, no drawer on this board),
   246 x 36 centred on the 832-wide canvas, 3D selected, `Zoom to selection (F).
   Select something first` drawn disabled at `#5f6873` -- a result is not a
   selection, which is the same fact the status bar's empty selection slot
   reports. **This board's collision:** minimap at `left: 12px; bottom: 12px` and
   legend at `right: 12px; bottom: 12px` now share the bar's baseline; centred on
   832 the bar spans 293 to 539 and clears both by more than 80 px; 832 is above
   TB-3's 622 threshold so neither overlay rises. The Insights strip is at the
   top of the canvas and is untouched (G3).
5. **Analyze panel, the `Advanced parameters` gear (lines 280-283).** Current: a
   24 px gear at `#7a828e` whose comment says it opens a collapsed Advanced block
   holding Resolution 1.0, Random seed 42 (Coming), Tolerance, Max iterations,
   Run as sweep... and Copy as command. New (POP-5): the gear opens a **280 3a
   pop-out** anchored to the parameters row, opening right with its left edge at
   `x = 336`. Six rows is more than POP-5's four-row threshold, so the rule
   fires; the gear stays dimmed `#7a828e` because every hidden option is at its
   default (it draws in the primary ink only when a hidden option deviates).
   Nothing is drawn open here. Replace "behind the trailing door" in the comment
   with `behind the trailing door, which opens a 280 pop-out anchored to this row
   (POP-5, 6.11) rather than pushing Run below the fold; a pinned Advanced field
   renders inline and does not render in the pop-out`.
6. **Inspector, the run record's `Details` chevron (lines 705-708).** Current: a
   16 px chevron titled `Details`, drawn closed, whose comment says it holds the
   weight and direction treatment, the timestamp, the duration, the engine
   version and the three record copies. New (POP-7): the chevron opens a **360
   inspector pop-out** headed with the result's own title, not an inline block.
   Keep the one-line record and the chevron exactly as drawn (floor 3 never
   moves); change the comment to say `Details opens a 360 pop-out (POP-7): weight
   attribute and its meaning, direction, every parameter including seed and
   sample size, scope with counts, timestamp, duration, the algorithms package
   version, and the copy control whose menu holds Copy as JSON, Copy as command
   and Copy methods text. It is never an info circle -- a pop-out is disclosure
   by tier, a circle is disclosure by explanation. One pop-out per region, so
   opening it closes the group profile of POP-4 and the reverse.`
7. **File comment, "navigation cluster" occurrences (lines 35, 506, 877).** New
   (TB-1): line 35's shell-delta list reads `canvas toolbar at bottom centre with
   the 2D/3D toggle`; line 506's block comment is replaced by the toolbar's own;
   line 877's MIN-8 justification reads `The canvas 2D/3D control is always
   visible in the canvas toolbar (5.6)`.
8. **File comment header (lines 16-42).** Add: `Revision 1.7: POP-4 (the Group 1
   profile leaves the inspector, -228px), POP-5 (Advanced becomes a 280 pop-out),
   POP-7 (Details opens a 360 pop-out), STY-1/STY-5 (the action row is the run's
   style face: swatch plus Change encoding; the More menu gains Delete layer),
   STY-7 (the resting Run tab is unchanged), TB-1/TB-2/TB-4 (canvas toolbar,
   bottom 12).` and state the new inspector content height once measured.

---

## ExplorerExpert

State after the edit: unchanged expert mid-analysis state -- Results tab with
three cards, acct-4471 selected, the Find a path highlight on the canvas -- with
the toolbar swapped in and three doors re-pointed. This board is the canonical
drawing of two 1.7 rules (STY-2 suppression and STY-4 highlight layers), so most
of its work is in comments that must be exact.

1. **Canvas: delete the navigation cluster (lines 834-865) and add the toolbar.**
   New (TB-1, TB-2, TB-4): delete the 56 px cluster; paste the VOCAB.md section
   12 "Canvas toolbar" snippet as the last canvas overlay child at **bottom 12**,
   246 x 36 centred on the 832-wide canvas, 3D selected, and `Zoom to selection
   (F)` drawn **enabled** at `#a3a8b1` -- acct-4471 is selected on this board, so
   this is the one core-group desktop board where that item is live. **This
   board's collision:** the legend is 190 wide at `right: 12px; bottom: 12px`
   (x 630 to 820) and the minimap is 160 wide at `left: 12px; bottom: 12px`
   (x 12 to 172); the bar spans 293 to 539, clearing the minimap by 121 px and
   the legend by 91 px. 832 is above TB-3's 622 threshold, so neither rises.
2. **Analyze panel, the Groups card's `Encode as style` button (line 403).**
   Current: the filled accent button, with a one-line comment saying the verb
   keeps its words. New (STY-2, limit 2): **the button stays, and this board is
   the drawing that proves the rule.** Add `title="Encode as style. Node color is
   held by your node type layer."` and rewrite the card comment as: `STY-2 limit
   2, suppression: a run applies its shape's primary action on first completion,
   except where a user-authored layer already drives the channel. Node colour on
   this board is the user's own node-type layer (see the legend's "Color: node
   type (type)" block), so the Groups run landed un-applied, the card keeps the
   full Encode as style button, its title names the layer that holds the channel,
   and the reading omits its closing clause -- which is why this card reads "7
   groups found. The largest has 41 members." with no "Colors show groups". This
   is the rule, not an inconsistency with ExplorerAfterCard, where nothing held
   node colour and the run painted itself.`
3. **Canvas legend, the highlight block (lines 1300-1320) and the Find a path
   card's More menu (lines 351-352).** Current: the legend's third block reads
   `Find a path (shortest path)` / `Not on path (dimmed)` / `Selected` / `Open
   notes`; the card's menu comment lists `Clear the highlight`. New (STY-4): the
   path result is a **highlight layer**, so (a) the legend block is unchanged in
   pixels -- it is already titled with the run name, which is what STY-4
   requires, and floor 5 keeps it -- but its comment gains `STY-4: this block is
   the highlight layer's legend block. Exactly one highlight layer exists at a
   time; a second path result replaces this one. The layer's row lives in Style's
   Layers list, which no panel on this board draws.`; and (b) in the card's menu
   comment `Clear the highlight` becomes **`Delete layer`**, matching STY-5's two
   delete verbs, with the resident eye (`Show on canvas`, drawn active at line
   ~355) staying as the layer's visibility toggle. **Collision resolved:** STY-4
   says the highlight's off switch gets one home and STY-5 names the verb; the
   eye is state and stays resident under RT-7's hover split, the menu row is the
   act and takes the new name.
4. **Analyze panel, the three `Details` chevrons (lines 250, 334, 386).**
   Current: 16 px chevrons titled `Details`, all drawn closed. New (POP-7): each
   opens a **360 activity-panel pop-out** (left edge `x = 336`, headed with that
   result's own title). Nothing is removed; add one line to the panel comment:
   `POP-7: a card's Details chevron opens a 360 pop-out rather than expanding the
   card, so opening the full run record no longer pushes the shape body and the
   action row off screen. One pop-out per region: opening one card's record
   closes another's.`
5. **Analyze panel comment, the missing History section (lines 407-418).**
   Current: a paragraph explaining that History was removed because it laid out
   below the clipped scroll region. New (SAV-1, SAV-8): add to that paragraph
   `The same arithmetic applies to 1.7's Recipes library section, which SAV-8
   places directly under History in Analyze: on this board it would lay out below
   the clip with History and is therefore not drawn. AnalyzePanel and IpadPanel
   draw it.` This is a deliberate omission and must be recorded so the board does
   not read as having missed SAV-8.
6. **Analyze panel, the Groups card's More menu comment (lines 397-399).**
   Current: lists `Select members (Coming) / Filter to this group (Coming) /
   ...`. New (POP-4): add one clause -- `a group's own profile opens as a 360
   inspector pop-out from its row in the Groups by size table (POP-4); this card
   carries no profile block and gains no menu row for one.`
7. **File comment, "navigation cluster" occurrences (lines 18, 834).** New
   (TB-1): line 18's spec list reads `5.6 canvas toolbar`; line 834's block
   comment is replaced by the toolbar's own comment.
8. **File comment header (lines 16-32).** Add: `Revision 1.7: TB-1/TB-2/TB-4
   (canvas toolbar, bottom 12, Zoom to selection enabled), STY-2 (this board is
   the canonical drawing of suppression -- the Groups card keeps Encode as style
   because the user's node type layer holds node colour), STY-4 (the Find a path
   result is the one highlight layer; its legend block is that layer's), STY-5
   (Clear the highlight becomes Delete layer), POP-7 (Details opens a 360
   pop-out), SAV-8 (the Recipes section is below the clip, as History is).`

---

## StylePanel

State after the edit: unchanged Loaded state with the Humans layer selected, but
the Presets chip block is replaced by a Styles library section, the panel header
overflow is emptied of its save verbs, and the toolbar replaces the cluster.
This is the board where track 3 lands hardest; measure the panel column
afterwards.

1. **Activity panel, the whole `Presets` section (lines 416-468).** Current: an
   RT-8 header `Presets` with an info circle and a Coming tag, then five 24 px
   option chips over two 32 px rows (`Default` active, `High contrast`, `Print`,
   `Colorblind safe`, `Presentation`). New (SAV-5, SAV-1): **delete the chip
   block and build a tier 1 `Styles` library section in its place**, using the
   VOCAB.md section 12 "Save and load control pair" snippets verbatim.
   - Header: the library-header snippet -- chevron, `Styles` at 12px/500
     `#d5d7da`, a dimmed 11px count `6` immediately after the name, the info
     circle titled `Saved in this browser on this computer. Export a file to move
     it.` (SAV-3), then in the trailing slots the 24 px overflow (`More`) and the
     resident 24 px `+` titled `Save as style...`. The technical name `Style
     templates` rides in the header's own title, not on a line of its own
     (Decision B). Keep the `Coming` tag from the old header on this section, at
     the same 16 px pill, since the kind is still unbuilt.
   - Rows: the library-row snippet at 28 px, in SAV-5's order -- the five
     built-ins first, each dimmed with the trailing word `built-in`
     (`Default` drawn with the selected background `#28364e` and its name at
     `#d5d7da` because it is the active one, then `High contrast`, `Print`,
     `Colorblind safe`, `Presentation`), then one user row `Cat clusters` with
     `2 Sep` in the trailing slot, live rather than dimmed because this board has
     the cat dataset open. Hover verbs (rename, empty slot, delete) are drawn on
     the user row only; a built-in carries none.
   - **Measure and record:** the block goes from about 104 px (32 header + two
     32 px chip rows + 8 pad) to about 206 px (33 header + six 28 px rows + 8
     pad), so the panel column grows by about 100 px. Re-measure the 800 px
     scroll region after the edit and put the number in the file comment; SAV-5's
     "roughly neutral" claim is about deleting the chip row, not about the row
     count, and section J of DECISIONS-1.7 requires the honest figure.
2. **Canvas: delete the navigation cluster (lines 607-639) and add the toolbar.**
   New (TB-1, TB-2, TB-4): delete the 56 px cluster; paste the VOCAB.md section
   12 "Canvas toolbar" snippet at **bottom 12**, 246 x 36 centred on the
   832-wide canvas, 3D selected, `Zoom to selection (F). Select something first`
   drawn disabled -- the cluster's own comment already says why ("A selected
   style layer is not a selection"), so carry that sentence into the toolbar's
   comment. **This board's collision:** minimap 160 wide at bottom 12 (x 12 to
   172), legend 160 wide at bottom 12 (x 660 to 820), bar at 293 to 539 -- 121 px
   clear on both sides, no reflow at 832.
3. **Activity panel header overflow (comment at lines 164-167, control at lines
   173-175).** Current: the five-item menu is `Import style...`, `Export style
   (JSON)`, `Expand all sections`, `Collapse all sections`, `Reset styles to
   defaults`. New (SAV-1, SAV-2, and 6.8's new clause "no saved-thing verb may
   live in the panel header or its overflow"): the panel header overflow keeps
   only `Expand all sections`, `Collapse all sections`, `Reset styles to
   defaults`; `Import style...` and `Export style (JSON)` move to the **Styles
   section's** overflow (the `More` glyph added in item 1). **Collision
   resolved:** SAV-5 lists `Reset styles to defaults` in both menus; it stays in
   the panel header overflow only, because it is not a saved-thing verb and
   principle 2 gives it one home. Rewrite the comment to say so, and add that
   this reverses the half of 1.5's IK-6 that put the two verbs in the panel
   header.
4. **Activity panel, the Parameters section's `Advanced` gear (lines 372-374).**
   Current: a 24 px gear at `#7a828e`; the comment lists six hidden rows (Start
   from current arrangement, Stiffness, Speed vs accuracy, Damping, Time step,
   Random seed). New (POP-5): the gear opens a **280 3a pop-out** anchored to the
   Parameters header row, left edge `x = 336`. Six rows is over the four-row
   threshold, so the rule fires; the gear stays dimmed because the comment
   already records that nothing deviates from its default. Add to the comment:
   `POP-5: the Advanced block is a 280 pop-out, not an inline collapse. The gear
   draws in the primary ink whenever a hidden option deviates from its default
   (6.11's stub obligation); here nothing does. A pinned Advanced field renders
   inline and does not render in the pop-out.`
5. **Activity panel, Layers list row verbs (lines 226-247).** Current: the Humans
   row's hover triple is edit / show / delete, the trash titled `Delete layer`.
   New (STY-5, SAV-7): no pixel change; add to the Layers comment: `STY-5 gives
   deletion two verbs and this is the first: Delete layer removes the picture and
   leaves the run, and the result card reverts to its un-applied form. Its twin,
   Remove result, lives on the result face and names the layer count before it
   acts. Both are undoable by toast.`
6. **Activity panel, Layers list (lines 189-260), Source section and the
   analysis-backed row.** Current: three hand-authored layers -- `Humans`,
   `Hubs`, `Base layer`. New (STY-3): **no row is added and no Source section is
   drawn**, because no run has been made on this board; add the rule to the
   comment instead so the omission is legible: `STY-3: a style layer created by a
   run carries the Analyze glyph in its 16px type slot, the run name, and the
   run's headline in place of the match count, plus a tier 1 Source section
   (reading, caveats line, run record with Details, the deviating parameters
   only, Open result) measured at 164px in this column. All three layers here are
   hand-authored, so none carries Source -- Rule 7c does not draw a section the
   board's own state cannot support. StyleFromAnalysis.dc.html draws it, with the
   VOCAB 12 "Analysis-backed style layer row" snippets.`
7. **Activity panel comment, the apply path (add after the Layers comment).** New
   (SAV-6): `Applying a library entry always writes one line naming what did not
   bind -- "Applied Publication style. 2 of 5 layers matched nothing: they need
   logFC and padj." -- and nothing when everything bound. A saved style that
   cannot apply to the open dataset renders dimmed with its reason in its title
   rather than being hidden: floor 7 outranks Rule 7c for a row carrying a name
   the user typed. No such row exists on this board, since Cat clusters belongs
   to this dataset; StyleLibrary and SavedItems draw the dimmed form.`
8. **Activity panel comment, the export case (add to the file comment).** New
   (STY-8): `An analysis-backed layer exports its run as metadata.source
   (algorithm key, parameters, seed, scope) on the layer, because StyleLayer is
   a strict object and StyleLayerMetadata is loose. Import has three defined
   outcomes: the run exists and the layer binds; it does not exist but can be
   run, and the layer imports with its Source gate showing the estimate; it
   cannot run on this data, and the layer imports disabled with the reason in its
   tooltip rather than being dropped. The Save as style dialog's two checkboxes
   (column roles, analyses to run on open) are off by default and are drawn on
   StyleLibrary.`
9. **File comment, "navigation cluster" occurrences (lines 19, 607).** New
   (TB-1): line 19's spec list reads `5.6 (canvas toolbar)`; line 607's block
   comment is replaced by the toolbar's own.
10. **File comment header (lines 16-40).** Add: `Revision 1.7: SAV-5/SAV-1/SAV-2
    (the preset chips become a Styles library section with a resident +; Import
    and Export leave the panel header overflow for the section overflow), SAV-3
    (destination line on the section info circle), SAV-6, SAV-7, POP-5 (Advanced
    is a 280 pop-out), STY-3/STY-5/STY-8 (comments), TB-1/TB-2/TB-4 (canvas
    toolbar, bottom 12).` and restate the measured panel height.

---

## ExplorePanel

State after the edit: unchanged Loaded state, Explore panel open with three nodes
selected, but the filter builder collapses to one rule row, the Selection sets
header gains its library `+`, and the toolbar replaces the cluster.

1. **Activity panel, Filter builder section (lines 306-382).** Current: header,
   an RT-1 pair (`Nodes` | `Match all`) with the `Edit as expression` pencil in
   its trailing slot, an RT-1 attribute select (`Most connected (degree)`), an
   RT-2 comparison row (NOT checkbox + `>=` + `3`), and the RT-7 row `15 of 20
   nodes would match` with an add plus -- about 169 px. New (POP-2): rebuild as
   about 128 px.
   - Keep the header row and the RT-1 pair row.
   - **Delete the attribute select row and the comparison row** and replace both
     with **one 32 px rule row** that reads the rule back in plain form:
     `Most connected >= 3` at 11px `#d5d7da` in the row's body,
     `title="Most connected (degree) is at least 3"`, its own match count `15`
     at 11px `#7a828e` in the trailing value position, and a 24 px X titled
     `Remove this rule` at the end. The row is the opener for the 360 rule
     pop-out (attribute picker with its search field and groups, NOT, the
     operator select, the dual-handle quantile slider over a full-width
     histogram, and the per-rule detail), which is drawn on FilterBuilderExpert,
     not here.
   - **Amendment against the floor, state it in the comment:** the per-rule match
     count stays on the rule row and does not travel into the pop-out -- floor 4
     puts the count a control acts on at that control, and the rule row is the
     control (A3).
   - Keep the `15 of 20 nodes would match` line and its plus; retitle the plus
     `Add rule` (POP-2 names the control `+ Rule`; the register's add glyph is
     reused and no glyph is added).
2. **Canvas: delete the navigation cluster (lines 547-578) and add the toolbar.**
   New (TB-1, TB-2, TB-4): delete the 56 px cluster; paste the VOCAB.md section
   12 "Canvas toolbar" snippet at **bottom 12**, 246 x 36 centred on the
   832-wide canvas, 3D selected, and `Zoom to selection (F)` drawn **enabled** at
   `#a3a8b1` -- three nodes are selected on this board. **This board's
   collision:** minimap at bottom 12 left 12, legend at bottom 12 right 12; the
   bar spans 293 to 539 with more than 100 px clear on both sides; 832 is above
   TB-3's 622 threshold, so neither overlay rises.
3. **Activity panel, `Selection sets and actions` header (lines 398-412).**
   Current: a collapsed RT-8 header at value ink, no trailing control. New
   (SAV-1, SAV-3): add the info circle titled `Saved in this browser on this
   computer. Export a file to move it.` after the name, and a resident 24 px `+`
   in the trailing slot titled `Save selection as set...`, drawn live at
   `#7a828e` because three nodes are selected. Use the library-header snippet in
   VOCAB.md section 12. Add to the comment: `SAV-1: a saved kind's verbs live on
   the section that lists the kind, never in the panel header. Applying is the
   row click and gets no verb. SAV-7: each row's hover triple is rename, empty,
   delete, and the row's context menu adds Rename, Duplicate, Update from
   current, Export JSON, Delete -- which is also where the five set verbs
   (Replace, Union, Intersect, Subtract, Filter to set) live, because a menu is
   for verbs and a pop-out is for parameters and reports (A3, cut 2).`
4. **Activity panel, the Filter builder section's `More` overflow (lines
   321-323, comment lines 306-309).** Current: the overflow holds `Result (Hide
   others)`, `Also include neighbors`, `Save this filter set...` and `Clear the
   builder`. New (SAV-1, SAV-2): `Save this filter set...` leaves the overflow --
   it becomes the resident `+` on the `Saved filters` section header, titled
   `Save as filter...`, when that section ships. Update the comment to list three
   items and to say where the save verb went. **Collision resolved:** POP-2 lists
   Hide others / Select matches and the neighbors row as resident members of the
   rebuilt builder, but Rule 7a still deletes a control sitting at its default
   and POP-2 names no amendment to 7a (precedence rule 4), so both stay in the
   overflow on this board and become resident only when they deviate.
5. **Activity panel, `Saved filters` section (lines 384-396).** Current: a
   collapsed RT-8 header at chrome ink with a `Coming` tag. New (SAV-1): no pixel
   change; add to the comment `The resident + titled "Save as filter..." and the
   section overflow holding "Import filter..." and "Export filter (JSON)" land
   with the section: an unbuilt row does not draw a control that cannot act.`
6. **Inspector, `Selection statistics` section (lines 685-700).** Current: the
   two-column form, inline. New (POP-9): **unchanged**; add one comment line:
   `POP-9: selection statistics stays inline in its two-column form. It becomes a
   stub row opening a 360 pop-out only when a pin is active or above the
   selection cap, because that is when the third column (A, B, Graph, Delta) no
   longer fits the 256px band. MultiSelection draws that state.`
7. **File comment, "navigation cluster" occurrences (lines 17, 24, 547, 802).**
   New (TB-1): line 17's spec list reads `5.6 (canvas toolbar, zoom percentage,
   mode chip)`; line 24 reads `the canvas gains the canvas toolbar at bottom
   centre (5.6)`; line 547's block comment is replaced by the toolbar's own; line
   802's MIN-8 note reads `The canvas toolbar's [2D | 3D] toggle is the one home
   for that fact.`
8. **File comment header (lines 16-29).** Add: `Revision 1.7: POP-2 (the builder
   drops to one rule row per rule with its own match count; the rule's editing
   controls open in a 360 pop-out drawn on FilterBuilderExpert), POP-9
   (statistics stay inline), SAV-1/SAV-2/SAV-3/SAV-7 (the Selection sets library
   +, and the filter save verb leaves the builder overflow), TB-1/TB-2/TB-4
   (canvas toolbar, bottom 12, Zoom to selection enabled).`

---

## AnalyzePanel

State after the edit: unchanged Loaded state with Analyze open on the Run tab and
the Results tab empty, but All statistics collapses to a door, a Recipes library
section appears under History, and the toolbar replaces the cluster.

1. **Activity panel, `All statistics` section (lines 302-355).** Current: an RT-8
   header drawn in its hover state (name, info circle, and the three verbs
   Recompute / Export CSV / More) followed by four 22 px stat rows
   (`Longest shortest path (diameter) 5`, `Typical distance (average path
   length) 2.99`, `Tight-knit neighborhoods` Coming, `Closed triangles
   (transitivity)` Coming) and the 20 px footer `Computed 14:12` -- about 149 px.
   New (POP-8): the section becomes **one 32 px stub row** opening a 360 pop-out.
   - Stub: chevron in the closed right-pointing form (it never opens -- POP-13b),
     `All statistics` at value ink `#d5d7da` because values exist, the existing
     info circle kept verbatim (it carries the technical name `Statistics panel`,
     which is floor 6), and in the trailing slot the count `4` at 11px `#7a828e`.
     Title: `All statistics. 4 statistics, computed 14:12`.
   - **The stub's state clause is mandatory, not decorative:** while the passes
     run the trailing slot reads `Computing 3 of 7` instead of the count, because
     6.2 guarantees that a row still computing reads "Computing..." and behind a
     door there is no row to say it. Write that sentence into the comment even
     though the idle state is what is drawn.
   - The four rows, the `Computed 14:12` footer and the three header verbs move
     into the pop-out (360, left edge `x = 336`, header `All statistics` with the
     dimmed technical name beside it), where actions are resident and the
     per-row caveats travel with their rows. The pop-out is not drawn on this
     board; use the VOCAB.md section 12 pop-out snippets when it is.
   - Delete the file comment's line 20 claim `All statistics is an inline tier 2
     section of the panel (6.2), not a popout over the canvas.` and replace it
     with `All statistics is a door (POP-8): a 32px stub in the panel whose
     trailing slot reports the computation, opening a 360 activity-panel pop-out.
     It is a 3a pop-out beside the panel, never a dialog over the canvas.`
2. **Activity panel, new `Recipes` section between History (lines 372-390) and
   More (line 392).** New (SAV-8, SAV-1, SAV-3): insert a library section using
   the VOCAB.md section 12 "Save and load control pair" snippets.
   - Header: chevron, `Recipes` at value ink, the info circle titled `Saved in
     this browser on this computer. Export a file to move it.`, and a resident
     24 px `+` in the trailing slot titled `Save as recipe...`. No count is drawn
     (MIN-2: a count of 0 or 1 is not drawn). Section overflow (`More`, revealed
     on section hover): `Import recipe...` and `Export recipe (JSON)`.
   - One RT-6 row at 28 px: `Fraud ring triage` left, `3 steps -- Aug 28` in the
     trailing slot at 11px `#7a828e`, `title="Replay Fraud ring triage on the
     current data. 3 steps: Groups, Bridges, Filter above threshold"`. The row
     exists because Welcome's Saved recipes block already draws this entry, and a
     recipe is portable across datasets (SAV-6's per-kind scope note), so it
     applies to the cat graph. Hover reveals rename and delete (SAV-7).
   - Add to the comment: `Clicking the row replays it -- applying is the row
     click and gets no verb (SAV-2). Save as recipe... names the ordered history
     one section above and is the only creation point; the row's context menu
     adds Rename, Duplicate, Update from current, Export JSON, Delete, and delete
     is a toast with Undo for 10 seconds rather than a confirm dialog (SAV-7).`
3. **Canvas: delete the navigation cluster (lines 490-521) and add the toolbar.**
   New (TB-1, TB-2, TB-4): delete the 56 px cluster; paste the VOCAB.md section
   12 "Canvas toolbar" snippet at **bottom 12**, 246 x 36 centred on the
   832-wide canvas, 3D selected, `Zoom to selection (F). Select something first`
   disabled. **This board's collision:** minimap at bottom 12 left 12, legend at
   bottom 12 right 12; the bar spans 293 to 539; nothing else occupies the bottom
   band (no time slider -- the cat dataset has no Time role -- and no drawer), so
   this is A1's "nothing else on" state and neither overlay rises at 832.
4. **Activity panel, the `Advanced parameters` gear (lines 285-288).** Current: a
   24 px gear at `#7a828e`; the comment lists five hidden rows (Damping,
   Tolerance, Max iterations, Run as sweep, Copy as command). New (POP-5): the
   gear opens a **280 3a pop-out** anchored to the method row, left edge
   `x = 336`. Five rows is over the four-row threshold. The gear stays dimmed
   because every hidden option is at its default. Add to the comment: `POP-5: the
   Advanced block is a 280 pop-out anchored to this row, not an inline collapse,
   so it never pushes Run below the fold. The gear draws in the primary ink
   whenever a hidden option deviates from its default.`
5. **Activity panel, History section comment and the file comment's NAV-11 item
   2 paragraph (lines 27-28, 372-374).** Current: `History's actions row gains
   "Save as recipe...", which names the ordered history and stores it under Saved
   items`. New (SAV-8): History's section actions **lose** `Save as recipe...`
   (it is now the `+` one section down) and `Import and replay` (now `Import
   recipe...` in the Recipes overflow), and keep Replay all, Export history,
   Export as script, Copy as commands, Copy as methods text, Clear history.
   Rewrite both paragraphs to say exactly that.
6. **Activity panel, the Run / Results tab pair (lines 186-195) and the Suggested
   section (lines 214-300).** New (STY-5, STY-7): **no pixel change**; add one
   comment line: `STY-7: the resting Run tab is unchanged -- the scope line, the
   cards already run, a Suggested group and one + Analysis row. The only 1.7
   change to a card is a subtraction that cannot show here because nothing has
   run: an applied card's action row loses its encoding controls to a resident
   state swatch plus "Change encoding", which opens Style with that layer
   selected. A suggested card is NOT labelled with the channel it will paint
   ("Groups -> colors" was considered and refused): the reading's closing clause
   states it at the only moment it can be checked. STY-5: the empty Results tab
   is unchanged.`
7. **File comment, "navigation cluster" occurrences (lines 19, 490, 773).** New
   (TB-1): line 19's shell-copy list reads `rail, top bar, canvas toolbar, status
   bar`; line 490's block comment is replaced by the toolbar's own; line 773's
   MIN-8 note reads `the canvas toolbar's [2D | 3D] toggle already shows it`.
8. **File comment header (lines 16-29).** Add: `Revision 1.7: POP-8 (All
   statistics becomes a 32px door whose trailing slot reports the computation,
   -117px), SAV-8/SAV-1/SAV-3 (a Recipes library section under History; History's
   actions lose Save as recipe... and Import and replay), POP-5 (Advanced becomes
   a 280 pop-out), STY-5/STY-7 (the resting panel subtracts and gains nothing),
   TB-1/TB-2/TB-4 (canvas toolbar, bottom 12).`

---

## AnalyzePicker

State after the edit: unchanged picker takeover of the 280 px column with the
Bridges preview open over the canvas, plus the toolbar. This board copies its
shell character for character from AnalyzePanel, so its toolbar must be
byte-identical to that board's.

1. **Canvas: delete the navigation cluster (lines 574-605) and add the toolbar.**
   New (TB-1, TB-2, TB-4): delete the 56 px cluster at `left: 12px; bottom:
   120px`; paste the VOCAB.md section 12 "Canvas toolbar" snippet at **bottom
   12**, 246 x 36 centred on the 832-wide canvas, 3D selected, `Zoom to selection
   (F). Select something first` disabled. Copy the finished block from
   AnalyzePanel.dc.html rather than re-typing it: the file comment's promise that
   the shell is copied character for character from AnalyzePanel is the reason
   this board exists in the set, and 6.3 wants identical inputs to render
   identically.
2. **Canvas, this board's specific collision: the preview card (lines 648-700).**
   The preview is at `left: 8px; top: 357px; width: 272px` -- it occupies the
   canvas's left flank in the vertical middle and does not enter the bottom band.
   The minimap is 160 wide at bottom 12 (x 12 to 172) and the legend is 200 wide
   at bottom 12 (x 620 to 820); centred on 832 the bar spans 293 to 539, clearing
   the minimap by 121 px and the legend by 81 px. Record both numbers in the
   toolbar's comment. **Second point, and it must be written down or the next
   pass will strip it:** the preview card already carries the tooltip shadow
   `0 8px 24px rgba(0,0,0,.45)`. TB-2's "the toolbar is the only canvas overlay
   with a shadow" governs the three resident overlays -- toolbar, minimap, legend
   -- and does not touch a transient hover surface like this preview, which is
   pop-out class. Keep the preview's shadow; keep the minimap and legend flat at
   radius 4.
3. **File comment, "navigation cluster" occurrences (lines 574, 948).** New
   (TB-1): line 574's block comment is replaced by the toolbar's own; line 948's
   MIN-8 note reads `the canvas toolbar's [2D | 3D] toggle already shows it`.
4. **File comment header (lines 16-38).** Add: `Revision 1.7: TB-1/TB-2/TB-4
   (the navigation cluster becomes the bottom-centre canvas toolbar, bottom 12,
   copied verbatim from AnalyzePanel), TB-2 (the toolbar's shadow is the
   instrument mark; the hover preview keeps its own shadow because it is a
   transient surface, not a resident canvas overlay). No decision in tracks 1 to
   4 touches this board: the picker holds no parameters block, no library section
   and no result card.`

---

## AiPanel

State after the edit: unchanged Result state with the AI transcript in the panel,
plus the toolbar and three re-pointed Details doors.

1. **Canvas: delete the navigation cluster (lines 458-489) and add the toolbar.**
   New (TB-1, TB-2, TB-4): delete the 56 px cluster; paste the VOCAB.md section
   12 "Canvas toolbar" snippet at **bottom 12**, 246 x 36 centred on the
   832-wide canvas, 3D selected, `Zoom to selection (F). Select something first`
   disabled. **This board's collision:** minimap at bottom 12 left 12 and legend
   at bottom 12 right 12 share the bar's baseline; the bar spans 293 to 539 and
   clears both by more than 80 px; the AI panel is a 280 px column to the left of
   the canvas and does not overlap it; 832 is above TB-3's 622 threshold, so
   neither overlay rises.
2. **Activity panel, the three step rows' `Details` chevrons (lines 219-247).**
   Current: three 16 px chevrons titled `Details`, whose menus are spelled out in
   the comment at lines 211-217 (parameters, scope, timestamp, duration, engine
   version). New (POP-7): each opens a **360 activity-panel pop-out** headed with
   that step's own name, left edge `x = 336`, not a menu and not an inline
   expansion. Keep the one-line step rows exactly as drawn (floor 3). Rewrite the
   comment's opening as `Details opens a 360 pop-out per step (POP-7), one per
   region, holding:` and keep the three lists verbatim. Add: `The run record is
   never placed behind an info circle -- a pop-out is disclosure by tier, a
   circle is disclosure by explanation.`
3. **Activity panel, the third step row `Styled nodes by bridge score` (lines
   237-247).** Current: a `#5b8ff9` link with the Style rail glyph and no title.
   New (STY-1): add `title="Open the Bridges layer in Style"` and add to the
   comment: `STY-1 amends the History row rule for both faces of a run: a run
   step opens Analyze at its card, an encoding step opens Style with its layer
   selected. Neither ever re-runs anything. The two rows above open Analyze at
   the Groups and Bridges cards.`
4. **Activity panel comment (lines 205-217).** New (STY-2): add `Both runs
   applied themselves on first completion, from the AI route exactly as from any
   other -- one run, one application, never repeated (STY-2). Nothing on this
   board would repaint if the transcript were scrolled back to or the panel
   reopened. The AI made two runs and one encoding change, which is three History
   entries and three rows here.`
5. **File comment, "navigation cluster" occurrence (line 458).** New (TB-1):
   replaced by the toolbar's own comment.
6. **File comment header (lines 16-19).** Add: `Revision 1.7: TB-1/TB-2/TB-4
   (canvas toolbar, bottom 12), POP-7 (each step row's Details opens a 360
   pop-out), STY-1 (a run is one object with two faces; the Styled nodes step
   opens Style with its layer selected), STY-2 (one application per run, from
   every route).`

---

## PresentPanel

State after the edit: unchanged Loaded state with Present open, but a Saved
reports library section appears above the report checklist, the duplicate recipe
save verb is deleted, the recipe export is renamed, and the toolbar replaces the
cluster.

1. **Activity panel, new `Saved reports` section immediately above `Report
   sections` (insert before line 468).** New (SAV-9, SAV-1, SAV-3, Rule 7c's
   one-row empty form): a 33 px library section in its empty state -- a 1 px
   `#495057` divider, then a 32 px header row carrying the chevron slot, the name
   `Saved reports` at 12px/500 **dimmed `#7a828e`** (the section holds nothing),
   the info circle titled `Saved in this browser on this computer. Export a file
   to move it.`, and a resident 24 px `+` in the trailing slot titled `Save as
   report...`. No content rows, no `0`, no empty-state sentence. Use the
   library-header snippet in VOCAB.md section 12. Comment: `SAV-9: a report
   configuration is the sections checklist and its per-section options, the
   title, the row cap, the Include done notes switch, the image export options
   and the pinned-item slots by kind -- not the pinned items, the notes, the
   results, the image or the graph. A row click loads it into the checklist and
   the dialog fields below; loading one onto a different graph produces the same
   report shape over that graph's content and reports what it could not fill
   (SAV-6). The + is resident even though the section is empty: saving your first
   report is a first-visit verb (SAV-1's amendment to RT-7's hover split).`
2. **Activity panel, More section, the `Save as recipe...` row (lines 513-519).**
   Current: the one shipped row in the More section, with the bookmark glyph and
   the title `Save as recipe. Stored under Saved items`. New (SAV-8): **delete
   the whole row.** Creation belongs where the steps are, and the `+` on
   Analyze's new Recipes section is now the single creation point. Consequence to
   apply in the same edit: the More section becomes four contiguous unshipped
   rows with no shipped member, so the header's single `Coming` tag and its info
   circle now govern the whole section cleanly -- update the section comment,
   which currently explains why one shipped row sits inside a dimmed run.
3. **Canvas: delete the navigation cluster (lines 625-656) and add the toolbar.**
   New (TB-1, TB-2, TB-4): delete the 56 px cluster; paste the VOCAB.md section
   12 "Canvas toolbar" snippet at **bottom 12**, 246 x 36 centred on the
   832-wide canvas, 3D selected, `Zoom to selection (F). Select something first`
   disabled. **This board's collision:** minimap at bottom 12 left 12, legend at
   bottom 12 right 12, no time slider and no drawer; the bar spans 293 to 539
   with more than 80 px clear each side; no reflow at 832. One extra note for
   this board, because it is the export board: the toolbar is canvas chrome and
   never appears in an exported image -- the legend does (floor 5) -- so the
   Export image section's `Legend` checkbox gains no toolbar twin.
4. **Activity panel, More section, `Export analysis recipe (JSON)` (lines
   520-523).** Current: that string, dimmed. New (SAV-2): rename to
   **`Export recipe (JSON)`**. It stays here and stays dimmed: A5 keeps file
   export of a saved thing with the kind's own library, and Present is where the
   recipe file export already lives; the Recipes library section in Analyze
   carries the same verb in its section overflow. Note both homes in the comment
   and say which is which (`the file export stays in Present; the library's own
   overflow exports one entry`).
5. **Activity panel, Report sections checklist (lines 468-490).** New (SAV-9,
   SAV-6): no pixel change; add to the comment `Every row here is a slot the
   saved report configuration remembers, by kind. Loading a configuration onto a
   graph that cannot fill a slot writes one line naming what did not bind, which
   is floor item 2 extended to the apply path.`
6. **File comment, "navigation cluster" occurrences (lines 17, 22, 625).** New
   (TB-1): line 17's spec list reads `5.6 (canvas toolbar, mode chip)`; line 22's
   untouched list drops the cluster and names the toolbar as new; line 625's
   block comment is replaced by the toolbar's own.
7. **File comment header (lines 16-43).** Add: `Revision 1.7: SAV-9 (a Saved
   reports library section above the checklist, empty at 33px), SAV-8 (the
   duplicate Save as recipe... row is deleted; creation lives on Analyze's
   Recipes section), SAV-2 (Export analysis recipe (JSON) becomes Export recipe
   (JSON)), SAV-1/SAV-3 (the resident + and the destination line),
   TB-1/TB-2/TB-4 (canvas toolbar, bottom 12).`

---

## Settings

State after the edit: unchanged Settings overlay over the scrimmed Explorer, with
the AI providers section open. Only the shell and two comments change; the
housekeeping list itself is drawn on the new SavedItems board.

1. **Canvas beneath the overlay: delete the navigation cluster (lines 273-304)
   and add the toolbar.** New (TB-1, TB-2, TB-4): delete the 56 px cluster;
   paste the VOCAB.md section 12 "Canvas toolbar" snippet at **bottom 12**,
   246 x 36 centred on the 832-wide canvas, 3D selected, `Zoom to selection (F).
   Select something first` disabled. **This board's collision:** the Settings
   overlay and its scrim sit above every canvas overlay, so the toolbar is drawn
   under the scrim exactly as the minimap and legend are -- same z-order, same
   dimming, no special case. Below the scrim the bar spans 293 to 539 on the
   832-wide canvas, clearing the minimap (ends 172) and the legend (starts 660)
   by 121 px each.
2. **Section nav, the `Data management` row (lines 569-571).** Current: a plain
   28 px nav row reading `Data management`. New (SAV-12): add
   `title="Data management. Saved items, recent files and storage used"` and a
   comment above the nav list: `SAV-12: Settings > Data management > Saved items
   is the housekeeping list -- every saved kind at once, with storage used, a
   per-row origin, the dimmed "For graphs you do not have open" group and bulk
   delete. The panel sections are the working lists: one kind, in the context
   where it is used, with apply / save / rename / update / delete. Both act on
   the same entries. SavedItems.dc.html draws this section open; it is not drawn
   here, where AI providers is the open section.`
3. **Same comment, two clauses that must be recorded here because they are
   promises this screen makes (SAV-3, SAV-5).** Add: `SAV-3: this section gains a
   storage line and a per-row origin, and every Save dialog in the application
   carries "Saved in this browser on this computer. Export a file to move it."
   under its name field. SAV-5: the Saved items list already promises to hold
   "presets", which could not exist while presets were built-in and unsavable;
   merging the five built-in styles and the user's own into one Styles library
   makes that promise true. SAV-12 also records what was rejected for 1.7: no
   "Export all saved items (JSON)" and no "Import saved items...", because a
   whole-library bundle is one step from the project file that section 11 defers
   and section 12 holds open.`
4. **File comment, "navigation cluster" occurrences (lines 17, 20, 273, 820).**
   New (TB-1): line 17's spec list reads `5.6 (canvas toolbar)`; line 20's
   shell-copy list reads `top bar, canvas toolbar, minimap, legend, status bar`;
   line 273's block comment is replaced by the toolbar's own; line 820's MIN-8
   note reads `The canvas toolbar's [2D | 3D] segment owns the mode and is always
   visible.`
5. **File comment header (lines 16-32).** Add: `Revision 1.7: TB-1/TB-2/TB-4
   (canvas toolbar, bottom 12, under the scrim), SAV-12/SAV-3/SAV-5 (Data
   management becomes the housekeeping list; drawn on SavedItems.dc.html). No
   control on the open AI providers section changes.`

---

## CommandPalette

State after the edit: unchanged palette over the scrimmed Loaded shell, query
`bridge`, four result groups. The visible dialog does not change; the board's
index comment gains the seven 1.7 routes, and the canvas beneath gains the
toolbar.

1. **Canvas beneath the scrim: delete the navigation cluster (lines 276-307) and
   add the toolbar.** New (TB-1, TB-2, TB-4): delete the 56 px cluster; paste
   the VOCAB.md section 12 "Canvas toolbar" snippet at **bottom 12**, 246 x 36
   centred on the **1112-wide** canvas (no activity panel is open on this board,
   so the bar spans x 433 to 679), 3D selected, `Zoom to selection (F). Select
   something first` disabled. Copy the finished block from Main.dc.html and
   change nothing but the centring, since the file comment promises the shell
   pieces are copied from Main so identical inputs render identically.
   **This board's collision:** the palette's scrim (`rgba(13,17,23,0.6)`,
   z-index 20) covers the bar, which is z-index 6 -- draw the bar dimmed under
   the scrim exactly as the legend is; the palette dialog itself is at top 120
   and never reaches the bottom band. Minimap at bottom 12 left 12, legend at
   bottom 12 right 12; at 1112 the clearances are more than 250 px a side and
   TB-3's two-line rule cannot fire.
2. **File comment, the NAV-6 / DEF-5 index paragraph (lines 21-27).** Current: a
   list of capabilities the palette indexes that do not match `bridge` and are
   therefore not drawn. New (POP-13d): extend the list with the seven pop-out
   rows, in this order and these exact strings -- `Time slider settings`,
   `Validation report`, `Group profile`, `Run record`, `Schema`, `All
   statistics`, `Filter expression`. Add the sentence: `POP-13d: every pop-out is
   indexed by name, which is 6.4's second of three routes for it; the first is a
   focusable opener in the panel's tab order and the third is its home-panel row.
   SettingsShortcuts and ShortcutsDialog gain no new bindings for them.`
3. **Same paragraph (SAV-11, SAV-2).** Add: `Cmd/Ctrl+S opens this palette scoped
   to Save, listing one "Save as <kind>..." row per saveable kind -- style,
   filter, subgraph, set, view, recipe, pattern, formula, report, mapping -- with
   the kinds that cannot apply right now dimmed and reasoned, plus the matching
   "Apply style: ..." rows. The browser default is intercepted deliberately. None
   of those rows matches the query "bridge", so none is drawn.` **Collision
   resolved:** SAV-11 asks for the scoped state "or at minimum" the Save rows;
   this board's single dialog is built around the query `bridge` and is tied to
   Main by 6.3, and a second dialog on one board would read as two palettes, so
   the scoped state is recorded in the index rather than drawn. Say that in the
   comment in one clause so the omission is a decision and not an oversight.
4. **Same paragraph (TB-6, TB-8).** Add two more indexed rows with their reasons:
   `Select a region` -- `TB-6: a verb, not a mode. It arms the next drag on empty
   canvas as a marquee and disarms on release, which is how box-select is reached
   on a bare-touch iPad where 5.6's touch list has no Shift. It is also a row in
   the canvas context menu. No glyph is added and 5.6's "there are no persistent
   tool modes" stands.` and `Show canvas toolbar` -- `TB-8: the Views menu's
   Toolbar row can hide the toolbar, which hides its own Views menu, so the way
   back is this palette row. It is always available on Cmd+K and needs no new
   binding; the toolbar is deliberately the one canvas overlay with no key.`
5. **File comment, "navigation cluster" occurrences (lines 19, 276).** New
   (TB-1): line 19's shell-copy list reads `top bar, canvas toolbar, legend,
   status bar`; line 276's block comment is replaced by the toolbar's own.
6. **File comment header (lines 16-45).** Add: `Revision 1.7: TB-1/TB-2/TB-4
   (canvas toolbar, bottom 12, centred on the 1112 canvas, drawn under the
   palette scrim), POP-13d (seven pop-out rows indexed), SAV-11 (Cmd+S opens this
   palette scoped to Save), TB-6 (Select a region), TB-8 (Show canvas toolbar).
   The dialog's drawn rows are unchanged: none of the new rows matches the query
   "bridge".`

---

## InsightsWide

State after the edit: unchanged widest-strip Loaded state, nothing selected,
canvas 1112 wide, with the toolbar in place of the cluster and the Schema row
made a door.

1. **Canvas: delete the navigation cluster (lines 475-506) and add the toolbar.**
   New (TB-1, TB-2, TB-4): delete the 56 px cluster; paste the VOCAB.md section
   12 "Canvas toolbar" snippet at **bottom 12**, 246 x 36 centred on the
   **1112-wide** canvas (x 433 to 679), 3D selected, `Zoom to selection (F).
   Select something first` disabled. **This board's collision:** minimap 160 wide
   at bottom 12 left 12 (x 12 to 172) and legend 190 wide at bottom 12 right 12
   (x 910 to 1100); clearances are 261 px and 231 px, so nothing reflows and
   TB-3's 622 px two-line rule is far from firing. The Insights strip occupies the
   top of the canvas and never meets the bar.
2. **Inspector, `Schema` section (lines 1078-1096).** Current: a collapsed RT-8
   row -- chevron, `Schema`, the summary `4 node types, 3 edge types`, and a
   hover-revealed Export icon (drawn revealed). New (POP-6): the row becomes a
   permanent **door**. Keep the summary as the door's state mark; keep the
   chevron in the closed right-pointing form and note that it never renders the
   open form (POP-13b); add the row title `Schema. 4 node types, 3 edge types`;
   keep the Export icon where it is (it acts on the schema, not on the pop-out).
   Add the comment: `POP-6: the row opens a 480 inspector pop-out holding a
   node-type table (type, count, completeness), an edge-type table, the type-pair
   list drawn as a matrix -- which is the only honest drawing of a
   two-dimensional relationship and the reason 480 exists in the width ladder --
   and one RT-7 row with Filter to type, Select all of type and Export schema
   JSON. The stub reads "measuring..." in place of the counts while
   SchemaExtractor is still running. Main.dc.html draws the pop-out open; the
   fraud dataset's types are account 96, device 48, phone 34, merchant 22 with
   transfer, paid and registered-to edges.`
3. **Status bar comment, the deleted 3D mode chip (line 1156).** Current: `MODE
   CHIP deleted (NAV-12 item 1): the 2D/3D control is always visible in the
   navigation cluster, so the status bar carries no 3D chip.` New (TB-1, named
   explicitly in the decision as the one comment that must be re-pointed or the
   deletion loses its justification): `MODE CHIP deleted (NAV-12 item 1, still
   sound in 1.7): the 2D/3D control is always visible in the canvas toolbar at
   the bottom centre of the canvas (TB-1), so the status bar carries no 3D chip.
   The control moved and stayed visible; it did not go behind anything.`
4. **Canvas minimap comment (lines 509-511).** Current: `...Fit lives in the
   navigation cluster above` and `The drawing is centred in the unchanged 160 by
   100 box so the navigation cluster above keeps its offset.` New (TB-1): `Fit
   lives in the canvas toolbar at the bottom centre` and `The drawing is centred
   in the unchanged 160 by 100 box; nothing sits above the minimap any more --
   the toolbar shares its 12px baseline instead, 261px to the right.`
5. **Canvas legend, the Time block (lines 928-935).** Current: `Time: ts` with a
   Coming tag and the second line `Step through time`. New (POP-1): **no pixel
   change**; add to the legend comment `POP-1 moves the slider's settings into a
   280 canvas-overlay pop-out opened from the slider's gear, and collapses the
   Explore panel's Step through time section to a 32px row. Neither is on this
   board -- no panel is open and the slider is off -- and this block is
   unaffected: it names the assigned Time role and its affordance, which is what
   floor 5 protects.`
6. **File comment, "navigation cluster" occurrences (lines 19, 38, 475, 511).**
   New (TB-1): line 19's revision-1.3 list reads `the canvas toolbar with the
   2D/3D toggle`; line 38's untouched list drops the cluster and names the
   toolbar as new; lines 475 and 511 are covered by items 1 and 4.
7. **File comment header (lines 16-47).** Add: `Revision 1.7: TB-1/TB-2/TB-4
   (canvas toolbar, bottom 12, centred on the 1112 canvas; 261px and 231px
   clear), POP-6 (the Schema row is a permanent door; the 480 pop-out is drawn on
   Main), POP-1 (recorded, not drawn), TB-1's re-point of the mode-chip
   justification. The Insights strip is untouched (G3) and the inspector loses
   nothing.`

---

## TimeSlider

State after the edit: unchanged Explorer-with-time-slider state, but the Explore
panel's five-row Step through time block collapses to one door row, the settings
are drawn open as a 280 canvas-overlay pop-out above the slider, and the toolbar
sits at bottom 82. This is the board that draws POP-1.

1. **Activity panel, `Step through time` section (lines 316-424).** Current: an
   RT-8 header (chevron, name, info circle, Coming tag, the compare glyph, the On
   switch) over four body rows -- the time attribute select `opened`, the
   Window 30 days / Step 7 days pair with the recompute toggle in its trailing
   slot, the Cumulative | Sliding RT-3 pair, and Speed `1x` -- about 169 px. New
   (POP-1): **delete the four body rows** and leave the header as a 32 px door.
   - The door row: chevron in the closed right-pointing form, which never renders
     the open form (POP-13b); `Step through time` at value ink; keep the existing
     info circle titled `Temporal navigation: filter the graph to a window of
     time and step the window along.`; keep the `Coming` tag; **add** a 24 px
     settings gear titled `Time slider settings` before the switch; keep the On
     switch resident in the trailing slot, because a switch is state, not an
     action (RT-7's hover split), and it is the door's state mark.
     **Collision resolved:** POP-1 asks for the dimmed technical name on the row,
     but `Step through time` + `Temporal navigation` + the tag + the gear + the
     switch overrun the 256 px band; Decision B's own sub-rule sends a technical
     name that will not fit into the row's title, and the info circle already
     carries it, so the circle stays and no second name is drawn.
   - The **compare glyph leaves the header** and becomes an RT-7 row inside the
     pop-out (`Compare with another window`), per POP-1's content list.
   - Rewrite the section comment: the 1.6 note explaining the four-row body is
     replaced by `POP-1: the slider bar keeps everything that is scrubbed and its
     settings live in a 280 pop-out. This section is the pop-out's home-panel
     row, which is 6.4's third route to it. It reports state and opens the door;
     it holds no settings.`
2. **Canvas: delete the navigation cluster (lines 717-748) and add the toolbar.**
   New (TB-1, TB-2, TB-4, A1): delete the 56 px cluster at `left: 12px; bottom:
   190px`; paste the VOCAB.md section 12 "Canvas toolbar" snippet at **bottom
   82** -- this is A1's "time slider on" state (the slider is 70 px and the bar
   rides 12 above it) -- 246 x 36 centred on the 832-wide canvas (x 293 to 539),
   3D selected, `Zoom to selection (F). Select something first` disabled.
   **This board's collision, and it is the one the offset table exists for:** the
   minimap (`left: 12px; bottom: 82px`, 160 wide) and the legend (`right: 12px;
   bottom: 82px`) already sit on the 82 baseline, so all three share it and
   neither moves; the slider itself is a full-width overlay at bottom 0 and the
   bar clears it by 12. Record the four offsets in the toolbar's comment: `12
   plain, 82 with the time slider on, 272 with the Data table drawer open, 342
   with both -- the slider is 70px, not 72, and this board is where that number
   is authoritative (A1).`
3. **Canvas: draw the time slider settings pop-out open.** New (POP-1, POP-0):
   use the VOCAB.md section 12 "Pop-out container, anchored form" snippet with
   **width 280** and body padding `0 8px 8px 16px`, so the field rows keep the
   panel identity 16 | 108 | 8 | 108 | 8 | 24 | 8 that the 280 width is derived
   from.
   - Position: right edge aligned to the opener (the slider's gear, whose right
     edge is at canvas x 820), so `left: 540px; width: 280px`, and
     **`bottom: 126px`**. **Collision resolved, and it must be stated:** the
     anchor rule puts a canvas-overlay pop-out 8 px above its overlay, which
     would be bottom 78 and would leave the bar's right edge 1 px from the
     pop-out's left edge with the two sharing a vertical band. A1 makes the
     toolbar the topmost resident member of the bottom stack, so the pop-out sits
     8 px above the **toolbar's** top edge instead: 82 + 36 + 8 = 126. The two
     objects then share no band and the bar keeps its position, which is what
     makes it an instrument.
   - Header: `Time slider settings` at 12px/500, the pin toggle titled `Pin this
     open`, the close X titled `Close (Esc)`.
   - Body, in this order, moved wholesale from the panel section of item 1: the
     time attribute select (`opened`, filled tag glyph, title `Time attribute:
     opened (node dates)`); the RT-1 pair `Window size: 30 days` / `Step: 7 days`
     with the recompute toggle in the trailing 24 px slot, titled `Recompute
     results on each step`; the RT-3 pair Cumulative | Sliding with Sliding
     active; the Speed field `1x`; and a new RT-7 row `Compare with another
     window` carrying the register's compare glyph and its full text, resident
     rather than hover-revealed, because inside a pop-out the actions are
     resident (VOCAB 12).
   - Add to the comment: `POP-0: no scrim, no focus trap -- the canvas keeps
     pointer and keyboard, every change previews live, Escape closes and returns
     focus to the gear, at most one pop-out per region. 6.2's scrub clause holds:
     a control the user scrubs while watching the canvas is never 3a or 3b, but
     its settings may be 3a and may never be 3b, which is exactly why the
     transport, the track, the sparkline, the playhead and the Viewing readout
     stay on the bar.`
4. **Time slider bar, the settings gear (line 1217).** Current:
   `title="Time slider settings (T)"`. New (POP-13a, and REGISTER-1.5 section 1.1
   takes the same edit): **`title="Time slider settings"`** with no key chip. 5.6
   binds `T` to toggling the slider, not to opening its settings, and a control
   may not print a binding it does not own. Add the sentence to the slider's
   comment, replacing `The T binding lives in the gear's title, never in a
   toolbar slot.` with `T toggles the slider itself (5.6) and appears on the
   control that owns it; this gear opens the settings pop-out and prints no
   binding (POP-13a).`
5. **Inspector, `Schema` section (lines 1435-1450).** Current: a collapsed RT-8
   row with its four-value trailing string. New (POP-6): the row becomes a
   permanent door -- keep the summary as its state mark, keep the chevron in the
   closed form and note that it never opens, add the row title in the form
   `Schema. <the summary>`, and add `POP-6: opens a 480 inspector pop-out with a
   node-type table, an edge-type table and the type-pair list drawn as a matrix;
   the stub reads "measuring..." while SchemaExtractor is still running. Drawn
   open on Main.dc.html.`
6. **Activity panel, `Saved filters` row (line 269) and the selection sections.**
   New (SAV-1): no pixel change on the dimmed `Saved filters` row -- an unbuilt
   kind draws no `+`. Add one comment line where the MIN-4 Coming run is
   explained: `SAV-1: when these ship, each gets a resident + on its own section
   header titled "Save as filter..." / "Save selection as set...", with Import
   and Export in the section overflow and never in the panel header; applying is
   the row click and gets no verb.`
7. **Views trigger, caret direction.** New (TB-8): inside the pasted toolbar
   snippet the Views caret already points **up** (`polyline points="3,10 8,5
   13,10"`); confirm it is the up form here rather than the old cluster's down
   form, and add to the comment: `TB-8: the Views menu opens upward, its bottom
   edge 4px above the bar, centred on the Views button and clamped 12px inside
   the canvas edges -- with the slider on, the clamp is real rather than
   theoretical. The menu gains a checked "Toolbar" row in its Show group between
   Minimap and Legend; hiding the bar hides its own menu, so the way back is the
   palette row "Show canvas toolbar". ViewsMenu.dc.html draws it.`
8. **File comment, "navigation cluster" occurrences (lines 717, 1195).** New
   (TB-1): line 717's block comment is replaced by the toolbar's own; line 1195's
   sentence `the overlay lost 26px, so the minimap, legend and navigation cluster
   bottom offsets moved down by 26` becomes `the overlay lost 26px, so the
   minimap and legend sit at bottom 82; the canvas toolbar shares that baseline
   (A1: 12 plain, 82 with the slider on).`
9. **File comment header (lines 16-40).** Add: `Revision 1.7: POP-1 (the Step
   through time section collapses to one 32px door and its settings are drawn as
   a 280 canvas-overlay pop-out above the slider, -137px in the panel), POP-13a
   (the gear loses its (T) chip), POP-0 (3a: no scrim, no focus trap, Escape
   closes), POP-6 (the Schema row is a door), TB-1/TB-2/TB-4 (canvas toolbar at
   bottom 82, sharing the minimap and legend baseline; the slider is 70px), TB-8
   (Views opens upward and gains a Toolbar row), SAV-1 (recorded, not drawn).`

---

## IpadPanel

State after the edit: unchanged iPad Analyze state, 1180 x 820, panel overlay at
left 48, canvas 1132 x 756 -- with the narrow toolbar centred on the canvas, All
statistics turned into a door, and a Recipes library section added.

1. **Canvas: delete the navigation cluster (lines 209-241) and add the narrow
   toolbar.** New (TB-1, TB-2, TB-5): delete the 56 px cluster at `left: 12px;
   bottom: 120px`; paste the VOCAB.md section 12 "Canvas toolbar" snippet at
   **bottom 12** and convert it to the **narrow variant**, which 6.8 point 3
   mandates below 1280 px for an icon that is the sole path to a capability:
   height **40**, items **32 x 32** with **16 px** glyphs, the segmented control
   **68** wide, Views **40** wide, dividers and gaps unchanged, total width
   **274** (`3 + 68 + 12 + (32*4 + 2*3) + 12 + 40 + 3 + 2`). 3D selected;
   `Zoom to selection (F). Select something first` drawn disabled -- nothing is
   selected on this board.
2. **Canvas, this board's specific collisions (record both numbers in the
   toolbar's comment, per TB-5).** 5.2 says overlays do not resize the canvas, so
   the bar centres on the full 1132 rect and spans x 429 to 703. The Analyze
   panel overlay is 280 wide at canvas x 0 to 280, leaving **149 px** clear on
   the left; the legend is 190 wide at `right: 12px` (x 930 to 1120), leaving
   **227 px** clear on the right. The minimap stays at `left: 12px; bottom: 12px`
   under the panel overlay exactly as now. The bar's lower edge sits 36 px above
   the window bottom, above the 24 px status bar and clear of the iPadOS home
   indicator. Nothing reflows and no special case applies.
3. **Canvas, the tap rule (TB-5's binding hole, must be written down).** Add to
   the toolbar's comment: `5.2 closes an open overlay "on tapping the canvas",
   and the toolbar is drawn inside the canvas element. Tapping the toolbar is not
   tapping the canvas: it does not close the open Analyze panel. Without this
   clause a tap on Fit would dismiss the panel the user is working in.`
4. **Activity panel, `All statistics` section (lines 512-527).** Current: a
   collapsed RT-8 header -- chevron, name, info circle -- with nothing in its
   trailing slot. New (POP-8): the row becomes the door's stub. Keep the chevron
   in the closed right-pointing form and note that it never opens (POP-13b); keep
   the info circle (it carries the technical name, floor 6); **add** the count
   `4` at 11px `#7a828e` in the trailing slot, with the row title `All
   statistics. 4 statistics, computed 14:12`; and record in the comment that the
   trailing slot reads `Computing 3 of 7` while the passes run, because 6.2's
   "Computing..." guarantee has no row to live on behind a door.
5. **Activity panel, new `Recipes` section between History (lines 544-556) and
   More.** New (SAV-1, SAV-8, SAV-7, POP-13c): the same library section
   AnalyzePanel gets, drawn for touch -- header with chevron, `Recipes`, the info
   circle titled `Saved in this browser on this computer. Export a file to move
   it.`, a resident 24 px `+` titled `Save as recipe...`, section overflow
   holding `Import recipe...` and `Export recipe (JSON)`; one RT-6 row at 28 px,
   `Fraud ring triage` with `3 steps -- Aug 28` trailing. **On this board the
   row's rename and delete glyphs are drawn resident, not hover-revealed** --
   RT-7's touch clause and POP-13c(c), the same rule that keeps every other
   affordance on the two iPad boards visible. Measure the panel column
   afterwards: it is 756 px tall here rather than 800, and the 33 px header plus
   one 28 px row must fit before More; if it does not, the section still renders
   and the column scrolls, which is what the panel already does.
6. **Activity panel, the `Advanced parameters` gear (lines 490-495).** Current: a
   24 px gear at `#7a828e` whose comment says it is the door onto the Advanced
   block. New (POP-5 with POP-0's narrow clause): the gear opens the Advanced
   block as a **second sheet over the panel at full panel width (280) with a back
   chevron**, not as a floating 280 box -- below 1280 px and on iPad a pop-out is
   a sheet, honouring 5.2's one-overlay-at-a-time rule. Nothing is drawn open;
   write the sentence into the comment and add `the gear draws in the primary ink
   whenever a hidden option deviates from its default (6.11's stub obligation);
   here nothing does`.
7. **Panel overlay comment (line 313) and file comment line 18.** Current: `The
   Analyze panel is an absolute overlay at left 48, top 40, bottom 24, width 280;
   it covers the navigation cluster and minimap.` and `ANALYZE PANEL OVERLAY, 280
   wide, over the canvas (spec 5.2). Covers the navigation cluster and the
   minimap.` New (TB-1, TB-5): both read `...it covers the minimap. The canvas
   toolbar is centred on the full 1132 canvas rect (5.2: overlays do not resize
   the canvas) and clears the overlay by 149px, so the panel never covers it.`
8. **File comment, remaining "navigation cluster" occurrence (line 209).** New
   (TB-1): the block comment is replaced by the toolbar's own.
9. **File comment header (lines 16-19).** Add: `Revision 1.7: TB-1/TB-2/TB-5
   (the narrow 274 x 40 canvas toolbar at bottom 12, centred on 1132, 149px clear
   of the panel overlay and 227px clear of the legend; tapping it does not close
   the overlay), POP-8 (All statistics becomes a door whose stub reports the
   computation), SAV-8/SAV-1/SAV-7 (a Recipes library section with resident row
   verbs), POP-5/POP-0 (Advanced opens as a full-width sheet over the panel with
   a back chevron, not a floating pop-out), POP-13c (every hover-revealed opener
   is resident here).`

---

## IpadInspector

State after the edit: unchanged iPad Selected state, 1180 x 820, inspector
overlay on the right, canvas 1132 x 756, minimap hidden -- with the narrow
toolbar centred on the canvas and the legend raised to clear it.

1. **Canvas: delete the navigation cluster (lines 191-222) and add the narrow
   toolbar.** New (TB-1, TB-2, TB-5): delete the 56 px cluster at `left: 12px;
   bottom: 12px`; paste the VOCAB.md section 12 "Canvas toolbar" snippet at
   **bottom 12** in the **narrow variant** -- height 40, items 32 x 32 with 16 px
   glyphs, segmented 68, Views 40, total width **274**. 3D selected, and
   **`Zoom to selection (F)` drawn enabled** at `#a3a8b1`: DC01 is selected on
   this board, which makes it the one iPad board where that item is live and the
   pair with IpadPanel that proves the item never disappears, only disables.
2. **Canvas, the legend (lines 227-235): raise it 48 px.** Current:
   `right: 292px; bottom: 12px`, 190 wide -- 5.2 shifts it left of the inspector
   overlay, so it occupies canvas x 650 to 840. New (TB-3): change to
   **`bottom: 60px`**, keeping `right: 292px`. **Collision resolved, and this is
   the one place in the core group where TB-3's two-line state actually fires:**
   the bar is centred on the full 1132 rect and spans x 429 to 703, so its right
   edge overlaps the shifted legend's left edge (650) by 53 px. TB-3's remedy is
   that the minimap and legend rise 48 px onto a second line and the bottom band
   belongs to the toolbar alone; the legend is floor item 5 and may never be
   hidden, and the bar may not move, because a centred bar that shifts stops
   reading as an instrument. 12 + 48 = 60 clears the bar's 40 px height with 8 px
   to spare. The minimap needs no treatment: it is hidden by default on iPad
   above the large-graph threshold. Use the panel's own transition for the rise
   so it reads as the layout reflowing. Record the arithmetic in the legend's
   comment: `TB-5's "no reflow" arithmetic assumes the legend at its 12px right
   inset, as on IpadPanel; 5.2 shifts it left under the inspector overlay, which
   is the case that fires TB-3.`
3. **Canvas, the tap rule (TB-5).** Add to the toolbar's comment: `5.2 closes an
   open overlay "on tapping the canvas". Tapping the toolbar is not tapping the
   canvas: it does not close the open inspector. Record the two clearances too --
   the bar's right edge is 149px clear of the 280px inspector overlay (which
   starts at canvas x 852) and its left edge is 429px clear of the rail, so a
   later resize cannot eat them silently.`
4. **Inspector, hover-revealed affordances and pop-out form (comment at lines
   276-280, 375-376, 415, 490).** Current: the board already states that every
   hover-revealed affordance is resident here (R2, R4). New (POP-13c, POP-0):
   extend that paragraph rather than adding a second one: `1.7 adds pop-out
   openers to that list: a door's opener -- a section gear, a Details chevron, a
   library row's verbs -- is drawn resident on this board, never hover-revealed
   (POP-13c). And a pop-out itself is not a floating box here: below 1280px and
   on iPad it opens as a second sheet over its panel at full panel width with a
   back chevron, honouring 5.2's one-overlay-at-a-time rule (POP-0).`
5. **Inspector, Notes section row verbs (lines 358-380).** Current: Edit and
   Delete drawn resident, with the comment explaining that R4 forbids hover-only
   actions on a touch board. New (SAV-7): no pixel change; add `SAV-7 uses the
   same fixed triple on every saved-thing row -- rename, an empty visibility
   slot, delete -- hover-revealed on the desktop boards and resident on the two
   iPad boards, which is the treatment this section already draws. The full set
   is the row's context menu: Rename, Duplicate, Update from current, Export
   JSON, Delete. Deleting a saved entry is a toast with Undo for 10 seconds, not
   a confirmation dialog, and that undo is toast-local rather than an entry in
   the fifty-deep history store.`
6. **Status bar comment (line 603).** Current: `...always visible in the
   navigation cluster (5.6).` New (TB-1): `...always visible in the canvas
   toolbar at the bottom centre of the canvas (5.6, TB-1).`
7. **File comment, remaining "navigation cluster" occurrence (line 191).** New
   (TB-1): the block comment is replaced by the toolbar's own.
8. **File comment header (lines 16-23).** Add: `Revision 1.7: TB-1/TB-2/TB-5
   (the narrow 274 x 40 canvas toolbar at bottom 12, centred on 1132, Zoom to
   selection enabled because DC01 is selected; tapping it does not close the
   inspector), TB-3 (the legend rises 48px to bottom 60 -- the shifted legend is
   the one case in the set where the two-line rule fires), POP-13c/POP-0
   (resident openers; a pop-out is a full-width sheet over its panel here),
   SAV-7 (row verbs resident on touch).`
