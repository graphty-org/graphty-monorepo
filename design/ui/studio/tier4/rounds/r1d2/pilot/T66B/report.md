# T66 B targeted re-pilot: leave out the gauge that only the stretch list names

Build: ff17391bb1 (frozen, `.study-builds/tier4-r1d2-ff17391bb1`). Start: `gauges-joined.txt`
(gauges.csv with flows.csv joined onto it; 12 nodes, 14 edges). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T66B/ (not in git).

## Result

Reached, with the answer key's counts. A Data source filter card with gauges.csv ticked leaves G12
out of the picture and keeps every other stretch: top bar "11 of 12 nodes, 13 of 14 edges", card chip
"11 of 12", inspector "Nodes showing 11 of 12, Edges showing 13 of 14". The Nodes table on All still
lists G12 (12 nodes), so the network still holds it. Nothing crashed, blocked or gave a wrong count.

## Routes walked this pass

### Success path by pointer (success-3/)

Replayed from the earlier walk on this build (success/); all 17 steps matched and the session ended.

- success-3/01.png: the start. Sources: gauges.csv (11), flows.csv (12 nodes, 14 edges, 1 issue);
  Overview 12 nodes, 14 edges. The data is the task's own.
- success-3/03.png, 04.png: Filters "+" opens the attribute picker; Data source is under Structure,
  below the fold until scrolled.
- success-3/05.png: the Data source card, one box per file, no count yet.
- success-3/07.png: ticking gauges.csv: "11 of 12 nodes, 13 of 14 edges"; G12 and its G09 -> G12
  stretch are gone from the drawing, every other stretch stays drawn.
- success-3/12.png: the effect radio "Hide" has the tooltip "Hide nodes that do not match"; the on box
  reads "Apply from gauges.csv" (13.png).
- success-3/14.png: Edges table on Shown: "13 of 14 edges".
- success-3/15.png: ticking flows.csv as well: top bar "12 of 12 nodes" (no edge count), inspector
  12 of 12 and 14 of 14, as the answer key says.
- success-3/18.png: flows.csv unticked again (back to 11 of 12, 13 of 14); Nodes table on All lists
  G12 as the twelfth row.

### The listed fix routes

None of the twelve routes on this pass's list belongs to T66 B: they are routes of T64 (shortest
path, weights, names), T65 (select and filter cards, selection inspector) and T68 (the narrowed
start). They were not walked here.

## Mismatch with the binding decisions

- The card's effects read "Select | Hide" (radio "Hide", tooltip "Hide nodes that do not match"),
  where the team decision of 2026-10-29 says a filter card's effects are "Select | Filter to | Filter
  out" and a new card starts on Filter out (success-3/07.png, success-3/12.png). This does not spoil
  grading: the answer key's T66 text still names "Hide", and the counts are right.

## Earlier walks on this build (not repeated)

The same build already has a detour walk (detours/, detours-2/) and a keyboard-only walk
(keyboard/, keyboard-2/) from an earlier attempt of this pass. keyboard/31.png shows the keyboard
route reaching the success state (Space on "gauges.csv, 11 nodes" announced "Filter on: 11 of 12
nodes, 13 edges"). They were not re-walked, as this targeted pass asks for the success path only.
