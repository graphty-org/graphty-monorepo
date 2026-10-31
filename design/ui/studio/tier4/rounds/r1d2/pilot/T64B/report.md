# T64 B pilot: the gauge's name and the river distance (targeted re-pilot)

Build a53beb7179 (frozen, served from .study-builds/tier4-r1d3-a53beb7179), start `gauges-joined.txt`.
The walk started from the task's real start and was driven by clicks and typing only. Screenshots
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T64B.

**Reached: yes.** With Label station and Weight km, Higher means farther set in Data > Fields, the
inspector names G05 **Old Bridge**, and Shortest path lists the path by name (Old Bridge, Heron
Marsh, Lake Inlet) with Total km 5.3 and Weight km (farther). No mismatch with the answer key. The
data stayed the task's own the whole way (12 nodes, 14 edges, gauges.csv and flows.csv).

## Success path, by pointer (r8-pointer)

A replay of the earlier pointer route on this build (20 steps) matched every check point to the
end, and the session was ended.

- Fields > gauges.csv "+" > Label > station; flows.csv "+" > Weight > km; Higher means > farther:
  the Graph overview reads Loaded weight "km (farther)" (r8-pointer/12.png).
- Clicking the G05 row names it Old Bridge in the inspector (r8-pointer/15.png).
- Analyze > Shortest path to Lake Inlet: Nodes in order Old Bridge, Heron Marsh, Lake Inlet,
  Total km 5.3, Weight km (farther) (r8-pointer/21.png).

## Not walked

These routes were queued as replays on this build (folders r9-z01 to r9-z17 under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T64B, script r9-replay.sh there)
but never got a browser: all eight of the machine's browser slots stayed taken, and the walk had to
report before one freed. They are still to be walked: the T65 A success path, its other card order and
its keyboard walk; the T65 B success path, its other card order and the style layer's Which nodes
detour; the T66 A/B Data source card's count and the source row's issue chip after it; the T68 A/B
starts; the T61 A success path, the T61 B success path, the T61 A deliveries.csv-first detour and the
T61 A keyboard walk; the T67 A/B column issue marks. This task's own detours and keyboard walk were
not part of this targeted pass.

## Defects

None on the walked route: nothing crashed, blocked the task or gave a wrong result.
