# Pilot: T20 A (bus stops), the load-time route, walked again

Build: graphty@0.8.55 (build stamp 75cbc3a9a0e9), served from a frozen copy of `graphty/dist`
built 2026-10-07 21:13, worktree at commit c16465e7a with uncommitted changes, `/?next`,
1440 x 900. Start: empty. Same 15 steps as the first T20 pilot (`../T20/pilot.md`); the printed
output of every step is in `steps.log`. No step missed, and none printed a script error, a console
error or a failed request.

**Reached: yes.** Values read Route "5 nodes, 4 edges", Total distance "14", Nodes in order Depot 1,
Market 2, Park 3, Clinic 4, Harbor 5, Made with "Weight: minutes (farther)" (`15.png`). The
Overview reads "Loaded weight minutes (farther)" right after Load (`08.png`). Both match the key.

## Still so (not blockers)

1. No "Higher means" choice looks picked before one is chosen (`06.png`); the hint under it is
   readable ("paths ignore it; PageRank and communities read it as larger = closer").
2. After Find path the inspector opens on Style, not Values, and two other numbers sit beside the
   route: the tree row "Shortest path 27" and the legend "Shortest route (edges) 24" (`14.png`).
   The answer key should list 27 and 24 as misreadings for T20, as it does for T18.
3. The "Time" role offered for the minutes column (`05.png`) is still an unwalked trap.
4. The graph is drawn Directed with no stop names, so the route cannot be read off the drawing.
