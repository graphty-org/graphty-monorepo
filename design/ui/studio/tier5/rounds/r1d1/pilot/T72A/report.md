# T72 A pilot (sources): re-walk on build 797a4f6b47

Task: color the companies and the government agencies in orange, but not the ones on the record,
and say how many are orange. Answer: 7 of 24. Every walk started from the task's real start (the
sources setup: Open a file, sources.graphml) and was driven by clicks, typing and keys only. Each
was replayed from the same walk on the earlier build (baac78342b, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T72A/), and every step
matched that walk's screen; the end screens were checked by eye. Nothing crashed, blocked or gave a
wrong count.

Walked here: the success path by pointer, and the two routes of this task that the fixes touched.
The other routes in the touched list belong to other tasks.

## Success path by pointer

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72A/success

+ (Add a layer or a folder) > Layer; Which nodes; kind; tick company and agency; Condition...;
on_record; Value...; Yes; the Except switch; Done; Fill's +; type E4572E; Enter. All 16 steps
matched.

- 12.png: the editor's outline reads "kind agency, company / Except on_record Yes", header
  "Which nodes -- Layer 1 7 of 24"; the table under the preview lists the seven (s01 Harlan
  Development, s04 Northgate Capital, s07 Bayview Holdings, s12 Port Authority, s15 Zoning Board,
  s20 Silverline Media, and below the fold the seventh), all on_record No.
- 15.png: seven nodes orange on the canvas, the layer row "Layer 1 7", the side panel "Which
  nodes 7 of 24", the legend "Color: Layer 1, 7 of 24 nodes". Matches the answer key.
- 17.png: typing 00FF00 in the color field and pressing Escape puts back E4572E; the canvas stays
  orange. Enter committed the color (15.png); Tab left the field without changing it (16.png).

## Route touched by the fixes: Layer 2 deleted, Layer 1 edited (touched-13)

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72A/touched-13

Layer 1 = kind company, agency, filled orange (10 nodes); a right-click on a node and Escape; Layer
2 = on_record Yes, filled indigo; Layer 2 deleted from its row's menu; Layer 1 reopened; Condition
on_record, Yes, Except; Done. All 12 steps matched.

- 09.png: "Deleted Layer 2." with Undo; ten nodes orange again, Layer 1 reads 10.
- 13.png: Layer 1 reads 7, "Which nodes 7 of 24", outline "kind agency, company / Except on_record
  Yes", seven orange nodes. A right answer by this route.

## Route touched by the fixes: a filter first, then the layer (touched-35)

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72A/touched-35

The canvas toolbar's Filters; kind company, agency; Condition on_record, Yes, Except; Done; Graph;
the Everything layer; its fill set to E4572E. All 6 steps matched.

- 04.png to 07.png: the filter leaves "7 of 24 nodes, 4 of 59 edges" in the top bar; Everything,
  filled E4572E, paints the seven left on the canvas orange. The count a participant would report is
  right, but no style layer holds the rule (the answer key grades a filter card as not success),
  which is what this route is in the set to measure; it works without a fault.

## Defects

None found on these walks. The keyboard walk was not part of this targeted re-walk.
