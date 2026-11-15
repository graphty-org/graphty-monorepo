# T64 A pilot, targeted re-walk -- build 037e96e9bb

Task: on pantries + deliveries (start `pantries-joined.txt`), make the site's name the label, make
trips the weight with "Higher means" closer, then report what the program calls P05.

Verdict: REACHED by pointer and by keyboard. Answer on screen: **Harbor Market**. The data stayed the
task's own the whole way (13 nodes, 18 edges, pantries.csv and deliveries.csv).

## What was walked

- **Earlier walks replayed on this build.** All nine walks from the earlier pass (`s1-pointer`,
  `s2-detours`, `s3-keys`, `w2-success`, `w2-detours`, `w2-keys`, `w3-success`, `w3-detours`,
  `w3-keys`) were replayed on 037e96e9bb. Every one matched at every check point, so none diverged.
  The screenshots for the routes the fixes touched were checked by eye:
  - Success path start (source row counts): the deliveries row reads 13, 18 and the issue
    chip 1, with no chip covering another. The file name gives way and shows as "d..".
    tmp/design-studio/tier4/r1d1/pilot/T64A/w3-success/01.png
  - Label column list: `opened` now shows Aa, the same as its header.
    tmp/design-studio/tier4/r1d1/pilot/T64A/w3-success/04.png
  - Success path end: Data shows Weight trips with closer, and the Overview shows "Loaded weight
    trips (closer)". tmp/design-studio/tier4/r1d1/pilot/T64A/w3-success/10.png. The find box and the
    inspector name P05 as Harbor Market. tmp/design-studio/tier4/r1d1/pilot/T64A/w3-success/14.png
  - Keyboard walk end: the inspector shows Harbor Market for P05.
    tmp/design-studio/tier4/r1d1/pilot/T64A/w3-keys/78.png
  - Detour, table header Role > Weight with "Higher means" left empty: Shortest path lists
    "trips (loaded, not read)" and starts on None. tmp/design-studio/tier4/r1d1/pilot/T64A/w3-detours/27.png
  - Detour, Analyze list for a weight after setting closer: Shortest path lists "trips (closer,
    loaded, not read)" and starts on None. It no longer says farther.
    tmp/design-studio/tier4/r1d1/pilot/T64A/w3-detours/32.png
- **New session `p1-success` (pointer, from the real start).** Walked to check that an analysis
  which reads strength picks up the weight:
  - The Label list opens, then site is picked. tmp/design-studio/tier4/r1d1/pilot/T64A/p1-success/02.png
  - Label is site, Weight is trips, closer, and the Overview reads "Loaded weight trips (closer)".
    tmp/design-studio/tier4/r1d1/pilot/T64A/p1-success/03.png
  - Control+F, then P05, finds "Harbor Market, Node id: P05".
    tmp/design-studio/tier4/r1d1/pilot/T64A/p1-success/04.png
  - Typing "weight" in the Analyze search finds only Shortest path.
    tmp/design-studio/tier4/r1d1/pilot/T64A/p1-success/05.png
  - PageRank's Weight starts on "trips (closer, loaded)". An analysis that reads strength now uses
    the weight set in Data. tmp/design-studio/tier4/r1d1/pilot/T64A/p1-success/06.png
  - Shortest path starts on None and explains why: "Each edge counts as 1. A path needs a distance,
    and "trips" means closer." This is right for a closer weight.
    tmp/design-studio/tier4/r1d1/pilot/T64A/p1-success/08.png

## Answer key against the screen

- answers.md says the table-header route "leaves Higher means empty, and Analyze then reads it as
  farther". On this build, Shortest path lists that weight as "trips (loaded, not read)" and does
  not read it. Nothing reads it as farther any more, so this line needs updating
  (w3-detours/27.png).

## Defects (crash, block, or wrong graded result)

None. The fixes for the source row counts, the Label list glyph for `opened` and the weight
analyses read are all in place on this route.

Below the bar, for the backlog: in the Label column list, `families` shows Aa while its table
header shows a different glyph, and `volunteer_run` shows the three-circle glyph while its header
shows another. tmp/design-studio/tier4/r1d1/pilot/T64A/p1-success/02.png

## Skipped

None. The other routes in the re-walk list belong to other tasks.
