# Session: hand a reviewer the filtered table -- Expert Emma

Participant: Expert Emma, network scientist and consultant (simulated; see ../../personas/expert-emma.md).
Task as given by the moderator: "Hand a reviewer the filtered table of your results so they can check how it was made."
Screens used: the Export dialog, then the table's CSV dialog it opens (screens/export-dialog.html, screens/table-dock.html).

What the participant saw:

- The Export dialog as it opens: ../../../shots/r3-emma-reviewer-export-open.png
- The CSV dialog for the filtered table: ../../../shots/r3-emma-reviewer-export-table.png
- The table's own Export table as CSV... routes: ../../../shots/r3-emma-reviewer-tabledock-out.png

## Think-aloud

**Framing.** "OK. Reviewer. This is the fraud-ring engagement: 3,000 accounts, I have narrowed it to
the 14 in the ring and ranked them. The reviewer is the client's internal model-risk person. They
will open whatever I send in R and try to get the same numbers. So I need two things: rows that
load without cleanup, and something that says exactly what was computed and on what."

**The Export dialog.** "Export files... top right. Fine, that is where I would look. Big dialog.
Figures first -- current view, a saved view, PNG, legend. I do not want a figure. Scrolling the
left list... Methods text, Graph data, then Tables. Tables is not a checkbox, it is a button,
'Export table as CSV...', and a grey line under it saying it opens the table's own export with a
methods file beside it. Slightly odd that everything else is a checkbox and this is a button, but
the line under it tells me what happens, so I click it."

"Before I leave: the footer says '3 files go to your Downloads folder. Nothing is uploaded.' Good.
And the left rail says the assistant is off and nothing is sent. That is the first thing I check
and it is answered without me hunting. Noted."

"The Scope at the top says Full graph. The note says it follows the filter chip unless I change it
here. My chip says 'Filtered: 14 nodes', so I expect 14 rows. Let us see if it agrees."

**The CSV dialog.** "Rows: 14 of 3,000 rows, filtered. Good -- denominator is there. From: Nodes, 1
filter step, in Mule ring suspects. Order riskScore, highest first. Columns: 6, hidden ones
included. OK, I would rather have everything than have it silently drop a hidden column, so that is
the right default. I cannot pick columns, but I can drop them in pandas in one line. Fine."

"The preview. id, kind, country, riskScore, then 'degree (full graph)', then 'pagerank (exact,
unweighted, full graph)'. The ids are the file's own ACC- ids, not some internal integer. Good.
The degree header says full graph while the rows are the filtered 14 -- that is exactly the thing a
reviewer would trip on, and it is in the header, not in a footnote. I like that more than I want to
admit. Header names with parentheses and commas are ugly for R -- check.names will turn them into
dots soup -- but they are quoted, so the file parses. I will live with it."

"Hm. pagerank: 0.000378, 0.00038, 0.000336. Three significant figures? On the other screen, the
protein table's preview wrote 0.13785223783101427 -- full float. Which is it? If the CSV rounds, the
reviewer cannot compare to networkx at 1e-6 and they will ask me why the fourth digit differs. I
need to know the file writes full precision. The preview is supposed to be the file 'exactly as
written', so right now it looks rounded."

**The methods file.** "Beside it: case-acc-233575_nodes-methods.txt. Reading it properly, this is
the bit the reviewer actually needs."

- "Rows: 14 of 3,000, filtered by 1 step: in Mule ring suspects, a fixed set of 14 accounts. --
  And how was the set made? 'Fixed' tells me it is a hand list. The reviewer's first question will
  be 'why these 14', and this file does not say. Was it the ones with riskScore over 90? Was it me
  lassoing a blob? If it was a rule, write the rule. If it was hand-picked, say so and say by whom
  and when. As written, the filter is a black box with a name on it."
- "Data: transfers-2026-03.csv, 3,000 accounts, 9,113 transfers, directed. Load: nodes from
  from_account and to_account. -- Good. No checksum or row count of the source file, but the counts
  are there, which is what I check anyway."
- "Weight: amount's meaning not answered, so no measure used it. -- Oh. That is honest, and I
  appreciate honest. But I did not know I had been asked a question. Somewhere earlier I apparently
  did not answer what 'amount' means, and so PageRank ran unweighted on a money-transfer graph. For
  fraud that is probably the wrong call. I am glad it says so; I am less glad I find out in the
  export dialog."
- "degree: exact, full graph, not normalized. -- Directed graph. In, out or total? For a mule ring
  that is the whole point. Say which."
- "pagerank: exact (power iteration, damping 0.85), full graph, unweighted, normalized to sum to 1.
  -- Power iteration is not 'exact'. It converges to a tolerance. What tolerance, how many
  iterations, and what happens to dangling nodes? networkx's defaults are tol 1e-6, max_iter 100,
  dangling redistributed uniformly. If this matches, write it. That is the line the reviewer will
  use to decide whether my number matches theirs."
- "Seed: none used. Ranges: every run is exact... -- Fine."
- "graphty-element 2.6.2. -- Good, a version. That is more than Gephi gives me."
- "riskScore -- where does riskScore come from? It is the sort column. Is it a column of the input
  file or something computed here? The methods file lists degree and pagerank but not riskScore, so
  I assume it came in with the data. The reviewer will not assume. One line: 'riskScore: from the
  input file, not computed.'"

"The grey text under it says the methods sit beside the CSV so the CSV is just header and rows. Yes,
that is right, I have fought comment lines in CSVs for years. But it is two loose files. When the
reviewer forwards the CSV to someone else, the methods file will not go with it. I would take a zip,
or at least the methods file name repeated... actually the file names share a stem, that helps.
Minor."

"File name case-acc-233575_nodes.csv. Fine. Button says 'Export 2 files'. Clear. No 'Nothing is
uploaded' line in this dialog like the big one had -- I already read it one step back, so not a
problem for me, but if I had come here from the table's own button I would not have seen it."

"Also: there is a 'Share the setup, without data' section back in the big dialog. A recipe. For a
reviewer who has the data, that recipe is the actual reproducibility artifact -- the steps, runs and
parameters as readable JSON. The CSV dialog does not mention it. I only know it exists because I
scrolled past it. If I were the reviewer I would want the CSV, the methods, and the recipe; the
dialog makes me go back and do a second export."

**Export.** "Click Export 2 files. Done. It closes and tells me what it wrote."

## After the task

**Single Ease Question: 6 of 7.** "Getting the file out was easy. Two clicks from the header, and the
table's tab row has the same button if I start there. What is not finished is the methods text:
the set's provenance, riskScore's origin, which degree, and PageRank's tolerance. The route is a 6;
the content, for a reviewer, is a 4."

**Would she use it instead of her current tool?** "For this job -- handing a non-coder the ring's
table plus a statement of how it was made -- yes, over my notebook, because today I write that
methods paragraph by hand at 11pm and I get it wrong. This writes it for me and puts the scope in
the column header. For the analysis itself, no, that stays in igraph. And I will check the first
file it writes against networkx before I send it to anyone, because 'exact (power iteration)' is a
sentence that makes me want to check."

## Problems observed

1. The filter step in the methods file names the set ("Mule ring suspects, a fixed set of 14") but
   not how the 14 were chosen; a reviewer cannot check the selection. Severity 3.
2. PageRank is described as "exact (power iteration)" with no tolerance, iteration count or dangling
   node rule; a reviewer cannot tell whether a mismatch with networkx is real. Severity 3.
3. The CSV preview shows PageRank to three significant figures on this screen and to full float
   precision on the table's own export screen; unclear whether the file rounds. Severity 3.
4. The weighting decision ("amount's meaning not answered, so no measure used it") surfaces first
   in the export; she did not know an unanswered question had changed the analysis. Severity 3.
5. Degree on a directed graph does not say in, out or total. Severity 2.
6. riskScore, the sort column, has no provenance line (input column or computed). Severity 2.
7. The CSV dialog does not point to the recipe, which is the reproducibility file a reviewer would
   want next to the table. Severity 2.
8. The CSV and its methods file are two loose files that can be separated when forwarded. Severity 1.
9. Tables is a button in a list of checkboxes; readable because of the line under it, but it breaks
   the pattern. Severity 1.
10. The CSV dialog has no "Nothing is uploaded" line when opened straight from the table. Severity 1.
