# Sweep findings after revision 1.5 (read-only pass over 39 artboards)

Format rules hold on all 39 files. Density: Format rules hold on all 39 files: exactly one `<script src="./support.js"></script>` line each and no other script tag, no data-dc-script, zero non-ASCII bytes anywhere, one `<x-dc>` and one `<helmet>` per file, correct root size (1440x900 on 37, 1180x820 on IpadPanel and IpadInspector, matching canvas.json), and no handlebars, sc-for, sc-if, img tags or external URLs.

Density: 22 artboards reported a clean pre/post count on the same measure. Those went from 3,611 visible pieces of information to 3,039 -- a reduction of 572, or 15.8 per cent, with a median per-board cut of about 14 per cent. The deepest cuts land where the spec said they should, on the reference and settings screens: SettingsPerformance -60 (-22%), ShortcutsDialog -42 visible strings (-23%), DataPanelLoaded -38 (-20%), ExploreNotesList -37 (-25%), ExplorerLargeGraph -36 (-17%), SettingsShortcuts -34 (-12%), CategoryTable and ViewsMenu -29 each (ViewsMenu -27%, the largest proportional cut), Welcome -27 (-24%), ExplorerAfterCard -27 (-14%), CompareSplit -23 (-12%), TimeSlider and DataTableDrawer -21 each. AnalyzeSweep cut rendered slots hardest, 175 to 137 (-22%), against only 8 distinct strings removed, which is the clearest single case of the pass removing restatement rather than facts.

Four boards gained: HistoryPopover +14 (a VR history group, three second lines and 12 row tooltips), MultiSelection +2, AiPanel +1, CommandPalette +1. Ten reported no change because they already carried the 1.5 state when their agent opened them (StylePanel, AnalyzePanel, PresentPanel, Settings, InsightsWide, IpadInspector, ImportOptions, ImportLargeFile, ImportAddToGraph, StyleDiverging), and three more (ExplorePanel, IpadPanel, ExplorerLoading) reported the same with a reconstructed pre-1.5 delta of roughly -9, -29 and -16. Summing all 39 as reported gives 6,199 to 5,674, or -8.5 per cent, but that figure understates the real reduction because 13 of the "before" numbers were themselves measured after 1.5 had been applied.

The reduction is a re-home, not a deletion. The 39 boards now carry 670 native title strings and 97 info circles against a pre-1.5 baseline where most boards had none, plus several hundred facts recorded in HTML comments (menus, collapsed Counts rows, overflow twins). Two boards illustrate the trade cleanly: DataTableDrawer dropped 21 visible strings while gaining 35 tooltip sentences, so its total addressable information rose from 142 to 156; ImportRecognised dropped 9 visible strings and gained 22 tooltips. The one place the re-home is incomplete is the 55 info circles that carry no title (SettingsPerformance holds 22 of them), where the sentence left the surface and landed only in a comment.

## Problems to fix

### S01
Artboards: 32 of 39 -- every artboard except DataPanelLoaded, DataTableDrawer, ImportAddToGraph, ImportLargeFile, ImportOptions, ImportRecognised, TableJoin

Problem: 227 of the 456 icon-only 24x24 controls carry no title, so they have no accessible name at all. The gap is systematic, not random: the shared top-bar cluster (inspector toggle, compare, share, close, undo, redo, collapse chevron) is titled in the 7 Data/Import-family boards (7-9 titles each) and untitled everywhere else (0-2 titles each). VOCAB 10 'Icon-only button' states that in artboards the tooltip is the native title attribute and that every icon-only control carries an accessible name equal to it, so on 32 boards that contract is unmet. Two controls added by 1.5 are also untitled: the inspector title-row pin in HistoryPopover and CategoryTable, and the section-header overflow in ExplorePanel, ExplorerLargeGraph, ExplorerLoading, IpadPanel, CategoryTable, ExploreNotesList, StyleDiverging, FilterBuilderExpert.

Proposed fix: Copy the seven top-bar titles verbatim from TableJoin (the most complete board) into the other 32 artboards: Toggle inspector (D), Compare two views, Share this view, Close the panel (Cmd+B), Undo (Cmd+Z), Redo (Shift+Cmd+Z), plus the zoom cluster. Then add title="Pin" to the HistoryPopover and CategoryTable inspector pins and title="More" to the eight untitled overflow buttons.

### S02
Artboards: Force directed - settled in AiPanel, AnalyzePanel, AnalyzeSweep, CommandPalette, DataPanelLoaded, ExplorePanel, ExplorerAfterCard, ExplorerExpert, FilterBuilderExpert, ImportAddToGraph, InsightsWide, IpadPanel, Main, MultiSelection, PresentPanel, Settings, TimeSlider (17). Force directed (ngraph) - settled in CategoryTable, ContextMenu, DataTableDrawer, ExploreNotesList, ExplorerNotes, HistoryPopover, InspectorGenomics, SettingsShortcuts, ShortcutsDialog, StyleDiverging, StylePanel, TableJoin, ViewsMenu (13)

Problem: The status bar layout chip is drawn with two different visible strings. VOCAB section 10 'Strings this revision standardizes' fixes it as `Force directed - settled`, but 13 boards render `Force directed (ngraph) - settled` because their own entry in ARTBOARD-CHANGES-1.5.md (e.g. ContextMenu item 5b) prescribes the (ngraph) form. Its tooltip has four forms too: `Layout. Force directed (ngraph), settled` (8), `Force directed - settled` (4), `Force directed (ngraph) - settled` (3), `Force directed (ngraph)` (2). This is the single most-repeated string in the set and it differs between two boards a viewer sees side by side (Main vs ContextMenu).

Proposed fix: Pick one and apply it to all 31 boards that draw the chip. Recommended: keep the VOCAB string `Force directed - settled` as the chip text and put the technical name in one tooltip form, title="Force directed (ngraph) - settled", so 6.3's pair is still reachable; then amend the (ngraph) instruction in the 13 affected checklist entries so a later pass does not re-split it.

### S03
Artboards: ExplorePanel (run of 8), Main (run of 4), ExploreNotesList, HistoryPopover, MultiSelection, SettingsPerformance (runs of 3)

Problem: The 1.5 Coming override says three or more contiguous unshipped rows in one list are dimmed to #5f6873, disabled, and carry the tag once on the group header or divider; only isolated rows keep the per-row tag. Six boards still draw contiguous runs of 3+ rows at full #d5d7da brightness with a tag on every row. ExplorePanel's inspector selection-action block is the worst: 8 consecutive chips (Merge selected nodes..., Simulate removing (3), Remove selected, Tag..., Set attribute on selection..., Pin selected positions, Layout selected nodes only, Pin to report) each with its own tag. Main is internally contradictory: it draws a 4-run of bright tagged rows (Select all visible, Select, Filter builder, Saved filters) in the same panel as a correctly-formed dimmed group under one 'Coming soon' note. HistoryPopover's 3-run is the one its checklist item 13 explicitly ordered, so the checklist and the vocabulary disagree.

Proposed fix: In each of the six, dim the run to #5f6873, remove the per-row tags, and put one 'Coming soon' label plus the info circle carrying 'Dimmed rows are not built yet.' on the group header or the divider above the run -- the treatment Main, ExplorerExpert, ExplorerLargeGraph, TimeSlider and eight others already use. Correct HistoryPopover item 13 in ARTBOARD-CHANGES-1.5.md so it stops prescribing the per-row form.

### S04
Artboards: Vertical dots r=0.75 (VOCAB canonical) in AnalyzePanel, CommandPalette, ExploreNotesList, ExplorerLargeGraph, Main, SettingsPerformance, SettingsShortcuts, ShortcutsDialog, StylePanel, ViewsMenu, ExplorerAfterCard, InspectorGenomics; horizontal dots r=0.75 in AnalyzePanel, IpadPanel, ExplorePanel, ExplorerLargeGraph, ExplorerLoading; horizontal dots r=1 in DataPanelLoaded, ImportAddToGraph, CategoryTable, ExploreNotesList, StyleDiverging; vertical dots r=1 in FilterBuilderExpert

Problem: The section-header overflow control -- one verb -- has four drawings and four naming conventions, which is the exact 'one verb, one drawing' failure 6.8 warns about. AnalyzePanel alone draws both the vertical r=0.75 form (title 'More', on the History header) and the horizontal r=0.75 form (title 'Run all (4)', on question-group headers). The names disagree too: the identical glyph is titled 'More' on 10 boards, 'Run all (3)/(4)' on AnalyzePanel, IpadPanel and ExplorerAfterCard, and 'More. Color by this, Size by this, Filter by this, Show in table' on InspectorGenomics. The comments confirm the control is an overflow whose menu holds Run all (N), so the name is wrong rather than the glyph.

Proposed fix: Standardise on the VOCAB snippet's vertical three dots at r=0.75 everywhere, and title every one of them 'More'. Move 'Run all (4)' and the InspectorGenomics item list out of the title and into the HTML comment that already records each menu's contents.

### S05
Artboards: AnalyzeSweep, CategoryTable, DataTableDrawer, FilterBuilderExpert, HistoryPopover (5 non-canonical) against AiPanel, CompareSplit, ContextMenu, ExplorePanel, ExplorerAfterCard, ExplorerExpert, ExplorerNotes, InspectorGenomics, IpadInspector, MultiSelection, StylePanel, DataTableDrawer (13 canonical)

Problem: 1.5 consolidated the pushpin to the upright form `M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z` plus its stem line, and 13 boards adopt it. Five boards still draw the inspector title-row pin as a diagonal pushpin, and each draws a different diagonal: AnalyzeSweep `M9.5 2.5l4 4-2 1-2.5 3.5...`, CategoryTable `M9.5 2.5l4 4-2 1-1.5 3.5...`, DataTableDrawer `M9.5 2.5l4 4-2.5 1 1 3.5...`, FilterBuilderExpert `M9.5 2l4.5 4.5-1.5 1.5...`, HistoryPopover `M9.5 2.5l4 4-2.5.5-2.5 2.5...`. These are the drifted pushpins 6.8 names as the reason the register is closed, and two of them (CategoryTable, HistoryPopover) also carry no title, so the drawing is the control's only name.

Proposed fix: Replace the five diagonal paths with the upright pushpin path from VOCAB section 10 verbatim, and give the CategoryTable and HistoryPopover pins the same title the other boards use ('Pin' or 'Pin as A' as the surface requires).

### S06
Artboards: CommandPalette, ExplorePanel, ImportOptions, ImportRecognised (deviating) against AnalyzePanel and DataTableDrawer (canonical)

Problem: Six info-circle popovers are drawn open and only two match the VOCAB snippet (`position: absolute; left: 0; top: 20px; padding: 4px 8px`). CommandPalette uses `right: 0; top: 20px`; ExplorePanel uses `right: 0; top: 28px` and `padding: 8px` instead of `4px 8px`; ImportOptions uses `right: 0; top: 42px`; ImportRecognised uses `left: 236px; top: -2px`, which places the bubble beside the circle rather than under it, so it does not read as belonging to that control. The task's premise -- the info circle drawn identically everywhere -- holds for the 97 resting circles (all 14px box / 12px glyph / #a3a8b1 or #d5d7da) but fails for the open state.

Proposed fix: Restore `left: 0; top: 20px; padding: 4px 8px` on all four. Where a left-anchored 250px bubble would be clipped by a narrow parent (CommandPalette's palette, ImportRecognised's column), flip only the horizontal anchor to `right: 0` and keep `top: 20px` and the padding, and note the flip in a comment so the deviation is bounded to one axis.

### S07
Artboards: 55 untitled circles across SettingsPerformance (22), ImportOptions (8), TableJoin (5), ImportAddToGraph (4), CompareSplit (2), ContextMenu (2), FilterBuilderExpert (2), HistoryPopover (2), SettingsShortcuts (2), AnalyzeSweep, ExploreNotesList, ShortcutsDialog, StyleDiverging, Settings, ImportRecognised (1 each); 42 titled circles across the rest

Problem: The info circle hides its sentence two different ways. On 20 boards the sentence rides in the circle's title, so hovering the artboard retrieves it. On 15 boards the circle is bare and the sentence exists only in an HTML comment -- SettingsPerformance moved 20 explanations behind circles and titled none of them, so on the densest Settings screen nothing the circles hide is retrievable from the rendered page. Both patterns are defensible against the VOCAB snippet (which shows no title), but they cannot both be the convention, and the split makes it impossible to tell whether a bare circle is an unfinished one.

Proposed fix: Adopt the titled form everywhere, since it is what 6.7's 'the same string is the control's accessible description' asks a static mock to demonstrate: copy each sentence out of its HTML comment into a title on its circle in the 15 bare-circle boards. Keep the comment as well where it also records menu contents.

### S08
Artboards: ExplorerExpert, IpadInspector, InspectorGenomics

Problem: Three boards explain the same thing -- percentile in the inspector's Computed metrics -- with three different strings, and two of them report rather than teach: 'Percentile among all 200 nodes: only 1 node scores higher.' (ExplorerExpert) and 'Percentile among all 41,200 nodes: only 12 nodes score higher.' (IpadInspector) both change word for word when the data changes, which 6.7's test makes reported text that must stay on screen. Only InspectorGenomics's 'Percentile compares this node with every other node: 98th percentile means it scores above 98 per cent of them.' survives the data being taken away. 6.7 also states the same string appears verbatim wherever it appears, so three variants for one concept breaks 6.3 as well. MultiSelection has the same mixed shape: 'A: acct-4471. Arrows show whether the selection is above or below the whole-graph value. A is the pinned card.' opens with a reported id.

Proposed fix: Use the InspectorGenomics sentence as the single canonical percentile popover on all three boards. Split the data half out and leave it inline next to the value where it already belongs (ExplorerExpert's rank cell already reads 'Rank 1 of 200'). In MultiSelection, drop the leading 'A: acct-4471.' from the popover -- the id is already drawn in the column header.

### S09
Artboards: Close/hide: CommandPalette, ImportAddToGraph, ImportLargeFile, ImportOptions, ImportRecognised, TableJoin, DataPanelLoaded, DataTableDrawer. Inspector toggle: DataPanelLoaded, DataTableDrawer, FilterBuilderExpert, ImportAddToGraph, TableJoin. Undo: 7 boards vs 10. Zoom: DataPanelLoaded, DataTableDrawer, ImportAddToGraph, InspectorGenomics, TableJoin. Share: DataPanelLoaded, DataTableDrawer, ImportAddToGraph, ImportLargeFile, ImportOptions, ImportRecognised, TableJoin. Gear: ImportLargeFile, ImportOptions, TableJoin

Problem: Where the shell top-bar icons are titled, the same control gets a different sentence per artboard, so a screen reader would hear five names for one button. Closing the right panel: 'Close (Esc)' / 'Close panel (Cmd+B)' / 'Close the panel (Cmd+B)' / 'Hide the panel (Cmd+B)' / 'Close the Data panel (Cmd+B)'. Inspector: 'Toggle inspector (D)' / 'Collapse the inspector (D)' / 'Collapse the inspector' / 'Hide the inspector (D)'. Undo: 'Undo' on 7 boards, 'Undo (Cmd+Z)' on 10, and the disabled reason splits 'Nothing to redo' (3) vs 'Nothing to redo yet' (2). Zoom: 'Zoom to fit (0)' / 'Fit (0)' / 'Fit (0, Home)', and 'Zoom in (=)' on 4 boards vs 'Zoom in (+)' on TableJoin -- two different bindings for one control. Share: 'Share' / 'Share this view' / 'Share a link. Load data first' / 'Share. Load data first'. Gear: 'Import settings' (ImportLargeFile, ImportOptions) vs 'Import options' (TableJoin) for the same control, where 'Import options' is also the dialog title.

Proposed fix: Write one tooltip per register verb in VOCAB section 10 and paste it everywhere: 'Close the panel (Cmd+B)', 'Toggle inspector (D)', 'Undo (Cmd+Z)', 'Redo (Shift+Cmd+Z)', 'Zoom to fit (0)', 'Zoom in (=)', 'Share this view', 'Import settings'. Keep the disabled suffix in one form per state ('Nothing to undo yet', 'Nothing to redo yet', 'Load data first'). Fix TableJoin's '(+)' to '(=)' to match ShortcutsDialog and SettingsShortcuts, which both list '=' as the binding.

### S10
Artboards: Eye: FilterBuilderExpert vs MultiSelection, StylePanel vs StyleDiverging. Pencil: ExploreNotesList, ExplorerNotes, IpadInspector, StylePanel vs MultiSelection vs SettingsShortcuts vs StyleDiverging. Circular arrow: AnalyzePanel vs StylePanel, StyleDiverging

Problem: Three register glyphs each carry several unrelated verbs, which inverts the closed-register rule. The eye is 'Show on canvas' (MultiSelection, StylePanel), 'Hide layer' (StyleDiverging) and 'Disable this rule' (FilterBuilderExpert) -- the third is a different capability from visibility, and the first two are the same toggle named by its two states, which VOCAB forbids ('a toggle keeps one name and never changes it with state'). The pencil is 'Edit', 'Rename', 'Rename layer' and 'Rebind'. The circular arrow is 'Recompute' (AnalyzePanel, and the VOCAB snippet's own name) and 'Re-run' (StylePanel, StyleDiverging), where 'Re-run' is a word 6.8's never list reserves for controls that keep their text.

Proposed fix: Eye: title it 'Show on canvas' in all four regardless of state, and give FilterBuilderExpert's rule row its own register entry or keep the text label, since disabling a rule is not visibility. Pencil: settle on 'Edit' plus the object ('Edit layer', 'Edit binding') so one verb reads across all seven. Circular arrow: use 'Recompute' on all three and rename the StylePanel/StyleDiverging layout transport control so it stops borrowing a never-list word.

### S11
Artboards: AnalyzePanel (2 cases), InspectorGenomics, StylePanel

Problem: Four icon tooltips carry a menu's contents instead of the control's name, up to 141 characters: 'Replay all on current data, Export history (JSON), Export as script, Copy as commands, Copy as methods text, Import and replay, Clear history' and 'Export top 20 (CSV), Export ranked list (CSV)' in AnalyzePanel, 'More. Color by this, Size by this, Filter by this, Show in table' in InspectorGenomics, and 'Advanced: Stiffness (springCoefficient), Speed vs accuracy (theta), Damping (dragCoefficient), Time step (timeStep), Random seed (seed)' in StylePanel. 6.8 fixes the tooltip as verb, then object, then key chip. Every other board records menu contents in an HTML comment and titles the icon with its verb alone, so this is a two-convention split, not a local choice.

Proposed fix: Cut each of the four titles back to its verb ('More', 'Export', 'Advanced') and move the item list into the HTML comment beside the control, matching what CommandPalette, ExploreNotesList, ViewsMenu and ExplorerLargeGraph already do.

### S12
Artboards: Locate: CompareSplit, ExplorerNotes, InspectorGenomics vs ContextMenu vs ExplorerExpert. Cards/List: AnalyzePanel, CompareSplit, ExplorerExpert vs AnalyzeSweep, ExplorerAfterCard vs IpadPanel. History caret: IpadInspector vs 14 boards

Problem: Three more register glyphs drift in geometry while keeping one name. 'Locate' has three drawings: outer r=4.5 with inner r=1.5 (CompareSplit, ExplorerNotes, InspectorGenomics), the same outer with inner r=1.25 (ContextMenu), and outer r=4 with longer ticks (ExplorerExpert). The Analyze view toggle 'List' is drawn with leading bullets on AnalyzePanel, CompareSplit and ExplorerExpert but as three plain rules on AnalyzeSweep and ExplorerAfterCard, and shifted again on IpadPanel; 'Cards' shifts its rects by 0.5px on IpadPanel. The History caret is `polyline 4,6 8,10 12,6` on 14 boards and `3,6 8,11 13,6` on IpadInspector. Separately, the Compare glyph `rect 2,2.5,12,11 + line at x=8` and the inspector-toggle glyph `rect 2,2.5,12,11 + line at x=10` differ by 2px and sit next to each other in the same top bar.

Proposed fix: Pick the majority drawing for each (Locate: outer r=4.5 / inner r=1.5; List: with bullets; Cards: rects at x=2.5 w=11; caret: 4,6 8,10 12,6) and paste it into the minority boards. For Compare vs inspector toggle, move the Compare divider further off-centre or change one of the two shapes so the pair is distinguishable at 14px, then record the decision in VOCAB section 5.

### S13
Artboards: HistoryPopover

Problem: The History popover's header row draws 'History [Coming] 12 entries, 6 undone ... Undo [Cmd+Z] Redo [Shift+Cmd+Z]' with two mono key chips inside the header. The 1.5 override closes the chip's hosts to exactly four -- a tooltip bubble, a menu row, a palette row and the shortcuts table -- and names a section header as forbidden. No other artboard puts a chip in a header; the only other in-place chips are the allowed Cmd+K pill and the '/' search hint.

Proposed fix: Delete both chips from the header row and move the bindings into the Undo and Redo controls' title attributes ('Undo (Cmd+Z)', 'Redo (Shift+Cmd+Z)'), which is what the same two controls already do in the top bar of ten other boards.

### S14
Artboards: AnalyzePanel; ContextMenu

Problem: Two rows survive that the 1.5 minimisation deleted everywhere else. AnalyzePanel's 'All statistics' section still draws 'Isolated nodes 0' although the fraud dataset has one connected part, and the Counts override says that row and '(largest holds 100%)' are not drawn in that case -- no other board draws it except ExplorerLoading, where the value is legitimately 'Loading...'. ContextMenu still draws the 'Key attributes' sub-header inside a section already titled Attributes; MIN-10 removed it and InspectorGenomics and IpadInspector both did so, but ContextMenu's own checklist item 4 only removed the type row.

Proposed fix: Delete the 'Isolated nodes 0' row from AnalyzePanel's All statistics block. In ContextMenu, replace the 'Key attributes' sub-header with the 1px #374047 hairline that InspectorGenomics uses, and extend ContextMenu item 4 in ARTBOARD-CHANGES-1.5.md to say so.

### S15
Artboards: TableJoin (only board with aria attributes) against the other 38

Problem: TableJoin carries 18 aria-label and 25 aria-hidden attributes; every other artboard carries zero. 6.8 requires both on each icon-only control, and TableJoin is the only board demonstrating it, so a reader comparing two files would conclude the contract is optional. The VOCAB snippet itself shows neither, so the vocabulary and the one compliant board disagree.

Proposed fix: Decide once: either add aria-label plus aria-hidden to the VOCAB icon-only snippet and roll it across all 39 boards, or drop them from TableJoin and state in VOCAB section 10 that the artboards stand in for the aria contract with the native title alone. The first is preferable, since it makes the missing-title problem above visible as a broken rule rather than a stylistic gap.

### S16
Artboards: ExplorerLargeGraph; IpadPanel

Problem: Two small residuals. ExplorerLargeGraph's warning line reads 'About 3 h at this size. Filter to a part, or run the sampled version [Coming]', but VOCAB retires 'sampled' along with the other cost-class words and says those words do not appear anywhere in the interface -- it is the only surviving instance across all 39 boards. Separately, IpadPanel is the only board that draws open card parameters, and its 15 selects and number fields use background #2a3035 on a #2a3035 card, so Method/Louvain, Resolution/1.0, Random seed/42, Scope/Visible (20) and the Bottleneck fields read as plain text with a chevron rather than as editable fields; the same controls are legible on every desktop board because none of them draws the block open.

Proposed fix: Reword ExplorerLargeGraph to 'run the approximate version' (or name the algorithm variant) so no cost-class word remains. For IpadPanel, give the field a distinguishable ground inside a card -- either #22272c for the field or #262b31 for the card -- and add the same rule to the VOCAB 'Compact select' and 'Card' snippets so the next board that draws parameters open inherits the fix rather than repeating the collision.
