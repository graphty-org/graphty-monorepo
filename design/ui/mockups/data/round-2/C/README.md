# Option C: List on the left, details in the inspector

The Data place in the left panel is a compact tree: Sources, Warnings (only when there are any), Filters, Sets and
Attributes. Each row is a glyph, a name and a count chip. Selecting any row opens its settings as property rows in the
inspector on the right. Readers already work this way for a node and for a style layer. A source, a warning, a filter
step, a join and an attribute all edit the same way, so there is one pattern to learn. The Data page is only for
opening something: a file, or network data such as Neo4j or a gene list. Joining a second file and replacing a source
happen in the inspector, starting from the source row. The table dock is view-only. Quick changes go in context
menus on a source row, an attribute row, a node on the canvas or a table cell. "Filter by this attribute" or "Filter
by this value" on those menus fills in a filter step. The + on the Filters header adds a blank one.

## On the first screen

- Opening a file: the Data page with a view-only preview, and a short "Reads as" stack on the right. Only the rows the
  app is unsure about carry a status icon. Focus is on Load.
- After loading: the drawing, the node and edge counts in the header, and the tree with one source row.
- No Warnings section on a clean file. No later-tier control, no setting left at its default, no zero count.

## A few clicks away

- Fixing an attribute: right-click it for Rename, Change type (each type shows how many values convert before you
  apply it), Use as and Hide. The same settings are rows in the attribute's inspector.
- Joining: drop a second file on the graph. Join is already chosen, with match counts, before you confirm. The Join
  button's arrow holds Add as new nodes and edges, Open as a separate graph, and Replace data.
- Replacing: on the source row, Replace file... or Refresh from source. The inspector shows a replacing state: the
  change chips (+12, -3, 40 changed), the read-as rows carried over with what was not found, and Keep styles, filters
  and analysis, already on. Afterwards there is a warning row for anything that broke, and Undo.
- Filtering: steps with on/off toggles and their own counts. The attribute dropdown also lists graph conditions (In
  largest connected part, Neighbors of selection). Save as set adds to a Sets section. A date attribute becomes a
  time window over a histogram, with step arrows.
- Network data: a source list on the Data page. Test returns the real first 20 rows and the total before Load.
  Afterwards, Load more is on the source row's inspector, and Expand from source is on a node's right-click menu.
- Export: the app's common Export dialog, with a new Rows setting (All, Filtered, Selection).

## Trade-offs

- With the inspector open, the canvas is 904px wide. Screens where nothing is selected close the inspector and give
  the canvas 1144px.
- A context menu is harder to discover than a button. Filtering keeps a visible way in: the + on the Filters header,
  and the toolbar's Filters button.
- Every data setting lives in one place, the inspector. A join or a replace that needs more room than 240px gets the
  inspector resized, never a new surface.
- Counts these screens need that graphty-element does not supply yet:
    - match counts for a join
    - the difference a replace makes
    - per-type conversion counts
    - Test rows from a network source
    - filtered or selected export

## Critique

A review of these screens against the flows, the personas and the first-screen rule, by a red team critic, an
accessibility specialist and a content designer.

### Fixed

- Join numbers did not add up. Only 6 nodes had no value, so ignoring case could not match 19 more rows. Now
  ignoring case adds 4: 316 matched, 24 unmatched, 2 nodes without a value. The source rows, the padj attribute
  (316 of 318 have a value) and the captions all use these numbers. "Not in graph" is now "unmatched" on every
  screen; the old label was cut off in the inspector.
- Counts that disagreed with the header. After Replace, the source row said 120 nodes while the graph had 129.
  After Expand, the attribute counts still said 3,912 nodes and 5,000 edges while the header said 3,962 and 5,050.
- The filtered table showed different numbers for TP53, BRCA1 and the other genes than the Export preview did for
  the same filter. They now match.
- The event table had as many rows as the graph had edges (1,104,206). Each row makes three edges, and repeated
  edges are combined, so that cannot happen. The table now has 2,861,540 rows. The drawn screen said
  "Large: drawn in 2D" but its toolbar showed 3D; it now shows 2D.
- The Filters header with + was missing on 9 of the screens drawn after loading, including the first one. That made
  the claim "filtering keeps a visible way in" untrue. It is now on every screen drawn after loading.
- The first screen after loading showed Direction set to Undirected, which is a setting left at its default. It is
  removed.
- Warnings: "Change type" was cut off at the right edge, and the Non-date row had two actions where the screen
  promises one per kind. It keeps only Change type; Show is still in the attribute's Change type menu. The
  self-loops row read "Keep: Kept" and now reads "Action: Keep".
- Load all was cut off at the right edge of the inspector.
- Counts on a highlighted menu row were gray on blue, about 1.4:1 contrast. They are now near-white.
- Callout 2 on the clean-file screen covered the Nodes label. Callout 2 on the filtered screen covered the toolbar's
  search button.
- The time-window caption claimed the next step's counts (132 and 388), which no screen shows. The caption now says
  only what is drawn.

### Remaining weaknesses

- File names are cut off in the 240px Sources list ("ovarian_de_s...", "expression...."), because the count chip
  takes the room. Two sources with similar names cannot be told apart without hovering.
- Join and Replace each use the narrow inspector for a decision with six or more rows. Neither screen shows the
  resize the README promises. A wide join (several match columns, many added attributes) is not drawn.
- The Data page's left list is headed "Sources", and the Data place's tree also has a "Sources" section, but they
  mean different things: where to open from, and what is loaded.
- Three different panels are drawn at the same time on several screens: the tree, the inspector and a context menu or
  pop-over. The canvas is 904px wide, and the drawing often sits off to one side.
- The node card after Expand shows risk_score, but the Attributes list has only id and holder. The time-window
  screen's Nodes section is open and empty, though the same fraud data has five node attributes on the warnings
  screens.
- "Has value 200 of 200" for opened sits beside 6 values that are not dates and 4 "n/a" values. It is honest but
  confusing next to the warning.
- The Export preview shows 3 columns under "Columns: All 6".
- Replace removes 3 nodes, but the edge count stays at 400. Edges to the removed suppliers would go too, or would
  need a warning.
- In the event table the edges chain user, host, process and IP address, but the edge kinds come from event_type.
  The screen does not show which pair of nodes a logon edge connects.
- The brief this option shares with A and B still says "+19 match ignoring case". A and B carry the same impossible
  join numbers unless they are fixed too.
- Every screen is a static picture. Focus order, keyboard access to the context menus and screen reader labels
  cannot be judged from it. The only focus rings drawn are on the primary buttons.
