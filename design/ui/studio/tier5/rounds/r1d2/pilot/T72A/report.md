# T72 A pilot (sources): re-walk on build d3fda9f2b6

Task: color the companies and the government agencies in orange, but not the ones on the record,
and say how many are orange. Answer: 7 of 24. Every walk started from the task's real start (the
sources setup: Open a file, sources.graphml) and was driven by clicks, typing and keys only, on the
frozen build /home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d2-d3fda9f2b6. The data
stayed the task's own file the whole way (24 nodes, 59 edges, one source, sources.graphml). Nothing
crashed, blocked or gave a wrong count.

Walked here: the success path by pointer, and the one route in the touched list that belongs to
this task: every setup start (the list's seventh route). The other routes in the touched list are
detours of other tasks (T71, T72 B, T75, T76, T77, T79). The keyboard walk and the detours were not
part of this targeted re-walk.

Walks from an earlier build that sat in this folder were moved to
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T72A/old-47c95a09fc.

## Success path by pointer

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T72A/success

Replayed from the walk on build c3100058ab
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T72A/success); all 16
steps matched. + (Add a layer or a folder) > Layer; Which nodes; kind; tick company and agency;
Condition...; on_record; Value...; Yes; the Except switch; Done; Fill's +; type E4572E; Enter; Tab;
then a typed 00FF00 and Escape.

- 12.png: the workspace header reads "Which nodes -- Layer 1 7 of 24"; the outline reads "kind
  agency, company / Except on_record Yes"; the table under the preview lists the seven, all
  on_record No. Matches the answer key.
- 13.png: after Done the layer row reads "Layer 1 7" and the inspector shows the two steps.
- 15.png: seven nodes orange, the legend "Color: Layer 1, 7 of 24 nodes", the inspector "Which
  nodes 7 of 24". Matches the answer key.
- 16.png, 17.png: Tab leaves the color field without a change; Escape after typing 00FF00 puts
  back E4572E and the canvas stays orange.

## Every setup start (touched route 7)

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T72A/touched-7

Started from the sources setup, then a click on Undo, Ctrl+Z, and a hover on Undo.

- 01.png to 03.png: the graph arrives as the setup left it (24 nodes, Everything 24); Undo is
  disabled (the click reports "element is not enabled"), and Ctrl+Z changes nothing.
- 04.png: the Undo tooltip reads "Nothing to undo". The setup's own steps cannot be undone.

The tool's self-test (`real.mjs --prove`) ran on the same build, written to
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T72A/touched-7-prove
(log: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T72A/touched-7-prove.log):
exit 0, 98 checks ok, none failed, including "after a setup start Undo is disabled, with the
tooltip Nothing to undo" and every other setup-start check.

## Mismatches with the answer key

None.

## Defects

None found on these walks.
