# Data management mocks, round 1: the plan

This round gives the owner three different ways to organize data in the graphty app. Each way is drawn across the same nine flows, so the screens can be compared side by side. Every screen is one 1440 x 900 artboard in the current app's frame: the study build's header, rail, 240px panels, floating toolbar and table dock, dark theme first, built from compact-mantine parts. The flows and the reasons for their order are in `brief-flows.md`, the app as it is today in `brief-app.md`, and the patterns borrowed from other tools in `brief-patterns.md`.

## The flows

Six common flows a reader reaches at once, then three special cases a few clicks away. That is 17 screens per option, 51 in all.

| Flow                                               | Screens                                                                                                                                                                                                                        | Data drawn                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1. Open my own file and get a right drawing        | 3: a clean file's one-line mapping; an unclear file with only the name and weight columns open for a choice; the drawing with nodes named                                                                                      | cat social network (clean); ovarian STRING TSV, 318 proteins, 1,104 links, weight `combined_score`, names in `preferredName` |
| 2. Check that it loaded right                      | 2: the load report with only the lines that are not zero, each with its fix; after loading, the one-sentence summary and each column's type, fullness and origin (file or run)                                                 | fraud ring, 200 nodes, 612 links, 4 issue types, 27 issues                                                                   |
| 3. Find, then show only what matters               | 3: typing "padj < 0.05" in find offers a condition; the condition card counting "60 of 318" with Select and Hide; the drawing showing 60 with "filter on" visible                                                              | ovarian STRING after the join                                                                                                |
| 4. Bring in a newer copy, keep my work             | 2: dropping the October file with Replace already chosen and last month's mapping carried; the receipt "+12 / -3 / 40 changed", one style that no longer binds, Undo                                                           | supply chain, September then October                                                                                         |
| 5. Add a second file to this graph                 | 2: the three choices (Add to this graph, Add columns to nodes, Replace data) with Add columns chosen and its match line, "19 more match ignoring case [Use]"; the result with the new columns and the 6 unmeasured nodes named | `expression.tsv` onto ovarian STRING: 340 rows, 312 matched, 28 not in the graph, 6 nodes with no value                      |
| 6. Take the numbers out                            | 1: export from the table, node table as CSV, scope "what is shown (60 of 318)", one line naming anything the format loses                                                                                                      | ovarian STRING after a run and the join                                                                                      |
| 7. Fix a column (special)                          | 1: a column's menu with its type, "1 blank among 500", role, rename, and the count that will not convert                                                                                                                       | fraud `amount`                                                                                                               |
| 8. Load from a server, expand, load more (special) | 2: "Open network data" beside Open, with the Neo4j form and Test before Load; a capped load "5,000 of 40,000" with Load more, and Expand on one account                                                                        | Neo4j query; fraud `acct-4471`, 37 links, limit 50                                                                           |
| 9. Clean up what the report found (special)        | 1: cleanup offers sitting on the report lines that found them                                                                                                                                                                  | fraud: 5 repeated pairs, 2 self-loops, 14 links with no amount                                                               |

Filter steps, saved sets, id lists and recipes are not drawn this round. They sit behind flows 3 and 4 and wait until the owner picks a structure.

## The three options

### Option A: "Load page, then the Data panel"

The closest to today. Loading and mapping happen on the full Data page, now shortened to one mapping sentence with Change, and a load report that appears only when something is wrong. After loading, the Data panel on the left is the home for what loaded: the summary sentence, sources, and each column with its type in words. Clicking a column opens its details and its fixes in the inspector on the right. The condition card is a popover from a Filter button on the toolbar. A second file or a newer copy opens the Data page again, with Load turned into a split button whose choices are Add, Add columns and Replace. Export stays in the main menu and also sits on the table dock.

What it bets on: readers already find the Data page, and one home per job is easy to learn.
Risk: still a page between the reader and the drawing for every file.

### Option B: "The table is where data lives"

Spreadsheet first. Every data job happens on columns. The Data page's preview and the table dock share one column header showing the type icon, the role, a fullness bar and how many values do not fit, so a column's menu works the same before and after loading. After loading, the table dock opens on its own with the summary sentence above the rows. Conditions are set from a column's header (and from find) and gather into one card above the table, with Select and Hide. A second file shows up as new columns in the table, with the match line above them, before you confirm. Export is the table's own button and follows what the table shows. The Data panel on the left shrinks to the list of sources.

What it bets on: readers go to the table first (18 of 21 looked for export there; 6 of 7 went to the column to say what a number means).
Risk: the table takes canvas height, and readers who never open a table may miss the data jobs.

### Option C: "Drop it, then confirm on the canvas"

Canvas first, like Figma. A clean file is drawn at once, with no page in between, and a receipt card on the canvas says what happened in one sentence ("Each row is a link from bait to prey, weighted by confidence. Nodes named by gene. Change / Undo"). Only an unclear file, or Change, opens the Data page. Dropping a second file on a graph shows a small card on the canvas with the three choices and the match line. Find on the toolbar takes words or conditions and grows into the condition card in place. The Data panel becomes a running list of what happened to the data, in order: each load, join, replace and cleanup, each with its receipt and Undo. Problems show as one warning on the receipt that opens the report.

What it bets on: most files are clean, and receipts with Undo beat a confirm step.
Risk: a wrong guess is drawn before the reader checks it, and the step list is a new idea for readers.

## Rules every screen follows

- No later-tier control, no setting at its default, no line that counts zero, no internal word (Key, Edge id, Attribute) on the first screen.
- Every number comes from graphty-element; one it cannot supply yet carries a small "needs graphty-element" note on the artboard.
- Every door to a file says the file stays in this browser.

## Questions for the owner

1. Which option's home for data feels right, or which parts of which should be combined?
2. Is it right for a clean file to be drawn at once with a receipt and Undo, with no preview first (option C)?
3. Is "Open network data" as one item beside Open, with nothing else on the first screen, enough of a door for server data until a study tries it?
4. Should the mapping sentence always say what names the nodes, even when the id is the name?
5. Should filtering start from its own toolbar button, from find, or from a column's header?
