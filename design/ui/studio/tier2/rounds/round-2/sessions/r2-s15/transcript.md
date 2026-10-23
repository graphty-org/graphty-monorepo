# Session r2-s15 -- Tom (returning), task T22 prompt A (bus stops)

Build: 8f0d5a6f7791 (frozen copy tier2-r2d4-8f0d5a6f7). Setup: bus-stops-ranked.txt.

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ node real.mjs --start ../tier2/rounds/round-2/sessions/r2-s15 setup:bus-stops-ranked.txt
commit 8f0d5a6f77911a0093a614457ac3c9db5fde3235, build 8f0d5a6f7791 graphty@0.8.61 -> 01.png
```

**Tom (01.png):** That's my colleague's bus file, already ranked -- orange balls, the big dark one in
the middle. The lines are all the same grey. I need the slow links, 10 minutes or more, to stand
out. There's a box at the top left that says "Find nodes, edges, values". Values -- the minutes are
values. I'll click in there and try.

**Tom:** Clicking the find box at the top left.

```
node real.mjs --step ../tier2/rounds/round-2/sessions/r2-s15 "--click" "Find nodes, edges, values"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s15/02.png
```

**Tom:** The box is outlined now, nothing else changed. The column is called minutes in her file, so I'll type that and see what it offers.

```
node real.mjs --step ../tier2/rounds/round-2/sessions/r2-s15 "--type" "minutes"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s15/03.png
```

**Tom:** 'No match for minutes'. But minutes is her column. Maybe it wants the condition, like an Excel filter -- I'll add '>= 10' after it.

```
node real.mjs --step ../tier2/rounds/round-2/sessions/r2-s15 "--type" " >= 10"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s15/04.png
```

**Tom:** Now it says 'Start with = to select by a value'. Underneath is something in typewriter letters with odd little ticks around the 10. I'll just put the = in front of what I typed -- going to the start of the box first.

```
node real.mjs --step ../tier2/rounds/round-2/sessions/r2-s15 "--key" "Home"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s15/05.png
```

**Tom:** Cursor should be at the front now. Typing the =.

```
node real.mjs --step ../tier2/rounds/round-2/sessions/r2-s15 "--type" "="
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s15/06.png
```

**Tom:** Red writing now: 'Put numbers in backticks'. I don't know what a backtick is. The example has those little slanted ticks round the 10, like on the key under Escape I never use. I'll clear the box and copy what it shows, ticks and all.

```
node real.mjs --step ../tier2/rounds/round-2/sessions/r2-s15 "--click" "Clear"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s15/07.png
```

**Tom:** Empty again, box still has the cursor. Typing it the way the example showed it.

```
node real.mjs --step ../tier2/rounds/round-2/sessions/r2-s15 "--type" "=minutes >= `10`"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s15/08.png
```

**Tom:** No red now. 'Rule: press Enter to select matches.' 'Select' -- I hope that doesn't remove anything. It doesn't say Delete, so pressing Enter.

```
node real.mjs --step ../tier2/rounds/round-2/sessions/r2-s15 "--key" "Enter"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s15/09.png
```

**Tom (09.png):** There. Three lines went thick and blue -- School to Harbor, Station to Harbor,
Depot to Station -- and it says "3 edges selected", with a list on the right: 12, 15 and 14
minutes. Every stop and every other line is still on the drawing, nothing went missing. That's
it, I'm done. Answer: 3 links take 10 minutes or more.

```
node real.mjs --end ../tier2/rounds/round-2/sessions/r2-s15
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s15
```

## Afterwards, in Tom's words

- **Did I finish?** Yes. Three slow links: School -> Harbor (12), Depot -> Station (15),
  Station -> Harbor (14). They show in blue on the full map.
- **Ease:** 4 out of 7.
- **What confused me:**
  - I typed "minutes", her own column name, and it said "No match for minutes". That's the column
    -- how is there no match? That was my first wrong turn.
  - Then I wrote it the way I would in an Excel filter, "minutes >= 10", and it told me to start
    with "=". Fine. But then it went red: "Put numbers in backticks". I had to look at the little
    typewriter example to work out what a backtick even is. I've never typed one in my life. If
    that example had not been there I would have stopped and emailed her.
  - "Press Enter to select matches" -- I wasn't sure "select" would leave her file alone. It did;
    nothing was taken off.
  - The answer says "edges". I'd call them links. The list on the right with the minutes was the
    best part: I could read the numbers and check them myself.
  - Will it stay blue if I click somewhere else, or when I save? I don't know. If she wants it on
    a slide I'd want it to stay put.
