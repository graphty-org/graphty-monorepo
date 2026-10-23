# Session r2-s13 -- Elena (returning), task T22, dataset A (bus stops)

Build: 8f0d5a6f7791 (frozen copy tier2-r2d4-8f0d5a6f7). Run from `design/ui/studio/tier2`.

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ node ../tool/real.mjs --start rounds/round-2/sessions/r2-s13 setup:bus-stops-ranked.txt
commit 8f0d5a6f77911a0093a614457ac3c9db5fde3235, build 8f0d5a6f7791 graphty@0.8.61
-> 01.png
```

**Elena (01.png):** OK, the bus file is open. Dots are sized and colored by PageRank from before. I need the links that take 10 minutes or more to stand out. Links are the lines. There's a "Find nodes, edges, values" box at the top left -- "values" sounds promising. I'll try typing there.

**Elena:** I'll click the find box that says it can find edges and values.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click Find\ nodes\,\ edges\,\ values
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/02.png
```

**Elena:** The box is focused, no hints. I'll type the word from the data, 'minutes', to see what it offers.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --type minutes
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/03.png
```

**Elena:** 'No match for minutes.' Hmm, it searches names I guess. In our dashboard filters I'd write something like 'minutes >= 10'. I'll clear it with the x and try that.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click-at 276\,90
at 276,90: button "Clear search"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/04.png
```

**Elena:** Cleared. I'll click back in the box and type my condition.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click Find\ nodes\,\ edges\,\ values
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/05.png
```

**Elena:** Typing it the way I would in a dashboard filter.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --type minutes\ \>=\ 10
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/06.png
```

**Elena:** Oh nice, it tells me: 'Start with = to select by a value: =minutes >= `10`'. The little quote marks around 10 are weird but I'll copy it exactly. Clearing first.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click-at 276\,90
at 276,90: button "Clear search"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/07.png
```

**Elena:** Box cleared; clicking into it.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click Find\ nodes\,\ edges\,\ values
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/08.png
```

**Elena:** Typing exactly what it showed me.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --type =minutes\ \>=\ \`10\`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/09.png
```

**Elena:** 'Rule: press Enter to select matches.' OK, pressing Enter.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --key Enter
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/10.png
```

**Elena:** Three links light up blue: School->Harbor 12, Depot->Station 15, Station->Harbor 14. Nothing got removed. But blue just means 'selected' -- if I click somewhere it'll probably vanish, and my colleague needs it to stay. There's a Style tab next to Values up on the right; I'll look there.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click Style
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/11.png
```

**Elena:** Style shows Line, Arrows, Label with plus signs. 'Line' is the link itself -- I'll press the plus next to Line to give them a color.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click-at 1419\,136
at 1419,136: button "Add to Line"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/12.png
```

**Elena:** A menu: Color, Width, Opacity, Pattern, Curved. Color, obviously.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click Color
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/13.png
```

**Elena:** It made a thing called '3 edges' on the left and a legend entry 'Edge color: 3 edges'. But the color is A9A9A9, grey -- same as every other line, so that does nothing. I'll click the little grey square to pick red.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click-at 1220\,160
at 1220,160: button "Color swatch"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/14.png
```

**Elena:** A color picker. I'll click the bright red top-right corner of the big square.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click-at 1195\,212
at 1195,212: slider "Saturation and brightness"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/15.png
```

**Elena:** Red now, legend says '3 edges' in red. The blue outline is still around them. I'll close the picker with the x.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click-at 1193\,173
at 1193,173: button "Close panel"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/16.png
```

**Elena:** Picker closed. Now the real test: I click on an empty part of the map to unselect and see if the red stays.

```
node ../tool/real.mjs --step rounds/round-2/sessions/r2-s13 --click-at 400\,600
at 400,600: empty canvas
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s13/17.png
```

**Elena (17.png):** The red stayed after I clicked away. The three slow links are red and every
other line is still grey; the panel still says 10 nodes and 17 edges, so nothing was taken off.
That's what my colleague asked for. I'm done.

```
node ../tool/real.mjs --end rounds/round-2/sessions/r2-s13
session ended
```

## At the end, in Elena's words

- **Finished?** Yes. Three links take 10 minutes or more: School -> Harbor (12), Depot -> Station
  (15) and Station -> Harbor (14). They're red now, and every stop and link is still on the map.
  What I'd paste into Slack: "3 bus links take 10+ min -- the red ones, all running into Station
  and Harbor."
- **Ease:** 5 of 7.
- **What confused me:**
  - The search box said "values", but typing the column name "minutes" only gave me "No match".
    Nothing told me there was a special way to type a condition until I happened to type
    "minutes >= 10" the way I would in our dashboard. Only then did it show me the "start with ="
    hint. If I'd typed "10 minutes" or "slow", I don't think I'd ever have seen it.
  - The example put little backtick marks around the 10 (`` `10` ``). I copied them because I
    didn't know if they mattered. I still don't know.
  - The blue "selected" outline looked like the answer, but I was pretty sure it would go away
    when I clicked somewhere, so I had to find another way to make it stay. The Style tab worked.
    But the first color it gave me was the same grey as every other line, so "adding a color"
    changed nothing until I picked a new one.
  - The red lines are thin, and the legend calls them "3 edges", not "10 minutes or more". If
    I send this to someone, they won't know what red means unless I tell them. I'm also not sure
    whether more links would turn red if the data changed, or if it's just these three now.
