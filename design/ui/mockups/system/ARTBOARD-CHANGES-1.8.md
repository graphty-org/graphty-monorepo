## ImportFlow

File: `ImportFlow.dc.html`. State: the import flow as one machine -- Ways in, The dialog (nine bands),
Ways out, Ways back in, and the eight-row decision table. No shell, no canvas, no legend. Frame 1440 by 900.

1. **SET-WIDE, read this first.** Nothing in this checklist adds an icon, a word or a colour that is not
   already in `VOCAB.md` (sections 1 to 13 plus the new section 14, "1.8 additions") or in this board's own
   copy. Keep `<script src="./support.js"></script>` exactly. Static board: no `<script data-dc-script>`,
   no handlebars, no `<sc-for>`. Plain ASCII, `--` for dashes, straight quotes. Do not edit `canvas.json`.
   Do not touch any other `.dc.html`. Every snippet quoted below is copied verbatim from VOCAB.md
   section 14 unless the item says otherwise.

2. **LEG-0: this board draws no legend, and that is now a recorded fact rather than an omission.**
   Region: file comment, the "NO CANVAS, SO NO TOOLBAR" paragraph, lines 25-28. Current: `... This board
   draws no canvas rect, no minimap and no legend, so it draws no toolbar and no bottom stack. Do not add
   one.` Append one sentence to that paragraph: `REVISION 1.8, C2: the legend now has two obligations --
   a canvas obligation and an export obligation -- and this board carries neither, because it draws no
   canvas and exports no image. Nothing in DECISIONS-1.8 section C fires here.` No change on screen.

3. **POP-DLG: the dialog lane exists, and this board is where the reader learns the dialog can host a
   pop-over.** Region: file comment, immediately after the "THE NINE BANDS" paragraph (after line 54).
   Add: `REVISION 1.8, B2: a dialog is a FOURTH region for as long as it is open, and a 3b dialog may open
   one pop-out; that pop-out may not open a second, and Escape closes the pop-out before the dialog. The
   dialog lane's gap is 8 and its shared edge line is row top to pop-out top. DECISIONS-1.7 POP-3 read
   6.11's silence about dialogs as a prohibition; the amended reason is that the validation ISSUES stay
   inline inside Import options because errors there gate the Import button and because the issue list is
   a scan surface of floor-7 ids -- not because a dialog cannot host a pop-out.` No change on screen.

4. **POP-ROLE: band 4 gains its one leader line -- the column Role chip is a door.** Region: the leader-line
   column, line 230, which is currently the empty 28px spacer standing opposite band 4 (`<div style="height:
   28px;"></div>`). Replace that one spacer with the leader-line form its neighbours already use, so band 4
   reads out its own pop-over:
   ```html
   <div style="display: flex; align-items: center; gap: 8px; height: 28px;">
     <div style="flex: 0 0 20px; width: 20px; height: 1px; background: #48525c;"></div>
     <span style="flex: 1 1 auto; min-width: 0; font-size: 11px; line-height: 1.2; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Role chip -- column role parameters, 280, dialog lane</span>
   </div>
   ```
   Band 4's own container at line 193 keeps its solid `background: #2a3035`: the grid is drawn in every
   state and only the pop-over is conditional on which role the column holds. Do not tint band 4.

5. **POP-BANNER: band 2 gains its Details destination.** Region: the leader line opposite band 2, line 224.
   Current text: `a known export signature matched`. New text, same span, same styles:
   `a known export signature matched -- Details holds the full per-column record`. That is DECISIONS-1.8
   D5's sentence ("the recognition banner's full per-column record goes behind its Details chevron, which
   floor item 3 names by hand") drawn once, in the column that names render conditions.

6. **RULE7A-1: band 5, Policies, stops being an always-drawn band.** Regions: the band container, line 197,
   and the spacer opposite it, line 231. On the container change `background: #2a3035;` to
   `background: transparent;` and change the label span at line 199 from `color: #d5d7da` to
   `color: #7a828e`, so band 5 takes the tinted form bands 2, 3, 7 and 8 already use. Then replace the
   empty spacer at line 231 with:
   ```html
   <div style="display: flex; align-items: center; gap: 8px; height: 28px;">
     <div style="flex: 0 0 20px; width: 20px; height: 1px; background: #48525c;"></div>
     <span style="flex: 1 1 auto; min-width: 0; font-size: 11px; line-height: 1.2; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">a policy has a non-zero count in this file</span>
   </div>
   ```
   Reason, for the comment: every policy in the product sits at its shipped default, so Rule 7a draws the
   group only where the file's own counts make it a report rather than a control. ImportRecognised's three
   zeros are the case that proves it.

7. **RULE7A-2: band 6, Load, stops being an always-drawn band.** Regions: the band container, line 201, the
   label span at line 203, and the spacer at line 232. Same three edits as item 6 -- `background:
   transparent`, label to `#7a828e`, and this leader line:
   ```html
   <div style="display: flex; align-items: center; gap: 8px; height: 28px;">
     <div style="flex: 0 0 20px; width: 20px; height: 1px; background: #48525c;"></div>
     <span style="flex: 1 1 auto; min-width: 0; font-size: 11px; line-height: 1.2; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">the size crosses a number, or Load is not Everything</span>
   </div>
   ```
   This is already true of the drawn set and was only ever mis-drawn here: ImportOptions and
   ImportParseError both say in their own comments that Load is not drawn at Everything, and 1.8 deletes
   ImportRecognised's copy for the same reason. The header band's tint legend needs no new word: "drawn on
   its condition" already covers it.

8. **CNT-1: the header band's split count changes with items 6 and 7.** Region: file comment, the
   "THE NINE BANDS" paragraph, the sentence `That gives exactly the split IMP-3 names: five always-present
   bands solid (1, 4, 5, 6, 9) and four conditional bands tinted with their render conditions on leader
   lines (2, 3, 7, 8).` New sentence: `That gives the split IMP-3 names, as 1.8 leaves it: three
   always-present bands solid (1, 4, 9) and six conditional bands tinted with their render conditions on
   leader lines (2, 3, 5, 6, 7, 8). Bands 5 and 6 moved in 1.8 under Rule 7a -- every policy and the Load
   control sit at their defaults, so neither is drawn until this file's own counts or its own size make it
   a report.` The dialog column's trailing count stays `9 items` (line 161): the item list is the spec's,
   and a band that does not render is still one of the nine.

9. **DEPTH-1: record the depth obligation, because this board is the only place a reader can count clicks.**
   Region: file comment, after item 3's paragraph. Add: `REVISION 1.8, A3: exactly one click from the row
   that owns the property. A door may not sit behind another door, and no pop-out may be reached only
   through a second pop-out. Counted on this board: the column role parameters are one click from the Role
   chip in band 4; the per-column recognition record is one click from Details in band 2; the item-3
   picker's per-option settings anchor to the chosen card and are one click from it. Where the owning row
   does not exist yet the create click is charged to 6.1, not to this obligation.` No change on screen.

## ImportOptions

File: `ImportOptions.dc.html`. State: Import options over the Empty shell, nothing loaded,
`fraud-ring-synthetic.csv`, 38 KB, one guessed type column, the type column's Role menu drawn open.
Dialog frame 720. No canvas toolbar, minimap or legend.

1. **SET-WIDE, read this first.** No new icons, words or colours beyond `VOCAB.md` (now including section
   14, "1.8 additions") and this board's own copy. Keep `<script src="./support.js"></script>` exactly.
   Static board. Plain ASCII, `--` for dashes, straight quotes. Do not edit `canvas.json`. Do not touch any
   other `.dc.html`. Target for this board, from DECISIONS-1.8 section H: **12 resident rows outside the
   preview grid -> 9.** Count a labelled field as one row and a flex row of several fields as that many
   rows, which is how the 12 was counted. If your count lands one off after applying every item below,
   record the achieved count in the file comment; do not invent or preserve a row to hit the number.

2. **LEG-0: this board draws no legend, and that is now a recorded fact.** Region: file comment, line 31
   (`... "No data loaded". No canvas toolbar, minimap or legend (nothing is loaded yet).`). Append to that
   sentence: ` C2 splits floor item 5 into an export obligation and a screen obligation; with nothing
   loaded there is no encoded channel, so neither fires and this board draws no legend in 1.8 either.`
   No change on screen.

3. **POP-3 AMENDED: the reason changes, the drawing does not.** Region: file comment, lines 55-58, the
   whole `REVISION 1.7, POP-3` paragraph. Replace it with: `REVISION 1.7, POP-3, AS AMENDED BY 1.8 B2: the
   Validation report is a 360 pop-out in the Data panel, and inside the Import options dialog the
   validation ISSUES stay INLINE -- because errors here gate the Import button and because the issue list
   is a scan surface of the user's own ids (floor 7). NOT because a dialog cannot host a pop-out: 6.11's
   constraint is a nesting limit, and B2 gives the dialog its own lane. A dialog is a fourth region for as
   long as it is open; it may open one pop-out; that pop-out may not open a second; Escape closes the
   pop-out before the dialog. This board draws that lane in use (item 5 below).` No change on screen.

4. **POP-11 REPLACED: the Role chip becomes the door for a column's own parameters.** Region: file comment,
   lines 59-61, the whole `REVISION 1.7, POP-11` paragraph. Replace it with: `REVISION 1.8, D5: the import
   policies keep their home (a control whose home is a dialog may not acquire a second home), and Rule 7a
   now decides whether they are drawn at all. What DOES move is the per-column role parameters: one 280
   pop-over per column, opened from that column's Role chip inside the grid header, titled with the
   column's own name. Weight holds Treat as, Normalize to 0-1 and the Divide by 1000 offer; Time holds
   Kind, Measured in and the family-dependent third field; the node-id-bearing column holds Identifier
   system. The chip is the stub and keeps the setting as a dimmed suffix, so the value stays on screen and
   only the editing moves -- which is what clears the A2 veto: the value is not silent.`

5. **POP-ROLE-1: the Identifier system select leaves the four-up row and becomes a suffix on the src Role
   chip.** Regions: (a) the fourth field group of the format-and-direction row, lines 523-541 -- the whole
   `<div style="position: relative; display: flex; flex-direction: column; gap: 1px; flex: 1 1 0; min-width: 0;">`
   holding the "Identifier system" label, its info circle and the `account id (detected)` select. DELETE
   that group entirely; the row becomes three fields (Format, Import as, Direction), each still
   `flex: 1 1 0`. (b) The src column header in the grid, the Role chip at line 551. Current inner text:
   `<span>Source</span>`. New: `<span>Source <span style="color: #7a828e;">account id</span></span>`.
   Keep the chip's `#28364e` fill, its `#4a7ee8` border, its 10px chevron and its 20px height. Add
   `title="Source. Identifier system: account id, detected. Click for this column's role parameters"` to
   the chip. The word `detected` is not lost: it rides in the title, and the dimmed suffix is the stub the
   door owes (6.11). Net: -1 resident row.

6. **RULE7A-3: the Policies group collapses to one RT-8 section row carrying this file's own counts.**
   Region: section 5 Policies, lines 763-805 -- the header row (`Policies` + Coming tag + info circle), the
   Repeats row and the "Edges that point at their own node (self-loops)" row. Both policy controls sit at
   their shipped defaults (`Combine + sum`, `Keep`) and both are dimmed and disabled under one Coming tag,
   so Rule 7a deletes the CONTROLS; the counts `5 pairs` and `2 found` are this file's own parse record
   (floor 3) and may not be deleted. Replace all three rows with one collapsed RT-8 section header, VOCAB
   14.1's RT-8 door form, with the Coming tag kept between the name and the trailing slot:
   ```html
   <div style="display: flex; align-items: center; gap: 4px; height: 32px; padding: 0; box-sizing: border-box;" title="Policies. Repeats: combine into one, count the repeats, sum the weight. Edges that point at their own node (self-loops): keep. Not built yet.">
     <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><polyline points="6,3.5 11,8 6,12.5"></polyline></svg>
     <span style="flex: 0 0 auto; font-size: 12px; font-weight: 500; color: #d5d7da; white-space: nowrap;">Policies</span>
     <div style="display: inline-flex; align-items: center; flex: 0 0 auto; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #7a828e; font-size: 10px; font-weight: 500; line-height: 1; box-sizing: border-box;">Coming</div>
     <span style="flex: 1 1 auto; min-width: 0; font-size: 11px; color: #7a828e; text-align: right; white-space: nowrap;">5 repeats, 2 self-loops</span>
   </div>
   ```
   The two info-circle sentences are not lost -- both ride in the row's title, verbatim from the rows they
   replace. Net: 3 rows -> 1. Do NOT make this a pop-out: A4's discriminator refuses it (it buys no width
   beyond 256, no survival across a selection change and no operability below), so a closed section is the
   right surface and its trailing slot carries the one fact a door stub would have carried.

7. **A6-1: no gear on this board draws dimmed by accident.** Region: the whole dialog. This board has no
   gear (Parsing is a collapsed row here, not a door), so A6 has nothing to colour. Record it: add to the
   file comment, after item 4's replacement, `REVISION 1.8, A6: a door glyph draws in the dimmed ink when
   everything behind it is at its default and in the primary ink when anything behind it is not. This board
   draws no gear -- Parsing is a collapsed row, not a door -- so the only stub it owes is the Role chip's
   dimmed suffix, which is drawn.` No change on screen.

8. **STUB-1: the guessed column's open Role menu keeps its place and gains one line.** Region: the type
   column's Role menu, lines 641-676, drawn open. Do not close it, do not move it: it is the one transient
   this board draws and E2 forbids two transients of different classes open at once. Add nothing to the
   menu itself. In the comment beside it (lines 641-642) append: `In 1.8 this menu and the column role
   parameters pop-over are two different surfaces from one chip: the menu changes WHICH role the column
   has, and the pop-over holds the parameters of the role it already has. A chip with a non-default
   parameter prints it as a dimmed suffix (src reads "Source account id"); a chip at its defaults prints
   the role word alone, which is why dst, ts and type carry no suffix here.`

9. **STUB-2: the ts column's two meta lines stay, and the reason is written down.** Region: the ts column
   header's meta block, lines 621-624 (`A single moment` / `ISO 8601`). Keep both lines exactly as drawn.
   Add a comment beside them: `1.8: these two lines are what the Time role's pop-over would otherwise hide,
   and D5 puts them on the chip as a dimmed suffix on the boards where the chip has room. This board's ts
   column is 170px wide and already prints them under the chip at 11px, which is the same fact in the same
   cell; do not move them into the chip and do not delete them. The pop-over holds Kind, Measured in and
   the family-dependent third field, all of which are at their defaults here (Rule 7a) and none of which is
   drawn.`

10. **STUB-3: the amount column's `strength` line stays and is named as the stub.** Region: the amount
    column's meta block, lines 596-601 (`strength` plus its info circle). Keep it. Add a comment beside it:
    `1.8, A2 and D5: "strength" is the Weight role's parameter printed where the reader can see it. A wrong
    weight sense silently inverts every path result, which is 6.10a's veto class, and the veto is cleared
    here exactly because the value is not silent -- it is printed. When this column's role parameters move
    behind the Role chip, the chip reads "Weight strength" and this line is the suffix's long form; the
    Normalize to 0-1 control and the Divide by 1000 offer are the two that go behind the door, and both are
    at their defaults on this file (Rule 7a), so neither is drawn.`

11. **CNT-1: restate the after-state in the file comment so the next pass can check it.** Region: file
    comment, at the end. Add: `REVISION 1.8 AFTER-STATE, 12 -> 9 resident rows outside the preview grid, in
    render order: (1) the reading "200 nodes, 612 edges, directed, weighted by amount, timed by ts";
    (2) "1 column was guessed." with Review; (3) Format; (4) Import as; (5) Direction; (6) the grid footer
    "First 5 of 617 rows -- not set"; (7) Two node types (bipartite); (8) the collapsed Policies section
    with "5 repeats, 2 self-loops"; (9) the collapsed Parsing row. Removed: Identifier system (to the src
    Role chip's pop-over) and two policy control rows plus their header (to one collapsed section). Kept by
    the floor and not negotiable: the reading, the guessed line and Review, every column name and cell
    value, "First 5 of 617 rows", "98% confidence", the bipartite checkbox (it is the parser's structural
    finding about this file, floor 3, and nothing else on this board reports it), "Mapping is remembered for
    files with these columns.", Cancel and Import in full text.`

## ImportRecognised

File: `ImportRecognised.dc.html`. State: Import options over the Empty shell, nothing loaded, a recognised
STRING export (`string_interactions.tsv`), 318 nodes, 1,104 edges, twelve columns mapped, the Identifier
system info bubble drawn open. Dialog frame 1120. No canvas toolbar, minimap or legend.

1. **SET-WIDE, read this first.** No new icons, words or colours beyond `VOCAB.md` (now including section
   14) and this board's own copy. Keep `<script src="./support.js"></script>` exactly. Static board. Plain
   ASCII, `--` for dashes, straight quotes. Do not edit `canvas.json`. Do not touch any other `.dc.html`.
   Target for this board, from DECISIONS-1.8 section H: **15 resident rows outside the preview grid -> 7**,
   the largest reduction in the Data set. Count a labelled field as one row and a section header as none.
   If your count lands one off after applying every item, record the achieved count in the file comment.

2. **LEG-0: this board draws no legend, and that is now a recorded fact.** Region: file comment, the line
   that reads `CANVAS: 1112 wide by 836 tall, hosts Welcome (Empty). No cluster, minimap or legend.`
   (line 308). Append: ` 1.8 C2 splits floor item 5 into an export obligation and a screen obligation;
   nothing is loaded, so there is no encoded channel and neither obligation fires.` No change on screen.

3. **POP-3 AMENDED.** Region: file comment. Add, after the last REVISION paragraph: `REVISION 1.7 POP-3,
   AS AMENDED BY 1.8 B2: the validation issues stay inline inside this dialog because errors gate the
   Import button and because the issue list is a scan surface of floor-7 ids -- not because a dialog cannot
   host a pop-out. B2 gives the dialog its own lane: gap 8, shared edge line row top to pop-out top, one
   pop-out at a time, Escape closes the pop-out before the dialog. This board opens one such pop-over, from
   a column Role chip.` No change on screen.

4. **POP-ROLE-1: the four-row "Weight: combined_score" block leaves the dialog body for the
   combined_score column's Role chip.** Region: the LEFT half of the "Weight and id details" grid, lines
   686-712 -- the `Weight: combined_score` header, the `Treat as` select with the `Normalize to 0-1`
   checkbox beside it, and the `Divide by 1000 -- 999 becomes 0.999` switch row. DELETE all four rows.
   Then, in the grid header, find the combined_score column's Role chip (the chip reading `Weight`) and
   give it the dimmed suffix and a title:
   ```html
   <span>Weight <span style="color: #7a828e;">strength</span></span>
   ```
   with `title="Weight: combined_score. Treat as strength (higher is closer). Divided by 1000. Click for
   this column's role parameters"`. The pop-over behind that chip holds Treat as, Normalize to 0-1 and the
   Divide by 1000 offer, at 280, in the dialog lane. This is the same door ImportOptions gets on its
   `amount` column: one shape for one control across the five drawn states.

5. **FLOOR2-1: the Divide by 1000 departure moves to the run record that caused it, and is not lost.**
   Region: the recognition banner's sentence, line 545. Current:
   `Recognized a STRING export -- 12 columns mapped, combined_score as weight, 1 saved filter installed`.
   New, same span, same styles:
   `Recognized a STRING export -- 12 columns mapped, combined_score as weight divided by 1000, 1 saved filter installed`.
   Reason for the comment: A6 requires that a departure a hidden option creates renders resident under the
   section that owns the door, and the recognition banner IS that section here -- the switch is on because
   the recognition turned it on, not because the user did. Floor item 4 is held: what the control will do
   before it does it is on screen, in the run record, in the file's own column name.

6. **POP-ROLE-2: the Identifier system select leaves the dialog body for the node1 column's Role chip.**
   Region: lines 714-736 -- the `Identifier system` label, its info circle WITH THE OPEN BUBBLE, the
   `Gene symbol` select, and the `padding-bottom: 104px` that reserved room under the open bubble. DELETE
   the whole group including the reserved padding. Then, in the grid header, the node1 column's Role chip
   (reading `Source`) takes the suffix and title:
   ```html
   <span>Source <span style="color: #7a828e;">gene symbol</span></span>
   ```
   with `title="Source. Identifier system: gene symbol. Map identifiers reads it later. Click for this
   column's role parameters"`. The bubble's own sentence -- `Which kind of ids the nodes use: account or
   device ids for transaction data; gene symbol, Entrez, Ensembl, STRING or UniProt for biology. Map
   identifiers reads it later.` -- is not lost: it is the first line of the role pop-over and it rides in
   the chip's title here. ImportOptions makes the same move on its `src` column, so the set keeps one shape.

7. **RULE7A-1: the whole Policies group goes, because every count is zero.** Region: the RIGHT half of the
   "Weight and id details" grid, lines 737-778 -- the `Policies` header with its Coming tag and info
   circle, the `in this file` caption row, and the three rows Repeats / Unknown nodes / Self-loops with
   their three `0`s. DELETE all of it. Every control is at its shipped default and every count is zero, so
   Rule 7a deletes the control and 6.2's null-statement rule deletes the report. This board -- the one
   whose entire argument is that the mapping was done for you -- is DECISIONS-1.8 D5's named example
   ("draws all three policies at their defaults with the counts 0 0 0 beside them"). Unlike ImportOptions,
   nothing here survives as a collapsed section: a section whose trailing slot would read "0, 0, 0" is the
   null statement 6.2 forbids.

8. **RULE7A-2: the Load control goes.** Region: lines 793-803, the `Load` label, its info circle and the
   `Everything` select. DELETE the group. Everything is the default and D5 names this row by hand
   ("and draws 'Load: Everything', which is also the default"). The Parsing group beside it then sits alone
   on its flex row: change that row's container (line 792) from
   `<div style="display: flex; align-items: center; gap: 24px;">` to
   `<div style="display: flex; align-items: center;">` and leave Parsing's own `flex: 1 1 auto` as it is.
   Floor item 4 is held without the row: the reading at the top says 318 nodes and 1,104 edges and the
   preview caption says 1,104 rows, so the scope Import acts on is stated twice already.

9. **RULE7A-3: the bipartite checkbox goes on this board only.** Region: lines 779-790, the
   `Two node types (bipartite)` checkbox with its info circle, which sat under the Policies block. DELETE
   it. It is unchecked at its default, and unlike ImportOptions this board has a recognition banner: the
   parser's structural finding travels in "Recognized a STRING export -- 12 columns mapped" and its full
   per-column record sits behind the banner's Details chevron, which is where floor item 3 puts it. Record
   that reason in the comment, because ImportOptions KEEPS its bipartite row and the difference must not
   read as drift: `1.8: the bipartite row is drawn where nothing else reports the parser's structural
   finding (ImportOptions, ImportLargeFile) and is not drawn where a recognition banner reports it (here).`

10. **DETAILS-1: the banner's Details chevron gets its destination named.** Region: the Details chevron,
    lines 547-549, `title="Details"`. New title: `title="Details. The full per-column record: every role,
    every type, the weight treatment, the identifier system and the installed filter"`. The chevron is
    unchanged in shape and position. D5: "the recognition banner's full per-column record goes behind its
    Details chevron, which floor item 3 names by hand."

11. **CNT-1: restate the after-state in the file comment.** Region: file comment, at the end. Add:
    `REVISION 1.8 AFTER-STATE, 15 -> 7 resident rows outside the preview grid, in render order: (1) the
    reading "318 nodes, 1,104 edges, undirected, weighted by combined_score"; (2) Format; (3) Import as;
    (4) Direction; (5) the recognition banner with its Details chevron and Map it myself; (6) the preview
    caption "First 5 of 1,104 rows, 12 columns"; (7) the collapsed Parsing row reading "Header row".
    Removed: the four-row Weight block and the Identifier system group (to two column Role chips, which now
    carry "Weight strength" and "Source gene symbol" as dimmed suffixes); the Policies header, its caption
    row and its three zero rows (Rule 7a plus 6.2's null statement); Load at Everything (Rule 7a); the
    bipartite checkbox (the banner reports it). Kept by the floor: the reading, the run record in full,
    every column name and cell value, the preview caption, Cancel and Import in full text.`

## ImportLargeFile

File: `ImportLargeFile.dc.html`. State: Import options over the Empty shell, nothing loaded,
`netflow-2026-q2.csv`, 3.2 GB, above the render ceiling, Busiest nodes 50,000 pre-selected. No canvas
toolbar, minimap or legend.

1. **SET-WIDE, read this first.** No new icons, words or colours beyond `VOCAB.md` (now including section
   14) and this board's own copy. Keep `<script src="./support.js"></script>` exactly. Static board. Plain
   ASCII, `--` for dashes, straight quotes. Do not edit `canvas.json`. Do not touch any other `.dc.html`.
   Target for this board, from DECISIONS-1.8 section H: **13 resident rows outside the preview grid -> 10.**
   If your count lands one off after applying every item, record the achieved count in the file comment.

2. **LEG-0: this board draws no legend, and that is now a recorded fact.** Region: file comment, the shell
   paragraph, line 70 (`... no inspector; no canvas toolbar, minimap or legend; status bar "No data
   loaded" ...`). Append to that sentence: ` 1.8 C2 splits floor item 5 into an export obligation and a
   screen obligation; nothing is loaded, so there is no encoded channel and neither fires.` No change on
   screen.

3. **A2-VETO: the Load radio list may never become a door, and the reason is now written on the board.**
   Region: file comment, after the "THE TWO NUMBERS" paragraph. Add: `REVISION 1.8, 6.10a and D5: the Load
   control and its options are refused a door in every pass. Floor item 4 binds a cost estimate to the
   control that spends it and 6.11's second clause forbids a door between them, so each option keeps its
   own arithmetic and its own cost figure resident -- the chosen option and the rejected one alike. The
   departure line and the ceiling it names stay resident for the same reason. Nothing in this section is a
   candidate for the door test at any density.` No change on screen.

4. **RULE7A-1: the three policy rows go.** Region: the three-column policy grid, lines 594-626 -- the
   `Repeats / Combine + sum` cell with its Coming tag, the `Unknown nodes / Create` cell and the
   `Self-links / Keep` cell, together with their wrapping
   `<div style="display: grid; grid-template-columns: 1.2fr 0.9fr 0.9fr; gap: 16px;">`. DELETE the grid and
   all three cells. Every control sits at its shipped default and no count can be known until the file
   parses -- 3.2 GB of it, read to 256 KB -- which is Rule 7a's own named example and D5 names this board
   by hand for it. The full sentences the fields carried are not lost: they are already the shipped default
   behaviour and they return the moment a policy deviates. Net: -3 rows.

5. **POP-ROLE-1: the prose role line goes, and its two facts move onto the two Role chips.** Region: the
   caption under the preview grid, the line reading
   `ts: one moment, ISO 8601. bytes: strength (higher is closer), not normalized.` DELETE that span. Then,
   in the grid header: the `ts` column's Role chip (currently `<div ...>Time</div>`) becomes
   ```html
   <div title="Time: ts. A single moment, ISO 8601. Click for this column's role parameters" style="display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 8px; background: #28364e; border: 1px solid #4a7ee8; color: #d5d7da; font-size: 10px; line-height: 1; box-sizing: border-box; white-space: nowrap;">Time <span style="color: #7a828e;">ISO 8601</span></div>
   ```
   and the `bytes` column's Role chip (currently `<div ...>Weight</div>`, `#f7b731` border because it was
   guessed) keeps its warning border and becomes
   ```html
   <div title="Weight: bytes, guessed. Treat as strength (higher is closer). Not normalized. Click for this column's role parameters" style="display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 8px; background: #2a3035; border: 1px solid #f7b731; color: #d5d7da; font-size: 10px; line-height: 1; box-sizing: border-box; white-space: nowrap;">Weight <span style="color: #7a828e;">strength</span></div>
   ```
   `not normalized` is a control at its default and is not printed (Rule 7a); it rides in the title and
   lives in the pop-over. Note in the comment that this deletes the third of D5's three shapes: "on
   ImportOptions the weight's strength is a tag crammed into the amount column and the time's Kind and
   Format are two dimmed sub-lines under ts; on ImportRecognised the same facts are a four-row block plus a
   top-level select; on ImportLargeFile they are a prose sentence." After 1.8 all three are the same dimmed
   suffix on the same chip.

6. **A6-1: the Parsing gear draws dimmed, and that is now stated.** Region: the trailing 24px Parsing door
   on the RT-2 compound row, the div with
   `title="Parsing: separator comma, quote double, first row is a header, UTF-8, list separator vertical bar"`.
   Keep its position and its `color: #7a828e`. Add a comment beside it: `1.8, A6: a door glyph draws in the
   dimmed ink when everything behind it is at its default and in the primary ink when anything behind it is
   not. Every value in this door's title is a detected or default value, so it draws dimmed (#7a828e). If a
   later state changes a separator or an encoding by hand, this glyph takes the primary ink #d5d7da and the
   departure renders resident under the row that owns the door.` No change on screen.

7. **STUB-1: the bipartite checkbox stays, and the reason is recorded.** Region: the RT-5 boolean row under
   the grid, the `Different node types (bipartite)` checkbox with its detection info circle. Keep it
   exactly as drawn. Add to its stated-departure comment: `1.8: this row is drawn because nothing else on
   this board reports the parser's structural finding -- there is no recognition banner here. ImportOptions
   keeps it for the same reason; ImportRecognised deletes it because its banner carries the finding.`
   Separately, correct the label to the set's one string: current
   `Different node types <span style="color: #7a828e;">(bipartite)</span>`; new
   `Two node types <span style="color: #7a828e;">(bipartite)</span>`. R2-M10 already recorded that
   ImportOptions and ImportRecognised carry "Two node types (bipartite)" and that this board's
   "Different node types" is the odd one out; 1.8's one-shape pass closes it. The title
   `Treat source and target as different node types (bipartite)` becomes
   `Treat source and target as two node types (bipartite)`.

8. **CONFIRM-1: no floating cost card appears on this board, and that is deliberate.** Region: file
   comment, after item 3's addition. Add: `REVISION 1.8, B4 and 14.4: a cost estimate, cap or destructive
   confirm is a pop-out with two verbs, not a floating card -- it takes its region's lane and its opener
   row's shared edge line, and it carries no close X. The cost GATE is a different thing: floor item 4
   binds the estimate to the control that spends it, so a gate renders INLINE under the row that raised it
   and never as any floating surface. Everything on this board is a gate: the departure line, each Load
   option's own arithmetic and each option's own cost figure. Do not convert any of them to a pop-out.`
   No change on screen.

9. **CNT-1: restate the after-state in the file comment.** Region: file comment, at the end. Add:
   `REVISION 1.8 AFTER-STATE, 13 -> 10 resident rows outside the preview grid. Removed: the three policy
   rows (Rule 7a -- every control at its default and no count knowable before the file parses) and, inside
   the preview-grid block, the prose role line (to two Role chip suffixes). Kept whole and not negotiable:
   the reading "Estimated 1.0M nodes, 10M edges (from the first 256 KB)."; the departure line and the
   ceiling it names; the Load header with "Default set in Settings > Performance"; every Load option with
   its own arithmetic and its own cost figure; the scope sentence; the Columns header with "2 guessed" and
   Review; the bipartite row; Cancel and Import in full text.`

## ImportParseError

File: `ImportParseError.dc.html`. State: Import options over the Empty shell, nothing loaded,
`malformed-export.csv`, 1.2 MB, parse error, Parsing drawn open with Separator focused, Import disabled
with "Skip 4 rows and import" beside it. No canvas toolbar, minimap or legend.

1. **SET-WIDE, read this first.** No new icons, words or colours beyond `VOCAB.md` (now including section
   14) and this board's own copy. Keep `<script src="./support.js"></script>` exactly. Static board. Plain
   ASCII, `--` for dashes, straight quotes. Do not edit `canvas.json`. Do not touch any other `.dc.html`.
   Target for this board, from DECISIONS-1.8 section H: **10 resident rows outside the preview grid -> 9.**
   If your count lands one off after applying every item, record the achieved count in the file comment.

2. **LEG-0: this board draws no legend, and that is now a recorded fact.** Region: file comment, the
   `A1 / TB-1` paragraph, lines 67-68 (`A1 / TB-1: no canvas toolbar, no minimap, no legend. Nothing is
   loaded, so there is no canvas to navigate; ...`). Append: ` 1.8 C2 splits floor item 5 into an export
   obligation and a screen obligation; with nothing loaded there is no encoded channel, so neither fires.`
   No change on screen.

3. **RULE7A-1: the two policy rows go.** Region: the section 5 Policies grid, lines 633-655 -- the whole
   `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">` holding the
   `Repeats / Combine + sum` cell with its Coming tag and info circle and the `Self-links / Keep` cell with
   its info circle. DELETE the grid and both cells. Both controls sit at their shipped defaults and this
   board already says in its own comment that no count can be drawn ("a repeat count taken from a partial
   parse would be a number the dialog cannot stand behind"), which is exactly Rule 7a's named case: a
   control at its default with a report the data cannot support. D5 names this board by hand for it. Net:
   -1 visual row (the two cells shared one grid row).

4. **RULE7A-2: record that the deletion is a rule and not a taste.** Region: the comment block that
   introduced the Policies grid, lines 629-632. Replace the whole comment with: `5. Policies. Not drawn in
   1.8 (Rule 7a, DECISIONS-1.8 D5): both controls sit at their shipped defaults, and the counts that would
   make them a report cannot be known until the file parses -- which on a parse-error board is the whole
   point. The full sentences are not lost; they return with the rows the moment a policy deviates or a
   count exists. "Edges that mention unknown nodes" was already not drawn here (Rule 7c: no nodes file).`

5. **POP-3 AMENDED, and this board stays the loudest proof.** Region: file comment, lines 56-58, the
   `POP-3` paragraph. Replace with: `POP-3, AS AMENDED BY 1.8 B2: inside the Import options dialog the
   validation issues stay INLINE -- because errors here gate the Import button and because the issue list
   is a scan surface of the user's own ids (floor 7). NOT because a dialog cannot host a pop-out: B2 gives
   the dialog its own lane (gap 8, row top to pop-out top, one pop-out at a time, Escape closes the
   pop-out before the dialog). This board is still the loudest drawn proof of the exception, because the
   whole error block is resident and the primary is disabled behind it.`

6. **POP-ROLE-1: the Role chips carry their parameters as dimmed suffixes here too, or carry nothing.**
   Region: the preview grid header's Role chips. This file has nothing guessed and no weight, time or
   identifier parameter that deviates, so NO chip takes a suffix on this board. Add one comment above the
   grid header: `1.8, D5: a column's role parameters live in a 280 pop-over opened from that column's Role
   chip, and the chip prints the setting as a dimmed suffix ("Weight strength", "Time ISO 8601", "Source
   account id"). On this file every role parameter is at its default, so every chip prints the role word
   alone (Rule 7a). Do not add an empty suffix.` No change on screen.

7. **A6-1: the Parsing group is open, so no door glyph is drawn, and that is stated.** Region: the section
   7 Parsing group, drawn open with Separator focused. Change nothing. Add to its comment: `1.8, A6: a door
   glyph draws dimmed at defaults and primary at a deviation. This board draws no Parsing door at all --
   item 8's override draws the group OPEN with Separator focused, because a user who once collapsed Parsing
   would otherwise never see the control that fixes their file. An open group has no stub to colour.`

8. **CONFIRM-1: the footer note and the two verbs stay inline.** Region: file comment, after item 5's
   replacement. Add: `REVISION 1.8, B4 and 14.4: a cost estimate, cap or destructive confirm is a pop-out
   with two verbs and no close X; a cost or loss GATE is inline on the control that spends it (floor item
   4). "Skip 4 rows and import" past a stated loss is a gate, so the footer note stays inline beside it and
   is never converted to a floating card. The disabled primary keeps its title, which is floor item 4's
   reason a disabled control is disabled.` No change on screen.

9. **CNT-1: restate the after-state in the file comment.** Region: file comment, at the end. Add:
   `REVISION 1.8 AFTER-STATE, 10 -> 9 resident rows outside the preview grid. Removed: the two-cell policy
   grid (Rule 7a). Kept whole: the error block with the row number, the arithmetic and the quoted line; the
   RT-2 compound row; the grid footer "First 5 of 40,912 rows, plus row 1,284" with the "-- not set"
   legend; the Parsing group open with its five controls; the footer note and both verbs in full text;
   Cancel, never disabled.`
## ImportAddToGraph

File: `ImportAddToGraph.dc.html`. State: the "What do you want to do with this file?" picker over a loaded
fraud graph, Data panel open at Loaded data, canvas encoded on two channels, minimap and legend drawn.
Frame 1440 by 900.

1. **SET-WIDE, read this first.** No new icons, words or colours beyond `VOCAB.md` (now including section
   14, "1.8 additions") and this board's own copy. Keep `<script src="./support.js"></script>` exactly.
   Static board. Plain ASCII, `--` for dashes, straight quotes. Do not edit `canvas.json`. Do not touch any
   other `.dc.html`. Two set-wide decisions land on this board: the legend loses its category counts (item
   2), and the Data panel gets the product's one general import door (item 5).

2. **LEG-1: the legend encodes TWO channels; it keeps both and loses four numbers.** Region: the legend
   block, lines 1002-1055. This legend draws `Color: node type (type)` with four categorical rows
   (Accounts 96, Devices 48, Phone numbers 34, Merchants 22) and `Size: Most connected (Degree centrality)`
   with the 1 / median 6 / 44 ramp and `sqrt scale`. Under DECISIONS-1.8 C3 the canvas legend draws no
   category counts. DELETE the four count spans at lines 1011, 1018, 1025 and 1032 (each is
   `<span style="flex: 0 0 auto; color: #7a828e;">N</span>`) and re-cut each of the four rows from the
   `space-between` two-part form to VOCAB 14.5's single-part form, keeping this board's own 10px div
   swatch and its own fill:
   ```html
   <div style="display: flex; align-items: center; gap: 6px; height: 14px; font-size: 11px; line-height: 1.2; color: #d5d7da;">
     <div style="width: 10px; height: 10px; flex: 0 0 auto; border-radius: 50%; background: #4a7ee8;"></div>
     <span style="flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Accounts</span>
   </div>
   ```
   Repeat for Devices (`#33bfd7`), Phone numbers (`#61d095`) and Merchants (`#f7b731`), keeping each row's
   existing fill exactly. Four rows is at or under the five-row cap, so NO Other row and NO coverage footer
   are drawn here. There are no state rows on this legend, so C3's first cut fires on nothing. The Size
   block is untouched: min / median / max, the word "median", the transformed radii and "sqrt scale" are
   all floor item 5 and the scale word is the highest-uniqueness line in the whole set.

3. **LEG-2: what replaces the counts, named on this board.** Region: none -- nothing is added to the
   canvas. The four numbers already stand, word for word, in the Graph summary inspector on this same
   board: `96 accounts, 48 devices, 34 phone numbers and 22 merchants, connected by 612 transactions. One
   connected part holds all 200 nodes.` They also stand behind the inspector's `Schema` door
   (`4 node types, 3 edge types`). That is C1's measured duplication drawn on one screen, and it is the
   whole reason the counts leave. Record it in the legend's comment: `1.8, C3: the canvas legend draws no
   category counts. On this board the same four counts are printed verbatim in the inspector's reading
   sentence and again behind the Schema door, so nothing is lost and one fact stops occupying two regions
   (5.1, One fact, one region). The EXPORT legend keeps the twelve largest categories WITH counts, the
   coverage footer and one row per state drawn in the frame; it is composed from the encoding model at the
   export's own scale and is not this DOM overlay (VOCAB 14.6).`

4. **LEG-3: the cap comes down.** Region: the legend container, line 1002. Current fragment:
   `min-height: 80px; max-height: 334px;`. New: `min-height: 80px; max-height: 240px;`. Everything else on
   that line -- `right: 12px; bottom: 12px; width: 256px`, the 6px gap, the 6px/8px padding, the 4px
   radius, `#1f2428` on `#48525c` -- is unchanged. The width stays 256, so 5.6's two-line reflow
   arithmetic and the bottom-stack offsets are untouched. This legend measures well under 240 after item 2,
   so the cap binds nothing here and only forbids regrowth.

5. **DOOR-1: the one general import door, retitled.** Region: the Loaded data section header's gear,
   line 261, `title="Import settings"`. New: `title="Import options"`. Keep the glyph, the 24px box and
   the `#7a828e` ink. D5: three boards drew three different Data panels with three different general
   import doors; after 1.8 there is one glyph, one title and one home -- the gear on the Loaded data
   section header, titled "Import options". This board already has the gear in the right place, so only the
   word changes. Add beside it: `1.8, A6: this gear draws dimmed (#7a828e) because everything behind it is
   at its default; it takes the primary ink #d5d7da the moment any import option deviates, and the
   departure renders resident under this section.`

6. **RULE3-1: the prose mapping sentence goes, and the four mapping fields take its place.** Region:
   line 296, the RT-10 run-record line reading `Mapped source, target, amount to weight (strength), ts to
   time, id to label.` and its wrapping `<div style="padding: 4px 0 6px;">`. DELETE both. In their place
   draw the two RT-1 pair rows DataPanelLoaded already draws, with this board's own values, each field
   carrying the 12px in-field chevron that is the per-column door:
   ```html
   <div style="display: flex; align-items: center; gap: 8px; height: 32px;">
     <div title="Weight column: amount. Change in Import options" style="display: flex; align-items: center; gap: 2px; flex: 1 1 0; min-width: 0; height: 24px; padding: 0 4px; background: #2a3035; border-radius: 4px; box-sizing: border-box; cursor: pointer;">
       <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #7a828e;">weight</span>
       <span style="flex: 1 1 0; min-width: 0; text-align: right; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">amount</span>
       <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><polyline points="4,6 8,10 12,6"></polyline></svg>
     </div>
     <div title="Time column: ts. Change in Import options" style="display: flex; align-items: center; gap: 2px; flex: 1 1 0; min-width: 0; height: 24px; padding: 0 4px; background: #2a3035; border-radius: 4px; box-sizing: border-box; cursor: pointer;">
       <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #7a828e;">time</span>
       <span style="flex: 1 1 0; min-width: 0; text-align: right; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">ts</span>
       <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><polyline points="4,6 8,10 12,6"></polyline></svg>
     </div>
     <div style="width: 24px; height: 24px; flex: 0 0 auto;"></div>
   </div>
   ```
   and a second identical row carrying `label | id` and `ids | account id`, with the titles
   `Label column: id. Change in Import options` and
   `Identifier system: account id. Change in Import options`. Then DELETE the now-duplicated `Ids /
   account id` label-value row (lines 274-277), because the new `ids` field states it (Rule 8). Reason for
   the comment: Rule 3 forbids the label-value prose list, D5 names this board's version by hand
   ("ImportAddToGraph's 1.5-era label-value list plus a prose mapping sentence, which Rule 3 forbids
   outright"), and each mapping field is already the anchored-door pattern -- an RT-1 select whose 12px
   in-field chevron opens Import options scrolled to that column with its Role chip focused, where the
   Role chip's own 280 pop-over now holds that role's parameters.

7. **RULE3-2: the three applied-policy label-values become one run-record line.** Region: lines 282-293,
   the three rows `Repeats / Combined, 5 pairs`, `Unknown nodes / Created, 1` and
   `Loops to self / Kept, 2`. DELETE all three and draw one RT-10 line in their place, under the mapping
   fields:
   ```html
   <div style="padding: 2px 0 6px;">
     <span style="font-size: 11px; line-height: 1.4; color: #7a828e;">Combined 5 repeated pairs, created 1 node, kept 2 self-loops.</span>
   </div>
   ```
   This is floor item 3 kept whole -- every count survives -- in the one shape the set now uses, and it
   ends the third of the three different Data panels. Keep the `Format / JSON node-link, 41 KB`,
   `Direction / Directed, from file` and `Attributes / 8` rows exactly as drawn.

8. **VERB-1: Close dataset leaves the section for the panel header's overflow.** Region: line 299, the
   `Close dataset` button and its wrapping 32px row. DELETE both. Add the verb to the Data panel title
   row's existing overflow menu (the vertical three-dot glyph in the panel header), whose menu keeps the
   verb's full text and its second name: `Close dataset. Starts a new session`. D5: of the two rows the
   Data panel loses in 1.8, both are verbs going to menus. Nothing is un-named -- FLOOR-1.9's clause keeps
   a menu row's full verb text.

9. **ANCHOR-1: the picker's per-option settings anchor to the chosen card.** Region: the
   "What do you want to do with this file?" picker. Change nothing on screen. Add to its comment:
   `1.8, D5 and B1: item 3's per-option settings anchor to the CHOSEN CARD, not to the dialog -- a
   transient surface never chooses its own position, it inherits one from its opener on both axes: 8px
   clear of the opener on the side it opens from, and a shared edge line (row top to pop-out top) on the
   other. Inside a dialog the lane is B2's dialog lane and the dialog is a fourth region for as long as it
   is open; one pop-out at a time, and Escape closes the pop-out before the dialog.`

10. **CNT-1: restate the after-state in the file comment.** Region: file comment, at the end. Add:
    `REVISION 1.8 AFTER-STATE. Legend: 2 encoded channels, both kept; four category counts deleted (C3),
    no state rows to delete, four rows is under the five-row cap so no Other row and no coverage footer;
    cap 334 -> 240. Data panel: the general import door is the gear on the Loaded data header, titled
    "Import options"; the prose mapping sentence and the Ids label-value became four RT-1 mapping fields,
    each its own door; the three policy label-values became one run-record line; Close dataset moved to
    the panel header overflow. Nothing else in the panel or on the canvas moved.`

## TableJoin

File: `TableJoin.dc.html`. State: the Table join dialog over the ovarian STRING network (318 proteins),
`expression.tsv` matched on gene against preferredName, 312 of 340 matched, Data panel open behind the
scrim, canvas encoded on one channel, minimap and legend drawn. Frame 1440 by 900.

1. **SET-WIDE, read this first.** No new icons, words or colours beyond `VOCAB.md` (now including section
   14) and this board's own copy. Keep `<script src="./support.js"></script>` exactly. Static board. Plain
   ASCII, `--` for dashes, straight quotes. Do not edit `canvas.json`. Do not touch any other `.dc.html`.

2. **LEG-1: the legend encodes ONE channel, and every line on it is floor -- it does not change.** Region:
   the legend block, lines 528-565. It draws `Size: Most connected (Degree centrality)` with the
   1 / median 5 / 41 ramp and `sqrt scale`, and nothing else. There are no category rows, so C3's count cut
   and five-row cap fire on nothing; there are no state rows, so C3's first cut fires on nothing. Keep
   every line. This is the Data group's instance of the honest headline in DECISIONS-1.8 section H --
   "StyleDiverging 240 -> 240, unchanged, because every line on it is floor" -- and it should be recorded
   as such, not silently left alone. Add to the legend comment: `1.8, C2 and C3: this legend is entirely
   floor item 5 -- channel, attribute, domain endpoints with the median, and the scale in words -- so the
   two unconditional cuts (no category counts, no state rows) remove nothing here and the five-row cap
   never fires. Its height is unchanged. That is the promise C makes: not that the legend is small, but
   that everything left on it is load-bearing.`

3. **LEG-2: the cap comes down anyway.** Region: the legend container, line 544. Current fragment:
   `min-height: 80px; max-height: 334px;`. New: `min-height: 80px; max-height: 240px;`. Nothing else on
   that line changes. The cap binds nothing on this board and exists to forbid regrowth.

4. **LEG-3: the export obligation is recorded where the export cannot be drawn.** Region: the legend
   comment. Append: `1.8, C4 and VOCAB 14.6: the exported image carries a legend composed from the encoding
   model at the export's own scale, drawn into the image -- never captured from this DOM overlay, which a
   Babylon scene capture cannot see. It ignores this legend's visibility and, in the SVG and PDF paths, is
   emitted as vector text. Nothing on this board draws it; the board only owes the reader the statement.`

5. **DOOR-1: one general import door, and this board currently draws two of the wrong ones.** Regions:
   (a) line 226, the gear on the `Add data` section header, `title="Import settings"`. DELETE that gear
   entirely: the Add data header's gear reaches nothing about a file that is already loaded, which is the
   same reason D5 deletes it from the Empty state. (b) The `Edit the import options` PENCIL on the Loaded
   data section header (around line 298). Replace the pencil with VOCAB 14.1's dimmed gear, keeping its
   24px box and its place beside the `212 KB` trailing text:
   ```html
   <div title="Import options" style="display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 24px; height: 24px; border-radius: 4px; color: #7a828e; cursor: pointer; box-sizing: border-box;">
     <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.25"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"></path></svg>
   </div>
   ```
   D5: one general import door, one glyph, one title, one home -- the gear on the Loaded data section
   header, titled "Import options". Update the section comment that currently reads "The section header
   keeps its pencil": `1.8, D5: the pencil becomes the one registered gear and the Add data gear is
   deleted, so the four Data-panel boards draw one door in one place with one title.`

6. **POP-JOIN: Prefix and Case-sensitive move behind the Conflicts field's own in-field chevron.**
   Regions: (a) the Prefix cell, lines 915-919 -- the comment, the `Prefix` label span and the
   `no prefix` placeholder field. DELETE the whole cell. (b) The booleans cell, lines 920-933: DELETE the
   `Case-sensitive` row (the checkbox, its label and its info circle, lines 924-928) and KEEP the
   `Color by log2FoldChange` row exactly as drawn. (c) The Conflicts field itself: it already carries a
   chevron; add the door's title so the reader can see what is behind it:
   `title="Conflicts: keep the existing value. Click for join options -- conflict rule, prefix,
   case-sensitive matching"`. Both deleted controls sit at their defaults (`no prefix`, unchecked), so
   Rule 7a would not draw them even if there were no door; the door is what makes them reachable in one
   click from the row that owns the property (A3). This is the RT-1 door rule at field scale: no new glyph
   and no new lane. D5 records the result as "Table join settings 4 controls -> 1".

7. **KEEP-1: "Color by log2FoldChange" stays resident, by name.** Region: line 931. Change nothing. Add
   beside it: `1.8, D5: this checkbox is W20 step 4 collapsed into one click, and hiding a one-click
   accelerator behind a door is the opposite of accelerating. It is not a join setting and it does not go
   behind the Conflicts chevron.` With the Prefix cell gone, the booleans cell moves from grid column 3
   into column 2; leave column 3 empty and do not restretch `grid-template-columns: repeat(3, minmax(0,
   1fr))`.

8. **KEEP-2: the match reports stay resident, by name.** Region: the `312 of 340 matched` line, the
   `28 unmatched` row and its `Ignore` / `Add as new nodes` pair, and the open unmatched list. Change
   nothing. Add to that block's comment: `1.8, D5, refused for a door and recorded so it is not
   re-proposed: W20's own success criterion names these reports, and floor item 4 binds what a control will
   do to the control that does it. The match reports, the unmatched list and the two verbs stay resident at
   every density.`

9. **CONFIRM-1: record the confirm rule, because this board has a destructive-looking pair and must not
   grow a card.** Region: file comment. Add: `REVISION 1.8, B4 and VOCAB 14.4: a cost estimate, cap or
   destructive confirm is a pop-out with two verbs -- its region's lane, its opener row's shared edge line,
   280 for a sentence and two buttons, no pin and no close X, Escape cancels and returns focus to the
   opener. A cost or overwrite GATE is a different thing and renders INLINE on the control that spends it
   (floor item 4). The overwrite warning on this board is a gate and stays inline.` No change on screen.

10. **CNT-1: restate the after-state in the file comment.** Region: file comment, at the end. Add:
    `REVISION 1.8 AFTER-STATE. Legend: 1 encoded channel, entirely floor, unchanged in content; cap 334 ->
    240. Dialog: the settings grid loses the Prefix cell and the Case-sensitive checkbox to a 280 join
    options pop-over opened from the Conflicts field's own in-field chevron (dialog lane, B2); Color by
    log2FoldChange, the match reports, the unmatched list and both its verbs stay resident. Data panel: the
    Add data gear is deleted and the Loaded data pencil becomes the one registered "Import options" gear.`

## DataPanelLoaded

File: `DataPanelLoaded.dc.html`. State: Data panel in the Loaded state over the fraud graph
(`fraud-ring-synthetic.json`, 200 nodes, 612 edges), Graph summary inspector, canvas encoded on two
channels, minimap and legend drawn, no drawer and no slider. Frame 1440 by 900.

1. **SET-WIDE, read this first.** No new icons, words or colours beyond `VOCAB.md` (now including section
   14) and this board's own copy. Keep `<script src="./support.js"></script>` exactly. Static board. Plain
   ASCII, `--` for dashes, straight quotes. Do not edit `canvas.json`. Do not touch any other `.dc.html`.
   Target for the panel, from DECISIONS-1.8 section H: **19 resident rows -> 17**, and both removals are
   verbs going to menus. D9 is explicit that Data is not Present: eight of the twelve content rows are
   floor items and three are the front door, so do NOT hide anything else.

2. **LEG-1: the legend encodes TWO channels; it keeps both and loses four numbers.** Region: the legend
   block, lines 1240-1290. It draws `Color: node type (type)` with four categorical rows (Accounts 96,
   Devices 48, Phone numbers 34, Merchants 22) and `Size: Most connected (Degree centrality)` with the
   1 / median 6 / 44 ramp and `sqrt scale`. DELETE the four count spans at lines 1249, 1256, 1263 and 1270
   (each `<span style="flex: 0 0 auto; color: #7a828e;">N</span>`) and re-cut each row to VOCAB 14.5's
   single-part form, keeping this board's own 10px div swatch and its own fill:
   ```html
   <div style="display: flex; align-items: center; gap: 6px; height: 14px; font-size: 11px; line-height: 1.2; color: #d5d7da;">
     <div style="width: 10px; height: 10px; flex: 0 0 auto; border-radius: 50%; background: #4a7ee8;"></div>
     <span style="flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Accounts</span>
   </div>
   ```
   Repeat for Devices (`#33bfd7`), Phone numbers (`#61d095`) and Merchants (`#f7b731`). Four rows is under
   the five-row cap, so no Other row and no coverage footer. No state rows exist on this legend. The Size
   block is untouched -- min / median / max, the word "median", the transformed radii and "sqrt scale" are
   floor item 5, and LEGEND-1.8 section 3's "the scale word is always printed, even when it is the default"
   is kept on both surfaces.

3. **LEG-2: what replaces the counts, named on this board.** Region: none -- nothing is added to the
   canvas. The four numbers already stand word for word in the Graph summary inspector on this same board:
   `96 accounts, 48 devices, 34 phone numbers and 22 merchants, connected by 612 transactions. One
   connected part holds all 200 nodes.`, and again behind the inspector's `Schema` door
   (`4 node types, 3 edge types`). Record it in the legend comment: `1.8, C3: the canvas legend draws no
   category counts and no state rows. On this board the same four counts are printed verbatim in the
   inspector's reading sentence and again behind the Schema door -- C1's measured duplication, on one
   screen. The exported legend keeps the twelve largest categories WITH counts, the coverage footer, every
   departure line and one row per state drawn in the frame, because a static figure has no filter strip, no
   status bar and no result card to name them (VOCAB 14.6).`

4. **LEG-3: the cap comes down.** Region: the legend container, line 1240. Current fragment:
   `min-height: 80px; max-height: 334px;`. New: `min-height: 80px; max-height: 240px;`. Nothing else
   changes: `right: 12px; bottom: 12px; width: 256px` and the 12px overlay inset stay, so the bottom stack
   and the toolbar do not move.

5. **LEG-4: the histogram note in the file comment needs one clause.** Region: file comment, the sentence
   about the size channel (around line 1371, `... the canvas legend, which still states the size channel
   and its scale in ...`). Append to that sentence: ` After 1.8 C3 the legend states the channel, the
   attribute, the endpoints, the median and the scale word, and no counts at all; the counts live in the
   inspector, the Schema door and the exported legend.`

6. **DOOR-1: the general import door moves from Open file to Loaded data.** Regions: (a) line 219, the
   gear on the Open file section header, `title="Import settings"`. DELETE it -- with nothing loaded that
   gear reaches nothing, which is D5's reason for deleting it from the Empty state, and with something
   loaded the door belongs to the data it edits. (b) The Loaded data section header (around line 244-252):
   add VOCAB 14.1's dimmed gear as its trailing control, in the same 24px box the deleted one used:
   ```html
   <div title="Import options" style="display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 24px; height: 24px; border-radius: 4px; color: #7a828e; cursor: pointer; box-sizing: border-box;">
     <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.25"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"></path></svg>
   </div>
   ```
   Add beside it: `1.8, A6: dimmed (#7a828e) because everything behind it is at its default; primary
   (#d5d7da) the moment an import option deviates, with the departure rendered resident under this
   section.` This is a net zero on rows: one gear moves, none is added.

7. **VERB-1: Close dataset leaves the section for the panel header's overflow.** Region: lines 328-332,
   the 32px row holding the `Close dataset` button and the `New session` dim word. DELETE the whole row.
   Add the verb to the Data panel title row's existing vertical three-dot overflow (the glyph at line 168),
   whose menu keeps the full text and the second name: `Close dataset. Starts a new session`. Net: -1
   resident row.

8. **VERB-2: Find and merge duplicates leaves the section for the Cleaning steps header's overflow.**
   Regions: (a) lines 493-497, the `Find and merge duplicates...` row with its Coming tag. DELETE the row.
   (b) The Cleaning steps section header (lines 465-472) has no trailing control; add the registered
   overflow glyph in a 24px box at its right end, inside the existing `justify-content: space-between` row:
   ```html
   <div title="More" style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
     <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="3.5" r="0.75"></circle><circle cx="8" cy="8" r="0.75"></circle><circle cx="8" cy="12.5" r="0.75"></circle></svg>
   </div>
   ```
   Its menu carries `Find and merge duplicates... (Node merging, batch mode)` with its Coming tag, so
   nothing is un-named (FLOOR-1.9). Net: -1 resident row. That is the second and last of the panel's two
   removals: 19 -> 17.

9. **KEEP-1: the four mapping fields are already the anchored-door pattern and may not be touched.**
   Region: the two RT-1 pair rows at lines 292-320 (`weight | amount`, `time | ts`, `label | id`,
   `ids | account id`), each with its 12px in-field chevron. Change nothing on screen. Extend each field's
   title so the destination names the 1.8 surface: `Weight column: amount. Change in Import options` ->
   `Weight column: amount. Opens Import options at that column, with its Role chip focused`, and the same
   pattern for the other three. Add to the block comment: `1.8, D5: these four are floor items 2, 4 and 6
   AND are already the anchored-door pattern -- an RT-1 select whose 12px in-field chevron opens Import
   options scrolled to that column with its Role chip focused, where that chip's own 280 pop-over holds the
   role's parameters (Weight: Treat as, Normalize to 0-1, Divide by 1000; Time: Kind, Measured in, format;
   the node-id column: Identifier system). Refused for any further door at any density.`

10. **CAP-1: the Columns section's row cap, recorded where it lives.** Region: the Columns section header
    (line 345-352), which is drawn COLLAPSED on this board and carries `12` plus the
    `amount 98% filled` warning. Change nothing on screen. Add to its comment: `1.8, D5: when this section
    is open it caps at 8 rows and the ninth row reads "Show all 12", which opens the Data table drawer.
    The cap is not drawn here because the section is closed; the boards that draw it open owe it.`

11. **POP-VAL: the Validation report door gains the caret and the scroll rule.** Region: the Validation
    report section header (lines 421-441), drawn closed with `4 types` in its trailing slot. Change nothing
    on screen -- the pop-out is drawn on ValidationPopout, not here. Add to its comment: `1.8, B1 and B3:
    the pop-out this door opens takes the activity-panel lane (left edge 336, 8px clear of the panel's
    328), and its SHARED EDGE LINE is this row's -- top to top, or bottom to bottom when a 470px surface
    cannot sit top-to-top in a 40-to-616 region. It carries a 6px caret on its leading edge at the vertical
    centre of THIS row, clamped 12px inside its own corners. While this row is in the panel the pop-out
    follows it; when this row scrolls out the pop-out docks to the edge it left through, drops its caret,
    keeps this row lit and grows a 20px return strip naming it; when this section collapses or the region
    changes activity, the pop-out closes. It carries no pin (E2 closes the pin set at four comparative
    surfaces and this is not one).`

12. **CNT-1: restate the after-state in the file comment.** Region: file comment, at the end. Add:
    `REVISION 1.8 AFTER-STATE. Panel 19 -> 17: Close dataset to the panel header's overflow, Find and merge
    duplicates to the Cleaning steps header's overflow. Nothing else in the panel is hidden -- D9 refuses
    it by name, because Data is a section you OPERATE where Present is one you configure once, eight of its
    twelve content rows are floor items and three are the front door. The general import door moved from
    the Open file header to the Loaded data header and is titled "Import options". Legend: two encoded
    channels kept, four category counts deleted, no state rows, cap 334 -> 240.`

## DataTableDrawer

File: `DataTableDrawer.dc.html`. State: the Data table drawer open on the fraud graph with the time slider
docked above it (30-day window), 3 nodes selected, the Selection inspector open, no activity panel, the
minimap hidden, the legend compacted, and the betweenness column's info bubble drawn open. Frame 1440 by 900.

1. **SET-WIDE, read this first.** No new icons, words or colours beyond `VOCAB.md` (now including section
   14) and this board's own copy. Keep `<script src="./support.js"></script>` exactly. Static board. Plain
   ASCII, `--` for dashes, straight quotes. Do not edit `canvas.json`. Do not touch any other `.dc.html`.

2. **LEG-1: the compact legend stops being a separate component; its two lines do not change.** Region: the
   compact legend, lines 437-458. It draws two lines -- `Color: node type, categorical` and
   `Size: Most connected, sqrt` -- for two encoded channels, at `right: 12px; bottom: 342px; width: 256px`.
   Change no markup. Replace the last paragraph of its comment (the one beginning "THIS BOARD: the Data
   table drawer is open...") with: `THIS BOARD: the drawer is open, so the minimap hides and the legend
   COMPACTS rather than hiding, because an encoded channel always needs its line (floor item 5). In 1.8 the
   compact form stops being a separately specified component (C6): it is the reading legend with the swatch
   rows and the ramps subtracted and the header lines kept, which is exactly the box already drawn here --
   same 256 width, same right edge, no min-height, no scroll. Two encoded channels, two lines. C3's two
   unconditional cuts fire on nothing here, because a compact legend already carries no counts and no state
   rows. The exported image always carries the FULL blocks, composed from the encoding model at the
   export's own scale and drawn into the image, never captured from this overlay (VOCAB 14.6).`

3. **LEG-2: no cap value changes on this board.** Region: the compact legend container, line 455. It
   carries no `max-height` at all and must not gain one: the compact form does not scroll. Record it in the
   comment: `1.8, C6: the on-screen cap moves 334 -> 240 on the FULL legend. The compact form has no cap
   and no scroll; do not add one here.`

4. **POP-COL: the Columns toolbar control changes class from a menu to a 280 pop-over.** Region: the
   drawer toolbar's `Columns` chip, line 667, measured at [408,648 76x22]. Keep the chip, its caret, its
   position and its ink. Change its title from `title="Columns"` to
   `title="Columns. Search, show and hide, drag to reorder, Show all, Hide all, Add column..."`. Then
   replace the toolbar comment's Columns sentence (line 648, `Columns menu, full text: Choose columns... /
   Add column (Coming) / Reset widths.`) with: `Columns is a 280 pop-over, not a menu (1.8, D5): show, hide
   AND REORDER over a set W20 sizes at 10 to 40 columns is not a menu, and drag-reorder inside a menu is
   not a menu at all. Contents, in order: a search box, one checkbox row per column with a drag handle,
   Show all / Hide all, and "Add column..." at its foot -- which also gives the spec's missing "Add column"
   toolbar item a home instead of a ninth toolbar control. Geometry, B2's dock lane: the drawer is a dock
   and a dock is a region, so this pop-over opens UP inside the dock with a vertical gap of 8 -- its bottom
   edge at y 640, 8px above this chip's top at 648 -- and its shared edge line is this chip's own left edge
   at x 408. A caret is required in the dock lane (VOCAB 14.2). It is NOT drawn open on this board: the
   info bubble below is the one transient drawn, and no artboard may show two transients of different
   classes open at once (E2). The column HEADER menu is unchanged and stays a menu.`

5. **ANC-1: the betweenness info bubble is re-anchored to its own info circle.** Region: line 743, the
   bubble `<div style="position: absolute; left: 0; top: 20px; width: 250px; ...">` inside the betweenness
   header cell. Measured today at [732,721 250x58] against an info circle at [848,701 14x14]: it is
   centre-anchored to the cell with a 6px gap and it covers the betweenness value in all three visible
   rows. Two edits. (a) Change `left: 0;` to `left: 116px;` so the bubble's left edge sits at shell x 848,
   the info circle's own left edge -- B4's corrected rect [848,721 250x58]. (b) Because the bubble at that
   position still covers that column's own cells, B4 makes the flip above the header row MANDATORY: change
   `top: 20px;` to `top: -66px;` so the bubble's bottom edge sits 8px above the header cell's top.

6. **ANC-2: the bubble gets its caret.** Region: the same bubble. A surface narrower than 280px carries an
   8px caret instead of an edge line (B1, VOCAB 14.2). Because the bubble now sits ABOVE its circle, the
   caret goes on the bubble's bottom edge, pointing down. Insert as the last child of the bubble div,
   copying VOCAB 14.2's second snippet with the ground changed to this bubble's own `#2a3035`:
   ```html
   <div style="position: absolute; left: 7px; bottom: -8px; width: 16px; height: 8px; overflow: hidden;">
     <div style="position: absolute; left: 3px; top: -5px; width: 10px; height: 10px; transform: rotate(45deg); background: #2a3035; border-right: 1px solid #48525c; border-bottom: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```
   Add `overflow: visible;` is NOT needed -- the bubble has no overflow rule -- but confirm the bubble's
   own `border-radius: 4px` still reads with the caret at 7px, which is inside the 12px clamp for a caret
   on a 250px surface.

7. **ANC-3: record the same treatment for the in-dialog bubble on ImportRecognised, so the rule is not
   read as a one-off.** Region: the bubble's comment. Add: `1.8, B4: an info bubble takes its opener's
   anchor box -- the smallest focusable ancestor that draws as one control, here the 14px info circle, not
   the header cell -- and it flips above the header row whenever it would cover that column's own cells.
   ImportRecognised's in-dialog bubble takes the same treatment.` No further change on screen.

8. **REG-1: the dock is a region, and that is what lets this board hold two surfaces.** Region: file
   comment. Add: `REVISION 1.8, E2: regions are now five -- activity panel, inspector, canvas overlay,
   dialog, dock. A pop-out opened from the Data table drawer or a report editor drawer counts against that
   DOCK, and the region is the OPENER's region rather than the surface's screen position, so a panel
   pop-out that has slid over the canvas still counts against the panel. That is what gives the Columns
   pop-over and the time slider settings independent lives on this board without loosening the one-per-
   region rule anywhere else.` No change on screen.

9. **PIN-1: the pin narrows to four comparative surfaces, and none of them is on this board's toolbar.**
   Region: file comment. Add: `REVISION 1.8, E2: a pin toggle renders only on a pop-out whose content is
   comparative across selections, and the set is closed at four -- the colour and gradient picker, Selection
   statistics with a pin active, the group profile, and the AI console. Every other pop-out loses its pin
   glyph and the 32px header it sat in. The Columns pop-over and the time slider settings pop-out carry no
   pin. The inspector's "Pin as A" button is a different control and is untouched.` Check the board and
   confirm no pop-out pin glyph is drawn; the inspector's `Pin as A` verb stays.

10. **CNT-1: restate the after-state in the file comment.** Region: file comment, at the end. Add:
    `REVISION 1.8 AFTER-STATE. Legend: the compact form is now defined as one subtraction from the reading
    legend rather than a third component; its two lines and its box are unchanged. Toolbar: Columns becomes
    a 280 pop-over in the dock lane, not drawn open. Info bubble: re-anchored to its own info circle at
    x 848 and flipped above the header row, with an 8px caret on its bottom edge. Nothing else moved.`

## ValidationPopout

File: `ValidationPopout.dc.html`. State: the Validation report pop-out open from the Data panel's
Validation report door, the Data table drawer open and filtered to the first issue, the time slider docked,
the minimap hidden and the legend compacted, on the fraud graph. Frame 1440 by 900.

1. **SET-WIDE, read this first.** No new icons, words or colours beyond `VOCAB.md` (now including section
   14) and this board's own copy. Keep `<script src="./support.js"></script>` exactly. Static board. Plain
   ASCII, `--` for dashes, straight quotes. Do not edit `canvas.json`. Do not touch any other `.dc.html`.
   This board is one of B4's ten measured anchor corrections and its correction is the largest of them.

2. **LEG-1: the compact legend stops being a separate component; its two lines do not change.** Region: the
   compact legend, lines 756-775, drawn at `right: 12px; bottom: 272px; width: 256px` with two lines --
   `Color: node type, categorical` and `Size: Most connected, sqrt` -- for two encoded channels. Change no
   markup. Replace the last paragraph of its comment (the one beginning "THIS BOARD: the Data table drawer
   is open...") with: `THIS BOARD: the drawer is open, so the minimap hides and the legend COMPACTS rather
   than hiding, because an encoded channel always needs its line (floor item 5). In 1.8 the compact form
   stops being a separately specified component (C6): it is the reading legend with the swatch rows and the
   ramps subtracted and the header lines kept -- same 256 width, same right edge, no min-height, no scroll,
   and it returns to the full form the moment the drawer closes. C3's two unconditional cuts (no category
   counts, no state rows) fire on nothing here, because a compact legend already carries neither. The
   exported image always carries the FULL blocks, composed from the encoding model at the export's own
   scale and drawn into the image, never captured from this overlay (VOCAB 14.6).` Do NOT add a
   `max-height`: the compact form does not scroll, and 1.8's 334 -> 240 change applies to the full form.

3. **ANC-1: the pop-out is re-anchored to the row that opened it. This is the board's main change.**
   Region: the pop-out container, line 965. Current:
   `<div style="position: absolute; left: 8px; bottom: 316px; width: 360px; max-height: 476px; ...">`,
   which renders at shell [336,90 360x470] while its opener -- the Validation report door row -- sits at
   shell [64,452 255x32]. The lane is right (336 is 8px clear of the panel's 328 edge, VOCAB 14.8) and the
   vertical position is wrong by 362px, in a lane that also serves Columns, Formulas, Cleaning steps and
   Mappings, so the lit opener is the only mark of the relationship. A 470px pop-out cannot sit top-to-top
   at y 452 in a 40-to-616 region (the usable bottom is the open drawer's top edge), so B1's ladder flips
   the edge line to its opposite pair: bottom to bottom. New style fragment, everything else on the line
   unchanged: `position: absolute; left: 8px; bottom: 392px; width: 360px; height: 288px; max-height: 288px;`.
   That renders at shell [336,196 360x288] with its bottom edge at 484, on the opener row's bottom 484.
   The body div immediately below already carries `flex: 1; min-height: 0; overflow-y: auto;`, so the four
   warning cards, the fixed warning and the collapsed Info group all stay and the pop-out scrolls. Delete
   nothing from the body.

4. **ANC-2: the pop-out gets its caret.** Region: the pop-out container, as the first child of that div,
   before the 32px header row. Copy VOCAB 14.2's first snippet verbatim and set only its `top`:
   ```html
   <div style="position: absolute; left: -6px; top: 264px; width: 6px; height: 12px; overflow: hidden;">
     <div style="position: absolute; left: 3px; top: 1px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-left: 1px solid #48525c; border-bottom: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```
   Arithmetic, so the next pass can check it: the opener row is shell [64,452 255x32], its vertical centre
   is 468; the pop-out's top is 196, so the caret's unclamped top is 468 - 196 - 6 = 266; the clamp is 12px
   inside the pop-out's own corners, which on a 288px surface is a maximum of 264; so `top: 264px`. Note in
   the comment that VOCAB 14.2's snippet comment ("caret on the LEFT edge, pointing back at the panel") is
   the authority for the side: the caret points back at its opener, which for an activity-panel pop-out
   drawn to the right of the panel is the left edge. The pop-out container has `overflow: hidden` -- change
   it to `overflow: visible` on the container and keep the scroll on the body div, or the caret is clipped.

5. **PIN-1: the pin comes off.** Region: line 969, the 24px `title="Pin this open"` control in the pop-out
   header. DELETE the whole div including its SVG. E2 closes the pin set at four comparative surfaces --
   the colour and gradient picker, Selection statistics with a pin active, the group profile, and the AI
   console -- and names this board's pin among the three it removes. The header then holds the name,
   `Re-ran after step 2` dimmed, and the close X. Update the header comment (line 956) from `... the pin in
   its pop-out form, and the register's close X` to `... and the register's close X. 1.8, E2: no pin. Pin
   exists to let a reader hold one report still while changing what it describes; a report of THIS import's
   issues has nothing to hold still, and pinning it would produce a stale panel that lies.` Also delete the
   "One object form is new -- the pin's pop-out form" sentence from the file comment (lines 103-104) and
   replace it with: `1.8, E2: the pin's pop-out form is withdrawn from this surface and from HistoryPopover
   and TimeSlider; REGISTER section 8 owes no new entry.`

6. **SCROLL-1: the follow-and-dock rule is recorded on the board that draws the anchor.** Region: the
   pop-out comment, lines 946-964. Append: `1.8, B3: a pop-out follows its opener while the opener is in
   the region. When the opener scrolls out, the pop-out docks to the edge it left through, keeps the opener
   lit, DROPS ITS CARET, and grows a 20px return strip in its header naming the opener with a chevron that
   scrolls it back (VOCAB 14.3). When the opener's section collapses, or the region changes activity, the
   pop-out closes. That replaces 6.11's "stays open at its last position with the opener still lit": a
   pop-out frozen at a pixel while its row is gone is the detached surface this revision exists to fix.
   This board draws the opener in the region, so the caret is drawn and the return strip is not.`

7. **DOOR-1: the general import door moves from Open file to Loaded data, exactly as on DataPanelLoaded.**
   Regions: (a) line 272, the gear on the Open file section header, `title="Import settings"`. DELETE it.
   (b) The Loaded data section header: add VOCAB 14.1's dimmed gear as its trailing control in a 24px box:
   ```html
   <div title="Import options" style="display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 24px; height: 24px; border-radius: 4px; color: #7a828e; cursor: pointer; box-sizing: border-box;">
     <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.25"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"></path></svg>
   </div>
   ```
   D5: one general import door, one glyph, one title, one home. A6: dimmed at defaults, primary at a
   deviation. Net zero rows.

8. **VERB-1: Close dataset leaves the section for the panel header's overflow.** Region: line 364, the
   `Close dataset` button and its wrapping row (delete the `New session` dim word with it if this board
   draws one). DELETE the row. The verb goes to the Data panel title row's vertical three-dot overflow,
   keeping its full text and its second name: `Close dataset. Starts a new session`. Same edit as
   DataPanelLoaded, so the two boards keep one panel.

9. **VERB-2: Find and merge duplicates leaves the section for the Cleaning steps header's overflow.**
   Regions: (a) lines 490-494, the `Find and merge duplicates...` row with its Coming tag. DELETE it.
   (b) Add the registered overflow glyph to the Cleaning steps section header, right end, 24px box:
   ```html
   <div title="More" style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
     <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="3.5" r="0.75"></circle><circle cx="8" cy="8" r="0.75"></circle><circle cx="8" cy="12.5" r="0.75"></circle></svg>
   </div>
   ```
   Its menu carries `Find and merge duplicates... (Node merging, batch mode)` with its Coming tag.

10. **KEEP-1: the report's contents are refused a second door, by name.** Region: the pop-out body. Change
    nothing inside it. Add to the pop-out comment: `1.8, A3 and D5, refused and recorded so it is not
    re-proposed: nothing inside this pop-out goes behind a further door. A door may not sit behind another
    door, and no pop-out may be reached only through a second pop-out. The per-type count and consequence
    sentence are floor items 2 and 4, the example ids are floor item 7's scan surface, and the four actions
    stay in full text and RESIDENT rather than hover-revealed, which is this board's one deliberate local
    override of RT-7's hover split.`

11. **CNT-1: restate the after-state in the file comment.** Region: file comment, at the end. Add:
    `REVISION 1.8 AFTER-STATE. Pop-out: [336,90 360x470] -> [336,196 360x288], bottom edge on its opener
    row's bottom 484, its own scroll region, a 6px caret at top 264 on its left edge, and no pin. Panel: the
    general import door moves to the Loaded data header and is titled "Import options"; Close dataset goes
    to the panel header overflow and Find and merge duplicates to the Cleaning steps header overflow, the
    same two verbs DataPanelLoaded loses. Legend: the compact form is now one subtraction from the reading
    legend rather than a third component; its two lines and its box are unchanged.`

## Welcome

State after the edit: unchanged Empty state, 1440 x 900, Data panel open, Welcome
block centred on the canvas, no canvas overlays. One control is deleted; everything
else on this board is a record that stops a later pass from "fixing" it.

1. **Data panel, Open file section header, the `Import settings` gear (lines 199-201).**
   Current: `<div title="Import settings" ...>` in the RT-8 header's trailing slot.
   New: **delete the whole 24px div.** DECISIONS-1.8 D5 settles one general import
   door with one glyph, one title and one home -- the gear on the Loaded data section
   header, titled `Import options` -- "because the Open file header's gear reaches
   nothing when nothing is loaded, which is also why it is deleted from the Empty
   state." The header becomes name-only and keeps its hover-state drawing; no row
   changes height and the section rhythm is untouched.
2. **File comment line 30.** Current: `Open file (RT-8 header with the Import settings
   gear)`. New: `Open file (RT-8 header, name only -- D5 deletes the Import settings
   gear here, because the one general import door lives on the Loaded data header and
   reaches nothing with no file open)`.
3. **Legend: this board encodes zero channels and draws no legend, and that stays
   true.** C2 splits floor item 5 into an export obligation and a screen obligation;
   neither reaches a state with no graph. Nothing replaces it on the canvas, because
   nothing was there: 6.1's Empty state renders no canvas overlays and 1.7 already
   removed the toolbar. Add to the canvas comment at line 284, after the existing
   sentence: `C2: floor item 5 now has two halves, export and screen, and Empty
   satisfies both vacuously -- no encoded channel, no legend, no exported image.`
4. **Data panel row count is unchanged, 7 -> 7 (D5), and that is the finding.** D9
   tests the user's "Present could hide most of its content" against Data and it
   fails: "Of the twelve content rows in the Loaded state, eight are 6.10 floor items
   and three are the front door", and Empty is the front door itself. Add to the panel
   comment block ending at line 36: `1.8 / D5, D9: Data is a section you OPERATE, not
   one you configure once and read out of, so the Present split does not generalise to
   it. Empty stays at 7 rows. No row on this board goes behind a door.`
5. **A2 record, so the veto is visible where the import path starts.** Add to the same
   panel comment: `A2 (6.10a): a control whose wrong value is invisible until it does
   damage stays resident however rarely it is touched. In the import path that is the
   Positions checkbox, the export Scope select and Analyze's Weight / Treat as pair.
   None of the three may become gear contents at any density.`
6. **A5 record on the `Run a recipe...` row (lines 221-227).** Current comment already
   protects the verb under A5 / SAV-8. Append one sentence: `A4 also refuses it a
   door: it buys none of width beyond 256, survival across a selection change, or
   leaving the rows below operable, so it is a row and not a door.`
7. **File comment header, after the 1.7 line (line 17-19).** Add:
   `Revision 1.8: D5 (the Import settings gear is deleted from the Empty state -- one
   import door, on the Loaded data header), D9 (Data is refused as a hiding candidate;
   Empty stays 7 rows), C2 (floor item 5 splits into export and screen obligations and
   Empty satisfies both with no legend), A2 (the Positions checkbox is a named
   counter-rule and stays resident wherever it renders). One control deleted, nothing
   else changes visually.`

---

## Main

State after the edit: unchanged Loaded state, Explore panel open, nothing selected,
canvas 832 x 836, the Schema pop-out drawn open over the canvas and the rail Help menu
drawn open. Main is the reference shell, so both transients here are the drawing every
other board copies -- and both need geometry work.

1. **Rail Help menu (line 1188).** Current: `position: absolute; left: 52px; bottom:
   8px; width: 200px;` -- measured [52,751 200x117], bottom 868. Opener: the Help rail
   button, measured [0,828 47x44], bottom 872. Fault (B4): 4px off the rail lane and
   4px off the button's bottom. New: `left: 56px; bottom: 4px;` -- the rail lane is
   left 56 (48px rail + the 8px shell-boundary gap, B2) and the shared edge line for a
   rail opener is button bottom to menu bottom, so 872 on 872.
2. **Schema pop-out (line 762), position: keep it exactly as drawn.** Measured
   [672,473 480x295], right edge 1152, top 473 on the Schema row's top 473. B5 records
   this as one of the five already-correct anchors in the set and cites it by pixel in
   6.11's Anchor paragraph. Do not move it and do not re-derive its height cap. Add to
   its comment: `B5: this pop-out is cited by pixel in 6.11 as a correct anchor -- top
   473 on 473, right edge 1152, 8px clear of the inspector under B2's 8px
   shell-boundary constant. It is not a canvas-overlay surface, so the 12px inset does
   not apply to it.`
3. **Schema pop-out header (lines 766-769): delete the pin toggle.** Current: a 24px
   `title="Pin this open"` div between the title and the close X. New: delete it; the
   close X moves left into its slot and the header stays 32px. E2 narrows the pin to a
   closed set of four comparative surfaces -- the colour and gradient picker, Selection
   statistics with a pin active, the group profile, and the AI console. Schema is a
   report of what is currently true, has nothing to hold still across a selection
   change, and "pinning it produces a stale panel that lies". Record the reason in the
   header comment.
4. **Schema pop-out: add the caret (VOCAB 14.2).** New element, first child of the
   pop-out div, using the inspector spelling -- an inspector pop-out carries its 6px
   caret on the **right** edge (it opens left, so the leading edge points back at the
   inspector). Position it at the vertical centre of the Schema row: the row's top is
   473 and it is 32 tall, so the caret's centre is y 489, i.e. `top: 10px` inside a
   pop-out whose top is 473, clamped 12px inside the corners. Mirror VOCAB 14.2's
   snippet, swapping `left: -6px` for `right: -6px` and the border pair for
   `border-right` + `border-top`.
5. **Explore panel, Filter builder (lines 364-407): three rows collapse to one.**
   Current: RT-8 header `Filter builder`; an RT-1 pair row `Nodes | Match all` with the
   `Edit as expression` door in the trailing slot (lines 384-397); an RT-7 row reading
   `20 of 20 nodes would match` with the `Add rule` plus (lines 398-405). New (D4):
   **at zero rules the Filter builder is one 32px row with a plus.** Delete the pair
   row and the match-count row; move the `Add rule` plus into the RT-8 header's
   trailing slot, retitled `Add rule`; keep `Edit as expression` as the header's
   second trailing control, which is the FilterExpression door (360, from the section
   header). Two reasons, both in D4: `Match all` at zero rules is a default (Rule 7a),
   and `20 of 20 nodes would match` is the null statement 6.2 forbids. **-2 rows.**
6. **Explore panel, Selection actions section (lines 451-462): delete the header row
   and its divider.** Current: a collapsed RT-8 header at dim ink with no members. New:
   gone. D4: the section duplicates the Select split button two rows above it, and its
   verbs -- Select matching filter, Select edges between selected, Select largest
   connected part -- join the Select split button's menu (line 353's `title="Select"`
   row). Add those three to that row's menu comment, in full text. **-1 row.**
7. **Explore panel, Around the selection row (lines 483-497): delete it.** D4: "Around
   the selection stops being an Explore section. 5.3's own sentence already assigns
   selection-scoped actions to the inspector, and the ego network's Hops and Max nodes
   leave the tier-3 dialog for a 280 pop-over on the inspector's Ego network action."
   The capability keeps its 6.3 pair (`Around the selection | Ego network`) on the
   inspector action it moves to, and joins the palette index by both names (E4). **-1
   row.**
8. **Explore panel, Expand neighbors row (lines 464-481): rename and re-type.**
   Current: a dimmed not-built row titled `Expand neighbors. Coming` with a Coming tag.
   New (D4): **one RT-8 door row reading `Neighborhood expansion`, whose trailing state
   mark names the remembered depth and type filter.** Use the VOCAB 14.1 RT-8 door
   spelling: permanently closed right-pointing chevron, the name, and the trailing slot
   carrying `2 steps, 3 types` in `#7a828e`. The Coming tag stays (the capability is
   still unbuilt) and sits between the name and the state mark. This is where 5.4's
   "uses the last node and edge type filter" becomes readable before it acts. **No net
   row change.**
9. **Explore panel: the section order after items 5-8 is D4's fixed eight, and it is
   frozen.** Filter builder, Filters, Sets, Views, Find a pattern, Neighborhood
   expansion, Step through time (only when a Time role exists -- the cat graph has
   none, so it does not render here), Notes. Rewrite the declared order in the panel
   comment at lines 298-299, which currently reads `Select all visible | Select |
   Filter builder | Filters | Sets | Selection actions | Expand neighbors | Around the
   selection (Ego network) | Views | Find a pattern (Subgraph search)`. The two RT-7
   rows above the sections (Select all visible, Select) are not sections and keep their
   place. **Panel 14 -> 10 resident rows (D4, H).**
10. **Legend (line 707): this board encodes ONE channel, Size (Most connected, degree
    2 / median 3 / 4, sqrt).** It draws no categorical rows, no counts and no state
    rows, so C3's three cuts take nothing off it. What changes is one number:
    `max-height: 334px` -> `max-height: 240px` (C6: the on-screen cap goes 334 to 240,
    which binds nothing today and forbids regrowth). Measured height stays 80 -- the
    single Size block is 63 and the 80px min-height binds. Nothing replaces it on the
    canvas because nothing leaves it. The Schema pop-out's third height cap, which was
    computed against this legend's rect (canvas y 744 to 824, measured [892,784
    256x80]), is unaffected: the rect does not move.
11. **Legend comment (lines 688-704), third paragraph.** Current ends: `No "Legend"
    caption, no palette name in the body, no counts on state rows, no block for a
    channel that is not encoded.` Append C2's and C3's grammar verbatim so every board
    carries the same words: `1.8 (C2, C3, C6): floor item 5 is now two obligations. On
    screen the legend carries one block per encoded channel -- channel, attribute,
    domain endpoints with the median or midpoint, the scale in words, and every
    departure line -- and NO category counts, NO state rows and at most five
    categorical rows plus Other. In the export it carries all of that plus twelve
    categories with counts, the coverage footer and one row per state drawn in the
    frame, composed from the encoding model at the export's own scale and never
    captured from this DOM overlay. Cap 240 on screen, no cap in the export.`
12. **Help menu rows (lines 1189-1204): record D8.** The menu is at its floor -- four
    verbs, and 6.11 routes verbs to menus, so nothing here is hidden. Two records in
    its comment: (a) `D8: "More suggestions (N)" and "Already run (N)" become SUBMENUS
    when their counts are non-zero, because their members are verbs too; both counts
    are zero on this graph so neither renders (MIN-2).` (b) `D8: the Keyboard shortcuts
    row opens the ? reference as a NON-MODAL overlay -- no scrim, no focus trap, the
    canvas keeps pointer and keyboard, Escape closes. 6.11 question 1's list is closed
    and the shortcuts reference is not on it, so it was never a legal dialog.`
13. **File comment header, after the pass-2 block.** Add: `Revision 1.8: B4 (the Help
    menu moves to the rail lane at left 56, bottom-aligned to the button's 872), B5
    (the Schema pop-out's anchor is correct and is now cited by pixel in 6.11), E2 (the
    Schema pop-out loses its pin -- the pin is narrowed to four comparative surfaces),
    B3 / VOCAB 14.2 (the pop-out gains a 6px caret on its leading edge at the opener
    row's vertical centre), D4 (Explore panel 14 -> 10: the zero-rule Filter builder is
    one row, Selection actions is deleted into the Select menu, Around the selection
    moves to the inspector, Expand neighbors becomes the Neighborhood expansion door
    row), C6 (legend cap 334 -> 240), D8 (the ? reference is non-modal).`

---

## ExplorerAfterCard

State after the edit: unchanged Result state, Analyze panel open on the Run tab with
the Groups card pointed at, the Community result shape in the inspector, canvas 832 x
836. The changes are one Rule 7a deletion in the panel, one door that stops sitting
behind another door, and the legend's comment.

1. **Analyze panel, the Method field row under the Groups card (lines 315-324): delete
   the row.** Current: an RT-1 single reading `Louvain` (title `Method: Louvain, or
   Leiden, Label propagation, Girvan-Newman, Tight clusters (Coming)`) with the
   `Advanced parameters` gear in its trailing slot. New: **gone.** D3: "AnalyzePanel
   draws a Method select reading 'PageRank' under a card titled 'Influence PageRank';
   AnalyzeSweep draws 'Louvain | Visible (200)'... Both are defaults, both are restated
   by the title on the same screen, and Rule 7a and Rule 8 each delete them
   independently." Louvain is the default community method here. "Method stays a
   top-level control once it deviates", so this is a rendering rule and not a tier
   change: record that in the card's comment. **-1 row.**
2. **Analyze panel, the Groups card row (lines 294-303): the Advanced parameters gear
   moves onto it.** Current: the row carries a 12px `title="Parameters"` chevron at the
   LEFT of the name and a resident `Run` at the right; the Advanced gear lives on the
   row deleted in item 1. New: **delete the left-hand Parameters chevron and put the
   24px `title="Advanced parameters"` gear in the row's trailing cluster, immediately
   left of Run.** A3's depth obligation: "Exactly one click from the row that owns the
   property. A door may not sit behind another door." As drawn, the Advanced pop-out
   was reached through the Parameters chevron and then the gear -- two doors. The gear
   draws in the dimmed ink (VOCAB 14.1, first spelling) because every hidden option is
   at its default; it draws primary the moment one deviates (A6).
3. **Analyze panel, Recipes header (lines 452-462): add the count to the trailing
   slot.** Current: `Recipes` with its info circle, the More overflow and the resident
   `Save as recipe...` plus; the one row below it is `Fraud ring triage / 3 steps --
   Aug 28`. New: the RT-8 header's trailing slot carries `1` in `#7a828e`. A4 refuses
   Recipes a door on all three counts and compensates: "RT-8's trailing slot carries
   what the door stub would have carried -- the recipe count for Recipes". Record the
   refusal in the section comment so a third pass does not propose the door again.
4. **Analyze panel, All statistics door row (line 428 area): confirmed as drawn, and
   protected.** D3 names it: "All statistics stays a door with its 'Computing 3 of 7'
   stub". Here the stub reads `4` and the title reads `All statistics. 4 statistics,
   computed 14:12`. Add to the comment: `D3 / A4: All statistics is a door because the
   360 table buys width beyond the 256 band. It is drawn open on the new AllStatistics
   board; the stub and this row do not change.`
5. **Analyze panel, Metric histograms and History: confirmed inline, and protected.**
   Add to each section comment: `D3: 6.11 refuses a door here by name -- a reader
   comparing distributions cannot open five doors, and History is on 6.11's refused
   list. A later compaction pass may not turn either into a door.`
6. **Inspector, the run record's Details chevron and the group profile pop-out:
   confirmed, with two riders.** POP-7's 360 run-record pop-out and POP-4's 360 group
   profile keep their anchors. Riders: (a) the group profile KEEPS its pin -- it is one
   of E2's closed set of four comparative surfaces; (b) the run-record pop-out LOSES
   any pin it would have carried, for the same reason Schema loses one. Both gain the
   6px leading-edge caret (VOCAB 14.2) at the vertical centre of the row that opened
   them, on the right edge because they are inspector pop-outs.
7. **Legend (line 710): this board encodes TWO channels -- Color: Groups (Communities,
   Louvain), four category rows drawn WITHOUT counts, and Size: Most connected (degree
   2 / median 3 / 4, sqrt).** After C3 it is unchanged in content and 155px tall: four
   categorical rows is under the five-row cap, and the counts were already absent. What
   changes is the RULE, not the drawing: `max-height: 334px` -> `max-height: 240px`
   (C6). Nothing leaves the canvas, so nothing replaces it.
8. **Legend comment (line 707), the THIS BOARD sentence.** Current ends: `No counts:
   the result card on this board lists every group with its size (5.1).` New: **delete
   the conditional and state the unconditional rule**, because C3 is explicit that
   condition-dependent rendering is what produced 0%-to-86% duplication across the set:
   `No counts, unconditionally (C3): the canvas legend draws no category counts on any
   board and under any condition. The four group sizes live in the result card, the
   groups table and the exported legend. The old clause -- "counts render except where
   the panel or card already lists every category" -- is one of the three conditional
   rules C3 replaces with one grammar.`
9. **Legend comment, third paragraph.** Append the same C2 / C3 / C6 paragraph given in
   Main item 11, verbatim. It is the one spelling for the set.
10. **File comment header, after the 1.7 line (lines 39-47).** Add: `Revision 1.8: D3
    (Rule 7a deletes the Louvain method row; the Advanced gear moves onto the Groups
    card row so no door sits behind a door, A3), A4 (Recipes stays a collapsed section
    and its header carries the recipe count), E2 (the group profile keeps its pin, the
    run-record pop-out loses one), B3 / VOCAB 14.2 (carets on both inspector pop-outs),
    C3 / C6 (the legend's no-counts rule becomes unconditional; cap 334 -> 240). Panel
    19 rows -> 18; the legend does not change height.`

---

## ExplorerExpert

State after the edit: unchanged Result + Selected state, fraud ring, Analyze panel on
the Results tab, acct-4471 selected with the Find a path result highlighted. This is
the board where the legend loses the most, and the one place in the group where the
inspector action block is already correct.

1. **Legend (line 1382): this board encodes THREE channels and draws a fourth block of
   app chrome.** Measured 296px tall, the tallest legend in this group. Blocks: Color:
   node type (four rows WITH counts 96 / 48 / 34 / 22), Size: Bridges (0 / median 0.04
   / 0.41, sqrt), Outline: Find a path (Path edges, Path order source to target, Not on
   path (dimmed)), then a state block (Selected, Linked to the selection, Open notes).
2. **Legend: delete the four count spans in the Color block.** Current: each
   node-type row is a `space-between` pair -- swatch plus label on the left, `96` /
   `48` / `34` / `22` at `#7a828e` on the right. New: use VOCAB 14.5's canvas
   categorical row -- swatch and label only, the label taking the full width. C3 item
   2: "Category counts leave the canvas legend." **Where they go on THIS board:** the
   inspector's Schema section (`4 node types, 3 edge types`, which opens the type table
   with its counts), the Data table drawer, and the exported legend, which carries
   twelve categories with counts and the coverage footer. Saves no height -- the counts
   were right-aligned on rows that exist anyway -- and that is stated plainly rather
   than claimed as pixels.
3. **Legend: delete the whole state block and the divider above it (the last two
   children of the legend div).** Current: `Selected`, `Linked to the selection`, `Open
   notes`, 49px plus a 1px divider. New: gone. C3 item 1: state rows "are not the
   user's data and they are not encoded channels; they are app chrome, constant across
   every dataset, learned once, and caused by an action the reader just performed."
   **What replaces them on THIS board:** `Selected` -> the inspector header, which
   names acct-4471, and the status bar's selection slot; `Linked to the selection` ->
   the inspector's neighbour section with its In / Out / All tabs, which is what the
   ring reports; `Open notes` -> the status bar's notes chip and the inspector's Notes
   section. All three also render in the exported legend, which has none of those
   regions, and in Help's "What the marks mean".
4. **Legend: delete the `Not on path (dimmed)` row from inside the Outline block.**
   Current: the third row of the Outline: Find a path block, a dimmed swatch and its
   label. New: gone. It is a state row in LEGEND-1.8 section 5's own list, and C3
   deletes state rows wherever they are drawn, not only where they are grouped. **What
   replaces it:** the path result card in the Analyze panel, which names the path, and
   the exported legend. `Path edges` and `Path order source to target` STAY -- they are
   the Outline channel's own encoding, not states.
5. **Legend: `max-height: 334px` -> `max-height: 240px` (C6).** After items 2-4 the box
   measures about 215px (296 less the 49px state block, its 1px divider and one 6px
   gap, less the ~18px Not-on-path row and its gap), so it clears the new cap with 25px
   to spare and C6's shortening rule does not fire. Record the arithmetic in the
   comment: a block is never dropped, only shortened, and nothing is shortened here.
6. **Legend comment (lines 1363-1381).** Rewrite the two THIS BOARD sentences that
   assert counts and state rows. Current: `Node-type rows are in count order (96 / 48 /
   34 / 22) like every other board.` and `the selection ring and the accent edges it
   draws on about 37 neighbours are the state rows under it, and they carry no counts.`
   New: `Node-type rows are in count order and carry no counts on canvas (C3): the
   Schema table, the Data table drawer and the exported legend own the four numbers.
   The selection ring and the linked-edge mark are app chrome, not encoded channels, so
   their rows are gone from the canvas legend (C3 item 1) and render in the exported
   legend, where there is no inspector header, no status bar and no result card to name
   them.` Then append the standard C2 / C3 / C6 paragraph from Main item 11.
7. **Inspector action block (lines 1571-1600 area): confirmed at four rows, and
   protected.** Current: `Expand 37 neighbors` with its type door and Coming tag; `Zoom
   to selection | Show in table`; `Note`; `Find path from here | More`. D4 caps the
   block at four rows in every selection state and names this board as already
   compliant ("ExplorerExpert already at 4"). Add to the comment: `D4: this block is
   the cap, not a coincidence. Four rows, the remainder in More with each verb keeping
   its full text. What may never move into More: the split button's cost estimate and
   its scope ("Expand 37 neighbors"), because floor item 4 binds the estimate to the
   control that spends it, and every departure line.`
8. **Result cards, the three Details chevrons (lines 308, 416, 499): confirmed as
   doors, with the depth checked.** Each opens the 360 run-record pop-out (POP-7), one
   click from the card that owns the record. Add to the run-record comment: `A3: walked
   from the row that owns the property with the owning thing present, this is one
   click. A3 forbids by name the Advanced parameter block behind the History door; the
   run record behind a card's own Details chevron is not that shape.` Each pop-out
   gains the 6px caret (VOCAB 14.2) on its left edge -- these are activity-panel
   pop-outs at left 336 -- at the vertical centre of the chevron's row, and carries NO
   pin (E2).
9. **Recipes section, below the clip: record A4.** Add to the panel comment where SAV-8
   is cited: `A4: Recipes was proposed as a door and refused -- it buys none of width
   beyond 256, survival across a selection change, or leaving the rows below operable.
   It stays a collapsed RT-8 section whose trailing slot carries the recipe count.`
10. **File comment header, after the adversarial blocks.** Add: `Revision 1.8: C3 (the
    four node-type counts, the three state rows and the Not-on-path row leave the
    canvas legend -- 296px to about 215px, the largest legend cut in the core group),
    C6 (cap 334 -> 240), C2 (floor item 5 splits into export and screen obligations;
    everything cut here renders in the composed export legend), D4 (the inspector
    action block is confirmed at its four-row cap), A3 / E2 / VOCAB 14.2 (the three
    Details pop-outs are one click deep, carry a caret and carry no pin), A4 (Recipes
    is refused a door). No panel or inspector row changes.`

---

## StylePanel

State after the edit: unchanged Loaded state, Style panel open with the Humans layer
selected, the style layer inspector on the right, canvas 832 x 836. D2 is the second
largest split in the revision -- 24 resident rows to 14, three doors in seven sections
-- and the sharpest inconsistency it fixes is inside one inspector row.

1. **Panel, Parameters section (lines 444-530): three field rows collapse into the gear
   that already exists.** Current: RT-8 header `Parameters` with a `title="Advanced"`
   gear (line 468), then three field rows -- `Edge length 30` (485-494), `Pull to
   center -1.2` (496-505), `Edge weight value` (513-521) -- then the `Keep this
   arrangement` row (526). New: **delete all three field rows.** D2: "All three drawn
   field rows are at their schema defaults -- `NGraphLayoutEngine.ts` declares
   `springLength .default(30)` and `gravity .default(-1.2)`, and Edge weight defaults
   to the import Weight column -- so Rule 7a already forbids drawing them, and 6.2's
   arithmetic already routes the rest." The gear becomes the Layout parameters door and
   opens a 280 pop-out in the panel lane (left edge 336, 8px clear of the panel),
   anchored top-to-top on the Parameters header row. It draws in the dimmed ink because
   nothing behind it deviates (VOCAB 14.1, first spelling). **6 rows -> 1.**
2. **Panel, `Keep this arrangement` row (line 526): move it to the Arrangement header's
   overflow.** D2: "Verbs to menus: Keep this arrangement, Reset to defaults and Start
   from current arrangement move to the Arrangement header's overflow." The Arrangement
   header already carries a `title="More layouts"` control (line 391); add a second
   24px overflow beside it, or extend that menu -- the menu carries all three verbs in
   full text, which is 6.8's mandatory twin. Keep this arrangement keeps its long title
   verbatim. **-1 row.**
3. **Panel, Styles section header (lines 566-582): the trailing count becomes the
   active style's own name.** Current: `Styles` then `6` at `#7a828e`, then the info
   circle, the Coming tag and the More overflow. New: the trailing slot reads
   `Default` -- the applied style, drawn with the selected background on line 588. A4:
   the Styles library was proposed as a door and refused on all three counts, "and
   RT-8's trailing slot carries what the door stub would have carried -- the active
   style's own name for Styles. That is strictly more information than today, where the
   active style is a selected background on a row you may have scrolled past." Use
   VOCAB 14.1's RT-8 spelling, whose worked example is this exact row. The six rows
   below stay drawn.
4. **Panel, Styles section: record the refusal so a third pass does not re-propose the
   door.** Add to the section comment at line 531: `A4: proposed as a door in two
   independent tracks and refused in both. A door must buy width beyond the 256px band,
   survival across a selection change, or leaving the rows below operable while it is
   open; the Styles library buys none of the three, and a closed section and a door
   cost the same single row while the door adds a click for nothing. Any departure an
   applied style creates ("Applied Publication style. 2 of 5 layers matched nothing:
   they need logFC and padj.") is floor item 2 and renders resident under this header.`
5. **Panel, Canvas section, the `Show legend (L)` control (line 644): confirmed
   resident, and now load-bearing.** D2 ends: "Show legend, which 5.3 puts at tier 1 and
   no Style board draws, comes back as one of the fourteen." This board already draws
   it pressed. Add to its comment: `C4: this switch does not reach the export. Hiding
   the legend with L or with this switch does not remove it from an exported image --
   the exported legend is composed from the encoding model, not captured from the
   canvas overlay, which a Babylon scene capture cannot see. Present's Include legend
   is the export's own control and lives behind the Image options door.`
6. **Inspector, Size section (lines 1085-1136): the numeric ramp gets ONE 280 pop-over
   from the RT-4 trailing glyph.** Current: row 1 is the attribute binding `Age` with a
   `title="Range and scale"` gear at line 1119; row 2 is the RT-4 wedge, `45`, the
   mapping bar and `68`, with a `title="Square root scale"` glyph at line 1131. New:
   **the RT-4 trailing glyph (line 1131) is the door.** It opens a 280 pop-out in the
   inspector lane (right edge 1152, 8px clear), anchored top-to-top on the Size section
   header, titled with the channel and its attribute -- `Size: Age`. It holds Scale,
   Palette family, Midpoint where diverging, Domain over the inline histogram with
   Clamp outliers and its live match count, Missing value, Use values as-is, and
   gradient handle editing **as a section of this pop-out** rather than as a pop-out of
   its own (A3: 6.11's nesting limit forbids the second surface). The `Range and scale`
   gear on row 1 is folded into it -- one door on this row, not two. D2: 5.3 already
   sends the CATEGORICAL sub-mode of an encodable row into a 280 pop-out from the row
   it belongs to, and told the NUMERIC sub-mode to render inline; "Two sub-modes of one
   row, two different disclosures." 6.9's RT-1 door rule already names "the domain pair
   on a Scale field" among the doors of the product.
7. **Inspector, Size section: three things the floor keeps OUT of that door.** Record in
   the section comment: `D2, floor: the Palette select stays resident (LEGEND-1.8
   section 2 pins the palette name to Style's Palette select and the legend body has no
   other home for it -- this layer's colour is fixed, so no Palette select renders
   here); the clamp departure line renders resident under the ramp, because 6.10's
   separation clause binds a departure to the channel it describes -- nothing is clamped
   on this board, so nothing is drawn (Rule 7's corollary); and the attribute chip stays
   resident, because Rule 6 makes the mode what the field contains.`
8. **Inspector, Which nodes section (lines 977-1049): confirmed resident, and
   protected.** D2 deletes this section on StyleDiverging by Rule 7a because the
   selector there matches every node. Here it reads `breed = human` and matches 2 of
   20, which is a deviation, so it renders. Add: `D2 / Rule 7a: this section renders
   only because the rule deviates -- breed = human matches 2 of 20. A selector that
   matches every node draws no rows at all. Do not copy this section onto a board whose
   layer matches everything.`
9. **Inspector, Color section (line 1138): record A5.** Add: `A5 (6.9, RT-1's door
   rule): a control may have two homes when it applies at two scopes. Opacity is
   resident on the row it modifies and repeated inside any picker that row opens; that
   duplicate is licensed, not a hygiene failure, and a later compaction pass may not
   deduplicate it. 5.1's One fact, one region forbids the same FACT in two regions; this
   licenses the same CONTROL at two scopes.`
10. **Legend (line 906): this board encodes TWO channels -- Color: style layers (fixed),
    three rows (Base layer, Humans, Hubs), already drawn WITHOUT counts; and Size: age
    (ageYears), 45 / median 56.5 / 68, sqrt.** Measured 139px. After C3 nothing is cut:
    three categorical rows is under the five-row cap, there are no counts and no state
    rows. One number changes: `max-height: 334px` -> `max-height: 240px` (C6). Nothing
    replaces it on the canvas because nothing leaves.
11. **Legend comment (line 906), the THIS BOARD sentence.** Current: `Color is fixed per
    layer, so the swatches are the layers and carry no counts -- the panel's Style
    layers list owns every layer's count (5.1).` New: keep the sentence but retire the
    condition: `Color is fixed per layer, so the swatches are the layers. No counts, and
    not because the panel lists them: C3 removes category counts from the canvas legend
    unconditionally. The panel's Style layers list, the groups table and the exported
    legend own the numbers.` Then append the standard C2 / C3 / C6 paragraph from Main
    item 11.
12. **Record E4's second escape hatch on the panel comment.** Add: `E4: Settings >
    Appearance > "Keep advanced sections open", default off, renders every gear
    pop-out's contents as inline rows in its own section instead, in the same order, at
    the same 32px pitch. On this board that restores Edge length, Pull to center and
    Edge weight under Parameters, and the ramp pop-out's field rows under Size. It ships
    in the same revision as the doors, and a panel in that mode may scroll -- the cost
    the user accepted by turning it on. Reports and matrices at 360 and 480 stay doors
    at every setting.`
13. **File comment header.** Add: `Revision 1.8: D2 (24 resident rows -> 14: Layout
    parameters 6 rows -> 1 behind the gear that already existed; Keep this arrangement
    to the Arrangement overflow; the Styles header's trailing slot carries the active
    style name "Default" instead of the count 6; the numeric ramp gets one 280 pop-out
    from the RT-4 trailing glyph, with gradient handles as a section of it, not a second
    surface), A3 (no door behind a door), A4 (the Styles library is refused a door), A5
    (a control may live at two scopes), A6 (the Parameters gear is dimmed at defaults
    and primary when one deviates), C3 / C6 (the legend's no-counts rule becomes
    unconditional; cap 334 -> 240), C4 (Show legend does not reach the export), E4 (the
    Keep advanced sections open hatch).`

---

## ExplorePanel

State after the edit: unchanged Loaded + Selected state, Explore panel open with a
search, two active filters and one filter rule, three cats selected, canvas 832 x 836.
D4's finding for Explore is that the surplus is verbs, not parameters -- and this board
is the one that shows it.

1. **Panel, Selection actions section header (lines 437-445): delete the header row and
   its divider.** Current: a collapsed RT-8 header at dim ink, holding nothing. New:
   gone. D4: "The Selection actions section duplicates the Select split button two rows
   above it... Delete the section; Select matching filter, Select edges between selected
   and Select largest connected part join the Select split button's menu." Add those
   three verbs, in full text, to the `title="Select by rule"` row's menu comment (lines
   295-299), which already lists eight. **-1 row.**
2. **Panel, Around the selection row (lines 459-471): delete it.** D4: selection-scoped
   actions belong to the inspector, and "the ego network's Hops and Max nodes leave the
   tier-3 dialog for a 280 pop-over on the inspector's Ego network action -- 6.11
   question 1 is a no, nothing commits, and the canvas must stay touchable to see the
   size preview and the ring chip." The verb reappears in the inspector's pinned action
   block, keeping its 6.3 pair, and joins the palette index by both names (E4). **-1
   row.**
3. **Panel, Expand neighbors row (lines 446-457): rename and re-type to the
   Neighborhood expansion door row.** Current: a dimmed not-built row titled `Expand
   neighbors. Coming`. New: an RT-8 door row reading `Neighborhood expansion` in VOCAB
   14.1's RT-8 spelling -- permanently closed right-pointing chevron, the name, the
   Coming tag, and the trailing slot carrying the remembered depth and type filter, `2
   steps, 3 types`, at `#7a828e`. D4: that is where 5.4's "uses the last node and edge
   type filter" becomes readable before it acts. **No net row change.**
4. **Panel, Filter builder (lines 310-386): the `Add rule` control moves onto the RT-8
   header.** Current: a 24px `title="Add rule"` plus on its own row at line 380. New:
   move it into the section header's trailing slot beside the existing More overflow.
   D4 states the zero-rule form of this section as "one 32px row with a plus", which
   makes the plus a header control rather than a row; this board draws one rule, so the
   rule row and the `Nodes | Match all | Edit as expression` row both stay. **-1 row.**
5. **Panel, Filter builder: record the zero-rule clause so the next board agrees.** Add
   to the section comment: `D4 / Rule 7a, 6.2: at ZERO rules this section is one 32px
   row with a plus and nothing else -- "Match all" at zero rules is a default and
   contradicts 5.3's own condition, and "20 of 20 nodes would match" is the null
   statement 6.2 forbids. This board draws one rule, so both rows render. Main draws the
   zero-rule form.`
6. **Panel, section order after items 1-3 is D4's fixed eight, frozen.** Filter builder,
   Filters, Sets, Views, Find a pattern, Neighborhood expansion, Step through time (only
   with a Time role -- the cat graph has none), Notes. Rewrite the declared order in the
   panel comment at lines 389 and 396, which currently name `Selection actions` and
   `Expand neighbors` as members. **Panel 23 -> 20 resident rows (D4, H).**
7. **Panel, Find a pattern row (lines 490-503): the pattern editor moves into the panel
   lane.** No row change; a comment change that fixes the anchor. Add: `D4: 5.3 tier 3
   anchors the pattern editor "over the canvas", which is the AnalyzePicker preview's
   one fixed home, and 6.11 warns against two surfaces arriving in the same place. A 3a
   pop-out already leaves the canvas live and the highlight running, so the canvas
   position buys nothing and costs the anchor -- the exact failure the user named on the
   timeline. 360, panel lane at left 336, anchored top-to-top on this row.`
8. **Inspector, Selection statistics section (lines 783-850): confirmed inline, and the
   door condition stated.** The existing comment already carries POP-9. Extend it with
   A4's discriminator: `A4: the third column is what buys the door. An A / B / Graph /
   Delta table does not fit the 256px band, which is width beyond the band and therefore
   a legal door; the two-column form here buys none of the three and stays a section.
   MultiSelection draws the pinned state.`
9. **Inspector action block (lines 855-930): cap at four rows.** Current: the unshipped
   `Expand neighbors of all` row with its Coming tag and info circle, then `Zoom to
   selection`, `Show in table`, `Style selection`, `Save selection as set...`, `Copy
   ids`, `More`. New (D4): four rows, the remainder in More with each verb keeping its
   full text, in REGISTER-1.5 12.1's frozen order. `Around the selection | Ego network`
   arrives here from item 2 as an action row with its own 280 pop-over holding Hops and
   Max nodes. What may NEVER move into More: the split button's cost estimate and its
   scope, because floor item 4 binds the estimate to the control that spends it, and
   every departure line.
10. **Legend (line 668): this board encodes ONE channel -- Size: Most connected (degree
    2 / median 3 / 4, sqrt) -- and draws a four-row block of app chrome under it.**
    Measured 141px. Delete the state block and the divider above it: `Selected`,
    `Matches filter`, `Filtered out`, `Edges shown`. C3 item 1. **What replaces them on
    THIS board:** `Selected` -> the inspector header, which reads the three-cat
    selection, and the status bar's selection slot; `Matches filter` and `Filtered out`
    -> the panel's two active-filter chips (`indoorOutdoor = outdoor`, `value >= 5`) and
    the status bar's counts slot; `Edges shown` -> the canvas drawing itself and the
    Counts section. All four render in the exported legend, which has no filter strip,
    no status bar and no panel. The box falls from 141px to the 80px min-height (the
    single Size block is 63) -- H's "ExplorePanel 141 -> about 70 (-50%)", with the
    min-height binding at 80.
11. **Legend: `max-height: 334px` -> `max-height: 240px` (C6),** and rewrite the THIS
    BOARD sentence at line 667. Current: `Color is not encoded on this board, so the
    filter states are the second block and they carry no counts (5.1): the status bar
    and the Explore panel own the match count.` New: `Color is not encoded on this
    board, so Size is the only block. The filter states are gone from the canvas legend
    entirely (C3 item 1): they are app chrome, not encoded channels, and every one of
    them is already named by the region that owns it -- the panel's filter chips, the
    status bar's counts and selection slots, the inspector header. They render in the
    exported legend, which has none of those regions.` Then append the standard C2 / C3
    / C6 paragraph from Main item 11.
12. **File comment header.** Add: `Revision 1.8: D4 (panel 23 -> 20: Selection actions
    deleted into the Select menu, Around the selection moved to the inspector with a 280
    Ego network pop-over, Expand neighbors becomes the Neighborhood expansion door row,
    the Add rule plus moves onto the Filter builder header; the fixed eight-section
    order; the inspector action block caps at four; the pattern editor moves to the
    panel lane), A4 (Selection statistics stays a section until the third column forces
    a door), C3 (the four-row state block leaves the canvas legend -- 141px to the 80px
    floor), C6 (cap 334 -> 240).`

---

## AnalyzePanel

State after the edit: unchanged Loaded state, Analyze panel open on the Run tab with the
Influence card pointed at and its parameters open, nothing selected, canvas 832 x 836.
D3's finding is that Analyze is already the model, so most items here protect what is
drawn -- and the two corrections are small and exact.

1. **The Method field row under the Influence card (lines 380-390): delete the row.**
   Current: an RT-1 single reading `PageRank` (title `Method: PageRank, or Katz
   (Attenuated influence)`) with the `Advanced parameters` gear in its trailing slot.
   New: gone. D3: "AnalyzePanel draws a Method select reading 'PageRank' under a card
   titled 'Influence PageRank'... Both are defaults, both are restated by the title on
   the same screen, and Rule 7a and Rule 8 each delete them independently. Method stays
   a top-level control once it deviates -- W04's decision points are which community
   algorithm and whether communities are stable, and W21 phase 1 wants MCL where Louvain
   is only acceptable -- so this is a rendering rule, not a tier change." Record that
   last clause in the card comment. **-1 row.**
2. **The Influence card row (lines 358-378): the Advanced parameters gear moves onto
   it.** Current: the row carries a `title="Parameters"` chevron at the left of the
   trailing cluster and a resident `Run`; the Advanced gear sits on the row deleted in
   item 1. New: **delete the Parameters chevron; put the 24px `title="Advanced
   parameters"` gear in the trailing cluster immediately left of the info circle and
   Run.** A3: "Exactly one click from the row that owns the property. A door may not sit
   behind another door." As drawn the pop-out is two doors deep. The gear draws dimmed
   (VOCAB 14.1) because Damping, Tolerance, Max iterations, Run as sweep and Copy as
   command are all at their defaults; it draws primary the moment one deviates (A6). The
   pop-out itself is the new AnalyzeParameters board: 280, panel lane at left 336,
   top-to-top on this row.
3. **The More section (lines 505-528): three rows become one.** Current: RT-8 header
   `More`, then `Compare | Comparison view`, then `Remove several nodes at once` with
   its Coming tag. New: **one panel-level `More` row whose overflow menu carries both
   verbs in full text**, plus their Coming tags. D3: "A header plus three verbs that
   each enter a mode or a dialog is five rows spent on one overflow glyph. 6.11 already
   routes verbs to menus, and 5.3 already writes it as 'A panel-level More row'. Compare
   has six other entry points, so the Analyze More row is nobody's first route." **3
   rows -> 1.** ("How it changed over time" still does not render: the cat dataset has
   no Time role.)
4. **Recipes header (line 480-500 area): add the count to the trailing slot.** Current:
   `Recipes` with its info circle, More overflow and resident plus; one row below
   (`Fraud ring triage / 3 steps -- Aug 28`). New: the trailing slot carries `1` at
   `#7a828e`. A4: Recipes is refused a door on all three counts and "RT-8's trailing
   slot carries what the door stub would have carried -- the recipe count." Record the
   refusal in the section comment.
5. **Weight / Treat as pair (lines 224-238): confirmed resident, and VETOED from any
   future gear.** Current: `Weight` with the field reading `value` and the `Strength`
   chip. Add to the comment: `A2 (6.10a): a control whose wrong value is invisible until
   it does damage stays resident however rarely it is touched, and may not become gear
   contents at any density. A wrong weight sense silently inverts every path result.
   This pair is one of the three named vetoes in the set and must not be folded into the
   parameters gear in a later compaction pass. Inside the Import options dialog the same
   pair IS legal behind the Role chip, because the chip prints the value as a dimmed
   suffix -- the value stays visible and only the editing moves.`
6. **All statistics door row (lines 404-432): confirmed, and its stub protected.** The
   stub reads `4` and the title `All statistics. 4 statistics, computed 14:12`. Add:
   `D3 / A4: this is a door because the 360 table buys width beyond the 256px band. Its
   stub reads the computation, which is 6.11's stub obligation and A6's requirement that
   a door never hides a deviation. The new AllStatistics board draws it open at 360 from
   this section row, with the stub still reading its progress string.`
7. **Metric histograms (line 434) and History (line 450): confirmed inline, and
   protected.** Add to each: `D3 / 6.11: refused a door by name. W23 phase 2 is a scan
   across five distributions and a reader comparing five cannot open five doors;
   History is on 6.11's refused list. A later compaction pass may not turn either into a
   door.`
8. **The `+ Analysis` row (lines 391-402): record the one refusal where the user's
   instruction and 6.11's geometry disagree.** Add: `D3: the catalogue is refused as an
   anchored pop-over, and it is the one place in the revision where "anchor pop-overs to
   their parents" and 6.11's geometry point in opposite directions. It is not one member
   of a list and not a report read once; it is the index of the product, seven groups and
   twenty-six cards. And with the panel open the canvas band runs x 328 to 1160, so the
   AnalyzePicker preview's fixed centred home occupies x 604 to 884: a 360 pop-out at x
   336 runs to 696 and a 280 one to 616, so EVERY rung of the width ladder collides with
   the preview. The picker stays the product's one panel-scale drill-down; 5.3 stops
   calling it a popover and 6.11's worked-examples table gains the row.`
9. **Legend (line 702): this board encodes ONE channel -- Size: Most connected (degree
   2 / median 3 / 4, sqrt).** No categorical rows, no counts, no state rows, so C3's
   three cuts take nothing off it and nothing replaces it on the canvas. One number
   changes: `max-height: 334px` -> `max-height: 240px` (C6). Measured height stays 80
   (the block is 63, the min-height binds).
10. **Legend comment (lines 683-701).** Append the standard C2 / C3 / C6 paragraph from
    Main item 11.
11. **File comment header.** Add: `Revision 1.8: D3 (18 resident rows -> 14: Rule 7a and
    Rule 8 delete the PageRank method row; the More section's three rows become one
    panel-level More row with a menu; Recipes gains its count in the RT-8 trailing
    slot), A3 (the Advanced gear moves onto the Influence card row so no door sits behind
    a door), A2 (the Weight / Treat as pair is a named counter-rule and stays resident),
    A4 / A6 (All statistics stays a door with its stub; Metric histograms and History
    stay inline), C6 (legend cap 334 -> 240). Analyze is already the model and this pass
    mostly protects it.`

---

## AnalyzePicker

State after the edit: unchanged picker state, the `+ Analysis` drill-down filling the
280px activity panel column, the hover preview drawn open over the canvas centre,
canvas 832 x 836. Nothing on this board moves. Every item is a record that fixes the
one place where the user's anchor instruction and 6.11's geometry disagree.

1. **The preview (line 780): keep it exactly as drawn.** Current: `position: absolute;
   left: 276px; top: 336px; width: 280px` -- measured [604,376 280x163] in root
   coordinates, centred on the canvas band. B5 records it among the five already-correct
   surfaces, with the reason spelled out: "correctly centred on the canvas band's centre
   and correctly unanchored; a preview takes no lane." Add that sentence to the preview
   comment so a later anchor pass does not give it one.
2. **The picker itself: record why it is NOT an anchored pop-over.** Add to the file
   comment: `D3: the + Analysis catalogue is refused as an anchored pop-over, and this
   is the one place in the revision where the user's "anchor pop-overs to their parents"
   instruction and 6.11's geometry point in opposite directions. Two reasons, the second
   measured. It is not one member of a list and not a report read once; it is the index
   of the product, seven groups and twenty-six cards, which 5.3 says in its own words.
   And with the panel open the canvas band runs x 328 to 1160, so the preview's fixed
   centred home occupies x 604 to 884; a 360 pop-out at x 336 runs to 696 and a 280 one
   to 616 -- every rung of the width ladder collides with the preview, and 6.11's own
   remedy ("where that fallback is in play, the preview does not open") would cost the
   picker the one thing it has that a list of names does not. So the picker is the
   product's one panel-scale drill-down: 5.3 stops calling it a popover and 6.11's
   worked-examples table gains the row.`
3. **Record the surface class in the picker's own header comment (lines 22-25).**
   Current the comment says "No decision in tracks 1 to 4 touches this board". New:
   `D3 touches it by naming its surface class: this is not a pop-out, not a dialog and
   not a menu -- it is a panel-scale drill-down that takes over the 280px column, with
   the rail item still active and the top bar unchanged. It is the sixth surface class
   after 6.11's five plus the preview, and the only member.`
4. **The Suggested-method scan list: confirmed resident with Run in full text.** D3:
   "the picker's Suggested-method scan list stays resident with Run in full text on
   every card." Add to the list comment: `D3: refused a door. This is a scan surface --
   26 methods behind 7 questions, each with its plain name, its technical name and its
   one-line description at the moment of choosing -- and 6.11 has already used the scan
   argument twice to refuse exactly this shape. Every Run keeps its words (floor item
   4).`
5. **Legend (line 708): this board encodes ONE channel -- Size: Most connected (degree
   2 / median 3 / 4, sqrt).** The picker changes nothing on the canvas, so the legend is
   the default-on-load block alone. No categorical rows, no counts, no state rows, so
   C3 takes nothing off it and nothing replaces it on the canvas. One number changes:
   `max-height: 334px` -> `max-height: 240px` (C6). Measured height stays 80.
6. **Legend comment (lines 689-704).** Append the standard C2 / C3 / C6 paragraph from
   Main item 11.
7. **The toolbar / minimap / legend clearance sentence (lines 622-630).** It measures
   the legend at "200 wide" -- stale, from before LEGEND-1.8 fixed 256. Re-measure and
   rewrite with the real numbers: the legend is 256 wide at right 12 on the 832 canvas,
   so its left edge is at canvas x 564 and root x 892; the centred 246px toolbar spans
   root x 481 to 727 when no panel is open and canvas x 293 to 539 here. Keep the
   sentence's point (the toolbar carries the only shadow; the minimap and the legend
   stay flat at radius 4 and read as content boxes; that rule governs the three RESIDENT
   canvas overlays and does not reach the preview).
8. **File comment header.** Add: `Revision 1.8: D3 (the + Analysis catalogue is refused
   as an anchored pop-over on two grounds, the second measured against this board's own
   preview geometry; the picker is named a panel-scale drill-down and 6.11 gains the
   row), B5 (the preview's centred, unanchored home is confirmed by pixel and a preview
   takes no lane), C6 (legend cap 334 -> 240). Nothing on this board moves.`

---

## AiPanel

State after the edit: unchanged AI state, provider connected, the assistant's answer
and three run-record step rows resident, canvas 832 x 836. D6's finding is that this
panel is inverted -- the conversation occupies about 280px while Provider and Console
occupy about 445px -- and two door rows plus one state clause fix it.

1. **Provider section (lines 300-347): three rows become ONE door row.** Current: RT-8
   header `Provider` with a `title="Connected"` status glyph; an RT-1 model field row
   reading `Anthropic, claude-sonnet-5`; an RT-5 `Voice input` toggle row. New: **one
   RT-8 door row reading `Provider`, whose trailing slot carries `claude-sonnet-5`.**
   Use VOCAB 14.1's RT-8 door spelling -- the permanently closed right-pointing chevron,
   the name, and the trailing slot at `#7a828e`. D6: "5.3 already assigns provider keys
   and settings to tier 3, so only the STATUS was ever meant to be resident -- and the
   status is already resident in the status bar ('AI: Anthropic ready'), so Rule 8
   deletes the panel's copy. What the status bar does not carry is the model, which is
   why that is the fact the stub reports." **-2 rows.**
2. **Provider pop-out contents, and the floor-6 answer for Voice input.** The 280
   pop-out opens in the panel lane (left edge 336, 8px clear), anchored top-to-top on
   the Provider row, titled `Provider`, and holds the model select, the provider keys
   and settings, and the `Voice input` switch with its full title (`Voice input. Also
   used for push-to-talk in VR and AR.`). Record why moving Voice input does not break
   floor item 6: `E4: every new door joins the palette index by both names, the door row
   itself is a focusable opener in the panel's tab order, and the panel row is 6.4's
   third route. Voice input is named in full inside the pop-out and in the palette; the
   capability's plain name is not deleted, only relocated. XR-G still holds: the
   microphone is push-to-talk on the controller's B or Y and on the wrist panel, and
   this switch is its only surface.` The 24px-band measurement argument in the current
   comment (lines 326-338) is retired with the row and should be deleted, not reworded.
3. **Console section (lines 348-395): the header, the four-line transcript, the input
   row and Run script become ONE door row.** Current: RT-8 header `Console` with its
   Coming tag; a transcript block of four `#7a828e` lines; a one-line input with its
   completion hint; a `Run script` button. New: **one RT-8 door row reading `Console`
   with its Coming tag**, opening the console as a 280 pop-out in the panel lane. D6:
   "Console is a door when a provider is configured and resident and expanded when none
   is (6.1's state axis), with the setup prompt replacing the chat input in that state.
   Two input surfaces for one job, stacked, and at most one of them is the user's
   route." A provider IS configured on this board, so the door form is what this board
   draws. **-3 rows.**
4. **Console: two riders that must be recorded, because they are the only two
   exceptions in the panel.** (a) `E2: the Console KEEPS its pin -- it is one of the
   closed set of four comparative surfaces that earn one (the colour and gradient
   picker, Selection statistics with a pin active, the group profile, the AI console).
   Every other pop-out in the set loses its pin glyph.` (b) `D6: width is not the
   argument and it was checked -- the widest console line measures 219px inside the
   256px band. 6.11 question 3 would send the Console inline; 6.2's frequency override
   is what moves it, and this is the one place in the revision where that override does
   the whole job. Shift+backtick already opens and focuses the console, so the keyboard
   obligation is met by a binding that exists.`
5. **The three run-record step rows (lines 248-277): add the missing second line to
   each.** Current: each row is one line -- `Ran Groups (Communities, Louvain)`, `Ran
   Bridges (Betweenness centrality)`, `Styled nodes by bridge score` -- with a Details
   chevron. New: **each gains a second muted line at 11px `#7a828e`, resident.** D6:
   "each step row's second muted line is floor item 3 and is not drawn on the board. It
   must be resident; only the full record goes behind the Details chevron, which 6.10
   explicitly licenses." The three strings, taken from this board's own Details comment
   at lines 236-241 so the resident line and the pop-out cannot disagree:
   - `resolution 1.0, seed 42, 20 of 20 nodes, 12 ms`
   - `normalized, 20 of 20 nodes, 4 ms`
   - `size 1.0 to 2.0, sqrt, 20 of 20 nodes`
   This supersedes the RT-10 deletion argument in the comment at lines 218-233, which
   removed "on 20 nodes", "12 ms" and "4 ms" as restatements; D6 rules them floor item
   3 and Rule 0 runs first. Rewrite that comment to say so rather than leaving two
   contradicting rules in one file.
6. **The three Details chevrons: caret, no pin, depth checked.** Each 360 pop-out gains
   the 6px caret on its LEFT edge (activity-panel pop-outs open right from left 336;
   VOCAB 14.2's snippet is drawn for exactly this case) at the vertical centre of its
   step row, clamped 12px inside the corners. None carries a pin (E2). Each is one click
   from the row that owns the record (A3).
7. **The panel header gear (line 152, `title="Settings"`): record A6.** Add: `A6: a gear
   draws in the dimmed ink when everything behind it is at its default and in the
   primary ink when anything behind it is not, at every density. This one reaches
   Settings > AI providers, which is a pane and not an option set, so it keeps the
   chrome ink of a navigation control rather than taking the door-stub ink.`
8. **Legend (line 601): this board encodes TWO channels -- Color: Groups (Communities,
   Louvain), four category rows carrying counts `7 / 6 / 4 / 3`, and Size: Bridges (0.00
   / median 0.08 / 0.35, sqrt).** Measured 155px.
9. **Legend: delete the four count spans.** Current: each group row is a
   `space-between` pair with its count at `#7a828e`. New: VOCAB 14.5's canvas
   categorical row -- swatch and label only, the label taking the full width. C3 item 2,
   unconditional. **What replaces them on THIS board:** the groups table (reached by
   clicking the Other row, and here by the result card's "See all N groups"), the
   Community result card in Analyze's Results tab, and the exported legend, which keeps
   twelve categories with counts and the coverage footer. No height is saved -- the
   counts were right-aligned on rows that exist anyway -- so the legend stays 155px.
   Four categorical rows is under the five-row cap, and there are no state rows.
10. **Legend: `max-height: 334px` -> `max-height: 240px` (C6),** and rewrite the THIS
    BOARD sentence at line 600. Current: `Counts stay: the AI answer names the groups
    but does not list all four with their sizes.` New: `No counts (C3 item 2,
    unconditional). The old clause -- counts stay because the AI answer does not list
    all four sizes -- is one of the three conditional legend rules C3 replaces with one
    grammar; condition-dependent rendering is what produced 0%-to-86% duplication across
    the set. The four sizes live in the groups table, the result card and the exported
    legend.` Then append the standard C2 / C3 / C6 paragraph from Main item 11.
11. **File comment header.** Add: `Revision 1.8: D6 (the panel is inverted and two door
    rows fix it -- Provider becomes a door row whose stub carries claude-sonnet-5, the
    Console becomes a door row because a provider is configured, and the six supporting
    blocks at about 445px become two door rows at about 64px while the conversation goes
    from about 280px to about 660px), D6 floor fix (each run-record step row gains its
    resident second line, floor item 3), E2 (the Console keeps its pin; the three
    run-record pop-outs lose theirs), B3 / VOCAB 14.2 (carets on the step pop-outs), C3
    / C6 (the four group counts leave the canvas legend unconditionally; cap 334 ->
    240), E4 (Provider, Console and Voice input join the palette index by both names).`

---

## PresentPanel

State after the edit: Present panel open, both gears CLOSED, ten resident rows, canvas
832 x 836 with the extended export frame hint. This is the largest change in the set by
a wide margin -- 28 resident rows to 10, about 795px to about 330px -- and the only
panel where more than half the resident rows move. The finding is not that too much is
visible: the doors were already drawn and nothing went behind them. The board's own
title attributes read "Image export options" and "Data export options" on two gear
buttons, and then eleven of those options render as resident rows beside the gears.

1. **Export image section, the Scope / Background row (lines 279-296): move it behind
   the Image options gear.** Current: an RT-1 pair -- a `Scope` field reading `Current
   view` beside the three-swatch RT-3 Background track (`Dark`, `Light`,
   `Transparent`). New: gone from the panel; both controls live in the Image options
   pop-out, Background as an RT-3 group. Scope passes the door test (D1 walks it row by
   row: it sits at a default most exports never leave, and the export frame hint plus
   the gear's primary ink report the deviation). A2's veto on the export Scope select is
   lifted by name in the same clause: "the canvas export frame hint carries the report
   instead and the select is therefore legally a door". **-1 row.**
2. **Export image section, the Legend / Note markers RT-5 pair (lines 320-333): delete
   from the panel.** Current: two checked boxes reading `Legend` and `Note markers`.
   New: gone; both live in the Image options pop-out as an RT-5 pair. Both are at their
   default (on), so Rule 7a removes them before any pop-over fires. **-1 row.**
3. **Export image section, the `Only pinned labels` switch (lines 334-342): delete from
   the panel.** Current: an off switch with its trailing report `hides all 20 labels`.
   New: gone; it lives in the Image options pop-out with that same report resident
   beside it there. It is off on this board, so it creates no departure and no floor-2
   line renders under the section (Rule 7's corollary). Record the conditional: `floor
   item 2: when this switch is ON, "hides all 20 labels" renders RESIDENT under the
   Export image section, not inside the pop-out -- a departure a hidden option creates
   is named where the section that owns the door is, per A6.` **-1 row.**
4. **Export data section, the Positions / Notes RT-5 row (lines 441-452): delete from
   the panel.** Current: `Positions` checked, `Notes` disabled with the title `Include
   notes. This graph has none yet`. New: Positions goes into the Data options pop-out;
   Notes is deleted outright, not dimmed -- D1: "'Include notes. This graph has none
   yet' is content the data cannot support, which Rule 7c deletes rather than dims."
   **-1 row.**
5. **Export data section, the two secondary export rows (lines 462-471): delete from
   the panel.** Current: `Analysis results as CSV -- Run something first` and `Notes as
   CSV -- Add a note first`. New: they become the Data options pop-out's "Other exports"
   group, which renders only when non-empty; both are empty here, so nothing is drawn in
   either place. **-1 row.**
6. **Export data section, rows 7 and 8 are restructured to D1's list.** Current: an RT-7
   row pairing the `JSON` format field with the `Export data` verb (lines 407-418), then
   an RT-1 single `Whole graph` with `about 6 KB` as its dimmed in-field suffix (lines
   420-430); `Copy node ids` is a 24px glyph on the section header (line 396). New: an
   RT-1 pair -- `Format JSON | Scope Whole graph`, keeping `about 6 KB` as the dimmed
   suffix inside the scope field -- then an RT-7 row carrying `Copy node ids | Export
   data`, both in full text. D1's ten-row list, verbatim. **No net row change; the
   header's Copy glyph is retired into the RT-7 row.**
7. **Export video section (lines 476-497): re-type as a door row.** Current: a collapsed
   RT-8 header with the record `10 s, Orbit once, WebM` right-aligned. New: the same row
   spelled as VOCAB 14.1's RT-8 door -- permanently closed right-pointing chevron, the
   name at value ink, and the stub `10 s, Orbit once, WebM` in the trailing slot. It
   opens a 280 pop-out from its own door row holding Duration, Camera, Format, the
   estimated time and Record, with progress and Cancel mirrored in the status bar. **No
   row change; the state is unchanged and only the row type is.**
8. **Report sections section (lines 533-604): delete all eleven rows and the header.**
   Current: an RT-8 header and eleven checkbox rows (`Graph summary 1`, `View image 1`,
   `Legend 2`, `Analysis results`, `Validation report`, `Methods 1`, `Data changes`,
   `Analysis steps 1`, `Pinned items`, `Notes`, `Data tables first 100 rows each`). New:
   gone from the panel entirely. D1: "6.11: a control whose home is a dialog may not
   acquire a second home. Its home is the report editor." The checklist renders inside
   the report editor as a packed RT-5 block with its per-section counts, unchanged in
   content -- every row is the name of a report section, which is floor item 6, so the
   list itself does not shrink. **-12 rows.**
9. **The report editor is a NON-MODAL BOTTOM DRAWER, and this resolves a standing
   contradiction.** Record it on the Reports section comment: `D1: not a dialog and not
   a pop-out. 6.11's first question is exclusive and its list is closed (Import options,
   Table join, Map identifiers, node merging, the computed attribute formula, Run a
   recipe); report generation is not on it, so "If no, it is never a dialog." And it
   cannot be a pop-out: the report-generation capability requires an editable
   description of up to 2000 characters plus editable methodology and findings sections,
   which the 480 ceiling cannot hold, and 6.11 says what that means -- "Anything wider is
   a drawer or the Data table". Non-modal is not a nicety: W15 phases 3 and 4 interleave,
   and a modal forces you to close the editor to fix the picture you are describing.
   This resolves a standing contradiction between 5.3 and 6.11. A pop-out opened from
   the drawer counts against the drawer's own region (E2: regions are now five --
   activity panel, inspector, canvas overlay, dialog, dock).`
10. **More section (lines 605-650): the header and its four dimmed rows become menu
    entries.** Current: RT-8 header `More` with one Coming tag and one info circle, then
    `Export recipe (JSON)`, `Export as script`, `Generate report...`, `Export evidence
    bundle`. New: gone from the panel. `Export recipe (JSON)` and `Export as script` go
    to the **Export data header's overflow**; `Generate report` and `Export evidence
    bundle` go into the **report editor**. FLOOR-1.9's clause holds and must be recorded:
    a menu row keeps the verb's full text and its Coming tag, so nothing is un-named.
    **-5 rows.**
11. **Reports section (lines 498-530): keep it, and give it its library shape.**
    Current: an empty RT-8 header with a resident `Save as report...` plus. New:
    unchanged for this board's state (no report has been saved), plus the record that it
    is D1's tenth row: `RT-8 Reports -- library section, resident plus, RT-6 rows
    carrying each saved report's own name when there are any; the pinned-items RT-6 list
    when non-empty. Both are floor item 7.`
12. **The two gears (lines 248 and 399): apply A6's ink rule.** Current: both are drawn
    at `#7a828e`. New: keep `#7a828e` on this board and record the rule at each: `A6: a
    gear draws in the dimmed ink when everything behind it is at its default and in the
    primary ink (#d5d7da) when anything behind it is not. Both are at their defaults
    here. When Include legend is turned OFF the Image options gear draws primary and its
    title becomes "Image export options. 1 option changed" (VOCAB 14.1, second
    spelling).`
13. **Canvas export frame hint (lines 731-736): extend the string.** Current: `Export
    frame: current view, 832 x 836, about 20 nodes in frame`. New: `Export frame:
    current view, 832 x 836, about 20 nodes in frame; legend: 1 channel`. **One channel,
    not two** -- this board's canvas legend draws the Size block alone. C4: this hint is
    the resident floor-item-4 report for everything behind the Image options door, and it
    is what lets Scope, Background and Include legend legally leave the panel. It reads
    `legend: off` when the option is turned off, and the gear draws primary in that case.
    Record: `C4: this is strictly better than a checked checkbox in a panel, and it is
    the resolution of the direct conflict between the Present split and the legend track
    -- the control goes behind the door and the report stays on the canvas where the
    picture is.` Use VOCAB 14.7's snippet as the shell.
14. **Report sections checklist, the `Legend` row's count.** Wherever the checklist is
    redrawn in the report editor, its `Legend` count must be `1`, not the `2` currently
    on line 593: 5.3's rule is that "each shows its item count", the count is the number
    of encoded channels the report's legend section will carry, and this board encodes
    one. It must agree with the frame hint in item 13 -- two surfaces cannot report
    different channel counts for the same graph on the same screen.
15. **Legend (line 838): this board encodes ONE channel -- Size: Most connected (degree
    2 / median 3 / 4, sqrt).** No categorical rows, no counts, no state rows, so C3's
    three cuts take nothing off it and nothing replaces it on the canvas. One number
    changes: `max-height: 334px` -> `max-height: 240px` (C6). Measured height stays 80.
16. **Legend comment (line 834), the THIS BOARD sentence, and the EXPORT BOARD NOTE
    (lines 757-759).** Current: `The exported image carries these same blocks when
    Include legend is on (5.3 Present).` That sentence is now false in the code and must
    be replaced: `C4, checked in the code rather than asserted:
    graphty-element/src/screenshot/ScreenshotCapture.ts exports by calling
    CreateScreenshotAsync(this.engine, this.scene.activeCamera, ...) -- a Babylon scene
    capture. The only drawImage calls in the file are format conversion and resize; there
    is no overlay compositing and no html2canvas. This legend is a DOM overlay in the
    shell, outside that canvas, so the exported image contains NO legend today and
    physically cannot contain this one. The export legend is COMPOSED from the encoding
    model at the export's own scale and drawn into the image, it does not depend on this
    legend's visibility, and in the SVG and PDF paths it is emitted as vector text. It
    carries more than this one: twelve categories with counts, the coverage footer, every
    departure line and one row per state drawn in the frame. The new ExportLegend board
    draws it.` Then append the standard C2 / C3 / C6 paragraph from Main item 11.
17. **File comment header.** Add: `Revision 1.8: D1 (28 resident rows -> 10, about 795px
    -> about 330px, the largest split in the set -- eleven options go behind the two
    gears that were already drawn; the report sections checklist leaves for the report
    editor, which is a NON-MODAL BOTTOM DRAWER and not a dialog; the More section becomes
    menu entries on the Export data overflow and inside the editor; Export video becomes
    a door row with the stub "10 s, Orbit once, WebM"), A6 (both gears take the dim /
    primary ink rule), C4 (the export frame hint gains "legend: 1 channel", which is the
    resident floor-4 report that lets Include legend leave the panel; the exported legend
    is composed, not captured, and ScreenshotCapture.ts is why), C6 (legend cap 334 ->
    240). New boards this split requires: PresentCompact, ImageOptionsPopout,
    ReportEditorDrawer, ExportLegend.`

---

## Settings

State after the edit: unchanged Settings overlay over the Loaded Explorer, AI providers
pane open, the canvas and its overlays under the scrim. D7's finding is that Settings is
mostly the wrong mechanism for pop-overs, and that the refusals matter more than the
exceptions -- so most of this board's work is written down rather than drawn.

1. **Record the governing rule on the section nav (lines 613-651), because a later pass
   will otherwise "fix" Settings with pop-overs.** Add to the nav comment: `D7: 6.11's
   anchor clause defines lanes for regions that have a boundary to be clear of; a
   full-panel overlay has none, so a pop-over inside it has nothing to point at. And the
   mechanism is already applied at the right scale: 6.9's RT-1 door rule says a section
   consulted rather than operated gets the same treatment at section scale, and IN
   SETTINGS THE NAV ITEM IS THE DOOR AND THE PANE IS WHAT IS BEHIND IT. Seven doors,
   seven panes, one open at a time.`
2. **Record the three refusals, at the controls they protect.** (a) On the provider
   accordion (lines 664-800): `D7: refused a pop-over. The provider cards are an
   accordion, which anchors each key and model inside that provider's own row at full
   width -- which is what a pop-over would be for, already done, with no second surface.`
   (b) On the Data management nav row (line 652): `D7: Saved items is 26 user-named rows
   across 8 kinds on one screen, which is floor item 7 and 6.11's own refused example,
   and its per-row verbs are correctly hover-revealed under RT-7's hover split. SavedItems
   draws it.` (c) Wherever the XR rows are named: `D7: the four XR rows stay resident
   because 5.9 requires them learnable before the headset goes on, so Rule 7c does not
   fire.`
3. **Appearance nav row (line 636): record the two switches it now carries, neither of
   which is drawn on this board.** Add to the nav comment: `IC-3 already puts "Show help
   text in place" here. E4 adds the second escape hatch beside Rule 11's first:
   Settings > Appearance > "Keep advanced sections open", default off, renders every gear
   pop-out's contents as inline rows in its own section instead, in the same order, at
   the same 32px pitch. Two constraints: it affects only pop-outs whose contents are
   field rows at 280 -- reports and matrices at 360 and 480 stay doors at every setting,
   because they do not fit the 256px band and there is no honest inline form -- and a
   panel in this mode may scroll, which is the cost the user accepted by turning it on.
   It ships in the same revision as the doors, for the same reason Rule 11's first hatch
   ships with the glyphs. The Appearance pane is not drawn on any artboard; the new
   KeepAdvancedOpen board draws it with one panel in that mode so the scroll cost is
   visible.`
4. **Record the two Settings exceptions that DO get pop-overs, so this board's nav
   agrees with the panes that draw them.** Add to the Performance and Keyboard shortcuts
   nav rows respectively: (a) `D7: Layout size ratings -- a header plus nine engine rows
   of benchmarked constants -- becomes a 3a pop-out at 360 from a gear on the row it
   belongs to (6.2: more than four schema rows). SettingsPerformance draws it. Same pane,
   35px below it, Layout stepping already collapses three settings into one row reading
   "engine default": same content class, two treatments, and this is the inconsistency
   the user named.` (b) `D7: Rebind becomes a 280 pop-over anchored to the key chip that
   was clicked and titled with the action's own name. Today rebinding captures in place
   and the conflict case inserts a warning line that pushes the remaining rows of a
   roughly 60-row table down while the user stares at a key chip. That reflow is the
   concrete harm, and it is A4's third clause -- the door buys leaving the rows below
   operable. SettingsShortcuts draws it.`
5. **Legend (line 355): this board encodes ONE channel -- Size: Most connected (degree 2
   / median 3 / 4, sqrt) -- on the loaded graph under the scrim.** No categorical rows,
   no counts, no state rows, so C3's three cuts take nothing off it and nothing replaces
   it on the canvas. One number changes: `max-height: 334px` -> `max-height: 240px` (C6).
   Measured height stays 80. The legend, the minimap and the toolbar keep their z-order
   under the scrim and their bottom-12 baseline.
6. **Legend comment (lines 336-354).** Append the standard C2 / C3 / C6 paragraph from
   Main item 11.
7. **Record E2's one-transient rule on the overlay comment (line 298 area).** Add: `E2:
   no artboard may show two transients of different classes open at once. Settings is a
   3b overlay with a scrim; it replaces and closes any open menu or pop-out in the same
   region rather than dimming it behind the scrim, and the Escape ladder closes the
   pop-out before the dialog. The canvas overlays under the scrim are resident chrome,
   not transients, which is why they are drawn.`
8. **File comment header.** Add: `Revision 1.8: D7 (Settings is mostly the wrong
   mechanism -- the nav item is the door and the pane is what is behind it; the provider
   accordion, Saved items and the four XR rows are refused pop-overs by name; the two
   exceptions are Layout size ratings at 360 and Rebind at 280, both drawn on their own
   boards), E4 (Appearance carries "Keep advanced sections open", the second escape hatch
   for the roughly 25 rows that move behind doors this revision), E2 (one transient class
   at a time), C6 (legend cap 334 -> 240). No control on this board moves.`

---

## CommandPalette

State after the edit: unchanged palette state, the query "bridge", no activity panel
open, canvas 1112 x 836, the dialog over a scrim. No drawn row changes -- none of the
new entries matches "bridge" -- but the index this board declares is E4's first
mitigation and it has to be right, because about 25 rows move behind doors this revision
and 6.4 becomes load-bearing rather than a formality.

1. **The pop-out index in the file comment (lines 27-29).** Current: `It also indexes the
   seven pop-out doors by name, in this order: Time slider settings, Validation report,
   Group profile, Run record, Schema, All statistics, Filter expression.` New: replace
   the seven with E4's full list of twenty-two, each indexed by BOTH names: `It indexes
   every pop-out door by name, which E4 makes mandatory in the same revision as the
   doors: Image options, Data options, Export video, Report editor, Layout parameters,
   Ramp options, Values table, Column role parameters, Join options, Table columns,
   Provider, Console, Layout size ratings, Rebind a shortcut, Neighborhood expansion, Ego
   network, Advanced parameters, Sweep runs, Filter expression, Note editor, All
   statistics, Run record -- plus the three the set already drew, Time slider settings,
   Validation report, Group profile and Schema. POP-13d's three routes stand: a focusable
   opener in the panel's tab order, this index, and the home-panel row.`
2. **Record why the index is mandatory, not decorative.** Add after item 1's list: `E4:
   four measures make hiding safe and all four ship in the same revision as the doors --
   this index by both names; A3's depth obligation, which makes "one click" measurable
   and forbids a door behind a door; A6's stub drawn primary, so hiding never hides a
   deviation; and Settings > Appearance > "Keep advanced sections open", the second
   escape hatch beside Rule 11's first.`
3. **Add the two Settings rows the palette must reach.** Extend the NAV-6 / DEF-5 index
   list at lines 21-25 with: `Keep advanced sections open (Settings > Appearance)` and
   `Show help text in place (Settings > Appearance)`. Neither matches "bridge", so
   neither is drawn.
4. **Record D8's surface-class change on the Keyboard shortcuts entry.** Add to the same
   comment: `D8: the palette's Keyboard shortcuts row and the Help menu's row both open
   the ? reference as a NON-MODAL overlay -- same content, no scrim, no focus trap, the
   canvas keeps pointer and keyboard, Escape closes. 6.11 question 1's list is closed and
   the shortcuts reference is not on it, so "If no, it is never a dialog"; and the
   modality defeated the use, because you read a binding and the very next thing you do
   is press it. ShortcutsOverlay replaces ShortcutsDialog.`
5. **Record the four report-editor and Present entries by their new homes.** Add: `D1:
   Export recipe (JSON) and Export as script are indexed here and reached in the panel
   from the Export data header's overflow; Generate report and Export evidence bundle are
   indexed here and reached in the report editor drawer. A menu row and a palette row
   each keep the verb's full text and its Coming tag (FLOOR-1.9), so nothing is
   un-named.`
6. **Legend (line 468): this board encodes ONE channel -- Size: Most connected (degree 2
   / median 3 / 4, sqrt).** No categorical rows, no counts, no state rows, so C3's three
   cuts take nothing off it and nothing replaces it on the canvas. One number changes:
   `max-height: 334px` -> `max-height: 240px` (C6). Measured height stays 80.
7. **Legend comment (lines 449-467).** Append the standard C2 / C3 / C6 paragraph from
   Main item 11. Then fix the stale clearance sentence at lines 344-347, which reads `the
   legend -- 200 wide here, not Main's 160 -- starts at x 900. So the bar clears the
   minimap by 261px and the legend by 221px`. Measured now, with the 256 legend: the
   toolbar spans root x 481 to 727, the minimap ends at root x 220 and the legend starts
   at root x 892, so the clearances are **261px and 165px**, both far above the 16px
   minimum, and neither overlay rises.
8. **Record the floor kept, unchanged.** The existing "Kept against the rules, by floor"
   list at lines 71-75 cites `the canvas legend's "1 to 4, sqrt scale" in words (5)`.
   That string is doubly stale -- the domain is 2 / 3 / 4 (FIXTURES 1.3) and the form is
   min / median / max. Rewrite it: `the canvas legend's "2 / median 3 / 4, sqrt scale" in
   words (floor 5, screen half), and the composed export legend that carries the same
   block plus counts, the coverage footer and the state rows (floor 5, export half)`.
9. **File comment header.** Add: `Revision 1.8: E4 (the pop-out index grows from seven
   doors to twenty-two, indexed by both names -- this is the first of the four measures
   that make about 25 hidden rows reachable, and 6.4 is load-bearing this revision rather
   than a formality), D8 (Keyboard shortcuts opens a non-modal overlay, not a dialog), D1
   (the four Present verbs are indexed at their new homes), C6 (legend cap 334 -> 240),
   plus two measured corrections to stale clearance and legend-domain strings. No drawn
   row changes: none of the new entries matches the query "bridge".`

---

## InsightsWide

State after the edit: unchanged Loaded state, widest Insights strip, no activity panel
open, canvas 1112 x 836, the Graph summary inspector on the right. No panel is open, so
no pop-over split applies to this board; the work is the legend, one door record and two
measured corrections.

1. **Legend (line 945): this board encodes ONE channel -- Size: Most connected (Degree
   centrality), fraud degree 1 / median 6 / 44, sqrt.** No categorical rows, no counts,
   no state rows, so C3's three cuts take nothing off it and nothing replaces it on the
   canvas. One number changes: `max-height: 334px` -> `max-height: 240px` (C6). Measured
   height stays 80 (the single Size block is 63 and the min-height binds).
2. **Legend comment (lines 926-944).** Append the standard C2 / C3 / C6 paragraph from
   Main item 11, and extend the existing THIS BOARD sentence, which already deletes the
   unbuilt `Time: ts -- Coming` block, with: `C2: the export half of floor item 5 is what
   that block was reaching for and it does not answer it either -- a capability that is
   not built is not an encoded channel on EITHER surface. The exported legend composes
   from the encoding model, so an unencoded channel produces no block there for the same
   reason it produces none here.`
3. **Correct the stale overlay-clearance numbers in the toolbar comment (lines 492-497).**
   Current: `the legend's left edge at x 910` and `231px clear of the legend's left
   edge`. Measured now: the toolbar spans root x 481 to 727, the minimap ends at root x
   220, the legend runs root x 892 to 1148. So the clearances are **261px to the minimap
   and 165px to the legend**, both far above the 16px minimum, and neither overlay rises.
   The 910 came from the 190px legend this board carried before LEGEND-1.8 fixed one
   width for the set.
4. **Inspector, Schema door row: record A6's ink rule and its one exception.** The 1.7
   floor fix already gave this door its state mark (`3 node types, 7 edge types`). Add:
   `A6: a gear or door glyph draws in the dimmed ink when everything behind it is at its
   default and in the primary ink when anything behind it is not. That rule governs
   OPTION doors. Schema is a report of what is currently true and has no default at all
   -- A2 records that class as derivable at the door test's first clause -- so its stub
   is a count and not an ink state, and the count is what 6.11's stub obligation asks of
   it. A4 keeps it a door for the other reason: the type-pair matrix cannot be drawn
   honestly at 256, so the door buys width beyond the band.`
5. **Inspector, Counts and Attributes sections: record A4's discriminator.** Add to each:
   `A4: a door must buy width beyond the 256px band, survival across a selection change,
   or leaving the rows below operable while it is open. Counts and Attributes are
   consulted rather than operated and buy none of the three, so they are collapsed
   sections and not doors -- a closed section and a door cost the same single row, and
   the door adds a click for nothing. Their RT-8 trailing slots carry the one fact a door
   stub would have carried.`
6. **Insights strip: confirmed exempt, and now protected against the disclosure pass
   too.** Add to the strip comment: `G3 exempts the strip from every density rule, and
   1.8 adds nothing to it: 6.11 routes verbs to menus and reports to doors, and a
   suggestion card is neither. The two dropped cards (Find the bridges, See how it
   changed over time) stay reachable from Help, whose two count-bearing rows become
   submenus under D8.`
7. **File comment header.** Add: `Revision 1.8: C3 / C6 (this legend carries one encoded
   channel, no counts and no state rows, so the three cuts take nothing off it; cap 334
   -> 240), C2 (an unbuilt capability is not an encoded channel on either surface), A4 /
   A6 (Schema stays a door because it buys width, and its stub is a count rather than an
   ink state; Counts and Attributes stay collapsed sections), plus two measured
   corrections to overlay clearances left stale by LEGEND-1.8's 256 width. No panel is
   open on this board, so no section split reaches it.`

---

## TimeSlider

State after the edit: Loaded state inside window A (2026-01-05 to 2026-02-04), Explore
panel open, the time bar docked at the canvas foot, the Time slider settings pop-out
drawn open and anchored to the bar gear that opened it. **This is the board the user
named** -- "the 'timeline' popover should be anchored to its parent" -- and the fault is
measurable: the pop-out sits 268px above its own gear, stacked on the legend, so the
right-edge alignment it does keep is invisible. Every geometry number below is measured
at 1440x900 in a 1600x1000 viewport.

1. **Time slider settings pop-out (line 1352): move it.** Current: `position: absolute;
   left: 540px; bottom: 331px; width: 280px; max-height: 804px` -- measured [868,343
   280x202] in root coordinates, against a bar gear measured [1124,813 24x24] and a
   legend measured [892,553 256x241]. New: **`left: 276px; bottom: 82px; width: 280px;
   max-height: 418px`** -- measured target [604,592 280x202], bottom 794, right edge 884.
   B4's correction, verbatim: "Keep the 12px gap to the bar; slide along the bar. Bottom
   794, right edge 884 (8px clear of the legend's 892 left edge)." Bottom 82 in canvas
   coordinates is the bar's 70px height plus the 12px canvas-overlay inset, which is the
   same baseline the bar, the minimap and the legend already share. `max-height` is 418
   because B1 adds a second cap -- a pop-out is never taller than half its owning region,
   836 / 2 -- and the smaller of that and 6.11's region-height-minus-32 (804) binds.
2. **Record WHY it slides instead of rising, because this is the rule the user's point
   produced.** Replace the ANCHOR paragraph at lines 1324-1341 wholesale. Current, it
   amends 6.11 to let a canvas pop-out rise to clear the legend and walks through four
   generations of that arithmetic (126, 290, 331). New: `B1: a transient surface never
   chooses its own position; it inherits one from its opener on both axes. One axis
   carries the GAP -- 12px here, the canvas-overlay inset -- and the other carries a
   SHARED EDGE LINE with the opener's anchor box. For a HORIZONTAL-overlay opener like
   this bar, the gap axis is VERTICAL, so the 12px gap above the bar is what must be
   preserved and the horizontal position is what gets spent. On a horizontal bar the
   vertical gap is what says "this bar's" and the horizontal position says nothing --
   which is why rising to clear the legend is the one move that destroys the tether. When
   the surface will not fit, the gap to the opener is the LAST thing surrendered and the
   shared edge line is the FIRST: slide along the shared-edge axis, then flip the edge
   line, then drop a width rung, and only then open centred over the canvas with "from
   <opener name>" in the header. Sliding is enough here, so the centred fallback is not
   needed. It may cover the toolbar and the minimap, which are dismissible chrome; only
   the legend is floor item 5. With the legend hidden it returns to right edge 1148 on
   the gear. The former amendment -- that a canvas-overlay pop-out clears the legend by
   rising -- is retired, and with it the 126 / 290 / 331 arithmetic that had to be redone
   every time the legend grew a block.`
3. **Name the opener, because there are two of them.** B4's second row: the board draws
   two controls titled `Time slider settings` -- the panel gear at [263,403 24x24] (line
   383) and the bar gear at [1124,813 24x24] (line 1242) -- and the pop-out as drawn is
   anchored to neither. The bar gear is drawn lit (`background: #28364e`) and the panel
   gear is not, so the bar gear is the opener that was used. Record the rule: `B4: a
   pop-out reachable from more than one opener is anchored to the opener that was USED,
   and its lane follows that opener's region. The palette route, which has no on-screen
   opener, opens it in its home panel's lane and lights that row. 6.5's remembered pinned
   position is stored per opener, not per pop-out type. This board draws the bar-gear
   route: the bar gear is lit and the panel gear is not.`
4. **Record the named obstruction, because B4 adds a review clause that requires it.**
   Add to the pop-out comment: `B4's review clause: "Every pop-out's shared edge line is
   within 8px of its opener's anchor box unless a named obstruction is recorded in that
   board's own comment." The obstruction here is the legend, floor item 5, whose left
   edge is at root x 892; the shared edge line is spent to clear it and the 12px gap to
   the bar is kept. Because the edge line is spent, this pop-out draws NO caret -- VOCAB
   14.2's caret marks a preserved edge line and would point at nothing here.`
5. **Time slider settings pop-out header (lines 1354-1358): delete the pin toggle.**
   Current: a 24px `title="Pin this open"` div before the close X. New: gone; the close X
   moves left into its slot. E2 narrows the pin to a closed set of four comparative
   surfaces -- the colour and gradient picker, Selection statistics with a pin active,
   the group profile, and the AI console -- and names this board: "It removes the pin from
   HistoryPopover, ValidationPopout and TimeSlider as currently drawn." A pop-out whose
   content is the parameters of the row that opened it has nothing to hold still.
6. **Panel, Active filters section (lines 235-256): delete the header and its Time window
   chip.** Current: an RT-8 header `Active filters` with a `Clear all filters` X, and one
   RT-6 chip row reading `Time window`. New: gone, both rows. D4: "TimeSlider's 'Active
   filters / Time window' chip is drawn while the slider is docked, which 5.3 forbids
   outright and which prints the window a third time." The three surfaces that already
   own it and stay: the bar's own `Viewing: 2026-01-05 to 2026-02-04` readout, the status
   bar's Viewing slot with the same string, and the inspector's window sub-line. With the
   chip gone the section holds nothing and Rule 7c deletes the header with it. **-2
   rows.**
7. **Panel, More... section (lines 393-420): delete the header and both rows.** Current:
   an RT-8 header reading `More...`, then `Pattern editor` (Coming) and `Around the
   selection` (Coming), each with an external-link glyph. New: gone, all three. D4: "The
   'More...' text row form is retired from the panel vocabulary: a text row that hides
   two sections is a third disclosure mechanism doing the job of the other two." Their
   destinations: the pattern editor becomes a 360 pop-out in the PANEL lane anchored to
   the Find a pattern row (D4: 5.3's "over the canvas" is the AnalyzePicker preview's one
   fixed home, and a 3a pop-out already leaves the canvas live, so the canvas position
   buys nothing and costs the anchor -- "the exact failure the user named on the
   timeline"); `Around the selection | Ego network` becomes an inspector action with a
   280 pop-over holding Hops and Max nodes. Both join the palette index by both names
   (E4). **-3 rows.**
8. **Panel: add the two sections this board was silently missing.** D4: "TimeSlider
   regains Sets and Notes, which it was silently missing." Draw both in RT-8's empty
   form -- dimmed name, no content rows, no "0", no empty-state sentence -- with the
   resident SAV-1 plus: `Sets` with a plus titled `Save selection as set... Select
   something first` (disabled, its reason in the title, floor item 4), and `Notes` with a
   plus titled `Note (N). Select something first`. Both strings are the ones Main already
   draws. **+2 rows.**
9. **Panel, section order: D4's fixed eight, in this order, every board.** Filter
   builder, Filters, Sets, Views, Find a pattern, Neighborhood expansion, Step through
   time, Notes. This board currently draws Neighborhood expansion BEFORE Views; move it
   to slot six. Step through time renders here because the fraud data has a Time role.
   **Panel 14 -> 11 resident rows (D4, H): -2 from item 6, -3 from item 7, +2 from item
   8.**
10. **Panel, Step through time row (lines 349-392): confirmed as drawn, gear and all.**
    D4: "Time slider settings: the gear does NOT move. One track proposed moving the gear
    to the bar's left end so a right-aligned pop-out could clear a right-aligned legend.
    Under B1 the pop-out slides along the bar instead, so the gear stays where users have
    learned it and the fix costs no control move. The rule wins; the workaround is
    dropped." Record that in the section comment, and add A6's ink rule to the gear: it
    is dimmed while everything behind it is at its default and primary when anything is
    not.
11. **Legend (line 1141): this board encodes THREE channels and draws a fourth block of
    app chrome.** Measured 241px, the second tallest in this group. Blocks: Color: node
    type, four rows carrying `58 of 96` / `29 of 48` / `20 of 34` / `13 of 22`; Size:
    Most connected (1 / median 6 / 44, sqrt) with the departure line `over all 200 nodes,
    not the window`; Arrow: payment direction (`payer to payee`); then a state block
    holding `Outside window`.
12. **Legend: delete the four count spans in the Color block.** Current: each node-type
    row is a `space-between` pair with its in-window-of-whole-graph count at `#7a828e`.
    New: VOCAB 14.5's canvas categorical row -- swatch and label only. C3 item 2,
    unconditional; the current comment's justification ("the type counts read in-window
    of whole-graph because the window is a departure and floor item 2 names it") is
    exactly the conditional rule C3 replaces. **What replaces them on THIS board:** the
    inspector's Schema section (`4 node types, 3 edge types`), the Data table drawer, the
    status bar's `120 of 200 nodes`, and the exported legend, which keeps twelve
    categories with counts and the coverage footer. Saves no height.
13. **Legend: delete the state block and the divider above it -- the `Outside window`
    row.** C3 item 1. **What replaces it on THIS board:** the time bar's own `Viewing:
    2026-01-05 to 2026-02-04` readout, the status bar's Viewing slot with the same
    string, and the exported legend, which carries one row per state drawn in the frame
    because a static figure has no time bar and no status bar.
14. **Legend: KEEP the Size block's departure line `over all 200 nodes, not the
    window`.** It is a departure line, and C2's screen obligation keeps every departure
    line on the canvas: "a window filters the drawing and never the encoding" is exactly
    the kind of statement floor item 2 exists for. Record that it survives the cut, so a
    later pass does not read it as a state row.
15. **Legend: `max-height: 334px` -> `max-height: 240px` (C6).** After items 12 and 13
    the box measures about 215px (241 less the 13px state row, its 1px divider and one
    6px gap), so it clears the new cap and C6's shortening rule does not fire. Four
    categorical rows is under the five-row cap. The legend keeps `right: 12px; bottom:
    82px` -- it does not move, does not change width and does not change corner (E3), and
    the bottom stack's 12 / 82 / 272 / 342 ladder is untouched.
16. **Legend comment (lines 1125-1140).** Rewrite the THIS BOARD sentence and append the
    standard C2 / C3 / C6 paragraph from Main item 11. New THIS BOARD text: `The fraud
    ring inside window A, 2026-01-05 to 2026-02-04 (FIXTURES 2.7). Node-type rows carry
    no counts on canvas (C3 item 2, unconditional) -- the Schema table, the Data table
    drawer, the status bar's "120 of 200 nodes" and the exported legend own the in-window
    numbers. "Outside window" is a state row and is gone from the canvas legend (C3 item
    1): the bar's Viewing readout and the status bar's Viewing slot name the window, and
    the exported legend carries the row because a static figure has neither. The size
    domain stays the whole graph's 1 / 6 / 44 and keeps its departure line, because a
    window filters the drawing and never the encoding.`
17. **File comment header (lines 32-44).** Add: `Revision 1.8: B1 / B4 (THE USER'S OWN
    EXAMPLE -- the settings pop-out was 268px above its own gear and stacked on the
    legend; it now keeps the 12px gap to the bar and SLIDES along it to [604,592 280x202],
    right edge 884, 8px clear of the legend's 892, and 6.11's rise-to-clear-the-legend
    amendment is retired with the arithmetic it forced), B4 (the pop-out is anchored to
    the opener that was used -- the bar gear, drawn lit; the panel gear is not), E2 (the
    pop-out loses its pin), D4 (panel 14 -> 11: the Active filters / Time window chip is
    deleted as a third print of the window, the "More..." text row form is retired with
    both its rows, Sets and Notes are restored, and the eight sections take their fixed
    order; the gear does NOT move -- the rule wins and the workaround is dropped), C3 /
    C6 (four node-type counts and the Outside window state row leave the canvas legend,
    241px -> about 215px; cap 334 -> 240).`

---

## IpadPanel

State after the edit: unchanged iPad Loaded state, 1180 x 820, the Analyze panel as a
full-height overlay at left 48, canvas 1132 x 756 underneath. The desktop Analyze
corrections apply here row for row; the one iPad-specific thing is that a pop-out is a
sheet, not an anchored surface, and that has to be written down where the new doors land.

1. **The Method field row under the Influence card (lines 544-553): delete the row.**
   Current: an RT-1 single reading `PageRank` with the `Advanced parameters` gear in its
   trailing slot. New: gone. D3: the method is the default and is restated by the card
   title on the same screen; Rule 7a and Rule 8 each delete it independently. **-1 row.**
2. **The Influence card row: the Advanced parameters gear moves onto it.** Same edit as
   AnalyzePanel item 2 -- delete the row's `title="Parameters"` chevron and put the 24px
   `title="Advanced parameters"` gear in the trailing cluster, so the parameters sheet is
   one tap from the row that owns it (A3: a door may not sit behind another door). The
   gear is dimmed at defaults and primary when one deviates (A6, VOCAB 14.1).
3. **The More section (lines 690-701): re-type as a menu row.** Current: a collapsed RT-8
   header reading `More`, whose members (Compare, Remove several nodes at once) are not
   drawn. New: **one panel-level `More` row whose overflow carries both verbs in full
   text with their Coming tags** -- the register's overflow glyph in the trailing slot
   rather than a section chevron. D3: "6.11 already routes verbs to menus, and 5.3
   already writes it as 'A panel-level More row'." **No row change; the row type
   changes.**
4. **Recipes header (lines 652-668): add the count to the trailing slot.** Current:
   `Recipes` with its info circle, the More overflow and the resident `Save as
   recipe...` plus; one row below (`Fraud ring triage / 3 steps`). New: the trailing slot
   carries `1` at `#7a828e` (A4). Record the refusal of the door in the section comment.
5. **All statistics door row (lines 585-600): confirmed, with its stub.** Add: `D3 / A4:
   a door because the 360 table buys width beyond the 256 band. POP-8's stub reports the
   computation, which is 6.11's stub obligation and A6's requirement that a door never
   hides a deviation.`
6. **Record the iPad answer to the anchor rule, once, on the panel overlay comment (line
   26 area).** Current: `POP-5/POP-0 (Advanced opens as a full-width sheet over the panel
   with a back chevron, not a floating pop-out)`. Extend it: `B1 / B2 on iPad: the seven
   lanes and the two gap constants govern surfaces that have a region boundary to be
   clear of. A full-width sheet over its own panel has none -- the sheet IS the panel
   column -- so the anchor is carried by the back chevron and the sheet's title, which
   name the row that opened it. Every new 1.8 door on this board (Layout parameters,
   Advanced parameters, Image options, Data options, Provider, Console) takes that same
   sheet form here and the anchored 280 form on desktop. POP-13c still holds: every
   hover-revealed opener is resident on touch.`
7. **Legend (line 296): this board encodes ONE channel -- Size: Most connected (degree 2
   / median 3 / 4, sqrt).** No categorical rows, no counts, no state rows, so C3's three
   cuts take nothing off it and nothing replaces it on the canvas. One number changes:
   `max-height: 302px` -> `max-height: 200px` -- **the iPad cap, not the desktop one**
   (C6 gives 240 on desktop; VOCAB 14.5 gives 200 on iPad). Measured height stays 80. The
   box keeps `right: 12px; bottom: 12px`, measured [912,704 256x80], right edge 1168.
8. **Legend comment (lines 277-295), the THIS BOARD sentence.** Current ends: `iPad
   frame: the 40% height cap is 302, measured on the 756px canvas.` New: `iPad frame: the
   cap is 200 (C6 / VOCAB 14.5), not the 40%-of-canvas 302 it was derived from -- C6
   replaces the proportional cap with a measured one, because 240 is the measured height
   of a desktop legend that is entirely floor and the iPad rung is 200. The cap binds
   nothing today and forbids regrowth.` Then append the standard C2 / C3 / C6 paragraph
   from Main item 11.
9. **File comment header.** Add: `Revision 1.8: D3 (Rule 7a and Rule 8 delete the
   PageRank method row; More becomes a panel-level menu row; Recipes gains its count),
   A3 / A6 (the Advanced gear moves onto the card row so the sheet is one tap from the
   row that owns it, and it takes the dim / primary ink), A4 (Recipes and All statistics
   are decided by the discriminator, one section and one door), B1 / B2 (the iPad answer
   to the anchor rule: a sheet over its own panel has no boundary to be clear of, so the
   back chevron and the title carry the anchor), C6 (legend cap 302 -> 200).`

---

## IpadInspector

State after the edit: unchanged iPad Selected state, 1180 x 820, security-events-41k.csv
with DC01 selected, the inspector as a right-edge overlay, the Select neighbors confirm
drawn open and -- for the first time -- anchored to a named opener. Two geometry fixes
and one action-block cap.

1. **Confirm pop-out (line 693): move it and name its opener.** Current: `position:
   absolute; right: 292px; bottom: 180px; width: 236px` -- measured [652,559 236x81],
   with the comment itself admitting it is "51px above its button rather than 6". B4:
   "ambiguous between the 'All 12,412' chip at y 417 and 'Select neighbors' at y 694; no
   relationship to any opener; right edge 12px clear of the inspector where 8 is the
   panel-boundary constant. Name the opener explicitly, then [656,417 236x81] from the
   'All 12,412' scope chip, right edge 892, 8px clear of the inspector's 900." New:
   **`right: 288px; bottom: 322px; width: 236px`** -- which places it at [656,417 236x81]
   in root coordinates. The opener is the `All 12,412` scope chip in the Neighbors
   section's In / Out / All track (line 526 area), measured [1087,416 84x18]; draw it in
   the lit state so the relationship is visible, and name it in the pop-out's comment.
   The 12px used here was the canvas-overlay inset applied to a shell-boundary gap; B2
   fixes the constant at 8 for a boundary.
2. **Confirm pop-out: add the narrow-surface caret.** B1: "A surface narrower than 280px
   carries an 8px caret at the anchored edge instead of an edge line, because nothing
   aligns meaningfully to a 14px control." 236 is narrower than 280, so use VOCAB 14.2's
   8px caret snippet, mirrored to the pop-out's RIGHT edge (it opens left from the
   inspector) and centred on the opener chip's vertical centre at root y 425.
3. **Confirm pop-out: record its surface class.** Add to its comment: `B4 / VOCAB 14.4: a
   cost estimate, cap or destructive confirm is a POP-OUT WITH TWO VERBS, not a floating
   card. It takes its region's lane and its opener row's shared edge line, its width
   comes from the same ladder, Escape cancels and returns focus to the opener, and it
   carries no pin and no close X -- a dismissible warning about spending forty seconds is
   not a warning. This one is already drawn to that shape (Cancel, Select 12,412, no X);
   what changes is that it now has an opener.` Delete the 1.6 / 1.10 re-anchoring history
   at lines 679-691, which walks through bottom 132, 90, 136 and 180 -- that arithmetic
   existed only because the surface had no opener, and B1 replaces it.
4. **Inspector action block (lines 594-676): cap at four content rows.** Current, seven
   children: the Coming tag and info-circle divider row; the `Expand top 50 of 12,412 by
   weight` split button with its type door; the departure line `Adds 50 nodes. All 12,412
   may slow the canvas down. Expand all anyway`; `Select neighbors` with the More
   overflow; `Ego network` with its `N 1,000` cap field; `Radial layout around this
   node`; and the ring caption `3 rings hold 29,300; 11,900 collapsed`. New (D4:
   "IpadInspector 7 -> 4"): the four content rows that stay are the **Expand split
   button**, its **departure line**, **Select neighbors + More**, and **Ego network**;
   `Radial layout around this node` moves into the More menu keeping its full text; the
   **ring caption moves up to sit directly under the Expand departure line**, because
   D4 forbids a departure line from going into a menu and 6.10's separation clause binds
   it to the drawing it describes rather than to the button beside it. The Coming tag and
   info-circle divider is not a content row and stays. Record the veto verbatim: `D4:
   what may NEVER move into More is the split button's cost estimate and its "All 12,412
   may slow the canvas down. Expand all anyway", because floor item 4 binds the estimate
   to the control that spends it, and every departure line.`
5. **Ego network row (lines 638-650): its cap field becomes a 280 pop-over.** Current: an
   RT-1 `N 1,000` field beside the verb. New: the verb keeps its row; the field is
   replaced by the door onto a 280 pop-over holding **Hops and Max nodes**. D4: "the ego
   network's Hops and Max nodes leave the tier-3 dialog for a 280 pop-over on the
   inspector's Ego network action -- 6.11 question 1 is a no, nothing commits, and the
   canvas must stay touchable to see the size preview and the ring chip." On iPad the
   pop-over is a sheet over the inspector with a back chevron (POP-0's narrow clause).
   **One rider that must be recorded:** the current comment argues the cap stays drawn
   even though 1,000 is the default, because 1,000 of 12,412 is a departure this hub's
   user must see (floor 4 vetoing Rule 7a). That argument survives -- the door's stub
   carries `1,000 of 12,412` in its trailing slot, so the number stays on screen and only
   the editing moves. That suffix is what clears A2's veto: the value is not silent.
6. **Legend (line 295): this board encodes ONE channel -- Size: Most connected (degree 1
   / median 6 / 12,412, sqrt).** No categorical rows, no counts, no state rows, so C3's
   three cuts take nothing off it and nothing replaces it on the canvas. One number
   changes: `max-height: 302px` -> `max-height: 200px` (the iPad rung; VOCAB 14.5).
   Measured height stays 80. The box keeps `right: 292px; bottom: 60px` -- measured
   [632,656 256x80], right edge 888, the one case in the set where TB-3's two-line rule
   fires and the legend rises 48px. It does not move, does not change width and does not
   change corner (E3).
7. **Legend comment (lines 279-294), the THIS BOARD sentence.** Current ends: `The 40%
   height cap is 302, measured on the 756px canvas, and the box is shifted left of the
   inspector overlay so it stays inside the remaining canvas width (5.1).` New: `The cap
   is 200 (C6 / VOCAB 14.5), not the 40%-of-canvas 302 it was derived from; the box is
   still shifted left of the inspector overlay so it stays inside the remaining canvas
   width (5.1). This legend is floor item 5 and may not be covered -- but under B1 a
   transient now buys clearance by sliding rather than by rising, which is why the
   confirm above it is anchored to its opener instead of being pushed 51px off it.` Then
   append the standard C2 / C3 / C6 paragraph from Main item 11.
8. **File comment header (lines 22-25).** Add: `Revision 1.8: B4 (the Select neighbors
   confirm gets an opener -- the "All 12,412" scope chip, drawn lit -- and moves from
   [652,559] to [656,417], right edge 892, 8px clear of the inspector under B2's
   shell-boundary constant; its four generations of re-anchoring arithmetic are retired
   with it), B1 / VOCAB 14.2 (a surface narrower than 280 carries an 8px caret instead of
   an edge line), VOCAB 14.4 (a confirm is a pop-out with two verbs, no pin and no close
   X), D4 (the pinned action block caps at four content rows: Radial layout moves into
   More, its ring caption moves up as a departure line, and the Ego network cap becomes a
   280 pop-over stub reading "1,000 of 12,412"), A2 (that visible suffix is what makes
   the move legal -- the value is not silent), C6 (legend cap 302 -> 200).`

## StyleFromAnalysis

File: `StyleFromAnalysis.dc.html`. State: Result / Style. Dataset `ovarian_de_string.tsv`, 318 proteins,
1,104 edges. Style panel open, Groups (Markov clustering, granularity 2.5) layer selected, the granularity
mid-edit with its cost gate pending. Legend measured today: **306px**, four encoded blocks
(Color 124 / Size 49 / Outline 30 / Edge width 49, three 1px rules, 36 of gaps, 15 of box).

1. **C3 cut 2, category counts leave the canvas legend.** Region: the legend's Color block, the six
   `Group N` rows. Current: each row is a `justify-content: space-between` flex holding an inner
   swatch+label group and a trailing `<span style="... color: #7a828e;">118</span>`. New: the count span
   and the inner wrapper both go and the label takes the full width. Rewrite each of the six rows to
   exactly this shape (swatch fill per row: `#e69f00`, `#56b4e9`, `#009e73`, `#f0e442`, `#0072b2`):
   ```html
   <div style="display: flex; align-items: center; gap: 6px; height: 14px; font-size: 11px; line-height: 1.2; color: #d5d7da;">
     <div style="width: 10px; height: 10px; flex: 0 0 auto; border-radius: 50%; background: #e69f00;"></div>
     <span style="flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Group 1</span>
   </div>
   ```
   The six member counts 118 / 71 / 52 / 38 / 24 / 15 are not lost: they render in the groups table, on the
   result card, and in the exported legend (C3, C4). Delete the board comment's claim that a count must be
   in the canvas legend for the export's sake -- the export composes its own.

2. **C3 cut 3, five categorical rows plus Other.** Region: the same Color block. Current: six rows,
   Group 1 through Group 6. New: five rows (Group 1 to Group 5, the five largest) then one Other row in the
   neutral `#6b7480`, which is also the click target for the groups table:
   ```html
   <div title="Open the groups table" style="display: flex; align-items: center; gap: 6px; height: 14px; font-size: 11px; line-height: 1.2; color: #d5d7da; cursor: pointer;">
     <div style="width: 10px; height: 10px; flex: 0 0 auto; border-radius: 50%; background: #6b7480;"></div>
     <span style="flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Other <span style="color: #7a828e;">(1 group, 5% of nodes)</span></span>
   </div>
   ```
   The arithmetic, so it is checkable: the six groups are 118 / 71 / 52 / 38 / 24 / 15 = 318; the five
   largest are 303; Other rolls up one group, 15 nodes, 4.7% -> **5% of nodes**. Do NOT repaint group 6's
   canvas nodes grey. The Other row is a roll-up row, not a colour key -- its text says how many groups it
   rolls up and its click opens the table that lists every one with its own swatch. The canvas keeps its six
   Okabe-Ito colours and the exported legend keeps all six named rows with their counts (C2, C4).

3. **C3 cut 1, state rows: nothing to do, and say so.** Region: the legend. This legend draws no state-row
   block, so cut 1 removes nothing here. Add one clause to the legend comment saying the cut was checked and
   found empty on this board, so a later pass does not look for it.

4. **The 240 cap does NOT fire on this board, and the reason is written down rather than a floor item cut.**
   Region: the legend box, `max-height: 334px`. After items 1-3 this legend still measures **306**: four
   encoded channels, and every line on it is floor (C2's screen obligation names channel, attribute, domain
   endpoints, the median or midpoint, the scale in words and every departure line, and this board carries
   four of each). C6's shortening rule -- "categorical blocks shorten by one row at a time from the smallest
   channel upward" -- would take the Color block to one row plus Other before 240 is reached, which is below
   C3's own five-plus-Other spelling and would leave five distinct canvas colours keyed by one grey row, a
   legend swatch the canvas does not paint (LEGEND-1.8 section 4, last bullet). **Keep `max-height: 334px`
   on this one board** and write this into the legend comment, in these words:
   ```
   THE 240 CAP AND THIS BOARD. Measured after C3's two subtractions this legend is 306, not 240: four
   encoded channels, every line of them floor. Reaching 240 by C6's per-row shortening would leave the
   Color block at one row plus Other while the canvas paints five colours, which is the one thing
   LEGEND-1.8 section 4 forbids. The cap is held at 334 here and the overflow is recorded rather than
   paid for with a floor item; DECISIONS-1.8 C6's "the cap binds nothing today" has exactly one
   measured counter-example and this is it.
   ```

5. **C2, the legend comment gains the two obligations.** Region: the legend comment block. Current: it
   describes one legend. New: append the paragraph below verbatim, so the drafter of the export board and
   any later reader see the split at every legend:
   ```
   TWO OBLIGATIONS (6.10 item 5, as split by DECISIONS-1.8 C2). EXPORT, ABSOLUTE: every exported image
   carries a legend composed from the encoding model -- every channel with its word, attribute, endpoints,
   median or midpoint and scale; twelve categories with counts and the coverage footer; every departure
   line; one row per state drawn in the frame. It is drawn into the image, never captured from this DOM
   overlay, because ScreenshotCapture.ts calls CreateScreenshotAsync on the Babylon scene and cannot see
   an overlay. SCREEN: this box, one block per encoded channel, no counts, no state rows, five categories
   plus Other.
   ```

6. **A6, the door stubs report deviation.** Region: two glyphs. (a) The inspector Source header's gear,
   `title="Advanced"` at `color: #7a828e`. New title `"Advanced parameters"` -- the palette-index name from
   E4 -- and the ink stays `#7a828e`, because no hidden MCL parameter deviates. Add to its comment: "dimmed
   because everything behind it is at its default; it draws `#d5d7da` the moment one is not (A6, VOCAB
   14.1)." (b) The inspector Color section's `title="Values (6)"` door: same clause, ink `#7a828e`. Use
   VOCAB 14.1's two spellings; do not invent a third.

7. **D2, Parameters is the panel's layout-parameters door and takes that name.** Region: the panel's
   `SECTION Parameters` header row, the 24px `title="Advanced"` gear at line ~395. Current: `title="Advanced"`.
   New: `title="Layout parameters"`, ink unchanged at `#7a828e` (Edge length 30 and Pull to center -1.2 are
   ngraph's own defaults, so nothing behind it deviates). This is the same gear-and-pop-out mechanism as the
   Analyze card gear -- two gears in the product, one behaviour (D2) -- and the row stays a door, not a
   collapsed section, because a 6-row schema group over the four-row threshold is what 6.2 routes to a 3a
   pop-out. No row is added and none is removed.

8. **A4 and D2, the Styles library stays a collapsed section and its trailing slot names the active style.**
   Region: the panel's `SECTION Styles` header row, the leading cluster's count span
   `<span style="font-size: 11px; line-height: 1.2; color: #7a828e;">6</span>`. Delete that span. Add, as the
   first child of the header's trailing cluster (before the `Coming` tag), the RT-8 trailing slot from
   VOCAB 14.1:
   ```html
   <span style="flex: 0 0 auto; font-size: 11px; color: #7a828e; white-space: nowrap;">Default</span>
   ```
   `Default` is this board's active style -- it is the row carrying `background: #28364e`. Record in the
   section comment that the library was proposed as a door and refused by A4's discriminator on all three
   counts (it buys no width beyond 256, no survival across a selection change, and nothing below it needs to
   stay operable), so a closed section and a door cost the same row and the door would add a click for
   nothing.

9. **D2, the cost gate is confirmed inline and must not be "fixed" into a pop-out.** Region: the inspector,
   the gate under the Granularity row ("Granularity 3.0 takes about 8 s. Colors still show granularity 2.5."
   with Run and use it / Cancel). No change. Add one line to its comment: "Confirmed by DECISIONS-1.8 D2 and
   VOCAB 14.4: floor item 4 binds the estimate to the control that spends it, so a gate renders inline under
   the row that raised it and never as any floating surface. StyleDiverging drew the identical construction
   as a floating card and is being corrected to this board's form, not the other way round."

10. **D2, Which nodes is confirmed absent.** Region: the inspector. This board draws no Which nodes row and
    that is now the set-wide rule (Rule 7a: the selector matches every node, which is its default).
    StyleDiverging draws four rows for the same selector and loses them. Add to the WHAT IS ABSENT block:
    "and StyleDiverging's four Which nodes rows are deleted in 1.8 for the reason this board already gives."

11. **Show legend: no change, recorded so it is not added twice.** Region: the panel's Canvas section, the
    pressed `title="Show legend (L)"` 24px toggle. D2 lists Show legend among Style's fourteen resident
    controls and says "no Style board draws" it; this board does draw it, as the Canvas section's own
    resident state control rather than as a lone RT-5 row. Leave it exactly as drawn and add that sentence
    to the section comment.

12. **E4, every door on this board joins the palette index.** Region: the file comment. Add one line:
    "Palette index (E4 measure 1): Layout parameters, Advanced parameters, Values table. Each is reachable
    by both its own name and the name of the row that owns it, and each is exactly one click from that row
    with the owning thing present (A3)."

## StyleLibrary

File: `StyleLibrary.dc.html`. State: Loaded, `cat-social-network.json`, the Humans style layer selected,
the Styles section's overflow menu open and the Save as style dialog up over a full-frame scrim.
Legend measured today: **139px**, two blocks (Color: style layers, three rows, no counts; Size: age).

1. **B4, the biggest correction on this board: Save as style stops being a centred modal.** Region: the
   Save as style surface, currently `<div style="position: absolute; left: 0; top: 0; width: 1440px;
   height: 900px; ... background: rgba(13, 17, 23, 0.6); z-index: 20;">` wrapping a 480px card. Current:
   a 3b dialog, scrimmed, centred. New: a **280 activity-panel pop-out at `left: 336px; top: 474px`**,
   panel lane, its top on the Styles section header row's own top; the opener is the header's
   `title="Save as style..."` bookmark button at [295,478 24x24], which stays lit with
   `background: #28364e; color: #4a7ee8`. Delete the scrim div entirely and re-parent the card as a
   sibling of the shell root:
   ```html
   <div style="position: absolute; left: 336px; top: 474px; width: 280px; display: flex; flex-direction: column; background: #1f2428; border: 1px solid #48525c; border-radius: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.45); box-sizing: border-box; overflow: hidden; z-index: 8;">
   ```
   Keep the 32px header ("Save as style" plus the close X), the Name field with SAV-3's destination line,
   the two checkboxes with their info circles, "The skybox image is not saved." and the RT-7 footer with
   Cancel and Save as style in full text. Drop the 480 body padding of 16 to the pop-out's 12, and drop the
   footer from 48 to 40. The board's own head comment already flagged that 6.11's first question refuses a
   dialog here ("Save as style changes no data") and left it "flagged, not decided" -- B4 decides it. Add to
   6.11's worked examples, in the comment: "Save as style / pop-out, 280, from the Styles header bookmark
   button / It names one member of a list and commits nothing the canvas must wait on."

2. **E2, two transients of different classes may not be open at once.** Region: the Styles section overflow
   menu at `left: 267px; top: 510px; width: 200px` holding "Import style..." and "Export style (JSON)".
   Current: drawn open beneath the dialog's scrim. New: **delete it from the drawing.** A pop-out opening in
   a region closes any menu already open in that region rather than dimming it behind a scrim, and the
   Escape ladder already forbids the stacked state. Keep the `title="More"` trigger on the header, drawn
   unpressed (`color: #7a828e`, no `background: #374047`), and keep the menu's two rows written out in full
   in the section comment, which is the 6.8 full-text twin this board already uses elsewhere.

3. **The head comment's "ONE STATE COLLISION" paragraph is retired.** Region: the file comment, the
   paragraph beginning "THE ONE STATE COLLISION, named rather than hidden." Current: it argues that three
   states are drawn at once as a deliberate drafting compromise. New: replace with:
   ```
   ONE STATE, after DECISIONS-1.8 B4 and E2. Save as style is a 280 panel pop-out anchored to the Styles
   header's bookmark button, not a 3b dialog, so there is no scrim and no frozen panel; and the section
   overflow menu is closed, because a pop-out closes any menu open in the same region. The board now
   draws one true state and the 1.7 compromise -- and the proposal to split this into two boards -- is
   withdrawn. 6.11's first question was always the answer: Save as style changes no data.
   ```

4. **B3 and VOCAB 14.2, the pop-out carries a caret.** Region: beside the new pop-out. Add, as its sibling
   so the pop-out's own `overflow: hidden` cannot clip it, a 6px caret on the LEFT edge pointing back at the
   panel. Note the edge: an activity-panel pop-out sits to the RIGHT of the panel, so the edge nearest its
   opener is its LEFT edge -- VOCAB 14.2's snippet comment ("pointing back at the panel") is the spelling to
   follow; DECISIONS-1.8 B3's sentence has the two lanes transposed. Draw it at pop-out top + 16:
   ```html
   <div style="position: absolute; left: 330px; top: 490px; width: 6px; height: 12px; overflow: hidden; z-index: 9;">
     <div style="position: absolute; left: 3px; top: 1px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-left: 1px solid #48525c; border-bottom: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```

5. **E2, no pin on this surface.** Region: the new pop-out's 32px header. Draw the close X and **no pin
   glyph**. The pin is now closed at four comparative surfaces -- the colour and gradient picker, Selection
   statistics with a pin active, the group profile and the AI console -- and a naming surface is none of
   them. Record that in the header's comment.

6. **C3 cuts 1 and 2, checked and empty on this legend.** Region: the legend. The Color block's three rows
   (Base layer, Humans, Hubs) already carry no counts and there is no state-row block, so cuts 1 and 2
   remove nothing here. Add one clause to the legend comment saying both were checked and found empty, so a
   later pass does not go looking.

7. **C3 cut 3, checked and does not fire.** Region: the legend's Color block. Three categorical rows against
   a cap of five, so no Other row is drawn and the coverage footer stays absent. Say so in the comment in
   one clause; the board comment's existing sentence "this legend needs no coverage footer" is correct and
   stays.

8. **C6, the cap.** Region: the legend box. Current: `max-height: 334px`. New: `max-height: 240px`. The
   legend measures 139, so nothing moves; the cap forbids regrowth. Width stays 256, the anchor stays
   bottom-right at the 12px inset, and the bottom stack is untouched.

9. **C2, the legend comment gains the two obligations.** Region: the legend comment. Append the same
   paragraph given in StyleFromAnalysis item 5, verbatim. This board's export legend carries **2 channels**:
   Color (style layers, three rows with their counts) and Size (age, 45 / median 56.5 / 68, sqrt), plus one
   state row for anything drawn in the frame.

10. **D2, verbs to the Arrangement header's overflow.** Region: the panel's Arrangement section, the RT-7
    row holding `title="Keep this arrangement. Writes the current positions into the data and switches the
    layout to Fixed (From file)"`. Current: a resident full-text button. New: delete the row; the verb moves
    into the Arrangement header's `title="More layouts"` overflow, which is renamed `title="More"` and whose
    comment lists, in full text: "More layouts... / Keep this arrangement / Reset to defaults / Start from
    current arrangement". FLOOR-1.9's clause holds -- a menu row keeps the verb's full text, so nothing is
    un-named. **-1 resident row.**

11. **D2 and A4, the Styles header's trailing slot names the active style.** Region: the Styles section
    header. Delete the leading count span `<span style="font-size: 11px; line-height: 1.2; color: #7a828e;">7</span>`.
    Add, as the first child of the trailing cluster before the `Coming` tag:
    ```html
    <span style="flex: 0 0 auto; font-size: 11px; color: #7a828e; white-space: nowrap;">Publication style</span>
    ```
    That is this board's applied entry -- the row the apply report names and the one drawn hovered with the
    SAV-7 triple. Record in the comment that the library was proposed as a door in two independent tracks
    and refused both times by A4's discriminator, and that this slot is what the door stub would have
    carried.

12. **A6, the Parameters door reports its state.** Region: the panel's Parameters section header gear.
    Current title `"Advanced"`. New `title="Layout parameters"`, ink `#7a828e`. This board is right where
    StylePanel is wrong -- it already omits Edge length 30 and Pull to center -1.2 under Rule 7a -- so keep
    the omission and add: "settled by DECISIONS-1.8 D2 in this board's favour; StylePanel draws the two
    defaults and loses them."

13. **Show legend: no change.** Region: the Canvas section's pressed `title="Show legend (L)"` toggle. Same
    clause as StyleFromAnalysis item 11: it is the Canvas section's resident state control, not a lone RT-5
    row, and D2's "no Style board draws it" is answered by this drawing.

14. **E4, palette index.** Region: the file comment. Add: "Palette index (E4 measure 1): Layout parameters,
    Save as style. Both reachable by name and by the name of the row that owns them; both one click from
    that row."

## StyleDiverging

File: `StyleDiverging.dc.html`. State: Style, the Expression layer selected on `ovarian_de_string.tsv`.
Legend measured today: **240px exactly**, three blocks (Color: fold change, diverging, with the clamp line
and the not-measured row, 101 / Size: significance, 49 / Edge width: confidence, 49). No counts, no state
rows. This is the board DECISIONS-1.8 C6 measures the cap against.

1. **C3, all three cuts checked, none fires, and that is the headline.** Region: the legend. No category
   rows, so no counts and no cap; no state-row block. **Nothing is removed.** Add to the legend comment,
   verbatim:
   ```
   C3 CHECKED, NOTHING CUT. This legend has no category counts, no categorical rows and no state rows, so
   all three of DECISIONS-1.8 C3's subtractions find nothing here. It measures 240 with three encoded
   channels and it is the board the 240 cap is measured from: 240 is not a chosen number, it is the
   measured height of a legend that is entirely floor. H's honest headline -- "StyleDiverging 240 -> 240,
   unchanged" -- is this box.
   ```

2. **C6, the cap.** Region: the legend box. Current: `max-height: 334px`. New: `max-height: 240px`. The
   content is 240, so the box is exactly at its cap and nothing clips. Do not change the width (256), the
   anchor (`right: 12px; bottom: 12px`) or the block order.

3. **C2, the two obligations.** Region: the legend comment. Append the paragraph given in StyleFromAnalysis
   item 5, verbatim. This board's export legend carries **3 channels** and every one of this box's lines,
   plus one state row per state drawn in the exported frame -- which is the half of floor item 5 that no
   export has ever received.

4. **D2, the largest change on this board: the numeric ramp goes behind one 280 door.** Region: the
   inspector's `SECTION Color`, rows 2 to 5. Current, five resident pitches: RT-1 attribute chip
   "Fold change"; RT-1 pair Palette "Blue-Orange diverging" | "Missing"; the RT-9 histogram with its 38px
   bars, baseline, 12px domain slider and ticks; the RT-1 triple Domain start | midpoint | Domain end; the
   RT-5 "Clamp outliers" toggle with its trailing "12 nodes". New, four pitches:
   - **Row 1, unchanged:** the RT-1 attribute chip `title="Color by attribute: Fold change (log2FoldChange)"`
     reading "Fold change". Rule 6 makes the mode what the field contains, so the chip is resident.
   - **Row 2:** the Palette field alone at full width (`flex: 1 1 0`), with the trailing 24px slot left
     empty. It stays resident because LEGEND-1.8 section 2 pins the palette name to Style's Palette select
     and the legend body has no other home for it. The Missing-value swatch field leaves this row for the
     pop-out.
   - **Row 3, new, RT-4, and this is the door:**
     ```html
     <div style="display: flex; align-items: center; gap: 8px; height: 32px;">
       <div title="Scale: diverging, midpoint 0, domain -4.2 to 3.8" style="display: flex; align-items: center; gap: 4px; flex: 1 1 0; min-width: 0; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-sizing: border-box; cursor: pointer;">
         <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Diverging, midpoint 0, -4.2 to 3.8</span>
       </div>
       <div title="Ramp options. 3 options changed" style="display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 24px; height: 24px; border-radius: 4px; color: #d5d7da; cursor: pointer; box-sizing: border-box;">
         <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12.5C4.5 12.5 5.5 3.5 8 3.5s3.5 9 6 9"></path></svg>
       </div>
     </div>
     ```
     The curve glyph draws in the **primary** `#d5d7da`, not the dimmed ink, because the domain is hand-set
     and Clamp outliers is on (A6, VOCAB 14.1).
   - **Row 4, the departure line, resident:**
     ```html
     <span style="font-size: 11px; line-height: 1.4; color: #a3a8b1;">clamped at -4.2 and 3.8; 12 nodes beyond the ends</span>
     ```
     Same string as the canvas legend's clamp line, character for character. 6.10's separation clause binds
     a departure to the channel it describes, so it may not go behind the door.
   - **Delete** the RT-9 chart row, the RT-1 domain triple and the RT-5 clamp toggle from the inspector.
   Do NOT draw the pop-out open on this board -- RampPopout (G item 4) is the board that draws it. Write its
   contents into the door's own comment so nothing is lost: Scale; Palette family; Midpoint; Domain over the
   inline histogram with Clamp outliers and its live match count; Missing value; Use values as-is; and
   gradient handle editing **as a section of this pop-out**, never as a second pop-out, because 6.11's
   nesting limit forbids it and A3 states the reader-facing consequence.

5. **D2 and Rule 7a, the Which nodes section is deleted outright.** Region: the inspector's
   `SECTION Which nodes` (header row, the RT-1 field reading "All nodes" with its N badge, the "318 nodes"
   read-back with its "Use as filter" glyph, and the Coming tag). Current: four rows for a selector that
   matches every node. New: **delete the whole section.** The selector is at its default, StyleFromAnalysis
   on the same dataset correctly draws none, and 5.3's own worked example says so. This is the single
   largest row saving on the board and it involves no door at all -- **inspector 18 -> 14 from this alone.**

6. **D2, B4 and VOCAB 14.4: the cost gate stops being a floating card.** Region: the Size cost pop-out at
   `left: 872px; top: 446px; width: 280px` (measured 280x109), its 32px header with `title="Pin this open"`
   and `title="Close (Esc)"`, its sentence and its two verbs. Current: a floating anchored pop-out over the
   canvas. New: **delete the pop-out and its whole comment block, and draw the gate inline** in the
   inspector, directly under the Size binding row that raised it, in StyleFromAnalysis's form:
   ```html
   <div style="display: flex; flex-direction: column; gap: 8px; padding: 4px 0 8px;">
     <span style="font-size: 11px; line-height: 1.4; color: #a3a8b1;">Bridges takes about 40 s. Size still shows Significance <span style="color: #7a828e;">(padj)</span>.</span>
     <div style="display: flex; align-items: center; gap: 8px;">
       <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: #4a7ee8; color: #ffffff; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Run and use it</div>
       <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; color: #a3a8b1; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Cancel</div>
     </div>
   </div>
   ```
   No pin, no close X, no shadow, no anchor arithmetic. VOCAB 14.4 states it in one sentence: "The cost GATE
   is a different thing... floor item 4 binds the estimate to the control that spends it, so a gate renders
   inline under the row that raised it and never as any floating surface at all." B4's row for this board
   gives the corrected anchor [872,470] and then defers to D2/XC in its own last clause -- **D2 is the one
   that lands: there is no floating surface here to anchor.** Keep the applied padj wedge in the dim ink
   while the gate is up, which is the stale encoding the sentence names. Rewrite the R2-M25 paragraph in the
   head comment accordingly.

7. **A6, the Parameters door reports its state.** Region: the panel's Parameters door stub. Current title
   `"Advanced"` (POP-5, POP-13b). New `title="Layout parameters"`, chevron permanently in the closed
   right-pointing form, ink `#7a828e` because nothing behind it deviates. Add VOCAB 14.1's clause to its
   comment.

8. **A4 and D2, the Styles library section and its trailing slot.** Region: the panel's Styles section
   header. Same edit as StyleLibrary item 11: delete the leading count span and add the RT-8 trailing slot
   carrying the active style's own name, using the name of whichever row on this board carries
   `background: #28364e`. If no row is applied, draw no trailing slot (Rule 7a). Record A4's refusal of the
   door in the section comment.

9. **Show legend: no change.** Region: the Canvas section's pressed `title="Show legend (L)"` toggle. Same
   clause as StyleFromAnalysis item 11.

10. **E2, no pin survives on this board.** Region: the file comment. After item 6 this board draws no
    pop-out at all, so it draws no pin. Add: "E2 narrows the pin to four comparative surfaces -- the colour
    and gradient picker, Selection statistics with a pin active, the group profile and the AI console. The
    Size cost surface was none of them and is now not a surface."

11. **E4, palette index.** Region: the file comment. Add: "Palette index (E4 measure 1): Layout parameters,
    Ramp options. The ramp door is one click from the Color section's RT-4 row with the layer selected,
    which is A3's depth obligation measured from the row that owns the property."

## CompareSplit

File: `CompareSplit.dc.html`. State: Result, compare split. `fraud-ring-synthetic.json`, 200 nodes,
612 edges. Two halves of one 66-node window, A = Louvain r=0.5 (4 groups), B = Louvain r=1.5 (11 groups),
acct-4471 selected in both. Legends measured today: **A [canvas x 148, bottom 112, 256x218]**,
**B [canvas x 564, bottom 112, 256x330]**; minimap bottom 12; toolbar centred at bottom 12.
This board spends 548px of legend on 832px of canvas and is the whole of DECISIONS-1.8 C5.

1. **C5, the shared Size block is drawn once, in a strip above the toolbar.** Region: both legends. Current:
   each legend draws an identical `Size: Most connected (Degree centrality)` block, 49px, with the same
   1 / median 6 / 44 stops and the same `sqrt scale` line -- the encoding is identical in both halves, and
   the spec used to acknowledge the duplication by making B's header read "size as A". New: **delete the
   Size block and its preceding 1px `#374047` divider from BOTH legends**, and draw the block once in a new
   shared strip, centred on the canvas rect, riding 12px above the toolbar on the toolbar's own offset
   ladder (the toolbar does not move):
   ```html
   <!-- C5: the shared-channel strip. Size is encoded identically in both halves, so it is drawn once.
        Bottom 60 = 12 (toolbar offset) + 36 (toolbar height) + 12 (gap). Centred on the canvas rect, the
        same centre the toolbar takes, 256 wide so the strip and the legends are one component at one width. -->
   <div style="position: absolute; left: 50%; bottom: 60px; transform: translateX(-50%); width: 256px; display: flex; flex-direction: column; gap: 4px; padding: 6px 8px; border-radius: 4px; background: #1f2428; border: 1px solid #48525c; box-sizing: border-box; z-index: 5;">
     <span style="font-size: 11px; line-height: 1.2; color: #d5d7da;">Size: Most connected <span style="font-weight: 400; font-size: 11px; color: #7a828e;">(Degree centrality)</span></span>
     <div style="display: flex; align-items: center; gap: 8px; height: 16px;">
       <div style="display: flex; align-items: center; gap: 4px;"><svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="#a3a8b1"></circle></svg><span style="font-size: 10px; line-height: 1.2; color: #7a828e;">1</span></div>
       <div style="display: flex; align-items: center; gap: 4px;"><svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="#a3a8b1"></circle></svg><span style="font-size: 10px; line-height: 1.2; color: #7a828e;">median 6</span></div>
       <div style="display: flex; align-items: center; gap: 4px;"><svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#a3a8b1"></circle></svg><span style="font-size: 10px; line-height: 1.2; color: #7a828e;">44</span></div>
     </div>
     <span style="font-size: 10px; line-height: 1.2; color: #7a828e;">sqrt scale</span>
   </div>
   ```
   Measured: the strip is 63 tall (block 49 + 12 padding + 2 border) and spans canvas x 288..544, bottom
   60..123. It clears the minimap (canvas x 12..172, bottom 12..96) by 116px horizontally and sits directly
   over the toolbar's 293..539, which is what makes it read as the toolbar's own line rather than a third
   floating box.

2. **C5, the diff key leaves both legends.** Region: the trailing block of each legend, headed
   `Outline: matched to a different group` with its `Moved 22` row, 31px, plus its preceding 1px divider.
   Current: printed twice, and a third time on the Difference chip at canvas top 48. New: **delete the
   Outline block and its divider from BOTH legends.** The Difference chip already owns it -- it draws the
   grey "Same group 178" and the red-ringed "Moved 22" and carries the full rule on its info circle
   ("Moved: a node whose group in B is matched to a different group in A. Groups are matched by their
   largest shared membership, so a group that only split is not a move.") -- and that chip is the region
   5.1's One fact, one region assigns it to. Floor item 5 is not breached: C5 states the exception in
   its own words, and the exported image of a Compare view carries one composed legend that names both
   halves and carries the diff key (C4). Write that sentence into both legend comments.

3. **C3 cut 2, category counts leave both legends.** Region: legend A's four rows (A1 61, A2 58, A3 47,
   A4 34) and legend B's eleven rows (B1 31 ... B11 6). Current: each row is a `space-between` flex with a
   trailing `#7a828e` count. New: the count span and the inner wrapper go; use the canvas row form given in
   StyleFromAnalysis item 1, with each row's existing swatch fill unchanged. The counts are not lost: card A
   draws "2 of 4" with its members column, card B draws "2 of 11", and the table glyph in each card's action
   row opens the rest; the exported legend carries all of them with counts (C3, C4, C5).

4. **C3 cut 3, legend B caps at five plus Other; legend A does not fire.** Region: legend B's Color block.
   Current: eleven rows B1 to B11. New: five rows B1 to B5 (31, 27, 24, 23, 21), then the Other row from
   StyleFromAnalysis item 2 with `background: #6b7480` and the text `Other (6 groups, 37% of nodes)`.
   Arithmetic, checkable: 31+27+24+23+21+19+16+13+11+9+6 = 200; the five largest are 126; Other rolls up six
   groups, 74 nodes, **37%**. Legend A has four rows against a cap of five, so no Other row is drawn there.
   Do not repaint B6..B11's canvas nodes: the Other row is a roll-up, and its click opens the groups table.

5. **C3 cut 1, state rows: checked and empty.** Region: both legends. Neither draws a state-row block, so
   cut 1 removes nothing. Say so in one clause in each legend comment. Note in the same clause that the
   selection state on this board is named by the inspector header and the status bar, which is why the
   legend never had one.

6. **C6, the cap, and the new bottom-stack arithmetic.** Region: both legend boxes. Current:
   `max-height: 334px`, both at `bottom: 112px`. New: `max-height: 240px` on both, and both move to
   **`bottom: 135px`**. The arithmetic, measured rather than assumed: after items 1 to 4 legend A is
   **112 tall** (View A 12 + Color 79 + one 6px gap + 15 of box) and legend B is **144 tall**
   (View B 12 + Color 111 + one 6px gap + 15 of box); the shared strip's top edge is 123 above the canvas
   bottom, so the legends' bottom edge is 123 + 12 = 135. Legend A stays at `left: 148px` (canvas
   coordinates) and legend B at `right: 12px`. The minimap stays at `bottom: 12px` and the toolbar at
   `bottom: 12px`; nothing else on the bottom stack moves. Two legends totalling 548 become 256 plus a 63px
   shared strip -- **319, a 42% cut** -- and the "Legend, view B (size as A)" header form and the Compare
   counts exception both disappear from the vocabulary.

7. **The R2-M07 paragraph is rewritten.** Region: the file comment, the paragraph beginning "R2-M07, the
   legend width." Current: it explains the raised baseline at bottom 112 as the fit of two 240-wide legends
   beside the minimap. New: keep the width argument and replace the baseline arithmetic:
   ```
   1.8, C5 and C3. Each half now draws only the channels whose encoding DIFFERS between the halves --
   Color, and nothing else. Size is identical in both and is drawn once, in the shared strip 12px above
   the toolbar; the diff key is the Difference chip's and is not repeated. Legend A falls 218 -> 112,
   legend B 330 -> 144, and the two plus the 63px strip are 319 against 548. The raised baseline goes
   112 -> 135, which is the strip's top edge plus the 12px overlay inset; the minimap and the toolbar
   keep bottom 12 and nothing is shrunk or hidden.
   ```

8. **C2, the two obligations, with this board's own clause.** Region: both legend comments. Append the
   paragraph from StyleFromAnalysis item 5, and add one sentence specific to Compare: "The exported image of
   a Compare view carries ONE composed legend that names both halves, draws each half's Color block in full
   with twelve categories and counts, draws the shared Size block once, and carries the diff key -- because
   a static figure has no Difference chip (C5, C4)."

9. **Rule 7a on the cards: checked, and it does not fire here.** Region: the Analyze panel's two result
   cards. D3 finds AnalyzePanel and AnalyzeSweep drawing a Method select under a card already titled with
   the method; this board's cards are on the Results tab and draw no Method or Scope select at all, so there
   is nothing to delete. Record it in one line so a later pass does not go looking.

10. **A4, the run-record Details doors are confirmed.** Region: both cards' one-line run records with their
    `title="Details"` chevrons opening a 360 pop-out at `left: 336px`, neither drawn open. No change. Add
    one clause: "confirmed under A3's depth obligation -- one click from the row that owns the record, with
    the run present -- and under A4, because a 360 record buys width beyond the 256px band."

11. **E4, palette index.** Region: the file comment. Add: "Palette index (E4 measure 1): Run record. The
    only door on this board."

## MultiSelection

File: `MultiSelection.dc.html`. State: Selected, `fraud-ring-synthetic`, seven nodes and four edges from a
marquee, Explore panel open, inspector with pinned card A (acct-4471) and the Selection statistics pop-out
drawn open. Legend measured today: **182px** (Color: node type, four rows with counts, 79 / Size, 49 /
state block "Selected", 13). Pop-out measured at **[792,412 360x238]**.

1. **B4, the pop-out returns to its opener's row.** Region: the Selection statistics pop-out,
   `position: absolute; left: 792px; top: 412px; width: 360px; max-height: 456px`. Current: 229px below the
   row that opened it. New: `top: 183px`, which is the opener row's own top -- the Selection statistics RT-8
   door row at [1177,183 255x32]. B4 measured it: "lane correct, 229px below the opener, with nothing
   forcing it -- anchored at 183 it would end at 421 and the legend does not start until 682". Left stays
   792 (right edge 1152, 8px clear of the inspector's 1160). Also set `max-height: 418px`, half the
   inspector's 836px region, which is B1's second height cap; the drawn body is 238, so nothing clips.

2. **The R2-M16b paragraph is withdrawn.** Region: the file comment, the paragraph "(R2-M16b) The 360
   pop-out dropped from top 183 to top 412 so it stops covering the selection it describes." Current: it
   justifies the drop. New: replace with:
   ```
   (R2-M16b, withdrawn by DECISIONS-1.8 B4.) The pop-out returns to top 183, its opener row's own top.
   B1's rule is that a transient surface never chooses its own position; it inherits one on both axes,
   and clearance is bought by sliding along the shared-edge axis only when something forces it. Nothing
   does here: at 183 the surface ends at 421 and the legend's top is 708. The 1.7 drop was taste.
   ```

3. **B3 and VOCAB 14.2, the pop-out carries a caret.** Region: beside the pop-out. Add, as its sibling so
   the pop-out's own `overflow: hidden` cannot clip it, a 6px caret on the pop-out's **right** edge -- the
   edge nearest its opener, because an inspector pop-out sits to the LEFT of the inspector. (VOCAB 14.2's
   snippet comment names the edge correctly by its relation to the opener; DECISIONS-1.8 B3's sentence has
   the two lanes transposed. Mirror the snippet: `right`/`top` borders instead of `left`/`bottom`.)
   ```html
   <div style="position: absolute; left: 1152px; top: 199px; width: 6px; height: 12px; overflow: hidden; z-index: 9;">
     <div style="position: absolute; right: 3px; top: 1px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-right: 1px solid #48525c; border-top: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```
   Top 199 = the pop-out's top 183 plus VOCAB 14.2's own 16. Do not recompute it per board: the caret ships
   with the shell.

4. **E2, the pin STAYS on this one.** Region: the pop-out header's `title="Pin this open"` glyph. No change.
   E2 closes the pin at four comparative surfaces and this is one of them by name -- "Selection statistics
   with a pin active" -- and card A is pinned on this board, so the condition holds. Add that sentence to
   the header's comment, because every other pop-out in the set loses its pin in this revision and a later
   pass will otherwise sweep this one too.

5. **C3 cut 1, the state-row block leaves the legend.** Region: the legend's trailing block -- the white-ring
   swatch and the word `Selected` -- and the 1px `#374047` divider above it. Current: 13px of block plus 1px
   of rule plus 12px of container gap. New: **delete both.** The state is already named by the inspector
   header ("Selection / 7 nodes, 4 edges") and by the status bar ("38 selected" slot on this board reads
   "7 nodes, 4 edges"), which is where 5.1's One fact, one region puts it. It renders in the exported
   legend, which has no inspector and no status bar, and in Help's "What the marks mean".

6. **C3 cut 2, category counts leave the legend.** Region: the Color block's four rows. Current:
   `Accounts 96`, `Devices 48`, `Phone numbers 34`, `Merchants 22`, each a `space-between` flex with a
   trailing `#7a828e` count. New: the canvas row form from StyleFromAnalysis item 1, swatch fills unchanged
   (`#4a7ee8`, `#33bfd7`, `#61d095`, `#f7b731`). The counts render in the groups table, the Schema table and
   the exported legend. Note in the comment that this also removes the inspector's reading sentence's
   word-for-word twin, which C3 names as one of the two places the duplication concentrates.

7. **C3 cut 3, checked and does not fire.** Region: the Color block. Four categorical rows against a cap of
   five, so no Other row and no coverage footer. One clause in the comment.

8. **C6, the cap.** Region: the legend box. `max-height: 334px` -> `max-height: 240px`. Measured after items
   5 and 6 the legend is **156** (Color 79 + rule 1 + Size 49 + one 6px gap + 15 of box... 79+1+49 = 129,
   two gaps 12, box 15 = 156), down from 182. Its top edge moves from y 682 to y 708. Nothing else on the
   canvas moves: the minimap keeps `left: 12px; bottom: 12px`, the toolbar keeps `bottom: 12px`, and TB-3's
   two-line rule still does not fire (bar canvas x 293..539, minimap ends 172, legend begins 660).

9. **C2, the two obligations.** Region: the legend comment. Append the paragraph from StyleFromAnalysis
   item 5. This board's export legend carries **2 channels** -- Color: node type with all four categories
   and their counts, Size: Most connected 1 / median 6 / 44 sqrt -- plus **one state row, Selected**, drawn
   with its colour-agnostic white ring, because a static figure has no inspector header to name it.

10. **D4, the Selection actions section is deleted.** Region: the panel, the whole `Selection actions`
    section: (a) the section header row with its chevron; (b) the RT-7 row reading `7 nodes, 4 edges` with
    its four 24px glyphs (Invert selection, Select nodes matching the filter, Select edges between selected,
    Select largest connected part); (c) the `Select neighbors` + `Coming` row below it. Current: three rows
    duplicating the Select split button two sections above, and printing "7 nodes, 4 edges" a third time
    against the inspector header and the status bar. New: **delete all three rows.** The three live verbs --
    Select nodes matching the filter, Select edges between selected, Select largest connected part -- join
    the **Select split button's** menu, and Select neighbors joins it too, keeping its full text and its
    Coming tag (FLOOR-1.9). Invert selection is already in that menu. Write the whole menu list into the
    split button's comment, which is the 6.8 full-text twin this board already uses.

11. **D4, Around the selection stops being an Explore section.** Region: the panel's `Around the selection`
    header row with its `Coming` tag. Current: a one-row section. New: **delete the row.** 5.3's own
    sentence assigns selection-scoped actions to the inspector, and the ego network's Hops and Max nodes
    leave the tier-3 dialog for a **280 pop-over on the inspector's Ego network action** -- 6.11's question 1
    is a no, nothing commits, and the canvas must stay touchable to see the size preview and the ring chip.
    On this board Ego network sits inside the inspector action block's More menu, so nothing is drawn; record
    the new destination in that menu's full-text listing. **Items 10 and 11 together are the board's
    17 -> 13 resident rows (H).**

12. **D4, the inspector action block caps at four rows.** Region: the pinned action block at the foot of the
    inspector. Current: eight rows -- (1) Zoom to selection | Show in table, (2) Style selection + "new
    layer", (3) Filter to selection, (4) Save selection as set..., (5) Clear selection, (6) Simulate
    removing (7) + Coming, (7) Remove selected + Coming, (8) More. New: **four rows**, in REGISTER-1.5
    section 12.1's frozen order:
    - row 1: `Zoom to selection` | `Show in table` (unchanged)
    - row 2: `Style selection` + the dimmed `new layer` (unchanged)
    - row 3: `Filter to selection` (unchanged)
    - row 4: `Save selection as set...` on the left, `More` right-aligned on the same row as a borderless
      subtle button -- the shape ExplorerExpert already draws
    Delete rows 5, 6 and 7. Their verbs move into More **keeping their full text, their scope and their
    Coming tags**: Clear selection (Esc) / Simulate removing (7) [Coming] / Remove selected (Delete)
    [Coming], joining the Copy ids, Select neighbors (Shift+E, Coming), Invert selection (I), Save as
    subgraph... and Expand neighbors of all (Coming) already listed there. What may never move into More,
    and is not being moved: any cost estimate and any departure line (floor item 4 binds an estimate to the
    control that spends it). Update the More trigger's title, which is this board's mandatory non-hover twin.

13. **A6, the Selection statistics door reports its state.** Region: the RT-8 door row at [1177,183],
    `title="Selection statistics. 4 rows, compared with acct-4471 and the whole graph"`. No text change; add
    to its comment that its chevron stays permanently in the closed right-pointing form and that a door glyph
    draws dimmed when everything behind it is at its default and primary when anything is not (A6, VOCAB
    14.1).

14. **A4, why this one IS a door, recorded.** Region: the Selection statistics section comment. Add: "A4's
    discriminator confirms the split: an A / B / Graph / Delta table does not fit the 256px band, so the door
    buys width, which a collapsed section cannot. The two shared-attribute rows stay inline for the opposite
    reason -- they are the user's own attribute names and values, a floor-7 scan surface, and a scan surface
    may not go behind a door."

15. **E4, palette index.** Region: the file comment. Add: "Palette index (E4 measure 1): Selection
    statistics, Ego network. Both one click from the row that owns them."

## HistoryPopover

File: `HistoryPopover.dc.html`. State: Result, `fraud-ring-synthetic`, the Undo split button's caret half
active and the History pop-out open, "Ran Groups (Louvain, r=1.0)" hovered so the canvas previews that
earlier point. Legend measured today: **120px** -- one 12px `preview of 14:12` line, one Size block (49),
one rule, and a 26px footer "At the current point: Color: Groups (Communities, Louvain), 7 groups".
Pop-out measured at **[554,44 360x446]**; preview banner at [540,704 407x28] i.e. bottom 144.

1. **B4, the pop-out hangs from the top bar's own bottom edge.** Region: the History pop-out,
   `position: absolute; left: 554px; top: 44px`. Current: `top: 44px`, a 4px gap. New: **`top: 40px`**.
   B4: "Anchor box is the whole split button, so left 554 is correct; only the gap changes: [554,40 360x446],
   top on the top bar's own bottom edge." The anchor box is the whole Undo split button (x 554 to 595), not
   its 16px caret half -- B1's clause that "the anchor box is the opener's smallest focusable ancestor that
   draws as one control" -- so the left edge line at 554 was already right and stays. Escape closes the
   pop-out and returns focus to the caret half; write that into the header comment.

2. **No caret on this surface, and the reason.** Region: the pop-out. Do **not** add VOCAB 14.2's caret. At
   `top: 40` the surface touches the bar it hangs from, so there is no gap to draw one in, and B1's shared
   edge line -- the pop-out's left 554 on the button's left 554 -- is the whole tether. Say so in one clause
   in the header comment so a later pass does not add a caret that would overlap the top bar.

3. **B1's second height cap does not bind here, and the reason is recorded.** Region: the pop-out's
   `max-height: 804px`. No change. B1 caps a pop-out at half its owning region "so the flip is always
   available"; a top-bar pop-out opens down from the bar's own bottom edge and has no flip -- there is
   nothing above the top bar -- so the binding cap is 6.11's region height minus 32, which is the 804
   already drawn. Write that sentence into the pop-out comment.

4. **E2, the pin comes off.** Region: the pop-out header's `title="Pin this open"` 24px glyph. Current: a
   pin between the "12 entries, 6 undone" state line and the close X. New: **delete the glyph.** E2 closes
   the pin at four comparative surfaces -- the colour and gradient picker, Selection statistics with a pin
   active, the group profile and the AI console -- and History is none of them: "a pop-out whose content is
   the parameters of the row that opened it has nothing to hold still, and pinning it produces a stale panel
   that lies." Rewrite the R2-M24 paragraph's sentence about the 32px header contract to list the surface's
   own name, the dimmed state line and the close X, and nothing else. The header gains 24px of width for the
   state line, which nothing else needs.

5. **C3 cut 1, the preview line leaves the legend.** Region: the legend's first child,
   `<span style="font-size: 10px; line-height: 1.2; color: #5b8ff9;">preview of 14:12</span>`. Current: a
   12px state line at the head of the legend. New: **delete it.** The preview banner 12px above the legend
   already reads "Previewing 14:12, Ran Groups (Louvain), 2 steps back" with a Restore button, and that
   banner is the region 5.1's One fact, one region assigns the preview to. This is C3 cut 1 in its own
   terms: app chrome, constant across every dataset, caused by an action the reader just performed.

6. **C3 cut 1, the current-point footer leaves the legend, and the banner takes its sentence.** Region: the
   legend's trailing 26px line "At the current point: Color: Groups (Communities, Louvain), 7 groups" and
   the 1px `#374047` rule above it. Current: the legend names a channel the drawn frame does not paint --
   the preview shows the point before Groups was encoded, so every node carries the single default colour.
   New: **delete the line and its rule**, and extend the banner's sentence so the fact stays in the region
   that owns it:
   ```html
   <span style="font-size: 11px; line-height: 1.2; color: #d5d7da;">Previewing 14:12, Ran Groups (Louvain), 2 steps back -- colors are not encoded at this point</span>
   ```
   LEGEND-1.8 section 8 is the rule: no block for an unencoded channel. The current point's Color: Groups
   encoding is named by the Analyze panel's Groups result card and by the History row itself, and it returns
   to the legend the moment the hover ends or Restore is pressed. The banner's rect grows from 407 to about
   470 and stays centred; it is still 12px clear of the legend below it after item 8 shortens that legend.

7. **C3 cuts 2 and 3, checked and empty.** Region: the legend. There is no categorical block on this board,
   so neither the counts cut nor the five-plus-Other cap has anything to act on. One clause in the comment.

8. **C6, the cap, and the banner's new offset.** Region: the legend box. `max-height: 334px` ->
   `max-height: 240px`. Measured after items 5 and 6 the legend is the Size block alone -- 49 of content and
   14 of box, so **the `min-height: 80px` floor decides it and the box renders at 80**, down from 120. Its
   top edge moves from y 744 to y 784. The preview banner's offset therefore recomputes: 12 (legend inset)
   + 80 (legend height) + 12 (gap) = **`bottom: 104px`**, replacing the 144 the 1.10 pass derived from a
   120px legend. Vertical only -- the banner stays centred on the canvas. Update both the banner's style and
   the 1.10 paragraph in its comment that shows the arithmetic.

9. **C2, the two obligations.** Region: the legend comment. Append the paragraph from StyleFromAnalysis item
   5. This board's export legend carries **1 channel** in the previewed frame -- Size: Most connected,
   1 / median 6 / 44, sqrt -- and no Color block, because the frame being exported is the previewed one; and
   it carries no state rows, because none is drawn in this frame. Say that explicitly: the export legend is
   composed from what the exported frame encodes, not from what the app knows.

10. **A4, History stays inline and Recipes stays a collapsed section.** Region: the panel's History section
    (expanded, filtered to Runs only, header "12 entries, 10 hidden") and the Recipes library section below
    it. **No change to either.** Add to their comments: "D3 confirms History inline -- 6.11 already names it
    in the refused list -- and A3 forbids by name the Advanced parameter block behind a History door. A4
    confirms Recipes as a collapsed RT-8 section rather than a door: it buys no width beyond 256, no survival
    across a selection change and nothing below it needs to stay operable, so a closed section and a door
    cost the same row and the door adds a click for nothing. Its trailing slot carries the recipe count, and
    the resident + stays under Rule 7b's carve-out."

11. **A6, the run-record door reports its state.** Region: the inspector's one-line run record
    ("Normalized, no endpoints, all 200 nodes") and its `title="Details"` chevron, which opens the 360
    pop-out at `left: 792px` and is drawn closed. No text change; add VOCAB 14.1's clause to its comment and
    the A3 line: "one click from the row that owns the record, with the run present, which is the depth
    obligation measured the way A3 says to measure it."

12. **E4, palette index.** Region: the file comment. Add: "Palette index (E4 measure 1): Run record. History
    itself is not a door -- it is a top-bar pop-out with its own opener and its own binding."

## AnalyzeSweep

File: `AnalyzeSweep.dc.html`. State: Result. `fraud-ring-synthetic.json`, 200 nodes, 612 edges. Analyze
panel on the Run tab with a Groups card and the Advanced door closed; a pinned Results section holding the
Sweep summary card with its three runs; the inspector showing the Sweep summary result view. Legend
measured today: **203px** (Color: Groups, seven rows with counts, 127 / Size, 49). D3 calls this board's
triple rendering of one result body the correction that matters here.

1. **C3 cut 2, category counts leave the legend.** Region: the legend's Color block, the seven `Group N`
   rows with their trailing counts 41 / 38 / 33 / 29 / 24 / 20 / 15. New: the canvas row form from
   StyleFromAnalysis item 1, swatch fills unchanged (`#4a7ee8`, `#33bfd7`, `#f7b731`, `#61d095`, `#c084fc`).
   The counts render on the Sweep summary card, in the groups table and in the exported legend. This board
   is also the one C3 names for the scrub cost: after the cut the legend is scrub-invariant and 5.3's
   per-step time summary stops recomputing its counts on every scrub. Put that sentence in the comment.

2. **C3 cut 3, seven rows cap to five plus Other.** Region: the same Color block. Current: seven rows. New:
   five rows (Group 1 to Group 5: 41, 38, 33, 29, 24), then the Other row from StyleFromAnalysis item 2 with
   `background: #6b7480` and the text `Other (2 groups, 18% of nodes)`. Arithmetic, checkable:
   41+38+33+29+24+20+15 = 200; the five largest are 165; Other rolls up two groups, 35 nodes, 17.5% ->
   **18%**. The canvas keeps all seven colours; the Other row is a roll-up and its click opens the groups
   table.

3. **C3 cut 1, state rows: checked and empty.** Region: the legend. No state-row block is drawn. One clause
   in the comment.

4. **C6, the cap.** Region: the legend box. `max-height: 334px` -> `max-height: 240px`. Measured after items
   1 and 2 the legend is **187** (Color 111 + rule 1 + Size 49 + two 6px gaps + 15 of box), down from 203;
   its top edge moves from y 661 to y 677. The minimap and the toolbar do not move; TB-3's two-line rule
   still does not fire.

5. **C2, the two obligations.** Region: the legend comment. Append the paragraph from StyleFromAnalysis item
   5. This board's export legend carries **2 channels** -- Color: Groups (Communities, Louvain) with all
   seven groups and their counts, Size: Most connected 1 / median 6 / 44, sqrt -- plus one state row per
   state drawn in the exported frame.

6. **D3, Rule 7a on the run card: the Method and Scope pair is deleted.** Region: the Run tab's Groups card,
   the RT-1 pair row holding `title="Method: Louvain, or Label propagation"` reading **Louvain** and
   `title="Scope: visible, 200 of 200 nodes"` reading **Visible (200)**. Current: both sit under a card
   already titled "Groups / Communities (Louvain)". New: **delete the whole 32px pair row.** Both fields are
   at their defaults and both are restated by the card title on the same screen; Rule 7a and Rule 8 each
   delete them independently. Method returns as a top-level control the moment it deviates -- W04's decision
   point is which community algorithm, and W21 phase 1 wants MCL -- so this is a rendering rule, not a tier
   change; write that into the card comment so nobody reads it as a demotion.

7. **The Advanced gear moves to the card title row and keeps its primary ink.** Region: the same card. The
   gear deleted with the pair row in item 6 must not be lost: move
   `title="Advanced parameters. Run as sweep is on"` with its `color: #4a7ee8` into the **card title row's**
   trailing slot, right-aligned after the info circle. It keeps the primary ink because a hidden option
   deviates -- Resolution is swept over three values rather than left at 1.0 -- which is A6's stub obligation
   and VOCAB 14.1's second spelling. The card's own RT-7 row `3 runs | Run sweep` does **not** move: floor
   item 4 keeps the estimate and the verb at the control they belong to. **Card 1 goes from four rows to
   three.**

8. **D3, the sweep run table moves behind a door in the panel card.** Region: the Sweep summary card's RT-6
   block -- the `resolution | groups` column captions and the three rows 0.5 / 4, 1.0 / 7 (with the
   paintbrush state glyph), 1.5 / 11. Current: a squeezed table that has already had to drop the modularity
   column to fit, which is how a table announces it is in the wrong band. New: **delete the caption row and
   the three run rows** and put in their place one RT-8 door stub, using VOCAB 14.1's RT-8 spelling:
   ```html
   <div title="Sweep runs. 3 runs, 4 to 11 groups" style="display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 8px 0 0; box-sizing: border-box; cursor: pointer;">
     <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><polyline points="6,3.5 11,8 6,12.5"></polyline></svg>
     <span style="flex: 1 1 auto; min-width: 0; font-size: 11px; font-weight: 500; color: #d5d7da; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Runs</span>
     <span style="flex: 0 0 auto; font-size: 11px; color: #7a828e; white-space: nowrap;">3</span>
   </div>
   ```
   The chevron stays permanently in the closed right-pointing form. The card keeps, in this order: title
   (with the Advanced gear from item 7), the reading, the one-line run record with its Details chevron, this
   Runs door, and the applied state row with `Groups (resolution 1.0)` and Change encoding. That is D3's
   sentence exactly. The paintbrush that marked which run the canvas reads does not vanish: the applied row
   below already names `Groups (resolution 1.0)` and the canvas result chip prints it again.

9. **D3, the same table and the agreement block leave the inspector for the 480 pop-out.** Region: the
   inspector, the RT-8 `Runs` section with its three-column table (Resolution | Groups | Modularity, three
   rows plus the sparkline column) and the whole RT-9 `Agreement between runs` block (0.5 vs 1.0 0.81 /
   1.0 vs 1.5 0.64 / 0.5 vs 1.5 0.72). Current: resident, which is the second and third rendering of one
   result body and breaks "One result body renders on screen at a time". New: **delete the table rows, the
   column captions and the agreement block**, and turn the `Runs` RT-8 header into a door of the same shape
   as item 8, trailing slot `3`, opening the **480 inspector pop-out** 6.11's worked-examples table already
   specifies -- right edge 1152, so `left: 672px`. It is **not drawn open** on this board. Write the
   pop-out's contents into the door's comment: the three runs with Resolution, Groups and Modularity and the
   sparkline, then the pairwise agreement block.
   **POP-12c is reversed and must be said so:** the 1.7 audit called this "neutral, an audit and not a
   change" and left both resident; D3 overturns it, on the room test and on MIN-6. Replace the POP-12c
   paragraph in the head comment with that sentence.

10. **B4's multi-opener rule, applied.** Region: both door comments from items 8 and 9. Two openers now reach
    one surface. Add, verbatim: "A pop-out reachable from more than one opener is anchored to the opener that
    was used, and its lane follows that opener's region (B4): from the panel card it opens right at
    `left: 336px`; from the inspector it opens left at `left: 672px` at the 480 rung. The palette route,
    which has no on-screen opener, opens it in the inspector's lane and lights that row."

11. **A6, the two run-record doors report their state.** Region: the panel card's and the inspector's
    one-line run records, both reading "Louvain, seed 42, 20 pass cap, 200 nodes", each with a
    `title="Details"` chevron opening a 360 pop-out (panel at `left: 336px`, inspector at `left: 792px`),
    neither drawn open. No text change; add VOCAB 14.1's dimmed/primary clause and A3's depth sentence to
    both comments.

12. **D3, the two Analyze refusals recorded so a compaction pass does not "improve" them.** Region: the file
    comment. Add: "Analyze is already the model this revision asks the other activities to copy, and two
    things on it must not move: Metric histograms stays inline, because W23 phase 2 is a scan across five
    distributions and a reader comparing five cannot open five doors (A4); and the per-card Advanced gear
    with its pinnable fields is the pattern Style is now being made to copy (D2). Neither is drawn on this
    board, and both are recorded here because this is the sweep board a later pass will reach for."

13. **E4, palette index.** Region: the file comment. Add: "Palette index (E4 measure 1): Advanced
    parameters, Sweep runs, Run record. Each is one click from the row that owns it with the run present
    (A3), and no door on this board sits behind another door."

## FilterBuilderExpert

File: `FilterBuilderExpert.dc.html`. State: Selected. `ovarian_de_string.tsv`, 318 proteins. Explore open,
Filter builder open on Nodes with three rules and one "Any of" group, 38 nodes selected, the Confidence
rule's 360 pop-out drawn open at [336,277] and the Expression door focus-ringed. Legend measured today:
**89px** -- one Size block (49) and a state block holding `Selected` (13).

1. **B5, the anchor is already right, and it is cited by pixel so a later pass does not move it.** Region:
   the rule pop-out, `position: absolute; left: 336px; top: 277px; width: 360px`. No change to left or top.
   Add to the ANCHOR AND CLEARANCES comment: "B5 records this board as one of the five already correct --
   top 277 on the opener row's 277, panel lane 336, 8px clear of the panel's 328 edge -- and cites it by
   pixel in 6.11's Anchor paragraph so the rule has geometry attached."

2. **B3 and VOCAB 14.2, the pop-out carries a caret.** Region: beside the pop-out. Add, as its sibling so
   the pop-out's own `overflow: hidden` cannot clip it, VOCAB 14.2's activity-panel caret -- the 6px caret on
   the pop-out's **left** edge, the edge nearest the panel it belongs to:
   ```html
   <div style="position: absolute; left: 330px; top: 293px; width: 6px; height: 12px; overflow: hidden; z-index: 9;">
     <div style="position: absolute; left: 3px; top: 1px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-left: 1px solid #48525c; border-bottom: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```
   Top 293 = the pop-out's 277 plus VOCAB 14.2's own 16. The caret is the second mark of the tether, beside
   the `#28364e` selected-row fill the opener already carries; B3 exists because a lit row 362px away is not
   a visible relationship.

3. **E2, the pin comes off the rule pop-out.** Region: the pop-out header's `title="Pin this open"` 24px
   glyph, beside the close X. New: **delete the glyph.** E2's closed set of four -- the colour and gradient
   picker, Selection statistics with a pin active, the group profile, the AI console -- does not include a
   rule editor, and E2's reason is exactly this surface: "a pop-out whose content is the parameters of the
   row that opened it has nothing to hold still, and pinning it produces a stale panel that lies." The board
   comment's closing paragraph already argues that a pinned rule pop-out cannot coexist with a second under
   Multiplicity; replace that argument with E2's, which is stronger and shorter: the pin was never legal here.

4. **E2, the pin comes off the Expression pop-out's specification too.** Region: the Filter builder section
   header's comment, the line describing the expression pop-out's header as
   `header 32: "Expression"  JMESPath          [pin: Pin this open] [X: Close (Esc)]`. New: delete the pin
   from that line, leaving `header 32: "Expression"  JMESPath          [X: Close (Esc)]`. The pop-out is not
   drawn open, so this is a comment-only edit -- and it is the edit that stops the next drafter from drawing
   a pin.

5. **C3 cut 1, the state-row block leaves the legend.** Region: the legend's trailing block -- the white-ring
   swatch and the word `Selected` -- and the 1px `#374047` rule above it. New: **delete both.** The selection
   is named by the inspector header ("Selection / 38 of 318"), by the reading ("22 proteins match; 16 more
   are their neighbors."), by the filter strip and by the status bar ("38 selected (+16)"), which is where
   5.1's One fact, one region puts it. It renders in the exported legend and in Help's "What the marks mean".

6. **C3 cuts 2 and 3, checked and empty.** Region: the legend. There is no categorical block on this board,
   so neither the counts cut nor the five-plus-Other cap acts. One clause in the comment.

7. **C6, the cap, and the min-height floor.** Region: the legend box. `max-height: 334px` ->
   `max-height: 240px`. After item 5 the content is the Size block alone -- 49 plus 14 of box, so
   **`min-height: 80px` decides it and the box renders at 80**, down from 89. Its top edge moves from y 775
   to y 784. The rule pop-out's bottom is 494, so it is 290px clear either way; the minimap and the toolbar
   do not move.

8. **C2, the two obligations.** Region: the legend comment. Append the paragraph from StyleFromAnalysis
   item 5. This board's export legend carries **1 channel** -- Size: Most connected, 1 / median 5 / 41,
   sqrt -- plus **one state row, Selected**, and, because a filter is live in the frame, the `Matches filter`
   state row too, both with their colour-agnostic swatches, because a static figure has no filter strip and
   no status bar.

9. **A5, one control at two scopes, and it licenses what this board already draws.** Region: the rule rows
   and the pop-out. No change. Add to the pop-out comment: "A5 licenses a control having two homes when it
   applies at two scopes, and it names this case: a per-rule match count stays in the rule row while the rule
   editor is per member of the list the panel already shows. The 597 that stays on the rule row is not a
   hygiene failure and may not be deduplicated by a later compaction pass -- 5.1's One fact, one region
   forbids the same FACT in two regions, and A5 licenses the same CONTROL at two scopes."

10. **A4, why the rule editor is a door and the Attribute profile is not.** Region: the section comments.
    Add: "A4's discriminator, both directions. The rule editor is a door because it buys width beyond the
    256px band -- the combined_score histogram cannot be drawn at 32px -- and because it leaves the rows
    below operable while it is open. The inspector's Attribute profile is not, and stays inline: it is a scan
    surface across five attributes, a reader comparing five cannot open five doors, and it is the user's own
    strings, which is floor item 7."

11. **D4, the Filter builder's zero-rule form recorded, though it does not fire here.** Region: the Filter
    builder section comment. Add: "At zero rules this section is one 32px row with a plus: 'Match all' at
    zero rules is a default that Rule 7a does not draw and that contradicts 5.3's own condition, and
    'N of N nodes would match' is the null statement 6.2 forbids. Three rules are live here, so both rows
    are drawn; the empty form is recorded so the boards that draw it get the same answer."

12. **E4, palette index.** Region: the file comment. Add: "Palette index (E4 measure 1): Filter expression,
    and the rule editor by the name of the rule it edits. Both one click from the row that owns them, with
    the rule present; the create click for a rule that does not exist yet is charged to 6.1 and not to A3's
    depth obligation."

## CategoryTable

File: `CategoryTable.dc.html`. State: Result. `ovarian_de_string.tsv`, 318 nodes, 1,104 edges, coloured by
a Tight clusters (Markov clustering, MCL) run of six groups with the Okabe-Ito palette; the imported
"Categories for group 3" table selected, its 360 pop-out drawn open at [792,300]. Legend measured today:
**201px** (Color: Tight clusters, six rows with counts and a two-line header, 124 / Size, 49).

1. **C3 cut 2, category counts leave the legend -- and this board's own argument for keeping them is
   answered.** Region: the legend's Color block, the six `Group N` rows with counts 118 / 71 / 52 / 38 / 24 /
   15. New: the canvas row form from StyleFromAnalysis item 1, swatch fills unchanged (`#e69f00`, `#56b4e9`,
   `#009e73`, `#f0e442`, `#0072b2`). Then **delete the "THIRD" paragraph of the R2 pass in the head
   comment** -- "each legend row now prints its member count. Floor 5 puts the legend inside the exported
   image, where the Analyze panel that also lists the six sizes does not exist" -- and replace it with:
   ```
   THIRD, superseded by DECISIONS-1.8 C3 and C4. The counts came off the canvas legend. The argument for
   adding them was the export, and the export is now served properly: ScreenshotCapture.ts takes a
   Babylon scene capture and never saw this DOM overlay at all, so the exported image has never carried
   this legend. The composed export legend carries all six groups with their counts and the coverage
   footer; the canvas legend carries five plus Other and no counts.
   ```
   That paragraph is the single clearest statement in the set of why the legend track had to split, so it is
   worth writing out in full on the board that made the argument.

2. **C3 cut 3, six rows cap to five plus Other.** Region: the same Color block. Current: six rows. New: five
   rows (Group 1 to Group 5: 118, 71, 52, 38, 24), then the Other row from StyleFromAnalysis item 2 with
   `background: #6b7480` and the text `Other (1 group, 5% of nodes)`. Arithmetic, checkable:
   118+71+52+38+24+15 = 318; the five largest are 303; Other rolls up one group, 15 nodes, 4.7% -> **5%**.
   The height does not change -- six rows before, six rows after -- and saying so is part of applying it
   honestly: the cap here is a rule change and a duplication change, not a pixel change. The canvas keeps all
   six Okabe-Ito colours; the Other row is a roll-up and its click opens the groups table.

3. **C3 cut 1, state rows: checked and empty.** Region: the legend. No state-row block. One clause.

4. **C6, the cap.** Region: the legend box. `max-height: 334px` -> `max-height: 240px`. The legend measures
   **201** after items 1 and 2 -- unchanged, because the row count is unchanged -- so it sits comfortably
   under the cap and its top edge stays at y 663. The pop-out's bottom is 560, 103px clear. Keep the
   two-line Color header: "Color: Tight clusters (Markov clustering, MCL)" is 250px at 11px in a 238px
   content box and no legend width both holds it on one line and clears the centred toolbar, so the wrap is
   the honest outcome (LEGEND-1.8 section 1).

5. **C2, the two obligations.** Region: the legend comment. Append the paragraph from StyleFromAnalysis item
   5. This board's export legend carries **2 channels** -- Color: Tight clusters (Markov clustering, MCL)
   with all six groups and their counts, Size: Most connected 1 / median 5 / 41, sqrt -- plus one state row
   per state drawn in the exported frame.

6. **B5, the pop-out's anchor is already right and is cited by pixel.** Region: the Categories pop-out,
   `position: absolute; left: 792px; top: 300px; width: 360px`. No change to left or top. Add to its
   comment: "B5 records this board as one of the five already correct -- top 300 on the Categories door row's
   300, right edge 1152, 8px clear of the inspector's 1160 -- and cites it by pixel in 6.11's Anchor
   paragraph."

7. **B3 and VOCAB 14.2, the pop-out carries a caret.** Region: beside the pop-out. Add, as its sibling, the
   mirrored inspector caret -- 6px on the pop-out's **right** edge, the edge nearest the inspector:
   ```html
   <div style="position: absolute; left: 1152px; top: 316px; width: 6px; height: 12px; overflow: hidden; z-index: 9;">
     <div style="position: absolute; right: 3px; top: 1px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-right: 1px solid #48525c; border-top: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```
   Top 316 = the pop-out's 300 plus VOCAB 14.2's own 16.

8. **E2, the pin comes off.** Region: the pop-out header's `title="Pin this open"` glyph. New: **delete it.**
   A sortable table of one result's categories is not one of E2's four comparative surfaces, and its content
   does not survive a selection change in any useful way -- change the result and the table is a different
   table. Record E2's closed set in the header comment.

9. **B1's second height cap, checked.** Region: the pop-out's `max-height: 640px`. New: `max-height: 418px`,
   half the inspector's 836px region, which is B1's second cap and the smaller of the two. The drawn body is
   260, so nothing clips and nothing on screen moves.

10. **A6, the doors on this board report their state.** Region: three glyphs -- the inspector's `Categories`
    RT-8 door row (`title="Categories. 41 rows. Open"`, currently carrying `background: #28364e` because its
    pop-out is open, which is correct), and the two run-record `title="Details"` chevrons on the Tight
    clusters card and in the inspector. No text change; add VOCAB 14.1's dimmed/primary clause to each
    comment, plus: "an opener takes the selected-row fill only while its pop-out is open (POP-13b), and the
    chevron keeps the closed right-pointing form permanently."

11. **A4, why Categories is a door, recorded.** Region: the Categories section comment. Add: "A4's
    discriminator confirms it: a four-column sortable table of 41 rows cannot be drawn honestly in the 256px
    band, so the door buys width, and it leaves the rows below operable while it is open. Two of the three
    clauses, where one is enough."

12. **POP-4 confirmed: the six group swatches keep their anchored pop-out.** Region: the Tight clusters
    card's six group chips, each of which opens the 360 group profile pop-out anchored to the clicked chip.
    No change. Add: "This is 6.11 question 2 answered yes -- one member of a list this surface already
    shows -- and B1's rule that a transient surface inherits its position from its opener on both axes. The
    chip that was clicked is the anchor; GroupProfilePopout draws the shell."

13. **E4, palette index.** Region: the file comment. Add: "Palette index (E4 measure 1): Categories table,
    Run record, Group profile. Each one click from the row or chip that owns it."

## GroupProfilePopout

File: `GroupProfilePopout.dc.html`. State: Result. `cat-social-network.json`, 20 nodes, Groups (Communities,
Louvain), 4 groups, Group 1 clicked in the inspector's Groups by size table and its 360 profile pop-out
drawn open at [792,226 360x479]. Legend measured today: **155px** (Color: Groups, four rows, already no
counts, 79 / Size: Most connected 2 / median 3 / 4, 49), top edge **y 709**.

1. **B4, the pop-out clears the legend by the overlay inset, not by 4px.** Region: the pop-out at
   `position: absolute; left: 792px; top: 226px; width: 360px; max-height: 640px`, whose body is
   `<div style="flex: 1; min-height: 0; overflow-y: auto; padding: 0 12px 12px; box-sizing: border-box;">`.
   Measured on the rendered board: the pop-out is 479 tall, so its bottom is **705**, against the legend's
   measured top of **709** -- a 4px gap where the canvas overlay inset is 12. B4's correction is **bottom
   697**. The top may not move: B5 records this board's 226-on-226 as one of the five already-correct
   anchors and cites it by pixel. So the height gives 8px. **Change the body's `padding: 0 12px 12px` to
   `padding: 0 12px 4px`.** That is the whole edit: 479 -> 471, bottom 226 + 471 = 697, gap to the legend 12.
   Then correct the two comment lines that state the old numbers -- "Its bottom edge is y 705, which leaves
   23px of clearance over the legend's 728 top" and "keeps its 479px height and its 23px of clearance over
   the legend" -- to 697, 471 and 12. The 728 figure was wrong: the legend's top is 709.

2. **B1's second height cap does not bind here, and the exception is named.** Region: the pop-out's
   `max-height: 640px`. New: `max-height: 471px`. B1's second cap -- half the owning region, so 418 for an
   836px inspector -- would cut this surface by 53 and break both B4's bottom 697 and B5's 226-on-226, so it
   yields to the two measured corrections. Write the exception into the ANCHOR ARITHMETIC comment in these
   words: "B1's half-region cap exists so the vertical flip is always available; this pop-out does not flip,
   because B4 and B5 fix both its edges by measurement, so the binding cap is 6.11's region height minus 32
   and the drawn 471. Named here as a recorded obstruction, which is what B1's review clause asks for."

3. **B3 and VOCAB 14.2, the pop-out carries a caret.** Region: beside the pop-out. Add, as its sibling, the
   mirrored inspector caret on the pop-out's **right** edge:
   ```html
   <div style="position: absolute; left: 1152px; top: 242px; width: 6px; height: 12px; overflow: hidden; z-index: 9;">
     <div style="position: absolute; right: 3px; top: 1px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-right: 1px solid #48525c; border-top: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```
   Top 242 = the pop-out's 226 plus VOCAB 14.2's own 16. The caret joins the Group 1 row's `#28364e` fill as
   the second mark of the tether. Note in the comment that B3 also gives this surface a **return strip**: if
   the Groups by size table scrolls its Group 1 row out of the inspector, the pop-out docks to the edge it
   left through, drops this caret, keeps the row lit and grows VOCAB 14.3's 20px strip naming the opener --
   and closes outright if the section collapses or the region changes activity. Not drawn here; the row is
   in view.

4. **E2, the pin STAYS on this one.** Region: the pop-out header's `title="Pin this open"` glyph. No change.
   E2's closed set of four names "the group profile" explicitly, and the reason is this surface's own
   capability: Up and Down on the table re-target the open pop-out, so a pin is what lets a reader hold one
   group's profile still while walking the list. Add that sentence to the header comment, because every other
   pop-out in this group loses its pin in this revision.

5. **C3, all three cuts checked; two are empty and one does not fire.** Region: the legend. The four `Group N`
   rows already carry no counts -- 5.1's old conditional exception fired here because the inspector's Groups
   by size table lists all four -- so cut 2 removes nothing, and after C3 the no-counts rule is
   **unconditional** rather than conditional on what the panel prints. Four rows against a cap of five, so
   cut 3 does not fire and no Other row is drawn. There is no state-row block, so cut 1 is empty. Write all
   three findings into the legend comment in one paragraph, and add the sentence that matters: "what C3 buys
   here is not pixels but one rule instead of three -- this legend's no-count form used to be an exception
   and is now the grammar."

6. **C6, the cap.** Region: the legend box. `max-height: 334px` -> `max-height: 240px`. The legend measures
   155 and does not move; its top stays at y 709, which is the number item 1's clearance is computed against.

7. **C2, the two obligations.** Region: the legend comment. Append the paragraph from StyleFromAnalysis item
   5. This board's export legend carries **2 channels** -- Color: Groups (Communities, Louvain) with all four
   groups **and their member counts 7 / 6 / 4 / 3**, Size: Most connected 2 / median 3 / 4, sqrt -- plus one
   state row per state drawn in the frame. Note the asymmetry deliberately: the counts the canvas legend
   never drew are exactly what the export legend must carry, because the exported figure has no Groups by
   size table beside it.

8. **A4, why the group profile is a door and the attribute profile is not, kept.** Region: the four-part
   "WHY FLOOR 7 DOES NOT CUT THIS THE WAY IT CUT POP-9b" comment. No change to the argument; add one
   sentence: "A4's discriminator reaches the same verdict from the other side and is the shorter test: this
   door buys width beyond the 256px band (four columns of the user's own attribute names and values) and it
   survives a selection change, which is why it also earns E2's pin. A collapsed section buys neither."

9. **A6, the run-record door reports its state.** Region: the inspector's one-line run record ("Louvain,
   seed 42, all 20 nodes") and its Details chevron, drawn closed. No text change; add VOCAB 14.1's
   dimmed/primary clause and the Multiplicity note already in the comment -- opening it closes this profile,
   because both are about the same result and they share the inspector region.

10. **E4, palette index.** Region: the file comment. Add: "Palette index (E4 measure 1): Group profile, Run
    record. Both one click from the row that owns them, with the result present."

## InspectorGenomics

File: `InspectorGenomics.dc.html`. State: Selected, TP53, on `ovarian_de_string.tsv`. No activity panel
open, so the canvas is 1112 wide. Legend measured today: **266px** -- Color: fold change, diverging, with
the clamp line and the not-measured row (101); Size: significance (49); Edge width: confidence (49); and a
state block holding `Selected` (13).

1. **C3 cut 1, the state-row block leaves the legend.** Region: the legend's trailing block -- the
   `border: 1.5px solid #ffffff` transparent-disc swatch and the word `Selected` -- and the 1px `#374047`
   rule above it. New: **delete both.** The selection is named by the inspector header ("Node / TP53"), by
   the canvas ring itself and by the status bar; 5.1's One fact, one region already assigns it there. It
   renders in the exported legend and in Help's "What the marks mean". This is the whole of C3 on this
   board: there is no categorical block, so cuts 2 and 3 have nothing to act on -- say so in the same
   clause.

2. **C6, the cap, and the number that makes it exact.** Region: the legend box. `max-height: 334px` ->
   `max-height: 240px`. Measured: 266 today; the state block is 13, its rule 1 and the container gap that
   carried it 12, so item 1 removes **26** and the legend lands at **exactly 240** -- the same three-channel,
   all-floor legend StyleDiverging measures, which is where the 240 cap comes from. Its top edge moves from
   y 598 to y 624. Put that identity in the comment: "this legend and StyleDiverging's are the same three
   blocks on the same data and now measure the same 240, which is the number C6 sets the cap from."

3. **C2, the two obligations.** Region: the legend comment. Append the paragraph from StyleFromAnalysis item
   5. This board's export legend carries **3 channels** -- Color: fold change (log2FoldChange), diverging,
   -4.2 / midpoint 0 / 3.8 with the clamp line "clamped at -4.2 and 3.8; 12 nodes beyond the ends" and the
   `not measured (6 nodes)` row; Size: significance (padj), 0.05 / median 1e-3 / 1e-12, -log10; Edge width:
   confidence (combined_score), 0.4 / median 0.6 / 0.99, linear -- plus **one state row, Selected**, with its
   colour-agnostic white ring, because a static figure has no inspector header. This board is the genomics
   persona's own board and the persona's complaint is named in the requirement set as "figures that need to
   be rebuilt in Illustrator because the legend is not exported"; add that sentence, and C4's answer: in the
   SVG and PDF paths the composed legend is emitted as **vector text**, which is exactly the rebuild being
   avoided.

4. **D4, the inspector action block: no change, and the reason, so nothing is cut.** Region: the pinned
   action block at the foot of the inspector. Current: three rows -- (1) the `Expand 41 neighbors` split
   button with its type caret and its Coming tag, (2) `Zoom to selection` | `Note`, (3) `Find path from here`
   with `More` right-aligned. D4 caps this block at four rows in every selection state; this board draws
   three, so **the cap does not bite and nothing is removed.** Write that into the block's comment together
   with what may never move into More even when it does bite: any cost estimate and the control it belongs
   to (floor item 4), and every departure line. This board's own "Resident content height now: 731px in a
   737px window... Do not add a row here without taking one out" stands unchanged.

5. **D4, the Ego network destination changes, in the More menu's listing.** Region: the action block's More
   menu listing in the comment, the entry `Ego network (Coming)`. Current: it inherits 5.3's tier-3 dialog.
   New: rewrite the entry as "Ego network (Coming) -- opens a 280 pop-over anchored to this row with Hops
   and Max nodes; 6.11 question 1 is a no, nothing commits, and the canvas must stay touchable to see the
   size preview and the ring chip (D4)." Comment-only: the menu is not drawn open.

6. **D4, Neighborhood expansion: recorded, not drawn.** Region: the `Expand 41 neighbors` split button's
   type caret, `title="Choose node and edge types"`. No change to the drawing. Add: "D4 turns Explore's
   Expand neighbors section into one RT-8 door row whose trailing state mark names the remembered depth and
   type filter ('2 steps, 3 types'), which is where 5.4's 'uses the last node and edge type filter' becomes
   readable before it acts. No activity panel is open on this board, so that row is not drawn here; this
   caret is the inspector-side half of the same control and keeps its words."

7. **D4 and POP-10, Notes stays inline.** Region: the inspector's Notes section. No change. Add: "Confirmed
   by D4 -- the notes list stays inline (floor item 7, and 6.11 refuses it a pop-out by name in the same
   words the 1.8 user question asks about); only a note ROW's editor pops out, anchored to the row it edits.
   POP-10's 380px refusal stands."

8. **A5, the two-home licence, recorded for the pinned encodings.** Region: the Attributes section, where
   log2FoldChange and padj are pinned at the top because Color and Size are bound to them. Add: "A5 licenses
   a control at two scopes and forbids a later compaction pass from deduplicating it: the encoding lives in
   Style, the value lives here, and they are different facts about the same attribute. What Rule 8 does
   delete is already deleted on this board -- the domain endpoints, which the legend prints on the same
   screen."

9. **F's rejected list, applied to this board's two scan surfaces.** Region: the Attributes list (ten rows
   with the resident "Show all 36 attributes" link) and the Neighbors list. No change to either. Add: "F
   rejects putting the attribute profile, the neighbour list or any floor-7 scan surface behind a door, and
   6.4's reachability rule is why the count sits on the link and not on the header -- a numeral a keyboard or
   touch reader cannot reach fails floor item 4. Recorded so a compaction pass reading '25 rows move behind
   doors this revision' does not reach for these."

10. **E4, palette index.** Region: the file comment. Add: "Palette index (E4 measure 1): Ego network. The
    only door this board reaches, and it is one click from the row that owns it once that row is drawn."

## CanvasToolbar

Screen group: nav. Component sheet, 1440 x 900, no shell regions: a title row, a
left column (the bar at 1:1, then the Clearance slice) and a right column (the
bottom stack slice, then the offset and order tables). One legend instance, in
SLICE 3 at `[357,550 256x155]` inside that slice's 600 x 264 canvas rect
(`right: 12px; bottom: 60px`, risen onto the second line). No activity panel and
no inspector are drawn, so none of D1-D7's panel splits reaches this board.

1. **The legend decision, this board's version (C1, C3, C6).** Region: the legend
   in SLICE 3, the block headed `<!-- LEGEND (5.1, floor item 5), the one
   component, settled once in LEGEND-1.8 ... -->` (from line 275). This board
   encodes **two channels**: `Color: node type (type)` with four categorical rows
   (Accounts, Devices, Phone numbers, Merchants) and `Size: Most connected
   (Degree centrality)` with the 1 / median 6 / 44 ramp. What the legend becomes:
   both blocks stay, every header stays, the ramp and the `sqrt scale` line stay
   -- and the **four count spans come off**. What replaces them on the canvas:
   nothing. The counts are not lost, they are relocated by 5.1's One fact, one
   region -- the group table, the result card and the exported legend own a
   category's member count from now on. There are no state rows on this board and
   no categorical block over five rows, so those two cuts do not bite here.
2. **Delete the four count spans (C3 item 2).** Region: the same legend, the
   four categorical rows. Current content: each row is
   `justify-content: space-between` with a trailing
   `<span style="flex: 0 0 auto; color: #7a828e;">96</span>` (then 48, 34, 22).
   New content: the canvas categorical row from **VOCAB 14.5**, copied verbatim --
   swatch and label only, `display: flex; align-items: center; gap: 6px;
   height: 14px;`, no `justify-content`, and the label span keeps
   `flex: 1 1 auto; min-width: 0; ... text-overflow: ellipsis;`. Delete the four
   count spans and the `justify-content: space-between` on the four rows. Height
   does not change: 155 before, 155 after. **Say that in the comment** -- this
   board's saving is one rule instead of three, not pixels, and C3 states it that
   way on purpose.
3. **The one number in the legend box (C6).** Region: the legend's own div.
   Current content: `max-height: 334px`. New content: `max-height: 240px`.
   Nothing else in that style attribute changes (`position: absolute; right:
   12px; bottom: 60px; width: 256px; min-height: 80px; ... overflow: hidden;`).
   240 is the measured height of an all-floor legend (StyleDiverging measures 240
   today with three channels, zero counts and zero state rows), so it binds
   nothing here and forbids regrowth.
4. **Rewrite two sentences of the legend comment (C2).** Region: the LEGEND
   comment block. Current content: the sentence `No "Legend" caption, no palette
   name in the body, no counts on state rows, no block for a channel that is not
   encoded.` New content: `No "Legend" caption, no palette name in the body, no
   category counts, no state rows and no block for a channel that is not
   encoded. 1.8 splits floor item 5 into two obligations: on screen, one block
   per encoded channel with channel, attribute, domain endpoints, the median or
   midpoint, the scale in words and every departure line; in the export,
   everything, including the counts, the twelve largest categories, the coverage
   footer and one row per state drawn in the frame, composed from the encoding
   model at export scale and never captured from this DOM overlay.` Then replace
   the last sentence of the `THIS BOARD:` paragraph's claim about counts with:
   `The four counts came off in 1.8: this board's canvas legend is two channel
   blocks and nothing else.`
5. **Record the export half, because this board is the stack's spec sheet (C4,
   VOCAB 14.6).** Region: the SLICE 3 comment. Add: `The exported image carries
   no legend today and physically cannot carry this one --
   ScreenshotCapture.ts calls CreateScreenshotAsync(engine, camera, ...), a
   Babylon scene capture, and the legend is a DOM overlay in the shell. 1.8 makes
   the export legend a composed block (VOCAB 14.6) drawn into the image at the
   export's own scale, with no cap and no compaction, and vector text in the SVG
   and PDF paths. That is new work in graphty-element, not a drawing on this
   board.`
6. **Record B1's change to how a canvas surface buys clearance.** Region: the
   `SECTION: Clearance` comment (from line 255). Current content: the section
   documents the two-line reflow of the minimap and the legend under a narrow
   canvas. New content: keep every drawn slice and every number, and append:
   `1.8 (B1) changes how a transient buys clearance over this stack, and it is
   the fix for the user's timeline example. A surface anchored to a horizontal
   overlay keeps the 12px vertical gap to its opener and spends the horizontal
   position instead: it slides along the bar until it is 8px clear of the
   legend, and it may cover the toolbar and the minimap, which are dismissible
   chrome, because only the legend is floor item 5. It never rises to clear the
   legend -- rising is what destroyed the tether. Measured case, TimeSlider: the
   settings pop-out moves from [868,343 280x202] to [604,592 280x202], bottom
   794, right edge 884 against the legend's left edge 892.`
7. **Record the two gap constants (VOCAB 14.8, B2).** Region: the `SECTION:
   Bottom offset` comment (from line 604), which already owns the 12 / 82 / 272 /
   342 ladder. Add: `Two constants, and this board owns the second. 8px is the
   gap between a pop-out and the shell region boundary it sits beside -- left
   edge 336 beside the panel, right edge 1152 beside the inspector. 12px is the
   inset used by anything that floats in the canvas overlay layer, which is this
   board's own ladder: the legend's right edge 1148 against a canvas right of
   1160, the minimap's left 340 against a canvas left of 328, the toolbar's
   bottom 864 against a canvas bottom of 876. A panel or inspector pop-out that
   has slid over the canvas takes 12. Neither constant is the gap to an OPENER,
   which is measured to the opener's own anchor box: ViewsMenu's menu sits 8px
   above the Views button's top edge, not 12 above the bar.`
8. **Record the measurement the 622 row no longer matches -- do not change the
   drawn number.** Region: the three RT-6 rows under SLICE 3 (`Second line below
   622`, `Second line below, narrow bar 650`, `Canvas clamp on a panel drag
   520`). Current content: 622 is `12 + 160 + 16 + 246 + 16 + 160 + 12`, computed
   when the legend was 160 wide. Measured now, with the 256-wide legend
   LEGEND-1.8 settles: one line needs `12 + 160 + 16 + 246 + 16 + 256 + 12 =
   718`, and SLICE 3 draws the reflow at 600 because at 600 a right-anchored
   legend would start at x 357 against a bar ending at x 448. New content: leave
   all three rows exactly as drawn -- C6 declares the reflow arithmetic untouched
   by 1.8 and forbids changing the legend's width -- and add to the Clearance
   comment: `The 622 threshold predates the 256-wide legend and is stale by the
   same arithmetic that produced it: with a 256 legend the single-line minimum is
   718. 1.8 does not change it, because C6 rules the ladder untouched and the
   legend width fixed; recorded here so the spec owner settles 5.6's number
   rather than a drafter guessing it.`
9. **Do not draw a compact legend in SLICE 2, and record why.** Region: the
   `SLICE 2` comment (from line 433), the 698 x 278 canvas rect with the time
   slider and the 260 drawer below it. Current content: no legend is drawn in the
   slice. New content: no change to the drawing, plus this sentence in the
   comment: `The drawer-open compact legend stops being a separately specified
   component in 1.8 (C6): it is this board's legend with the swatch rows and the
   ramps subtracted and the header lines kept, same 256 width, same right edge,
   no scroll. It is not drawn in this slice because at a 698 canvas the centred
   246 bar runs x 226 to 472 and a right-anchored 256 legend runs x 430 to 686,
   which overlap -- the slice would have to draw the two-line reflow that SLICE 3
   exists to show. The compact form is drawn on DataTableDrawer and
   ValidationPopout, which are the two boards C6 names.`
10. **Guard, so nothing else moves.** The bar at 1:1, both plates, the parts
    table, the two width sums (246 and 274), the offset ladder, the order table,
    the drawer and the time slider in SLICE 2 are all unchanged. This board draws
    no gear and no door, so A1's door test, A6's stub ink and A3's depth
    obligation have nothing to act on here -- and saying so is part of the review:
    do not add a gear to this sheet to "apply" 1.8.

## ViewsMenu

Screen group: nav. Canvas 1112 x 836 (no activity panel), nothing selected, 3D,
the Views menu drawn open from the canvas toolbar. Legend at `[892,784 256x80]`,
one channel. Inspector: Graph summary, nothing selected.

1. **Re-anchor the Views menu (B1, B4).** Region: the block headed `<!-- VIEWS
   MENU (5.6), open. TB-8: it now opens UPWARD ... -->` (from line 303), the
   `<div style="position: absolute; left: 533px; bottom: 52px; width: 248px; ...
   z-index: 15;">`. Current content: `left: 533px`, which renders the menu at
   `[581,483 248x341]` against a Views button at `[687,832 36x28]` -- centred on
   the opener, so its right edge overhangs the button by 106px and the toolbar's
   right end by 102px. New content: `left: 427px`, everything else in the style
   attribute unchanged. That renders the menu at `[475,483 248x341]`: right edge
   723 on the button's right edge 723, bottom 824, 8px above the button's top
   edge 832. This is B4's measured correction for this board, quoted by pixel.
   The arithmetic for the comment: canvas left 48, so canvas-relative left =
   475 - 48 = 427, and 427 + 248 = 675 = the Views button's canvas-relative right
   edge.
2. **The menu gains an 8px caret (B1, VOCAB 14.2).** Region: the same menu div,
   as its first child. Current content: none -- the menu carries no caret, and
   the lit Views button is the only mark of the relationship. New content: a
   caret on the menu's bottom edge, centred on the Views button and clamped 12px
   inside the menu's own corners. A surface narrower than 280 carries an 8px
   caret instead of an edge line, which is what B1 says and what VOCAB 14.2 spells
   for `every menu under 280`. Snippet, the 14.2 caret mirrored to point down and
   filled in the menu's own `#2a3035`:
   ```html
   <div style="position: absolute; left: 220px; bottom: -8px; width: 16px; height: 8px; overflow: hidden;">
     <div style="position: absolute; left: 3px; top: -5px; width: 10px; height: 10px; transform: rotate(45deg); background: #2a3035; border-right: 1px solid #48525c; border-bottom: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```
   The arithmetic: the button's centre is at canvas x 657, the menu's left edge is
   427, so the caret's centre wants x 230 inside the menu; a 16px box centred
   there ends 10px from the menu's right corner, so the clamp fires and the box
   sits at `left: 220px`, 12px inside. Record that the clamp fired.
3. **The caret points back at the opener, and that is the rule (VOCAB 14.2).**
   Region: the menu comment. Add: `The caret sits on the edge that FACES the
   opener -- here the bottom edge, because the toolbar is below. 14.2's prose
   names the direction a surface travels ("the right edge for an activity-panel
   one") while its snippet draws the edge that carries the caret (left: -6px,
   pointing back at the panel). The snippet is the spelling: a caret points at
   its opener.`
4. **The legend decision, this board's version (C1, C3, C6).** Region: the legend
   at `[892,784 256x80]`, the block from line 443. This board encodes **one
   channel**: `Size: Most connected (Degree centrality)`, 2 / median 3 / 4, sqrt
   scale, on the cat graph. What the legend becomes: exactly what it is now. It
   carries no category counts, no categorical rows and no state rows, so all
   three of C3's cuts pass over it. What replaces anything on the canvas: nothing
   -- there is nothing to replace. This board is the honest headline of C6: the
   1.8 legend is not a promise of a small legend, it is a promise that every line
   on it is load-bearing, and here 80px of legend is 80px of floor.
5. **The one number in the legend box (C6).** Region: the legend div. Current
   content: `max-height: 334px`. New content: `max-height: 240px`. Nothing else
   in the attribute changes.
6. **Rewrite two sentences of the legend comment (C2).** Region: the LEGEND
   comment. Current content: `No "Legend" caption, no palette name in the body, no
   counts on state rows, no block for a channel that is not encoded.` New
   content: `No "Legend" caption, no palette name in the body, no category
   counts, no state rows and no block for a channel that is not encoded. 1.8
   splits floor item 5 into an export obligation and a screen obligation: the
   screen carries one block per encoded channel with its endpoints, median and
   scale word and every departure line; the export carries all of that plus the
   counts, twelve categories, the coverage footer and one row per state in the
   frame, composed from the encoding model (VOCAB 14.6). This board's legend is
   one all-floor block and loses nothing.`
7. **The Views menu keeps its `Legend` row, and the row's meaning is unchanged
   (C7, E3).** Region: the menu's Show group (`Minimap` M, `Toolbar`, `Legend`
   L). Current content: three checked rows. New content: unchanged. Record in the
   comment: `Hiding the legend with L or with Style's Show legend switch does not
   remove the legend from an export (C4): the exported legend is composed from
   the encoding model and does not depend on the overlay's visibility. The L
   binding is a canvas-reading control, not an export control.`
8. **The Schema door needs no stub-ink change (A6).** Region: the inspector's
   `SECTION: Schema, now a DOOR (POP-6, 6.11)` header with its trailing
   `3 node types, 7 edge types`. Current content: chevron plus the summary in
   `#7a828e`. New content: unchanged. Record why in the comment, so a drafter
   does not repaint it: `A6's dimmed-or-primary rule is about a door that hides
   OPTIONS -- the glyph is dimmed when everything behind it is at its default and
   primary when something is not. Schema hides a REPORT, which has no default to
   deviate from, so its stub keeps the chrome ink and carries the summary
   instead. Gears get A6; report doors get their fact.`
9. **The inspector loses no row on this board (D4, H).** Region: the whole
   inspector. Current content: Graph summary at 12 rows -- reading, Counts,
   Most connected, its chart row, Schema, Attributes, Case notes, More in
   Analyze. New content: unchanged. Record it: `H's table reads "Inspector:
   nothing selected 12 -> 12". The Explore reductions are paid by the Selection
   actions section, the Around the selection section and the capped action block,
   none of which a nothing-selected inspector draws. Do not delete a row here to
   chase a number.`
10. **Guard.** The rail, top bar, insights strip, canvas drawing, toolbar,
    minimap, status bar and every menu row (order, key chips, the three Coming
    tags, `Save as view...`) are unchanged. The menu moves horizontally and gains
    a caret; nothing else on this board moves.

## ContextMenu

Screen group: nav. Canvas 1112 x 836 (no activity panel), one node selected
(acct-4471), 3D, the node context menu open at the pointer
(`left: 622px; top: 330px` in canvas coordinates). Legend at
`[892,682 256x182]`, two channels plus a state block. Inspector: one node.
Status bar carries `1 selected` and `4 data issues`.

1. **The legend decision, this board's version (C1, C3, C6).** Region: the legend
   at `[892,682 256x182]`, the block headed `<!-- LEGEND (5.1, floor item 5) ...
   -->` (from line 952). This board encodes **two channels** -- `Color: node type
   (type)` with four categorical rows (Accounts 96, Devices 48, Phone numbers 34,
   Merchants 22) and `Size: Most connected (Degree centrality)` 1 / median 6 / 44,
   sqrt -- and draws **one state row**, `Selected`. What the legend becomes: the
   two channel blocks, complete, with their headers, ramp, `sqrt scale` line and
   four swatch rows; the four counts and the whole state block go. What replaces
   them on the canvas: nothing new is drawn, because both facts are already on
   this board twice over. The counts are the inspector's reading (`96 accounts,
   48 devices, 34 phone numbers and 22 merchants`) and the Schema table; the
   selection is the inspector title row (acct-4471) and the status bar's
   `1 selected`. Measured: **182 -> about 155**.
2. **Delete the four count spans (C3 item 2).** Region: the Color block's four
   rows. Current content: each row is `justify-content: space-between` with a
   trailing `<span style="flex: 0 0 auto; color: #7a828e;">96</span>` (then 48,
   34, 22). New content: the canvas categorical row from **VOCAB 14.5** verbatim
   -- swatch and label only, `display: flex; align-items: center; gap: 6px;
   height: 14px;` -- so the label takes the full width. Delete the four count
   spans and the `justify-content: space-between` on those four rows.
3. **Delete the state block (C3 item 1).** Region: the last child of the legend:
   the `<div style="height: 1px; background: #374047;"></div>` divider plus the
   `<div style="display: flex; flex-direction: column; gap: 4px;">` holding the
   white-ring swatch and the word `Selected`. New content: both elements deleted,
   so the legend ends with the Size block. The state rows are app chrome, not
   encoded channels: they are constant across every dataset, learned once, and
   caused by an action the reader just performed. They render in the exported
   legend, which has no inspector and no status bar, and in Help's "What the
   marks mean". They do not render on canvas.
4. **The one number in the legend box (C6).** Region: the legend div. Current
   content: `max-height: 334px`. New content: `max-height: 240px`. Nothing else
   in the attribute changes (`right: 12px; bottom: 12px; width: 256px;
   min-height: 80px; ...`).
5. **Rewrite two sentences of the legend comment (C2).** Region: the LEGEND
   comment. Current content: `No "Legend" caption, no palette name in the body, no
   counts on state rows, no block for a channel that is not encoded.` plus the
   `THIS BOARD:` sentence `One node is selected, so the state block carries
   Selected and no count.` New content: `No "Legend" caption, no palette name in
   the body, no category counts, no state rows and no block for a channel that is
   not encoded. 1.8 splits floor item 5 into an export obligation and a screen
   obligation (C2): the screen keeps one block per encoded channel with its
   endpoints, median and scale word and every departure line; the export carries
   the counts, twelve categories, the coverage footer and one row per state drawn
   in the frame, composed from the encoding model (VOCAB 14.6).` and `THIS BOARD:
   one node is selected and the legend no longer says so -- the inspector title
   row names acct-4471 and the status bar reads "1 selected", which is 5.1's One
   fact, one region deciding it.`
6. **The context menu is the named exception to the anchor rule (B2).** Region:
   the block headed `<!-- CONTEXT MENU (5.6, 5.4 one-node actions), opened by
   right-click on acct-4471; anchored at the pointer. -->` (from line 396).
   Current content: the menu is drawn at the pointer with no lane and no caret.
   New content: unchanged geometry, plus this in the comment: `B2 gives every
   transient surface a lane, a gap axis and a shared edge line, and names two
   exceptions that take none: a context menu, which takes the pointer, and a
   preview, which takes the centred home. This menu is the first. It carries no
   caret either: a caret marks the edge line back to an opener's anchor box, and
   a pointer has no anchor box. 14.2's "every menu under 280 carries an 8px
   caret" is about menus that hang off a control.`
7. **Record where `Ego network` opens from, when it is built (D4, A5).** Region:
   the menu's unbuilt block, the dimmed `Ego network` row. Current content: a
   dimmed row under the block's one Coming note. New content: unchanged drawing,
   plus in the comment: `D4 moves the ego network's Hops and Max nodes out of a
   tier-3 dialog into a 280 pop-over on the inspector's Ego network action, where
   6.11 question 1 is a no, nothing commits, and the canvas must stay touchable
   to see the size preview and the ring chip. This menu row is a route to that
   control, not a second home for it: it opens the same pop-over anchored to the
   inspector row that owns it, in the inspector lane with its right edge at 1152.
   A pop-over does not open at the pointer.`
8. **The inspector action block is already at D4's cap -- record it, change
   nothing (D4).** Region: the pinned `ACTIONS` block (from line 1240). Current
   content: `Expand 37 neighbors` (with its type-filter chevron and Coming tag),
   `Find path from here`, then the icon verbs and More. New content: unchanged.
   Record: `D4 caps the inspector action block at four rows in every selection
   state, with the remainder in the block's More menu, each verb keeping its full
   text; and it forbids More from ever swallowing the split button's cost
   estimate or a departure line, because floor item 4 binds an estimate to the
   control that spends it. This block draws two rows plus More and is already
   inside the cap. H's "one node 26 -> 24" is paid on the boards that draw the
   Around the selection section and the eight-row action stack; do not delete a
   row here to reach a number.`
9. **Neighborhood expansion, when it is built, is a door row (D4).** Region: the
   inspector's `Expand 37 neighbors` row and its chevron
   (`title="Choose node and edge types"`). Current content: an unshipped chevron
   beside a Coming tag. New content: unchanged drawing, plus in the comment:
   `In the Explore panel the same capability becomes one RT-8 door row whose
   trailing state mark names the remembered depth and type filter ("2 steps, 3
   types"), which is where 5.4's "uses the last node and edge type filter"
   becomes readable before it acts. On the inspector it stays this row with this
   chevron, and the chevron is the door: A6 draws it dimmed while the filter is
   at its default and primary once it is not.`
10. **Guard.** The rail badge, top bar, canvas drawing and its selection ring,
    labels, canvas toolbar, minimap, every menu row and every status-bar slot are
    unchanged. The menu does not move. The legend does not move, does not change
    width, corner or bottom offset.

## ShortcutsDialog

Screen group: nav. Explore panel open (280), canvas 832 x 836, cat graph,
nothing selected, and the keyboard-shortcuts surface drawn open at
`[340,143 760x614]` inside a full-frame scrim. Legend at `[892,784 256x80]`, one
channel.

1. **The surface stops being a dialog (D8).** Region: the block headed `<!--
   KEYBOARD SHORTCUTS DIALOG (5.3 Help, 5.6): scrim over the whole frame ... -->`
   (from line 647) and the element it heads,
   `<div style="position: absolute; left: 0; top: 0; width: 1440px; height:
   900px; display: flex; align-items: center; justify-content: center;
   background: rgba(13, 17, 23, 0.6); z-index: 20;">`. Current content: a
   full-frame scrim centring a 760px card; the panel, canvas, inspector and
   status bar all read through a 60% wash. New content: replace that wrapper with
   a container over the **canvas rect only**, with no background:
   ```html
   <div style="position: absolute; left: 328px; top: 40px; width: 832px; height: 836px; display: flex; align-items: center; justify-content: center; z-index: 20;">
   ```
   The card inside is unchanged except for its cap: `max-height: 800px` becomes
   `max-height: 812px` (the canvas rect's 836 less the 12px overlay inset top and
   bottom, VOCAB 14.8). That renders the card at `[364,151 760x614]`: centred on
   the canvas rect, clear of the panel and the inspector, 12px clear of nothing it
   must clear, and 21px above the legend's top edge at 784. Removing the scrim
   un-dims the whole shell in one edit -- there is no second element to repaint.
2. **Rewrite the surface's own paragraph (D8).** Region: the same comment.
   Current content: `This is the tier 3b modal form: scrim, focus trap, canvas
   inert. Tier 3a is the pop-out, which has none of the three.` New content:
   `This is the REFERENCE OVERLAY, and 1.8 makes it a fourth surface class.
   6.11's first question is exclusive and its list of dialogs is closed (Import
   options, Table join, Map identifiers, node merging, the computed attribute
   formula, Run a recipe), so "if no, it is never a dialog"; and 760 is over the
   480 pop-out ceiling, so it is not a pop-out either. Non-modal: no scrim, no
   focus trap, the canvas keeps pointer and keyboard, Escape closes, the card is
   centred on the canvas rect and may cover the insights strip and the minimap,
   which are dismissible chrome, but not the legend, which is floor item 5. The
   modality was defeating the use: you read a binding and the very next thing you
   do is press it, which a frozen canvas forbids, and the keyboard-shortcuts
   capability asks for an "overlay" in its own words. The report editor in D1
   hits the identical 5.3-versus-6.11 conflict and is resolved in the same edit,
   as a non-modal bottom drawer.`
3. **Rename the row that names this surface (Rule 1).** Region: the table's
   Panels group, the row reading `Keyboard shortcuts dialog` with the `?` chip
   (label span at `[821,331]` on SettingsShortcuts, same string here). Current
   content: `Keyboard shortcuts dialog`. New content: `Keyboard shortcuts
   reference`. The key chip `?` is unchanged. The label column names a
   capability, and the capability is no longer a dialog. The same string is
   renamed on SettingsShortcuts in the same revision, because 5.6 renders both
   tables from one dispatcher and they may differ only in WHICH rows they draw.
4. **The card keeps everything else it draws.** Region: the card. Current
   content: the 40px header (`Keyboard shortcuts`, the `?` chip, the info
   circle, the close X), two columns of grouped rows, and the footer (`Cmd and
   Ctrl are interchangeable.`, `Change in Settings`, `Close`). New content:
   unchanged, including both dismiss controls -- a non-modal overlay keeps its X
   and its Close verb, and 6.8 keeps `Close` as text. Only the scrim, the focus
   trap and the position change.
5. **The legend decision, this board's version (C1, C3, C6).** Region: the legend
   at `[892,784 256x80]` (from line 400). This board encodes **one channel**:
   `Size: Most connected (Degree centrality)`, 2 / median 3 / 4, sqrt, on the cat
   graph. What the legend becomes: unchanged content -- no counts, no categorical
   rows and no state rows are drawn, so none of C3's three cuts bites. What
   replaces anything on the canvas: nothing. 80px, all of it floor.
6. **The one number in the legend box (C6).** Region: the legend div. Current
   content: `max-height: 334px`. New content: `max-height: 240px`. Nothing else
   changes.
7. **Rewrite two sentences of the legend comment (C2).** Region: the LEGEND
   comment. Current content: `No "Legend" caption, no palette name in the body, no
   counts on state rows, no block for a channel that is not encoded.` New
   content: `No "Legend" caption, no palette name in the body, no category
   counts, no state rows and no block for a channel that is not encoded (C3).
   Floor item 5 is now two obligations: the screen carries one block per encoded
   channel with its endpoints, median and scale word and every departure line;
   the export carries everything, composed from the encoding model at export
   scale (VOCAB 14.6).` And in `THIS BOARD:` replace `The dialog is an overlay;
   the canvas under it keeps its default-on-load encoding.` with `The reference
   overlay is non-modal and the canvas under it is live, so the legend is read
   through no scrim and keeps its default-on-load encoding.`
8. **The Explore panel behind it is now read at full ink -- and it still keeps
   the rows it has (D4 scope).** Region: the activity panel (search and scope,
   `Select all visible`, the `Select` split button, the empty `Notes` section).
   Current content: four rows, drawn thin because a scrim covered them. New
   content: unchanged. Record the reason: `D4's eight-section inventory and fixed
   order -- Filter builder, Filters, Sets, Views, Find a pattern, Neighborhood
   expansion, Step through time, Notes -- is applied on the ten boards D4 names
   (Main, ExplorePanel, MultiSelection, TimeSlider, ExploreNotesList,
   ExplorerNotes, ExplorerExpert, FilterBuilderExpert, InspectorGenomics,
   IpadInspector). This board is not one of them and its panel is a background
   state, not an Explore study. It is now read without a wash, which is a
   difference worth recording; it is not a licence to invent seven sections here.`
9. **The Escape ladder and the palette route, recorded (E4, D8).** Region: the
   overlay comment. Add: `Escape closes the overlay and returns focus to
   whatever opened it -- the ? key, the Help menu row, or the palette. Nothing
   else on the Escape ladder changes: with no scrim and no focus trap there is no
   trapped rung to unwind. The overlay joins the palette index under both of its
   names, "Keyboard shortcuts" and "Keyboard shortcuts reference" (E4 measure 1).`
10. **Guard.** Every table row, group name, key chip and Coming tag in the card is
    unchanged -- including the three deliberate refusals already recorded (no rows
    for the seven pop-outs, no Toolbar row, no Select/Pan mode rows) and the one
    1.7 addition (`Save as...` / Cmd+S). The canvas drawing, insights strip,
    toolbar, minimap, inspector and status bar are unchanged. The legend does not
    move.

## SettingsShortcuts

Screen group: nav. Settings overlay open over the body row, panel inset 24,
section nav 200 wide, **Keyboard shortcuts** pane active, one row mid-rebind.
Overlay card `[60,52 1368x812]`, section content `[285,127 1118x685]`. The
Explore panel, canvas, inspector and legend are behind the overlay; the legend is
at `[892,784 256x80]`, one channel.

1. **Rebinding becomes a 280 pop-over anchored to the key chip (D7, A4, B2).**
   Region: the shortcuts table, the Panels group, the `Toggle inspector` row --
   label at `[821,202 98x16]`, key chip at `[1203,201 160x18]` reading
   `Press a key... Esc to cancel`, then a second line under it holding the amber
   warning triangle, `Already used by Focus Explore search. Press again to take
   it over.` and the `Cancel` text button at `[1342,219 53x18]`. Current content:
   the recording happens in place and the conflict note inserts a line that
   pushes every remaining row of a roughly 60-row table down while the reader is
   staring at a key chip. New content: **delete the second line entirely** (the
   triangle, the amber sentence and the Cancel button), return the key chip to
   the binding it holds, and move the whole recording surface into a pop-over.
   The reflow is the concrete harm and A4's third clause is the reason a door is
   right here: it buys leaving the rows below operable while it is open.
2. **The row after the split.** Region: the same row's key cell. Current content:
   the chip reads `Press a key... Esc to cancel` in `#5f6873` with
   `box-shadow: 0 0 0 1px #5b8ff9`. New content: the chip reads `D` in the same
   chip style as every other key cell on this board, keeps
   `box-shadow: 0 0 0 1px #5b8ff9` because it is the lit opener while its surface
   is open (POP-13b), and keeps `cursor: pointer` because the chip IS the rebind
   control. The row's grid (`minmax(0, 1fr) 160px 24px`) and its selected fill
   `#28364e` are unchanged, and the 24px pencil stays revealed.
3. **Draw the pop-over open, anchored (B1, B2).** Region: a new element inside
   the Settings overlay card, after the section content. Position:
   `[915,201 280x148]` -- right edge 1195, 8px clear of the chip's left edge
   1203; top 201 on the chip's top 201. It opens leftward because a 280 pop-out
   to the right of the chip would end at 1651 and the overlay's inner edge is
   1416, so the dialog lane's "beside its opener inside the dialog rect" resolves
   to the left. Use the **pop-out container, anchored form** from VOCAB section 12
   with three changes: `position: absolute; left: 915px; top: 201px; width:
   280px;`, **delete the pin div** (E2 closes the pin set at four comparative
   surfaces -- the colour and gradient picker, Selection statistics with a pin
   active, the group profile and the AI console -- and a pop-out whose content is
   the parameters of the row that opened it has nothing to hold still), and title
   it with the action's own name. Contents, top to bottom:
   - header 32: `Toggle inspector`, then the close X (`title="Close (Esc)"`).
   - the recording chip, full width of the 256 content band, 24 tall, reading
     `Press a key... Esc to cancel` in `#5f6873` with
     `box-shadow: 0 0 0 1px #5b8ff9`.
   - the conflict line, copied verbatim from the row it leaves: the 12px amber
     triangle (`stroke="#f7b731"`, `<path d="M8 2.5l6 11H2z">` plus the two
     ticks) and `Already used by Focus Explore search. Press again to take it
     over.` at 11px `#f7b731`, wrapping inside 232px.
   - a right-aligned verb row, 24 tall, holding `Cancel` as a text button
     (`#a3a8b1`, 11px, 500) -- Cancel is on the never-iconify list (6.8).
   Height follows that content, about 148.
4. **The caret goes on the edge that faces the opener (B3, VOCAB 14.2).** Region:
   the new pop-over, as its first child. The opener is to its right, so the caret
   is on the right edge, pointing right, 6px, at the vertical centre of the
   opener's row and clamped 12px inside the pop-out's corners. Snippet, 14.2
   mirrored:
   ```html
   <div style="position: absolute; right: -6px; top: 12px; width: 6px; height: 12px; overflow: hidden;">
     <div style="position: absolute; left: -7px; top: 1px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-top: 1px solid #48525c; border-right: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```
   The chip's centre is 9px below the pop-out's top, so the 12px clamp fires and
   the caret sits at `top: 12px`. Record that it fired.
5. **Rewrite the rebind paragraph of the section comment (D7).** Region: the
   comment headed `<!-- Rebinding has no button (IK-7, IK-8, C2): the key chip is
   the click target ... -->` (from line 468). Current content: it describes
   recording in place, and says the reserved-combination message renders `in the
   same place as the conflict note drawn here`. New content: keep the pencil, the
   reset-to-default refresh icon and the reserved-key list exactly as they are,
   and replace the two sentences about where recording happens with: `Clicking a
   key chip opens a 280 pop-over anchored to that chip, titled with the action's
   own name, holding the recording field, the conflict note and Cancel. Nothing
   records in the table itself and no line is ever inserted between two rows: the
   1.7 form pushed the remaining rows of a roughly 60-row table down while the
   reader was staring at a key chip, and that reflow is exactly what a door buys
   its way out of (A4, third clause -- it leaves the rows below operable). The
   reserved-combination message, "Cmd+T is reserved by the browser. Try another
   key.", renders in the pop-over where the conflict note renders. Escape closes
   the pop-over before the overlay and returns focus to the chip; the pop-over
   closes with the overlay. The overlay is a region for as long as it is open, so
   at most one of these is ever open (E2).`
6. **Record the refusals for this pane, so a later pass does not "fix" them
   (D7).** Region: the same comment. Add: `6.11's anchor clause defines lanes for
   regions with a boundary to be clear of; a full-panel overlay has none, so a
   pop-over inside Settings has nothing to point at -- which is why Settings gets
   two exceptions and no more. In Settings the NAV ITEM is the door and the pane
   is what is behind it, which is 6.9's RT-1 door rule applied at section scale.
   Refused by name: the provider cards (an accordion, which anchors each key and
   model inside that provider's own row at full width), Detected > Change (four
   numeric fields, 6.2's inline threshold), the four XR rows (5.9 requires them
   learnable before the headset goes on, so Rule 7c does not fire) and Saved
   items (floor item 7 and 6.11's own refused example). The two exceptions are
   Rebind, here, and Layout size ratings on the Performance pane.`
7. **Rename the row that names the ? surface (D8, Rule 1).** Region: the table's
   Panels group, the row label at `[821,331 157x16]` reading
   `Keyboard shortcuts dialog` with the `?` chip. New content: `Keyboard
   shortcuts reference`. The chip is unchanged. D8 makes that surface non-modal
   and not a dialog; 5.6 renders this table and ShortcutsDialog's from one
   dispatcher, so the two boards may differ only in which rows they draw, and the
   rename lands on both in this revision.
8. **Add the two new palette-index rows to the comment (E4 measure 1).** Region:
   the section comment. Add: `Every door 1.8 opens joins the command palette
   index by both names. From this pane: "Rebind a shortcut". From Performance:
   "Layout size ratings". Neither takes a key binding (POP-13d).`
9. **The legend behind the overlay (C1, C3, C6).** Region: the legend at
   `[892,784 256x80]` (from line 361). This board encodes **one channel**:
   `Size: Most connected (Degree centrality)`, 2 / median 3 / 4, sqrt, on the cat
   graph. It carries no counts, no categorical rows and no state rows, so none of
   C3's cuts bites: the content is unchanged. One number changes:
   `max-height: 334px` becomes `max-height: 240px`. And in the LEGEND comment,
   replace `No "Legend" caption, no palette name in the body, no counts on state
   rows, no block for a channel that is not encoded.` with `No "Legend" caption,
   no palette name in the body, no category counts, no state rows and no block
   for a channel that is not encoded. 1.8 splits floor item 5 into an export
   obligation and a screen obligation (C2); the export legend is composed from
   the encoding model at export scale (VOCAB 14.6) and does not depend on this
   overlay's visibility.`
10. **Guard.** Every other row of the shortcuts table -- every group name, label,
    key chip, `or` separator, Coming tag and the `Read-only:` clause on XR -- is
    unchanged, as are `Click a key to rebind it.`, `Reset to defaults`, the
    section nav, the top bar, the status bar and the hidden panel and inspector
    behind the overlay. Only the `Toggle inspector` row changes shape, one label
    is renamed, and one pop-over is added.

## SavedItems

Screen group: nav. Settings overlay open, **Data management** pane active, the
Saved items housekeeping list drawn across three columns with two rows selected.
The Explore panel, canvas, inspector and legend sit behind the overlay; the
legend is at `[892,784 256x80]`, one channel.

1. **The legend behind the overlay, this board's version (C1, C3, C6).** Region:
   the legend at `[892,784 256x80]` (from line 428). This board encodes **one
   channel**: `Size: Most connected (Degree centrality)`, 2 / median 3 / 4, sqrt,
   on the cat graph. What the legend becomes: unchanged content. It draws no
   category counts, no categorical rows and no state rows, so all three of C3's
   cuts pass over it. What replaces anything on the canvas: nothing.
2. **The one number in the legend box (C6).** Region: the legend div. Current
   content: `max-height: 334px`. New content: `max-height: 240px`. Nothing else
   in the attribute changes.
3. **Rewrite two sentences of the legend comment (C2).** Region: the LEGEND
   comment. Current content: `No "Legend" caption, no palette name in the body, no
   counts on state rows, no block for a channel that is not encoded.` New
   content: `No "Legend" caption, no palette name in the body, no category
   counts, no state rows and no block for a channel that is not encoded. Floor
   item 5 is two obligations from 1.8 (C2): the canvas legend carries one block
   per encoded channel with its endpoints, median and scale word and every
   departure line; the exported image carries all of that plus counts, twelve
   categories, the coverage footer and one row per state in the frame, composed
   from the encoding model at export scale (VOCAB 14.6).`
4. **Record the refusal this board is the evidence for (D7, A4, F).** Region: the
   comment headed `<!-- SAVED ITEMS, the housekeeping list (SAV-12) ... -->`
   (from line 772). Current content: it describes the list and the eleven groups.
   New content: unchanged drawing, plus: `1.8 reviewed this list for disclosure
   and refused every door. It is 26 user-named rows across 11 kinds on one
   screen, which is floor item 7 (a scan surface of the user's own strings) and
   6.11's own refused example, and A4's discriminator refuses it independently: a
   door must buy width beyond the 256px band, survival across a selection change,
   or leaving the rows below operable, and this list buys none of the three. The
   per-row verbs stay hover-revealed under RT-7's hover split, which is the
   correct mechanism and not a disclosure failure. Recorded so a later compaction
   pass does not propose a "Saved items" pop-out for the third time.`
5. **Cross-reference the Reports group to the report editor (D1).** Region: the
   `Reports` group in column 3, the rows `Cat social one-pager  4 sections
   2 Sep` and `Fraud weekly  6 sections 27 Aug`. Current content: two RT-6 rows
   with a section count and a date. New content: unchanged drawing, plus in that
   group's comment: `D1 moves the nine-row report sections checklist out of the
   Present panel: a control whose home is a dialog may not acquire a second home,
   and its home is the report editor -- which 1.8 makes a non-modal bottom
   drawer beside the Data table drawer, not a dialog and not a pop-out, because
   the capability needs an editable description of up to 2000 characters plus
   methodology and findings sections and the 480 ceiling cannot hold them. These
   two rows are the saved configurations that drawer writes, and Present's
   Reports section is an RT-8 library whose RT-6 rows carry these same two names.
   The section COUNT stays here, because a saved item's row reports what it
   holds; the checklist itself is in the drawer.`
6. **Record that the Recipes, Styles, Filters, Views, Patterns and Formulas
   groups are unaffected (A4, D2, D3).** Region: the same comment. Add: `1.8
   proposed and refused doors for two libraries that this list registers: the
   Recipes library in Analyze and the Styles library in Style. Both fail A4's
   discriminator on all three counts, so both stay collapsed RT-8 sections whose
   header trailing slot carries the one fact a door stub would have carried --
   the recipe count for Recipes, the active style's own name for Styles. Nothing
   in this pane changes because of that; it is recorded here because this is
   where the same objects are enumerated.`
7. **Guard.** Every group, every row, both selected rows, the header's
   `2 selected` and `Delete 2 saved items`, the four preferences at the top of
   the pane, the section nav, the top bar, the status bar, and the panel,
   inspector and canvas behind the overlay are unchanged. Only the legend's cap
   and three comment paragraphs change on this board.

## ExplorerNotes

Screen group: nav. Canvas 1112 x 836 (no activity panel, the rail has no active
item), fraud ring, acct-4471 selected, four note markers drawn on the canvas.
Legend at `[892,663 256x201]`: two channels plus a two-row state block.
Inspector: one node, with the Notes section open and its newest note drawn in its
hover state. Status bar carries `4 issue types (27)`, `5 notes` and `1 selected`.

1. **The legend decision, this board's version (C1, C3, C6).** Region: the legend
   at `[892,663 256x201]`, the block from line 816. This board encodes **two
   channels** -- `Color: node type (type)` with four categorical rows (Accounts
   96, Devices 48, Phone numbers 34, Merchants 22) and `Size: Most connected
   (Degree centrality)` 1 / median 6 / 44, sqrt -- and draws **two state rows**,
   `Selected` and `Open notes`. What the legend becomes: the two channel blocks,
   complete; the four counts and the entire state block go. What replaces them on
   the canvas: nothing is added, because every removed fact is already printed by
   the region that owns it on this very board -- the counts by the inspector's
   reading and the Schema table, `Selected` by the inspector title row
   (acct-4471) and the status bar's `1 selected`, `Open notes` by the status
   bar's `5 notes` chip, by the note markers themselves and by the inspector's
   Notes section. Measured: **201 -> about 155**. This board is the largest
   legend cut in the nav group after ExplorerLargeGraph.
2. **Delete the four count spans (C3 item 2).** Region: the Color block's four
   rows. Current content: each row is `justify-content: space-between` with a
   trailing `<span style="flex: 0 0 auto; color: #7a828e;">96</span>` (then 48,
   34, 22). New content: the canvas categorical row from **VOCAB 14.5** verbatim
   -- swatch and label only. Delete the four count spans and the
   `justify-content: space-between` on those rows.
3. **Delete the state block (C3 item 1, C7).** Region: the legend's last two
   children: the `<div style="height: 1px; background: #374047;"></div>` divider
   and the `<div style="display: flex; flex-direction: column; gap: 4px;">`
   holding the white-ring `Selected` row and the speech-bubble `Open notes` row.
   New content: both deleted; the legend ends with the Size block and its
   `sqrt scale` line. C7 adds the row to 6.11's worked examples in exactly these
   words: `The legend's state-row block | delete, not move | App chrome, not an
   encoded channel; every state is already named by the region that owns it, and
   the export legend carries them because a static figure has no such region.`
4. **The one number in the legend box (C6).** Region: the legend div. Current
   content: `max-height: 334px`. New content: `max-height: 240px`. Nothing else
   in the attribute changes (`right: 12px; bottom: 12px; width: 256px;
   min-height: 80px; ...`).
5. **Rewrite the legend comment's two claims about notes (C2, C7).** Region: the
   LEGEND comment. Current content: `No "Legend" caption, no palette name in the
   body, no counts on state rows, no block for a channel that is not encoded.`
   and `THIS BOARD: ... Notes are their own encoded channel and their marker is
   the last state row; the note count is the inspector's and the status bar
   chip's, not the legend's (5.1).` New content: `No "Legend" caption, no palette
   name in the body, no category counts, no state rows and no block for a channel
   that is not encoded (C3). Floor item 5 is two obligations from 1.8: the screen
   carries one block per encoded channel with its endpoints, median and scale
   word and every departure line; the export carries all of that plus the counts,
   twelve categories, the coverage footer and one row per state drawn in the
   frame (VOCAB 14.6).` and `THIS BOARD: the fraud ring. Degree runs 1 to 44 over
   all 200 nodes (FIXTURES 2.2) and the median is 6. A note marker is app chrome,
   not an encoded channel, so the Open notes row leaves the canvas legend with
   the Selected row: the marker is on the node, the status bar reads "5 notes",
   and the inspector's Notes section lists them. Both rows are drawn in the
   EXPORTED legend, in LEGEND-1.8 section 5's order with their colour-agnostic
   swatches, because a static figure has no status bar and no inspector.`
6. **Record where the note editor opens from (D4, B1, B2).** Region: the
   inspector's Notes section, the newest note drawn in its hover state -- the
   note card at `[1177,419 255x69]` with `Edit` at `[1355,426 20x20]` and
   `Delete` at `[1381,426 20x20]`. Current content: the hover verbs are drawn and
   open nothing. New content: unchanged drawing, plus in the Notes comment: `The
   notes LIST stays inline -- floor item 7, and 6.11 refuses it a pop-out by name
   -- and the ROW EDITOR pops out anchored to the row it edits (D4). From this
   inspector that is the inspector lane: 280 wide, right edge 1152 (8px clear of
   the inspector's 1160 edge) so left = 872, top on this card's top, 419, and a
   6px caret on the pop-out's right edge, the edge that faces the opener, at the
   card's vertical centre and clamped 12px inside the corners. It carries no pin
   (E2 closes the pin set at four comparative surfaces and a note editor is not
   one of them). It follows the card while the card is in the region; when the
   card scrolls out it docks to the edge it left through, keeps the opener lit,
   drops its caret and grows a 20px return strip naming the note (VOCAB 14.3);
   it closes outright if the Notes section collapses or the region changes
   activity (B3, E1). Drawn open on NoteEditorPopout, not here.` Caret snippet
   for that board, 14.2 mirrored:
   ```html
   <div style="position: absolute; right: -6px; top: 12px; width: 6px; height: 12px; overflow: hidden;">
     <div style="position: absolute; left: -7px; top: 1px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-top: 1px solid #48525c; border-right: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```
7. **The pinned action block is already at D4's cap -- record it, change nothing
   (D4).** Region: the `ACTIONS, pinned (5.4)` block (from line 1130). Current
   content: two rows plus More. New content: unchanged. Record: `D4 caps the
   inspector action block at four rows in every selection state, with the
   remainder in More, each verb keeping its full text; what may never move into
   More is the split button's cost estimate and every departure line, because
   floor item 4 binds an estimate to the control that spends it. This block is
   already inside the cap.`
8. **Guard.** The rail, top bar, canvas drawing, the four note markers and their
   tints, the toolbar, the minimap, every inspector section and note row, and
   every status-bar slot are unchanged. The legend does not move and does not
   change width, corner or bottom offset; it loses two counts' worth of ink and
   one block.

## ExploreNotesList

Screen group: nav. Explore panel open with the **Notes** section live and
scrolled, canvas 832 x 836, fraud ring, nothing selected, note markers drawn.
Legend at `[892,709 256x155]`, two channels, no state block. D4 names this board
the best in the Explore set and the precedent for the notes pattern, so most of
its work is confirmation plus one inventory fix.

1. **The legend decision, this board's version (C1, C3, C6).** Region: the legend
   at `[892,709 256x155]`, the block from line 1164. This board encodes **two
   channels** -- `Color: node type (type)` with four categorical rows (Accounts
   96, Devices 48, Phone numbers 34, Merchants 22) and `Size: Most connected
   (Degree centrality)` 1 / median 6 / 44, sqrt. It draws no state rows already.
   What the legend becomes: both blocks, complete, minus the four counts. What
   replaces them on the canvas: nothing -- this board prints the same four counts
   in the inspector's reading, 285px to the right of the legend
   (`96 accounts, 48 devices, 34 phone numbers and 22 merchants`), which is
   exactly the duplication C1 measured across the set. Height is unchanged at
   155: the saving here is one unconditional rule in place of three conditional
   ones, not pixels.
2. **Delete the four count spans (C3 item 2).** Region: the Color block's four
   rows. Current content: `justify-content: space-between` with a trailing
   `<span style="flex: 0 0 auto; color: #7a828e;">96</span>` (then 48, 34, 22).
   New content: **VOCAB 14.5**'s canvas categorical row verbatim -- swatch and
   label only, the label taking the full width.
3. **The one number in the legend box (C6).** Region: the legend div. Current
   content: `max-height: 334px`. New content: `max-height: 240px`.
4. **Rewrite two sentences of the legend comment (C2).** Region: the LEGEND
   comment. Current content: `No "Legend" caption, no palette name in the body, no
   counts on state rows, no block for a channel that is not encoded.` and the
   `THIS BOARD:` clause `The notes list is a panel section; this canvas draws no
   note markers, so no note row is keyed.` New content: `No "Legend" caption, no
   palette name in the body, no category counts, no state rows and no block for a
   channel that is not encoded (C3). Floor item 5 is two obligations from 1.8:
   the screen keeps one block per encoded channel with its endpoints, median and
   scale word and every departure line; the export carries all of that plus the
   counts, twelve categories, the coverage footer and one row per state drawn in
   the frame (VOCAB 14.6).` and `THIS BOARD: the fraud ring. Degree runs 1 to 44
   over all 200 nodes (FIXTURES 2.2), median 6. The canvas draws note markers and
   the legend keys none of them: state rows are not canvas legend content from
   1.8, and the note count is the panel section's ("Open, 6 of 14") and the
   status bar's.`
5. **Bring the section inventory and order to D4's eight.** Region: the panel's
   unshipped run (from line 220, `<!-- Six contiguous unshipped rows are one
   dimmed group ... -->`) and the Notes section below it. Current content, in
   order: the `Select` split button, `Filter builder`, `Neighborhood expansion`,
   `Views`, `Find a pattern`, `Step through time`, then `Notes`. Two sections of
   the eight are missing and one is out of order. New content, the fixed order,
   every board: **Filter builder, Filters, Sets, Views, Find a pattern,
   Neighborhood expansion, Step through time (only when a Time role exists),
   Notes.** So: (a) move the `Neighborhood expansion` row to sit between
   `Find a pattern` and `Step through time`; (b) insert two live collapsed RT-8
   sections, `Filters` and `Sets`, between `Filter builder` and `Views`. Copy
   both rows from ExplorePanel.dc.html, which draws them at rest on the same
   dataset; the shape is the RT-8 empty section -- a 1px `#495057` divider, then a
   32px row with a closed chevron, the name in `#7a828e`, its info circle
   (`Saved filters: saved in this browser on this computer. Export a file to move
   it.` / `Selection sets: saved in this browser on this computer. Export a file
   to move it.`) and a 24px `+` in the trailing slot titled `Save as filter...`
   and `Save as set...`:
   ```html
   <div style="flex: 0 0 auto; display: flex; flex-direction: column;">
     <div style="height: 1px; background: #495057;"></div>
     <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 32px; cursor: pointer;">
       <div style="display: flex; align-items: center; gap: 4px; min-width: 0;">
         <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
           <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
         </div>
         <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #7a828e; white-space: nowrap;">Filters</span>
         <div title="Saved filters: saved in this browser on this computer. Export a file to move it." style="width: 14px; height: 14px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; color: #a3a8b1; cursor: default;">
           <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"></circle><line x1="8" y1="7" x2="8" y2="11.5"></line><line x1="8" y1="4.5" x2="8" y2="4.75"></line></svg>
         </div>
       </div>
       <div title="Save as filter..." style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
         <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="3" x2="8" y2="13"></line><line x1="3" y1="8" x2="13" y2="8"></line></svg>
       </div>
     </div>
   </div>
   ```
6. **Re-tag the unshipped run once it is split (5.8, 6.8, register 3).** Region:
   the dimmed group's one `Coming` tag on its divider row. Current content: one
   tag over six contiguous dimmed rows. New content: the two live sections split
   the run into `Filter builder` alone and then `Views, Find a pattern,
   Neighborhood expansion, Step through time`. Keep the group tag on the
   four-row run, where three-or-more consolidation still fires, and give
   `Filter builder` its own `Coming` tag on its own row, because an isolated
   unshipped row carries its own tag. Every dimmed row keeps its full name, its
   `#5f6873` ink, its `. Not built yet` title and no key chip. The `Select` split
   button keeps its own dimmed row above the sections: it is the Select control,
   not one of the eight sections, and D4 sends `Select matching filter`,
   `Select edges between selected` and `Select largest connected part` into its
   menu rather than into a Selection actions section.
7. **Record the two divergences this board keeps, so nobody silently "fixes"
   them.** Region: the section-order paragraph of that comment. Add: `Two things
   this board draws differently from Main and ExplorePanel, both deliberate and
   both pre-1.8: Filter builder is inside the unshipped run here and live there,
   and this panel draws no Around the selection section -- which is right, because
   D4 removes that section from Explore entirely and gives selection-scoped
   actions to the inspector, with the ego network's Hops and Max nodes moving to
   a 280 pop-over on the inspector's Ego network action. 1.8 settles the INVENTORY
   and the ORDER of the eight sections, not which of them have shipped on which
   fixture.`
8. **The Notes filter door draws primary, because a filter is applied (A6, VOCAB
   14.1).** Region: the Notes section header's trailing slot, the 24px funnel at
   `[267,373 24x24]`, `title="Filter notes"`, `color: #d5d7da`. Current content:
   primary ink, plain title, beside a header that reads `Open, 6 of 14`. New
   content: keep `color: #d5d7da` -- it is correct and this is the set's one
   drawn instance of A6's primary form -- and extend the title to name the
   deviation: `title="Filter notes. Showing open notes only"`. Record in the
   comment: `A6: a door glyph draws in the dimmed ink (#7a828e) when everything
   behind it is at its default and in the primary ink (#d5d7da) when anything
   behind it is not, at every density. Here the Open filter is applied and the
   header says so, so the funnel is primary. With the filter cleared it goes
   dimmed and the header reads the unfiltered count.`
9. **Confirm the notes pattern as the precedent, in words (D4).** Region: the
   `SECTION: Notes (Annotations)` comment (from line 282). Add: `D4 confirms this
   section as drawn and names it the precedent for the whole Explore set: the
   list stays inline (floor item 7, and 6.11 has already refused it a pop-out by
   name in the same words the user is now asking about); the header's four filter
   chips, the tag picker and the sort control collapse into this one filter door;
   and the row editor pops out anchored to the row it edits. Nothing in this
   section moves in 1.8.`
10. **Record where the note editor opens from (D4, B1, B3).** Region: the note
    rows, the first card at `[64,437 247x111]` with its `Edit` pencil at
    `[257,441 20x20]`. Current content: the pencil opens nothing. New content:
    unchanged drawing, plus in the comment: `The pencil opens the note editor as
    a 280 pop-out in the ACTIVITY PANEL lane: left edge 336, 8px clear of the
    panel's 328 edge, top on the card's own top -- 437 for this first card -- and
    a 6px caret on the pop-out's LEFT edge, the edge that faces the panel, at the
    card's vertical centre, clamped 12px inside the corners (VOCAB 14.2, the
    snippet verbatim). No pin (E2). It follows the card while the card is in the
    region, docks to the edge it left through with a 20px return strip if the
    list scrolls it out (VOCAB 14.3), and closes if the Notes section collapses
    or the activity changes. Drawn open on NoteEditorPopout.`
11. **Neighborhood expansion, when it is built, is a door row with a state mark
    (D4).** Region: the moved `Neighborhood expansion` row. Current content: a
    dimmed unshipped row. New content: unchanged drawing -- an unshipped row
    carries no switch, no gear and no key chip -- plus in the comment: `Built, it
    is one RT-8 door row whose trailing state mark names the remembered depth and
    type filter ("2 steps, 3 types"), which is where 5.4's "uses the last node
    and edge type filter" becomes readable before it acts. Do not add a gear to a
    dimmed row.`
12. **Guard.** The search row and its scope pair, the note search field and its
    marker toggle, all six note rows with their authors, times, tags, `Dictated`
    mark and hover verbs, the `Target not in graph (2)` group, the canvas
    drawing, the toolbar, the minimap, the inspector and the status bar are
    unchanged.

## ExplorerLoading

Screen group: nav. Analyze panel open while security-events-120k.csv is still
loading (48,000 of about 120,000 nodes, 40%), canvas 832 x 836 drawing the quick
grid, inspector Graph summary with Loading rows. Legend at `[892,784 256x80]`,
one block. Status bar carries the building progress with Cancel and the
Performance mode chip.

1. **The legend decision, this board's version (C1, C2, C6).** Region: the legend
   at `[892,784 256x80]`, the block from line 2807. This board encodes **one
   channel and it has no domain yet**: `Size: uniform (measuring)`, one swatch
   labelled `every node`, and the line `sized after load`. What the legend
   becomes: unchanged. It carries no category counts, no categorical rows and no
   state rows, so all three of C3's cuts pass over it, and `sized after load` is
   a DEPARTURE line, which C2's screen obligation keeps on the canvas by name.
   What replaces anything: nothing. Record the reasoning in the comment, because
   this is the one legend in the set that looks like a violation of LEGEND-1.8
   section 8 and is not: `Section 8 forbids a block for an UNENCODED channel -- a
   capability that is not built is not a channel. Size here is encoded and being
   measured: the canvas is drawing every node at one radius because the degree
   pass has not finished, and "sized after load" is the departure that says so.
   Floor item 2 requires it. The exported legend during a load carries the same
   two lines.`
2. **The one number in the legend box (C6).** Region: the legend div. Current
   content: `max-height: 334px`. New content: `max-height: 240px`. Nothing else
   in the attribute changes.
3. **Rewrite two sentences of the legend comment (C2).** Region: the LEGEND
   comment. Current content: `No "Legend" caption, no palette name in the body, no
   counts on state rows, no block for a channel that is not encoded.` New
   content: `No "Legend" caption, no palette name in the body, no category
   counts, no state rows and no block for a channel that is not encoded (C3).
   Floor item 5 is two obligations from 1.8: the screen keeps one block per
   encoded channel with its endpoints, median and scale word and every departure
   line; the export carries all of that plus counts, twelve categories, the
   coverage footer and one row per state drawn in the frame, composed from the
   encoding model at export scale and never captured from this overlay, which a
   Babylon scene capture cannot see (VOCAB 14.6).`
4. **The parameters door on the pointed-at card draws dimmed (A6, VOCAB 14.1).**
   Region: the `Most connected` row, drawn in its RT-7 hover state, the 24px
   chevron at `[248,241 24x24]` with `title="Parameters"`. Current content:
   `color: #d5d7da`. New content: `color: #7a828e`, title unchanged. Every
   parameter behind that chevron is at its default on this board, and A6 makes
   the ink the report: dimmed when everything behind the door is at its default,
   primary when anything is not. The hover state changes the ROW's fill, not the
   door's ink. This is the one A6 edit on this board and it is the pattern D3
   says every other gear in the product should copy.
5. **Record that door's anchor, measured, for AnalyzeParameters (A3, B2).**
   Region: the `pointed-at row` comment (from line 266). Add: `The chevron is a
   door and its pop-out is 280 in the ACTIVITY PANEL lane: left edge 336, 8px
   clear of the panel's 328 edge, top on this row's own top (237 on this board,
   the row running 237 to 269), with a 6px caret on its left edge at the row's
   vertical centre, clamped 12px inside the corners (VOCAB 14.2 verbatim). A3's
   depth obligation: exactly one click from the row that owns the property, and a
   door may never sit behind another door. It carries no pin (E2). Drawn open on
   AnalyzeParameters, where the gear is primary because a parameter deviates.`
6. **Record what the `+ Analysis` row is, and what it is not (D3).** Region: the
   comment headed `<!-- the whole 26-card catalogue lives one click behind this
   row ... -->` (from line 297) and the `+ Analysis` control at
   `[64,305 224x24]`. Current content: the comment describes the catalogue.
   New content: unchanged drawing, plus: `1.8 refuses the catalogue as an
   anchored pop-over and this is the one place where "anchor pop-overs to their
   parents" and 6.11's geometry point in opposite directions. Two reasons, the
   second measured: it is not one member of a list and not a report read once, it
   is the index of the product -- seven groups and twenty-six cards; and with the
   panel open the canvas band runs x 328 to 1160, so the method preview's fixed
   centred home occupies x 604 to 884, while a 360 pop-out at x 336 runs to 696
   and a 280 one to 616. Every rung of the width ladder collides with the
   preview, and 6.11's own remedy ("where that fallback is in play, the preview
   does not open") would cost the picker the one thing it has that a list of
   names does not. So the picker is the product's one panel-scale drill-down,
   5.3 stops calling it a popover, and 6.11's worked-examples table gains the
   row.`
7. **Record the two floor items on this panel that no door may take (floor 4,
   A2).** Region: the `SECTION: Suggested` comment (from line 212). Add: `Two
   things on this panel stay resident at every density and may not become gear
   contents in a later compaction. The Groups row's "about 20 s" estimate, because
   floor item 4 binds a cost estimate to the control that spends it -- which is
   also why Most connected carries none, degree over 48,000 nodes being under the
   ask limit. And the "Partial data (40% loaded)" departure line at the head of
   the panel, which is floor item 2 and the reason every Run on this board means
   something different from the same Run after the load.`
8. **This panel has no More section, and none is to be added (D3).** Region: the
   panel comment. Add: `D3 turns Analyze's More SECTION -- a header plus three
   verbs that each enter a mode or a dialog, five rows spent on one overflow
   glyph -- into a menu on AnalyzePanel. This board draws no More section and
   gains none: its panel is the loading state, its verbs are the four Run rows and
   the picker, and Compare has six other entry points.`
9. **Guard.** The Run | Results tabs, the departure line, the Suggested header
   and its `48,000 nodes` scope, all four analysis rows with their enabled,
   hovered and disabled states and their titles, the `+ Analysis` row, the quick
   grid drawing, the toolbar, the minimap, every inspector row including the
   Loading values, and every status-bar slot are unchanged. One chevron changes
   ink; one style number changes in the legend.

## ExplorerLargeGraph

Screen group: nav. Analyze panel open on the Find weak points group with the
pinned Bridges result card, canvas 832 x 836 in Performance mode,
security-events-120k.csv, 120,418 nodes and 1,104,206 edges, positions from file.
Legend at `[892,551 256x313]` -- **the tallest legend in the nav group and the
one board where C3's categorical cap actually bites**.

1. **The legend decision, this board's version (C1, C3, C6).** Region: the legend
   at `[892,551 256x313]`, the block from line 3162. This board encodes **two
   channels**: `Color: Groups (Communities, Label propagation)` with eleven
   ordinal rows, an `Other` row and a coverage footer, and `Size: Most connected
   (Degree centrality)` 1 / median 6 / 14,206, sqrt. What the legend becomes: the
   Color block keeps its header, its **five largest** rows and the `Other` row;
   the six rows Group 6 to Group 11 go, every count goes, and the coverage footer
   folds into the Other row. The Size block is untouched. What replaces them on
   the canvas: the Other row is the click target that opens the groups table,
   where all 3,399 groups and their counts live; the exported legend draws twelve
   rows with counts. Measured: **313 -> about 217**, inside the new 240 cap, and
   this board stops being a scrolling surface. The cap bites the least
   informative rows in the product -- `Group 1` to `Group 11` are ordinal labels
   whose swatch-to-name mapping carries rank and nothing else -- which is exactly
   the trade C3 accepts.
2. **Delete six categorical rows (C3 item 3).** Region: the Color block's row
   list. Current content: eleven rows, `Group 1` (`#e69f00`) through `Group 11`
   (`#e78ac3`). New content: five rows -- `Group 1` `#e69f00`, `Group 2`
   `#56b4e9`, `Group 3` `#009e73`, `Group 4` `#f0e442`, `Group 5` `#0072b2` --
   then the Other row. Delete the six row divs whose swatches are `#d55e00`,
   `#cc79a7`, `#b58a3c`, `#66c2a5`, `#8da0cb` and `#e78ac3`. **Do not touch the
   canvas, the minimap or any node fill**: the picture still paints eleven groups
   and the Okabe-Ito spelling LEGEND-1.8 settled is unchanged. The legend stops
   ENUMERATING groups 6 to 11; it does not claim they are grey.
3. **Delete the five remaining counts and rebuild the Other row (C3 items 2 and
   3, VOCAB 14.5).** Region: the five surviving rows and the Other row. Current
   content: each row is `justify-content: space-between` with a trailing count
   span (`18,412`, `11,206`, `8,930`, `7,415`, `5,088`), and the Other row is the
   same shape with `<span style="flex: 0 0 auto; color: #7a828e;">(3,388 groups,
   43% of nodes)</span>`. New content: the five group rows take VOCAB 14.5's
   canvas categorical row -- swatch and label only. The Other row takes 14.5's
   Other form, which carries the coverage footer inside its own label and is the
   click target:
   ```html
   <div title="Open the groups table" style="display: flex; align-items: center; gap: 6px; height: 14px; cursor: pointer;">
     <svg width="10" height="10" viewBox="0 0 10 10" style="flex: 0 0 auto;"><circle cx="5" cy="5" r="5" fill="#6b7480"></circle></svg>
     <span style="flex: 1 1 auto; min-width: 0; font-size: 11px; color: #d5d7da; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Other <span style="color: #7a828e;">(3,388 groups, 43% of nodes)</span></span>
   </div>
   ```
   The string `(3,388 groups, 43% of nodes)` is unchanged and stays true: it is
   the neutral bucket the canvas actually paints, and C3's own spec text quotes
   this board's number.
4. **Keep the colouring departure, reworded (floor item 2, C2).** Region: the
   line under the Color block,
   `<span style="font-size: 10px; line-height: 1.2; color: #7a828e;">Top 11 of
   3,399 groups colored</span>`. Current content: it reads as a coverage footer,
   which the Other row now carries. New content: keep the element, at the same
   10px `#7a828e`, and change the string to `Top 11 of 3,399 groups colored; the
   5 largest named`. It is not a duplicate of the Other row: it reports the
   CANVAS cut (how many groups get their own ink) and now also the LEGEND cap
   (how many are named), which is what stops a reader counting more colours than
   rows. The arithmetic to keep straight, and to put in the comment: five named
   rows hold 51,051 nodes, Other holds the 52,241 in the 3,388 uncoloured
   groups, and the 17,126 in the six coloured-but-unnamed groups are the gap this
   line accounts for. C2's screen obligation keeps every departure line on the canvas.
5. **The one number in the legend box (C6).** Region: the legend div. Current
   content: `max-height: 334px`. New content: `max-height: 240px`. The measured
   height after the cuts is about 217, so the cap binds nothing today and forbids
   regrowth.
6. **Rewrite the legend comment, and state the export contract in full (C2, C4,
   VOCAB 14.6).** Region: the LEGEND comment. Current content: `No "Legend"
   caption, no palette name in the body, no counts on state rows, no block for a
   channel that is not encoded.` New content: `No "Legend" caption, no palette
   name in the body, no category counts, no state rows, five categorical rows
   plus Other, and no block for a channel that is not encoded (C3). Floor item 5
   is two obligations from 1.8. Screen, this board: two channel blocks, five
   group rows, the Other row carrying its coverage footer, the colouring
   departure line, and the Size ramp with its scale word. Export, this board, and
   none of it optional: both channels; the twelve largest categories with their
   counts, which on this fixture is the eleven FIXTURES names -- 18,412 / 11,206
   / 8,930 / 7,415 / 5,088 / 4,271 / 3,640 / 2,905 / 2,462 / 2,118 / 1,730 --
   and no invented twelfth; then Other with the coverage footer; the colouring
   departure; and one row per state drawn in the frame. It is composed
   from the encoding model at export scale and drawn into the image, never
   captured from this DOM overlay -- ScreenshotCapture.ts calls
   CreateScreenshotAsync(engine, camera, ...), which cannot see it -- and it does
   not depend on the legend's visibility: hiding the legend with L does not
   remove it from an export.`
7. **The graph-level Weight pair stays resident, forever (A2, 6.10a).** Region:
   the `GRAPH-LEVEL FACTS` row (from line 200): `N 120,418` and
   `W count strength`. Current content: an RT-1 row stating the node scope and
   the weight column with its sense. New content: unchanged, plus in that
   comment: `6.10a, new in 1.8: a control whose wrong value is invisible until it
   does damage stays resident however rarely it is touched and may not become
   gear contents at any density. The Weight and "Treat as" pair is named in that
   subsection by hand -- a wrong weight sense silently inverts every path result.
   Do not fold this row into a parameters gear in a later compaction pass.`
8. **Record where the run-record Details chevron opens (A3, B2, G).** Region: the
   pinned result card's one-line run record at `[73,671 217x15]`
   (`Betweenness, all 120,418 nodes`, with the full record in its title) and the
   `Details` chevron at `[294,671 16x16]`. Current content: the chevron opens
   nothing, here and on ten other boards. New content: unchanged drawing, plus in
   the card comment: `The chevron opens the run record as a 360 pop-out in the
   activity panel lane: left edge 336, top on this row's own top, 671, with a 6px
   caret on its left edge at the row's vertical centre, clamped 12px inside the
   corners (VOCAB 14.2 verbatim), no pin (E2). 360 is the rung 6.11 gives a
   sentence-plus-user-ids report. A3: one click from the row that owns the
   record, and no door behind a door. Drawn open on RunRecordPopout.`
9. **The cost gate stays inline, and this board is the proof (D2, B4, VOCAB
   14.4).** Region: the `Bridge edges` card -- the amber block
   `Filter to a part, or run the approximate version` and the outlined
   `Run anyway (about 3 h, cannot cancel)` button. Current content: both inline,
   under the control that spends the cost. New content: unchanged, plus in the
   card comment: `A cost GATE is never a floating surface: floor item 4 binds the
   estimate to the control that spends it and 6.11's second clause forbids a door
   between them, so it renders inline on the row that raised it, exactly as
   drawn. What 1.8 does change is the shape of a CONFIRM -- a cost estimate, cap
   or destructive confirm is a pop-out with two verbs, taking its region's lane
   and its opener row's shared edge line, 280 wide, with no close X and no pin,
   Escape cancelling and returning focus to the opener (VOCAB 14.4). StyleDiverging
   drew that as a free-floating card and is corrected; this board's gate is not
   that thing and must not be turned into one.`
10. **Record the two Analyze refusals that touch this panel (D3, A4).** Region:
    the panel comment (from line 189). Add: `Analyze is already the model 1.8
    asks every other activity to copy, and two of its parts are refused a door by
    name so a compaction pass does not "improve" them: Metric histograms stays
    inline, because W23 phase 2 is a scan across five distributions and a reader
    comparing five cannot open five doors; and History stays inline, which 6.11
    already names in its refused list. The Recipes library stays a collapsed RT-8
    section rather than a door -- it fails A4's discriminator on all three counts
    (width beyond 256, survival across a selection change, leaving the rows below
    operable) -- and its header's trailing slot carries the recipe count, which is
    the same information a door stub would have carried, in the same one row,
    with no extra click.`
11. **Guard.** The panel's cards, their departure lines, their Coming tags and
    their estimates, the pinned result card's reading, departure, record, id
    rows, chart row and RT-7 action row, the canvas drawing and its 20 labels,
    the filter strip, the insights strip, the minimap heatmap, the inspector and
    every status-bar slot are unchanged. The legend does not move and does not
    change width, corner or bottom offset.

## SettingsPerformance

Screen group: nav. Settings overlay open over the body row, panel inset 12,
section nav 200 wide, **Performance** pane active, security-events-120k.csv
loaded and in Performance mode. Overlay card `[60,52 1368x812]`, section content
`[285,218 1118x597]`, two columns at x 285 and x 854, each 549 wide. The Explore
panel, canvas, inspector and legend are behind the overlay; the legend is at
`[892,784 256x80]`, one channel. Resident control rows in this pane: about 33
before, about 25 after, and the whole difference is item 1.

1. **Layout size ratings collapses to one row (D7, 6.2).** Region: the right
   column, the block headed `<!-- Layout size ratings: a table of capability
   names and their values, floor item 6, so it is not compacted ... -->` (line
   452) -- a 24px header row at `[854,375 549x24]` with its info circle, then a
   `[854,403 549x151]` container holding eight rows on a 19px pitch, each a
   230px name column (plain name plus its technical name in `#7a828e`) and a
   108px rating select at x 1092. Current content: a header plus eight rows of
   constants the spec itself calls "benchmarked before release" -- and 35px below
   it sits `Layout stepping`, which collapses three settings into one row reading
   `engine default`. Same pane, same content class, two treatments, and that is
   the inconsistency the user named. New content: delete the header row and the
   eight-row container and put in their place **one row in the Layout stepping
   row's exact shape**, at `[854,375 549x28]`:
   ```html
   <div style="display: flex; align-items: center; gap: 8px; height: 28px;">
     <div style="display: flex; align-items: center; gap: 4px; flex: 0 0 230px; min-width: 0;">
       <span style="min-width: 0; font-size: 11px; line-height: 1.2; color: #7a828e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Layout size ratings</span>
       <div title="Drive the All layouts warnings; benchmarked before release." style="width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; color: #a3a8b1; cursor: default;">
         <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"></circle><line x1="8" y1="7" x2="8" y2="11.5"></line><line x1="8" y1="4.5" x2="8" y2="4.75"></line></svg>
       </div>
     </div>
     <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; flex: 0 0 224px; width: 224px; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-shadow: 0 0 0 1px #5b8ff9; font-size: 11px; line-height: 1.2; color: #d5d7da; box-sizing: border-box; font-style: italic; cursor: pointer;">
       <span style="min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">8 layouts, benchmarked defaults</span>
       <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><polyline points="4,6 8,10 12,6"></polyline></svg>
     </div>
   </div>
   ```
   The info circle is the one already on the header row, moved onto the label
   with its title unchanged. The `box-shadow: 0 0 0 1px #5b8ff9` is there because
   this board draws the door OPEN and the opener is lit (POP-13b); a resting
   board draws the field without it. Eight rows and a header become one row:
   -151px in this column and about 33 resident control rows becomes about 25.
2. **Why the door is the field's own chevron and not a ninth glyph (D5, D7,
   A4).** Region: the same block's comment. Add: `6.2's arithmetic decides this
   -- a schema group of more than four rows renders as a 3a pop-out opened from
   the row it belongs to -- and D7 names it a gear. The door here is the RT-1
   in-field chevron, which is the same door at field scale and the form D5 gives
   Table join's Conflicts field; it is used because the twin row 35px below
   already uses it, and a third disclosure glyph in one pane is precisely the
   inconsistency this item exists to remove. The chevron keeps the twin's
   downward form so the two rows read as one grammar. A4's discriminator says a
   door here is right and a collapsed section is not: a three-column table of
   capability names, technical names and ratings does not fit the 224px field or
   the 256px band, so the door buys width -- which is why 6.11's 360 rung is the
   one it takes.`
3. **Draw the pop-out open, anchored (B1, B2).** Region: a new element inside the
   Settings overlay card. Position: `[724,375 360x244]` -- right edge 1084, 8px
   clear of the field's left edge 1092; top 375 on the row's own top. It opens
   leftward because a 360 pop-out to the right of the field would end at 1460 and
   the overlay's inner edge is 1416, so the dialog lane's "beside its opener
   inside the dialog rect" resolves to the left. Height cap check: a pop-out is
   never taller than half its owning region, and half of the overlay's 812 is
   406, so 244 clears it. Use the **pop-out container, anchored form** from VOCAB
   section 12 with `position: absolute; left: 724px; top: 375px; width: 360px;`,
   the pin div **deleted** (E2 closes the pin set at four comparative surfaces),
   the close X kept, and the title `Layout size ratings`. Body: a two-column
   table on a 24px pitch, name column 214 (plain name at 11px `#d5d7da`, then the
   technical name at 11px `#7a828e`), rating control 112 wide in the same select
   shape the pane uses. Eight rows, in the drawn order, with their values
   verbatim: `Force directed` `ngraph` 10k; `Layers from a root` `bfs` 10k;
   `Rings around a node` `radial` 2k; `Layered` `sugiyama` 500; `Circle`
   `circular` any size; `Shells` `shell` any size; `Layers by attribute`
   `multipartite` 10k; `From file` `fixed` any size. Nothing is renamed, nothing
   is dropped: these are capability names and their data, which is floor item 6.
4. **The caret goes on the edge that faces the opener (B3, VOCAB 14.2).** Region:
   the new pop-out, as its first child. The opener is to its right, so the caret
   is on the right edge, 6px, at the vertical centre of the opener's row (389,
   which is 14px below the pop-out's top and clears the 12px corner clamp):
   ```html
   <div style="position: absolute; right: -6px; top: 8px; width: 6px; height: 12px; overflow: hidden;">
     <div style="position: absolute; left: -7px; top: 1px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-top: 1px solid #48525c; border-right: 1px solid #48525c; box-sizing: border-box;"></div>
   </div>
   ```
5. **The stub reports whether anything behind it deviates (A6, VOCAB 14.1).**
   Region: the new row's field. Current content: n/a. New content: on this board
   every rating is at its benchmarked default, so the field carries the
   placeholder form -- `font-style: italic`, the string `8 layouts, benchmarked
   defaults`, the chevron in `#7a828e` -- which is the field-scale spelling of
   14.1's dimmed gear. Record the other half in the comment: `With any rating
   changed the field drops the italic, draws its text and chevron in the primary
   ink, and reads the deviation rather than the default -- "Force directed 25k, 7
   at defaults". That is A6's only job: hiding must never hide a non-default.`
6. **Record the second escape hatch, and what this board looked like before it
   (E4 measure 4).** Region: the same comment. Add: `Settings > Appearance gains
   "Keep advanced sections open", default off, which renders every gear pop-out's
   contents as inline rows in its own section instead, in the same order and at
   the same 32px pitch. Turned on, this pane draws exactly what it drew before
   1.8: the eight rating rows in place, and a pane that may scroll -- which is the
   cost the reader accepted by turning it on. It ships in the same revision as the
   doors, for the same reason Rule 11's first hatch ships with the glyphs. Two
   constraints: it affects only pop-outs whose contents are field rows at 280,
   and reports and matrices at 360 and 480 stay doors at every setting. This
   pop-out is a 360 three-column table, so it is one of the ones that stays a
   door -- the escape hatch does not reopen it, and the palette row does.`
7. **Record the palette rows and the refusals (E4 measure 1, D7).** Region: the
   `SECTION CONTENT: Performance` comment (line 359). Add: `Every door 1.8 opens
   joins the command palette index by both names; from this pane that is "Layout
   size ratings", and from the Keyboard shortcuts pane "Rebind a shortcut".
   Neither takes a key binding. Refused in this pane, with reasons, so a later
   pass does not "fix" them with pop-overs: the readout, the "Rules in force"
   line and the warn-and-allow line are floor items 1, 2 and 4 and report THIS
   graph; Detected > Change discloses four numeric fields, which is exactly
   6.2's inline threshold; the four XR rows stay resident because 5.9 requires
   them learnable before the headset goes on, so Rule 7c does not fire; and in
   Settings generally the NAV ITEM is the door and the pane is what is behind it,
   which is 6.9's RT-1 door rule at section scale. A full-panel overlay has no
   boundary for a pop-over to be clear of, which is why this pane gets one
   exception and not five.`
8. **The legend behind the overlay (C1, C3, C6).** Region: the legend at
   `[892,784 256x80]`, the block from line 261. This board encodes **one
   channel**: `Size: Most connected (Degree centrality)`, 1 / median 6 / 14,206,
   sqrt, on security-events-120k.csv. What the legend becomes: unchanged content
   -- no counts, no categorical rows, no state rows, so none of C3's cuts bites.
   What replaces anything on the canvas: nothing.
9. **The one number in the legend box, and two sentences of its comment (C6,
   C2).** Region: the legend div and its comment. Current content:
   `max-height: 334px`, and `No "Legend" caption, no palette name in the body, no
   counts on state rows, no block for a channel that is not encoded.` New
   content: `max-height: 240px`, and `No "Legend" caption, no palette name in the
   body, no category counts, no state rows and no block for a channel that is not
   encoded (C3). Floor item 5 is two obligations from 1.8: the canvas keeps one
   block per encoded channel with its endpoints, median and scale word and every
   departure line; the exported image carries all of that plus counts, twelve
   categories, the coverage footer and one row per state in the frame, composed
   from the encoding model at export scale (VOCAB 14.6).`
10. **Guard.** Every other row of the Performance pane is unchanged: the reading,
    the Rules in force line, the warn-and-allow block, the Detected block and its
    two thresholds, Subset load default, Progressive loading, both caps, the
    Performance mode group with its three dimmed rows and `Apply now (about 6
    s)`, the four Analysis rows with their Coming tags, `Layout stepping`, the
    four XR rows, the section nav, the top bar, the status bar and everything
    behind the overlay. One block collapses to one row, one pop-out is added, one
    legend number changes.
