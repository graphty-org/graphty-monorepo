# Shell deltas for spec revision 1.3

Checklist of every change revisions 1.2 and 1.3 require of the fifteen
existing artboards. Source: app-shell-progressive-disclosure-design.md,
starting from the section 9 paragraph on existing artboards, then sections
5.1 to 5.7 and 6.3. Section numbers in parentheses. Snippets are in VOCAB.md
section 9 ("1.3 additions"); the shell pieces are in SHELL-SKELETON.html.
Current-state notes come from grepping the 1.1 artboards on 2026-09-04.

## G. Global: every Loaded, Selected and Result artboard

Apply these to Main, ExplorerAfterCard, ExplorerExpert, StylePanel,
ExplorePanel, AnalyzePanel, AiPanel, PresentPanel, Settings, CommandPalette,
IpadPanel, IpadInspector, InsightsWide, TimeSlider. Welcome has its own list.

- [ ] G1 Top bar: remove the Saved dot and label; there is no saved or unsaved indicator (3, 5.1).
- [ ] G2 Top bar: Export is a menu trigger with a label, download icon and 8px chevron; its menu has two rows, Image and Data, both landing in Present (5.1).
- [ ] G3 Top bar: add the Compare toggle next to the inspector toggle, inactive (5.1).
- [ ] G4 Top bar: the cmd-K pill reads "Search commands, nodes and edges" with the bordered key chip "Cmd+K" (5.5; VOCAB 9 key chip).
- [ ] G5 Canvas: add the navigation cluster on the left edge above the minimap: [2D | 3D] with 3D active, Fit, Zoom to selection (disabled unless a selection exists), Zoom in, Zoom out, Views menu trigger (5.6; section 9 "every existing artboard shows the navigation cluster with the 2D/3D toggle"). Remove any floating Fit button or pointer/hand/zoom tool toggle the artboard drew instead (5.6: no persistent tool modes). Main, ExplorerAfterCard, ExplorerExpert, StylePanel, ExplorePanel, AnalyzePanel, AiPanel, PresentPanel, CommandPalette, IpadPanel, IpadInspector, InsightsWide, TimeSlider all currently render a standalone "Fit" control.
- [ ] G6 Status bar: replace the bare "100%" with "Zoom 100%" and add the mode chip "3D" right after it; final order is counts | Zoom | mode | layout | running | viewing | issues chips | AI | selection (5.1, 5.6). Settings and InsightsWide currently have no zoom text at all.
- [ ] G7 Status bar: the selection-count slot fills only when nodes or edges are selected. Remove "1 selected" from StylePanel (a style layer is selected, not a node), AnalyzePanel, CommandPalette and TimeSlider (inspector shows Graph summary) (5.1, 6.1).
- [ ] G8 Inspector graph summary: remove the "Longest shortest path (diameter)" row; diameter and average path length live in Analyze tier 2 only (5.4). Present on Main, ExplorerAfterCard, PresentPanel, Settings, CommandPalette, IpadPanel, InsightsWide, TimeSlider.
- [ ] G9 Inspector graph summary: Connected parts reads "1 (largest holds 100%)" with an "Isolated nodes" sub-row; Most connected gains "See all N ranked" (opens the Data table drawer), "Export top N (CSV)" and a 50px degree histogram; add the Schema section (node types with counts, edge types with counts, type pairs; Filter to type, Select all of type, Export schema JSON); add the "Case notes" line with "Add a case note" (5.4).
- [ ] G10 Inspector header: pin icon whenever a node, edge, selection or result is shown (5.4).
- [ ] G11 Analyze and Insights cards: descriptions are canonical and domain-neutral. The Groups / Find groups card reads "Cluster nodes that interact more with each other than with the rest" on every screen; no description names cats, accounts or devices (5.3 Analyze; 3 Domain vocabulary). Affected copy: Main and CommandPalette "Cluster cats that...", AnalyzePanel "Cluster cats that mingle most." and every "Rank cats..." line, InsightsWide "Cluster accounts, devices and merchants...", IpadPanel "Score cats...", ExplorerAfterCard "Cluster cats that interact...".
- [ ] G12 Every canonical pair renders both names (6.3): check every card title, legend block, statistics row, inspector metric row and palette row; Label order Plain first.
- [ ] G13 Rename "Analysis history" to "History" (5.3 Analyze tier 2; one history store, 5.1) and "Compare two results" to "Compare (Comparison view)" (6.3).
- [ ] G14 Coming tags (5.8, 5.3 status notes): a muted 10px "Coming" pill on every control whose 5.8 status is not shipped. Engine-dependent controls that appear on these artboards: Explore filters, saved filters, neighborhood expansion, ego network, Select all visible, time slider (visibility layer and time detection); edge selection and multi-selection controls; Hierarchical (sugiyama) and Radial (ego-centric) layout segments; Core layers, Bridge edges, Likely missing links, personalized PageRank, Tight clusters (wrapper needed); Tight-knit neighborhoods, Every route, Unusual nodes, What breaks if removed, temporal analysis, Find a pattern (new work); seed and sample-size fields; Delete or Remove selected; SVG and PDF export; GraphML, GEXF, CX2 writers; the arrow-walk alternative binding; the console row and the AI select, undo, filter, expand, findNotes and addNote tools.
- [ ] G15 Open question for the spec owner, do not resolve on the artboards: the 5.8 "new work, app" row also lists undo and redo, legend, minimap, search, bookmarks, computed attributes, node merging, data export, report generation, style presets, recipes and console. Read literally the 5.8 rule would tag the top bar undo buttons, the legend and the minimap "Coming" on every artboard. Recommended reading: tag panel controls from that row (console, presets, bookmarks, computed attributes, merging, export formats, report generation, recipes) and leave shell chrome (undo, redo, minimap, legend, search) untagged; confirm before the pass.
- [ ] G16 Legend: one block per encoded channel, plain then technical name, palette named, "not measured" swatch when any node lacks the attribute (5.1, 5.3 Style legend). Edge width block reads "Edge width: value (1 to 10)".
- [ ] G17 Selected-state artboards: the inspector shows the Notes section with the "Add a note..." input for the selection (5.4, 5.7, 6.1 Selected). Applies to ExplorerExpert, ExplorePanel, IpadInspector.
- [ ] G18 Result-state artboards: every result card and inspector result view opens reading, caveats line, run record line with Copy as JSON / Copy as command / Copy methods text, then the shape body (5.3 Result shapes, 5.4, 7.5). Applies to ExplorerAfterCard, ExplorerExpert, AiPanel.

## Welcome (Empty, 7.1, 6.1)

- [ ] W1 Top bar: no Saved indicator; Export menu trigger and Compare toggle drawn disabled (`color: #5f6873`) (5.1, 6.1 Empty).
- [ ] W2 cmd-K pill string and key chip (5.5).
- [ ] W3 No navigation cluster, minimap or legend: the canvas hosts Welcome; no mode chip or Zoom in the status bar; status bar reads "No data loaded" then AI status (6.1 Empty, 5.1).
- [ ] W4 Drop zone copy: "Drop a graph file (or a nodes file and an edges file) here"; formats line reads "JSON, CSV or TSV, GraphML, GEXF, GML, DOT, Pajek, SIF, CX2" in both the panel and the canvas (currently stops at GML) (7.1, 5.3 Data).
- [ ] W5 Sample list: Karate Club, Cat social network ("20 nodes. Small enough to see every relationship. Try finding the groups."), Fraud ring with tags Directed, Timed, Weighted, one sample with categorical node types (tag Types), the biology sample ("Ovarian cancer DE genes. 150 proteins, STRING edges at 0.4 confidence, logFC and padj columns. Try coloring by logFC and finding the groups."), and one large sample last with a Large badge, size in MB, "Opens in Performance mode, about 20 s" and "Try finding connected parts, or search for a node." Each row: tags and a one-line source credit link; sizes KB below 1 MB (7.1, 5.3 Data). Currently Cat, Fraud ring, Citation network, Les Miserables with no tags or credits.
- [ ] W6 Data panel: remove the "Data preview" section (the first-rows preview is gone, 5.3 Data tier 2); add the "Data table (Node and edge table)" row with the "Show data table" switch, disabled in Empty; keep Open from URL and Paste data; add the disabled "Add attributes from a table (Table join)" row (enabled only in Loaded) (5.3 Data tier 1).
- [ ] W7 Recent rows show name, format, counts and time; note under the list that recents are cleared from Settings > Data management (7.1).
- [ ] W8 Rail: Explore, Analyze, Style, Present disabled with tooltip "Load data first"; the Data icon carries no badge (6.1).

## Main (Explorer, first load: Loaded)

- [ ] M1 G1 to G16 (no selection, no notes).
- [ ] M2 Insights strip cards for an undirected 20-node graph: Find groups, Who is most connected, Search for something you know; the Find groups line is the canonical Groups sentence (7.3, G11).
- [ ] M3 Status bar reads "20 nodes  29 edges | Zoom 100% | 3D | Layout: Force-directed  Settled | AI: not configured" (5.1). Layout slot state is "Settled" only when convergence, not the step cap, stopped it.
- [ ] M4 Legend blocks: "Size: most connected (degree)" with "1 to 4, sqrt scale", "Color: not encoded" (7.2, VOCAB 8 and 9).
- [ ] M5 Explore panel tier 1 (the artboard's open panel): search field with prefix hint, scope toggle All nodes / Visible nodes, Zoom to selection (F, disabled), Select all visible (Coming), the Select split button, and the Notes section collapsed with "Notes 0" and the empty state "No notes yet. Select a node or edge and press N." (5.3 Explore).

## ExplorerAfterCard (Result)

- [ ] A1 G1 to G16, G18.
- [ ] A2 Analyze panel gains the Run | Results (1) sub-tab row under the title and the Cards / List view toggle in the title row (5.3 Analyze tier 1). Section 9 wants the highlighted Find groups control visible; 5.3 switches to Results on completion. Draw Run selected with the highlighted Groups card and the "Results (1)" badge, and move the result card into the Results tab; do not show both the card's Run row and its result in one tab.
- [ ] A3 Groups card: technical name "Communities (Louvain)"; Parameters open with a Method select (Louvain default, Leiden, Label propagation, Girvan-Newman, Tight clusters with Coming), Resolution 1.0, Random seed with the Coming tag (Louvain seed is new work, 5.8), Scope control (Visible default), and a collapsed Advanced block; no per-card weight field because it equals the panel default (5.3 Analyze tier 2 and 3).
- [ ] A4 Panel-level tier 2 settings: Weight attribute "value" with Treat as strength; no Direction control on an undirected graph (5.3 Analyze tier 2).
- [ ] A5 Result card body (Community shape): reading "4 groups found. The largest has 7 members. Colors now show groups.", caveats "Exact. Unweighted, direction ignored. Computed on all 20 nodes.", run record "Louvain, resolution 1.0, seed 42. Weight: value (strength). Direction: ignored. Scope: visible, 20 of 20 nodes. 2026-09-04 14:12, 12 ms, algorithms 1.4.0" with the three copy links; groups by size; "See all 4 groups" opens the drawer; Label group by top value; Compare categories disabled with its reason; Select members, Filter to this group, Copy member ids; "Encode as style" primary; Run again with changes, Compare with..., Pin to report, Combine into a score, Copy as TSV (5.3 Result shapes, 7.5).
- [ ] A6 Graph statistics summary in the panel: remove the diameter row (instant rows only, 5.3 Analyze tier 1).
- [ ] A7 Inspector result view mirrors the card: reading, caveats, run record, body, Remove result (5.4).
- [ ] A8 Legend: "Color: Groups (communities, Louvain)" with the palette name and group labels from the result (5.3 Style legend).
- [ ] A9 Question group headers carry the card count and cost class ("Find groups  3 cards  heavy") and a "Run all (3)" overflow (5.3 Analyze).

## ExplorerExpert (Result plus Selected, fraud ring)

- [ ] E1 G1 to G18.
- [ ] E2 Section 9: Bridges runs exact on 200 nodes. Replace "Approximate (k=100)" and "Approximate, 100 sampled sources" with the caveats line "Exact. Directed, weighted by amount as strength. Computed on all 200 nodes."; remove the "Sample size 100" field (sampling applies only above the threshold; the field renders only on engines that accept it and carries Coming, 5.3 Analyze, 5.8).
- [ ] E3 Section 9: the Results tab is selected; the Run | Results (3) tab row sits under the title; the Cards / List toggle in the title row (5.3 Analyze tier 1).
- [ ] E4 Section 9: a run record line under every result card (Shortest path, Bridges, Groups) with Copy as JSON / Copy as command / Copy methods text (5.3 Result shapes).
- [ ] E5 Node metric body for Bridges: top 3 with "See all 200 ranked" opening the drawer sorted by betweenness; Select top N, Add top N to selection, Filter above threshold, Copy as TSV, Export ranked list (CSV); histogram caption states the scale; Encode as style primary (5.3 Result shapes).
- [ ] E6 Path result body: ordered step list with edge type, weight and a time column per step (edges are timed), click a step to center; Highlight this path primary; Expand around path, Bookmark this path, Copy steps, Export CSV, Clear (5.3 Path shape). Bookmark this path and Export CSV are missing.
- [ ] E7 Progress row for the running Influence (PageRank) card reads "Computing Influence (PageRank)... 42%  4.0 s  Cancel" with the 4px bar; the status bar running slot mirrors it: "Computing Influence (PageRank)... 42%  Cancel" (5.3 Running and scope, 5.1). Replace "0:04" with seconds.
- [ ] E8 Section 9: the node inspector shows the neighbor list: count with a per-type breakdown ("37: 21 transfer, 9 paid, 7 registered to"), In / Out / All tabs (directed), a sortable list (neighbor, edge type, weight, recency) with the top 10 by weight, "Show all in data table", per-row "Note this relationship"; the degree row reads "Incoming N / Outgoing N / Both N" (5.4).
- [ ] E9 Inspector actions block (pinned at the bottom): Expand neighbors as a split button reading "Expand 37 neighbors", Select neighbors, Ego network, Frame this node, Radial layout around this node (rename from "Center on this node (radial)"), Use as root or focus, Pin or Unpin, Find path from here, Distance from here, Likely missing links from here, Simulate removing, Merge with..., Tag..., Bookmark this node, Show in table, More (Copy as JSON, Copy neighbor ids) (5.4).
- [ ] E10 Inspector label row: copy-id icon and Locate icon; Key attributes pinned group; computed metrics as plain name with the technical field muted and "Rank 1 of 200" with percentile (5.4).
- [ ] E11 Section 9: note markers on the canvas (three noted nodes, one noted edge, per the Explorer notes artboard) and the inspector Notes section with "Add a note..." and existing notes newest first; the status bar issues slot carries the "N notes" chip (5.7, 5.1, G17).
- [ ] E12 Panel-level tier 2: Weight attribute "amount" with Treat as strength; Direction: follow edges (directed graph) (5.3 Analyze tier 2).
- [ ] E13 Graph statistics summary: remove diameter; add "Timed (ts)", self-loops 2 and parallel edges 5 rows (5.3 Analyze tier 1; VOCAB 9 canonical strings).
- [ ] E14 Question group headers with card counts and cost classes; the Advanced group collapsed at the end (5.3 Analyze).
- [ ] E15 Rail Data badge and "N issue types" chip only if the artboard shows validation warnings; the fraud ring has 3 issue types on InsightsWide, keep the two artboards consistent (5.1, 6.1).

## StylePanel (Loaded, layer selected)

- [ ] S1 G1 to G16. Remove "1 selected" from the status bar (G7).
- [ ] S2 Section 9: remove the "Annotation tools" row ("Text, arrows") from tier 3; notes live in Explore, callouts are deferred to Present (5.3 Style tier 3, 5.7, 11).
- [ ] S3 Section 9: the layout selector has four segments: Force directed (ngraph) active, Hierarchical (sugiyama, Coming), Radial (radial ego-centric, Coming), More; More reads the active full-list layout's name or "From file" (5.3 Style Layouts tier 1). Currently three segments with "bfs" under Hierarchical.
- [ ] S4 Section 9: the run row under the selector for the live ngraph layout: Play/Pause, Step, Settle, Re-run, Pin selected, Unpin all (5.3 Style Layouts tier 1, Live stepping).
- [ ] S5 Layout parameters (tier 2): Edge length (springLength) 30, Pull to center (gravity), Edge weight attribute (defaults to value); advanced options behind the gear: Stiffness, Speed vs accuracy, Damping, Time step, Random seed; "Focus node: Mr_Whiskers" belongs to Radial only and moves out of the ngraph parameters; Apply to: All visible / Selection only (Coming); Start from current arrangement switch; Keep this arrangement (Fixed); Reset to defaults (5.3 Style Layouts).
- [ ] S6 Add the "All layouts" searchable list (tier 2, collapsed) grouped by family with badges (2D only, Live or Batch, size rating) (5.3 Style Layouts tier 2).
- [ ] S7 Add Canvas: Background color row at tier 2; tier 3 keeps Animation, adds Skybox image and Import / Export style template (5.3 Style tier 2 and 3).
- [ ] S8 Style presets are chips: Default, High contrast, Print, Colorblind safe, Presentation, with the note that presets never change the label visibility rule (5.3 Style tier 1).
- [ ] S9 Inspector (layer): Which nodes builder with the Expression toggle at tier 3, helper "Matches 2 nodes: The_Vet, Mrs_Henderson." plus Preview matches and Use as filter; every encodable row has the Fixed / By attribute toggle (Color, Size, Opacity, Shape, Label text); Size By attribute shows Scale (Square root default) and the range line; Color By attribute shows the Palette select; Label gains "Show on"; Effects keep Glow, Outline, Wireframe, Flat shaded (5.4 Style layer).
- [ ] S10 Legend: "Size: age (ageYears)" block names the scale and palette; add the "not measured" swatch if any node lacks ageYears (5.3 Style legend).
- [ ] S11 Status bar layout slot names the engine and is clickable: "Layout: Force directed (ngraph)  Settled" (5.3 Style Layouts tier 1; 5.1 five states).

## ExplorePanel (Selected, three nodes)

- [ ] X1 G1 to G17. Zoom to selection in the cluster is enabled (a selection exists).
- [ ] X2 Search results header reads "5 match. Showing 5 by connections. Narrow with attribute:value or Filter to matches"; scope toggle All nodes / Visible nodes; list actions Filter to matches and Select all matches (5.3 Explore tier 1).
- [ ] X3 Section 9: add the Select split button after Select all visible: Invert, Neighbors of selection (depth 1 to 3), Same group as selection, From list, By expression; Save selection as set... (5.3 Explore tier 1).
- [ ] X4 Section 9: add the Notes section (tier 2) with count in the header, search, chips Open / Done / Mine / Assistant, one row per note or the empty state, "Show notes" switch and More menu (5.3 Explore tier 2, 5.7).
- [ ] X5 Filter builder: Builder | Expression tabs; Nodes / Edges scope toggle; NOT checkbox per row; operator "at least" becomes ">=" (number operators are <, <=, >, >=, between, abs() >, is missing, is not missing); "Joined with AND" becomes the Match all / Match any select once two rows exist; Result toggle Hide others / Select matches at the top; "Also include neighbors (1 step)" checkbox; chip menu Hide / Dim / Invert / Save as style layer (5.3 Explore tier 2).
- [ ] X6 Add the Selection sets and Selection actions sections (Invert selection, Select neighbors of selection, Select matching filter, Select edges between selected, Select largest connected part) (5.3 Explore tier 2).
- [ ] X7 Neighborhood expansion shows node and edge type checkboxes with counts, the preview line "Adds about 6 nodes", Collapse last, Collapse all (5.3 Explore tier 2).
- [ ] X8 Find a pattern row: New pattern button, the text form of the pattern, Seeds: selection, Import and Export (5.3 Explore tier 2).
- [ ] X9 Coming tags on filters, saved filters, neighborhood expansion, ego network, Select all visible, and on the multi-selection state itself (Explore status note, 5.4 last paragraph, 5.8).
- [ ] X10 Status bar counts read "5 of 20 nodes  6 of 29 edges" while the filter is active; delete the separate "5 of 20 nodes, 6 of 29 edges match" text (5.1). The filter status strip under the Insights strip reads "Showing 5 of 20 nodes" (5.1).
- [ ] X11 Inspector (multi): count "3 nodes, 0 edges"; statistics with the above or below marker against the whole graph; "Add a note to these 3 nodes"; actions Zoom to selection, Filter to selection, Save as subgraph, Save as set, Style selection, Select neighbors, Expand neighbors of all, Invert, Copy ids, Pin as A, Merge selected nodes, Simulate removing (3), Remove selected, Tag..., Set attribute on selection..., Pin selected positions, Layout selected nodes only, Pin to report, Show in table, Clear selection (5.4).

## AnalyzePanel (Loaded, full list)

- [ ] N1 G1 to G16. Remove "1 selected" from the status bar (G7); the inspector shows Graph summary.
- [ ] N2 Run | Results sub-tabs under the title with "No results yet" on Results; Cards / List view toggle in the title row (5.3 Analyze tier 1).
- [ ] N3 Graph statistics summary: instant rows only (nodes, edges, direction, weighted with attribute, average links per node, density, connected parts "1 (largest holds 100%)"); remove diameter; keep "More statistics" (5.3 Analyze tier 1).
- [ ] N4 Section 9: question groups with a card count and cost class in each header and a "Run all (N)" overflow: Find groups (Groups; Connected parts; Core layers, Coming; Tight-knit neighborhoods, Coming), Find important nodes (Most connected; Influence; Closest to everyone; Well-connected neighbors; header action "Run all node rankings (All centralities)"), Find weak points (Bridges; Bridge edges, Coming; What breaks if removed, Coming; Bottleneck capacity with From, To, Capacity attribute and Method), Find paths (Find a path; Distance from here; Every route, Coming, with Max steps 4 and Max routes 100), Find unusual things (Unusual nodes, Coming), Predict (Likely missing links, Coming), Advanced collapsed by default with its count (Backbone; Farthest apart; Walk from here; Hubs and authorities hidden on an undirected graph; Best pairing hidden unless bipartite) (5.3 Analyze question groups). Missing today: Core layers, Bridge edges, Bottleneck capacity, Distance from here, the cost classes, Run all.
- [ ] N5 Section 9: one card with tier 2 open and the tier 3 Advanced block: Influence with Method (PageRank | Katz), Damping 0.85, "Relative to selection" (Coming), Scope control, then the collapsed Advanced block holding Tolerance, Max iterations 100 and "Run as sweep..."; Iterations leaves tier 2 (option kinds, 5.3 Analyze tier 3, 6.2).
- [ ] N6 Remove the "Follow edges | Ignore" control from Influence: the direction control exists on directed graphs only (5.3 Analyze tier 2).
- [ ] N7 Every card carries a scope line "On 20 of 20 nodes" and Run; path cards have From and To pickers with Use selected and Run disabled "Pick a node first"; What breaks if removed keeps "Select nodes first" (5.3 Analyze tier 1, Path cards).
- [ ] N8 Card descriptions domain-neutral (G11); Closest to everyone avoids the reserved word "reach": "Nodes that are the fewest steps away from everyone else." (6.3).
- [ ] N9 Panel-level tier 2 settings row: Weight attribute "value", Treat as strength; no Direction on the undirected cat graph; per-card override only where a card differs (5.3 Analyze tier 2).
- [ ] N10 Tier 2 sections: All statistics with the footer "Instant rows follow the data. Computed rows: 14:12  Recompute"; Metric histograms with "Compare two metrics"; History (renamed) with per-row Re-run, Re-run with changes, Copy as JSON, Copy as command and the section actions; More row: Compare, How it changed over time (needs a Time role), Remove several nodes at once (5.3 Analyze tier 2 and 3, G13).
- [ ] N11 Link prediction tier 2 (if opened): Method (Common neighbors, Adamic-Adar, Jaccard Coming, Preferential attachment Coming, Resource allocation Coming), Top N 50, Around the selection (5.3 Analyze).

## AiPanel (Result)

- [ ] I1 G1 to G16, G18.
- [ ] I2 Section 9: add the console row (tier 2): one-line input over the command registry with a completion hint, the transcript, and Run script; the backtick key chip in its tooltip; the Coming tag (5.3 AI tier 2, 5.8).
- [ ] I3 Remove the follow-up chips "Select The_Vet" and "Undo styling": Select node, Undo, Filter and Expand tools do not appear until built (5.3 AI tier 1, 5.8).
- [ ] I4 Each step row names its owning panel and carries a second muted line with scope and method: "Ran Groups (Communities, Louvain)  Analyze" then "on 20 nodes, exact, 12 ms"; "Styled nodes by bridge score  Style" shows the restyle progress row form when in flight (5.3 AI tier 1, 7.4).
- [ ] I5 Input row: microphone button at the right (speech available) with a listening state; Cancel on the in-flight message; Retry on a failed one (5.3 AI tier 1).
- [ ] I6 Tier 2: Provider status and model selector ("Anthropic, claude-sonnet-5, connected"), Voice input switch, then the console; tier 3 link "Provider keys and settings" to Settings > AI (5.3 AI).
- [ ] I7 Inspector result view: reading first ("The_Vet is the main bridge. It sits on 35% of the shortest paths between other nodes. Simulate removing The_Vet to see what breaks."), caveats "Exact. Unweighted, direction ignored. Computed on all 20 nodes.", run record "Betweenness, normalized. Scope: visible, 20 of 20 nodes. 2026-09-04 14:12, 4 ms, algorithms 1.4.0" with the copy links; then the Node metric body (top 3, See all 20 ranked, histogram with scale caption, Select top N, Filter above threshold, Copy as TSV, Export ranked list); Encoded as node size, Change encoding, Remove result. Replace "Ran by AI, 20 nodes, 4 ms", "Caveats: exact (all 20 nodes)..." and "Parameters used: defaults" (5.3 Result shapes, 5.4, 7.5).
- [ ] I8 Legend both names: "Color: Groups (communities, Louvain)" and "Size: Bridges (betweenness)" with min and max ticks (G12, 5.3 Style legend).
- [ ] I9 Status bar AI text is one string across artboards: "AI: Anthropic ready" (Settings uses it; AiPanel uses "AI: ready") (5.1).
- [ ] I10 If an Assistant note is shown, its author is "Assistant" with the distinct marker glyph and a step row "Added a note on The_Vet (Explore)" (5.3 AI, 5.7).

## PresentPanel (Loaded)

- [ ] P1 G1 to G16.
- [ ] P2 Section 9: remove "Add callouts: Annotation tools (Style)"; rename "Include annotations" to "Include note markers", on by default (5.3 Present tier 2, 6.3).
- [ ] P3 Export image Format select: PNG, JPEG, WebP, SVG, PDF with Coming on SVG and PDF; replace "PNG, SVG or JPEG; SVG keeps vector lines."; add the Copy to clipboard secondary button (5.3 Present tier 1, 5.8).
- [ ] P4 Image export options: Scope (Current view, Entire graph, Current filter (N), Selection (N)), Scale 1x / 2x / 4x with pixel size, View angle (Current, Top, Side, Front, Isometric; 3D only), Background, Include legend, Include note markers, "Publication ready" switch, frame hint "current view, 832 x 836, about 20 nodes in frame" (5.3 Present tier 2). View angle and Publication ready are missing.
- [ ] P5 Export data: Format select JSON, CSV, GraphML, GEXF, CX2 (Coming on GraphML, GEXF, CX2); Scope (Whole graph, Visible (N), Selection when one exists, Set..., Top N by metric once a result exists); "Include notes" checkbox (default on when notes exist); "Analysis results as CSV" and "Notes as CSV"; "Copy node ids" beside the button; estimated size "about 6 KB" (5.3 Present tier 1, 5.8).
- [ ] P6 Data export options (tier 2, collapsed): Columns picker, Separator, BOM, precision 6, Include computed metrics, Copy as TSV; "Export analysis recipe (JSON)" and "Export as script" rows; the collapsed "Export video" section (Duration, Camera, Format, Record with estimate) (5.3 Present tier 2).
- [ ] P7 Report sections checklist: Validation report, Data changes (Cleaning steps), Methods, Analysis steps, Notes (evidence log), Data tables (first 100 rows), pinned items; keep Graph summary, View image, Legend, Analysis results; add "Export evidence bundle" beside "Generate report..." and the dialog hint "title, sections, format, row cap, Include done notes" (5.3 Present tier 2 and 3).
- [ ] P8 Do not draw the Callouts toolbar row; callouts are deferred (3, 11). If a placeholder is kept it carries the Coming tag.
- [ ] P9 Legend: "Edge width: value (1 to 10)" instead of "Width: value (1-10)" (G16).

## Settings (Any; AI providers active)

- [ ] T1 G1 to G16 on the shell behind the overlay (the status bar persists under the overlay).
- [ ] T2 Section list: Appearance, Defaults, Keyboard shortcuts, Performance, AI providers, Data management, Extensions (tier 3). Extensions is missing (5.3 Settings).
- [ ] T3 AI providers section: add the two switches "Assistant can read notes" and "Assistant can add notes", both on (a provider is configured) (5.3 Settings).
- [ ] T4 If the Appearance section is shown collapsed or in a summary: theme, density, Label order (Plain first default), Show help text under controls, Your name (5.3 Settings).
- [ ] T5 Defaults summary if shown: initial layout (ngraph), initial view 3D, initial encoding, Run on load, scroll wheel zooms or pans, allow rotating the 2D view, Pin nodes when dragged, Decimal places 2, Show AI status (5.3 Settings).
- [ ] T6 Status bar AI text "AI: Anthropic ready" (I9).

## CommandPalette (Loaded, query "bridge")

- [ ] C1 G1 to G16. Remove "1 selected" (G7).
- [ ] C2 Pill and palette input placeholder "Search commands, nodes and edges" (5.5).
- [ ] C3 Result rows: plain name "Bridges" (not "Bridge"), technical "Betweenness centrality", the estimate as secondary text ("instant on 20 nodes") and a muted remembered-parameter summary ("normalized, weight value"); a key chip on the right where a binding exists; add the Advanced-group and method rows that match ("Bridge edges  Edge betweenness  Coming"); the hint reads "Enter to open, Cmd-Enter to run" (5.5).
- [ ] C4 Group headers: Commands, Nodes (@ prefix hint), Docs; footer "Searches plain and technical names" stays (5.5).
- [ ] C5 Insights strip and inspector behind the palette follow Main (M2, G8, G9).

## IpadPanel (1180 by 820, Analyze panel overlay)

- [ ] D1 G1 to G16 in the iPad variant: cluster and minimap sit under the panel overlay (SHELL-SKELETON.html trailing comment); the status bar shows Zoom and the mode chip (5.2, 5.6).
- [ ] D2 Insights strip as a single row of chips (5.2).
- [ ] D3 Analyze panel content follows N2 to N11: Run | Results tabs, Cards / List toggle, summary without diameter, group headers with counts and cost classes, canonical descriptions ("Rank cats by how many relationships they have." and "Score cats by how well connected their connections are." become domain-neutral; Closest to everyone avoids "reach"), scope lines, Method selects, Advanced group collapsed (5.3 Analyze).
- [ ] D4 Inspector is closed (one overlay at a time); the top bar inspector toggle is inactive (5.2).

## IpadInspector (1180 by 820, hub node)

- [ ] R1 G1 to G18 in the iPad variant; the cluster is visible with Zoom to selection enabled; the legend shifts left of the inspector overlay (5.2, 5.1).
- [ ] R2 Section 9: the node is a hub with 12,412 neighbors, so the dataset is not the cat network. Use the security-events sample from VOCAB 9 (41,200 nodes, 212,000 edges, above the large-graph threshold and under the iPad render ceiling): top bar name "security-events-41k.csv", status bar "41,200 nodes  212k edges | Zoom 100% | 3D | Positions from file | Performance mode: labels off, hover off | AI | 1 selected", minimap hidden (iPad above the threshold), Insights chips from the fixed cheap set (5.1, 5.2, 7.2, 7.3).
- [ ] R3 Inspector header: label with copy-id and Locate icons, pin icon; subtitle "Selected 1 of 41,200 visible" (5.4).
- [ ] R4 Attributes: Key attributes pinned group, first 10 rows with "Show all 52", type glyphs, Copy value / Copy path per cell (5.4).
- [ ] R5 Computed metrics with percentile ("12,412, top 0.03%") and the rank in each result (5.4, 7.5).
- [ ] R6 Section 9: the capped neighbor section: "12,412: 9,100 logon, 3,380 process" with "N more types" beyond five types, In / Out / All tabs, per-type count chips, top 10 by weight then degree, 20 rows then "Show all in data table" and Select these, "See all 12,412" opening the paged list, per-row "Note this relationship" (5.4).
- [ ] R7 Section 9: actions that warn and confirm: Expand neighbors split button reads "Expand top 50 of 12,412 by weight (Choose which)" with the warning line "Adds about 12,412 nodes; the canvas may slow down" and Expand anyway; Select neighbors confirms "Select 12,412 nodes? The inspector will show totals only."; Copy neighbor ids warns above 1,000; Ego network shows Max nodes 1,000; Radial layout around this node caps rings ("showing 3 rings; 11,900 nodes beyond are collapsed") (5.4, 5.3 Explore, 5.3 Style Layouts).
- [ ] R8 Section 9: the Notes section with "Add a note..." and existing notes; note marker on the selected node (5.4, 5.7).
- [ ] R9 Above the threshold: labels capped, hover off, note markers clustered; the reading uses relative phrasing ("Linked to 12,412 others, more than 99.9% of nodes") (7.2, 7.5).

## InsightsWide (Loaded, fraud ring, warnings)

- [ ] L1 G1 to G16.
- [ ] L2 Rail: the Data icon carries the badge "3" (issue types) (5.1).
- [ ] L3 Status bar issues chip reads "3 issue types (7)" in the issues slot (VOCAB 9 chip), not "3 data issues" (5.1).
- [ ] L4 Cards: Check 3 data issues, Find groups (canonical sentence), Who has influence (PageRank), Search for something you know; "2 more in Help" stays; card order follows the 7.3 priority table (7.3).
- [ ] L5 Inspector: fraud reading from VOCAB 9 ("96 accounts, 48 devices and 34 phone numbers, and 1 other type, connected by 612 transactions. One connected part holds all 200 nodes."); counts per VOCAB 9 with Timed (ts); remove diameter; Self-loops and Parallel edges rows stay (5.4, 7.5).
- [ ] L6 Legend and Explore "Step through time" row present because a Time role is assigned; the row carries Coming (5.3 Explore, 5.8).

## TimeSlider (Loaded, fraud ring, window active)

- [ ] V1 G1 to G16. Remove "1 selected" (G7).
- [ ] V2 Status bar viewing slot reads "Viewing: 2026-01-05 to 2026-02-04" (mirrors the overlay); counts "120 of 200 nodes  340 of 612 edges" stay (5.1, 5.3 Time slider).
- [ ] V3 Slider overlay: play, pause, step buttons; tick marks; the density sparkline of timestamps behind the track; Window and Step readouts inline-editable; Cumulative / Sliding toggle beside them; "Compare with another window" action; keyboard chips (comma, period) in tooltips (5.3 Time slider, 5.6).
- [ ] V4 Cluster, minimap and legend sit above the full-width slider; the cluster sits above the minimap (5.1 overlays).
- [ ] V5 Filter status strip under the Insights strip reads "Showing 120 of 200 nodes"; the Time chip in Explore reads "Time: 2026-01-05 to 2026-02-04" (5.1, 5.3 Explore).
- [ ] V6 Explore: "Step through time (Temporal navigation)" row on with the Coming tag; Time slider settings tier 2: time attribute select in two groups (node dates, edge dates), window size and step with a unit select, playback speed, Cumulative or Sliding, "Recompute results on each step" off (5.3 Explore tier 2, 5.8).
- [ ] V7 Inspector: reading opens "Showing 120 of 200 nodes."; counts visible of total; Most connected "Degree, in window"; remove diameter (5.4, 7.5).
- [ ] V8 Legend counts "58 of 96" per type stay; "Arrow: payment direction" block names both names (G16).

## Cross-artboard consistency checks

- [ ] K1 The same input gives the same label, reading and legend text on every screen (6.3): the cat graph summary reading and counts are identical on Main, PresentPanel, Settings, CommandPalette, IpadPanel; the fraud summary is identical on InsightsWide and TimeSlider (as visible of total).
- [ ] K2 Every Analyze card name and technical name matches the 6.3 table verbatim (VOCAB 9), including "Closest to everyone (Closeness centrality)", "Category table", "Identifier system" where the Loaded data line appears.
- [ ] K3 Every key chip uses the bordered 11px mono chip and the "+" spelling (VOCAB 9).
- [ ] K4 Coming tags are the only visual difference on a non-shipped control; no control is drawn disabled because it is unshipped (5.8).
- [ ] K5 The navigation cluster, mode chip and Zoom text are pixel-identical across the desktop artboards (copy from SHELL-SKELETON.html).
