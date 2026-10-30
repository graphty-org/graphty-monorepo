# T64 B pilot: the gauge's name and the river distance (targeted re-pilot)

Build bccf8fe47f (frozen, served from .study-builds/tier4-r1d2-bccf8fe47f), start `gauges-joined.txt`.
The walk started from the task's real start and was driven by clicks and typing only. Screenshots
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T64B.

**Reached: yes.** With Label station and Weight km, Higher means farther set in Data > Fields, the
inspector names G05 **Old Bridge**, and Shortest path lists the path by name (Old Bridge, Heron
Marsh, Lake Inlet) with Total km 5.3 and Weight km (farther). No mismatch with the answer key. The
data stayed the task's own the whole way (12 nodes, 14 edges, gauges.csv and flows.csv).

## Success path, by pointer (r4-pointer)

A replay of the earlier pointer route on this build (20 steps) matched every check point to the
end, and the session was ended.

- Fields > gauges.csv "+" > Label > station; flows.csv "+" > Weight > km; Higher means > farther:
  the Graph overview reads Loaded weight "km (farther)" (r4-pointer/12.png).
- Clicking the G05 row names it Old Bridge in the inspector (r4-pointer/15.png).
- Analyze > Shortest path to Lake Inlet: Nodes in order Old Bridge, Heron Marsh, Lake Inlet,
  Total km 5.3, Weight km (farther) (r4-pointer/21.png).

## Not walked

Every other route in this re-pilot's list belongs to another task and its own pilot: the T65 A and
T65 B success paths, follow-ups, keyboard walk and style-layer detour; the T66 A/B Data source card
and source row issue chip; the T68 A/B starts; the T61 A/B Edges issue routes and keyboard walk;
the T67 A/B column issue marks. None of them uses this task's start or asks this task's question.

## Defects

None on the walked route: nothing crashed, blocked the task or gave a wrong result.
