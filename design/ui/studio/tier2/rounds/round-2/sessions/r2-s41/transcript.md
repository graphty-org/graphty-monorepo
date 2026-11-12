# Session r2-s41 -- Tom (returning), task T4, dataset A (office: people.csv + messages.csv)

Build: frozen build 8f0d5a6f7791 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/). Start: empty.

Task as given: "You have used this program a few times, always on a single list. Two spreadsheets
from your office are in your Downloads folder: people.csv lists the staff, and messages.csv lists
who emails whom and how often. Get them into the program as one network, drawn, and make sure
every person and every link arrived. Tell us anything that did not fit."

Commands run from design/ui/studio with REAL_DIST set; S=tier2/rounds/round-2/sessions/r2-s41.

## Steps

### Start
`./tool/with-browser.sh node tool/real.mjs --start $S empty` (waited for a free browser slot first)

### Step 2
Tom: The start page. Before anything else there's a box asking to collect usage data. Our lab data doesn't leave the building, so no. I'll press No thanks.
`node tool/real.mjs --step $S --click "No thanks"`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s41/02.png
```

### Step 3
Tom: Good, it says files are read on this computer and never uploaded, and Usage data stays off. That's what I need to see before office data goes in. I've always used Open project or file, so I'll do that and start with the staff list, people.csv.
`node tool/real.mjs --step $S --click "Open project or file..." --upload people.csv`

```
a file chooser is open (answer it with --upload <file>)
chose the file people.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s41/03.png
```

### Step 4
Tom: It didn't just draw it; it shows me the staff list as a table, 12 rows, which matches my spreadsheet (I count p01 to p12). The line at the bottom says 12 nodes and 0 edges, so the emails aren't in yet. Under 'Tables' on the left there's a little plus. That looks like where another table would go. I'll press the plus.
`node tool/real.mjs --step $S --click-at 271,107`

```
at 271,107: button "Add a table"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s41/04.png
```

### Step 5
Tom: A small menu: File..., From a URL..., Paste... My file is in Downloads, so File..., and I pick messages.csv.
`node tool/real.mjs --step $S --click "File..." --upload messages.csv`

```
a file chooser is open (answer it with --upload <file>)
chose the file messages.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s41/05.png
```

### Step 6
Tom: Now there are two tables, the staff and the messages. The bottom says 12 node rows and 23 edge rows read, but the load makes 22 edges, and '1 edge row names a node missing from the node rows'. There's a warning triangle on the messages table: '23 rows, 1 left out'. So one of my 23 links won't arrive. 'Leave out' is already picked. Before I decide anything I want to see which row it is: 'Show the 1 unmatched row'.
`node tool/real.mjs --step $S --click "Show the 1 unmatched row"`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s41/06.png
```

### Step 7
Tom: It's line 24: p11 (Kemi Bello) emailed p13, six times, and p13 isn't on the staff list. That's the thing that didn't fit, and I'll tell them. I was told every link has to arrive, so I don't want it left out. 'Add' next to it -- I take that to mean add p13 as a person so the link comes in. It's only this screen, not my spreadsheet, so I'll press Add and see what the counts say.
`node tool/real.mjs --step $S --click "Add"`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s41/07.png
```

### Step 8
Tom: Now it says 13 nodes and 23 edges, and both tables have green ticks. 23 matches the rows in messages.csv. 13 people is my 12 plus the unknown p13. The direction box says 'As the file says' -- I don't know what else it would be, so I leave it. Load.
`node tool/real.mjs --step $S --click "Load"`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s41/08.png
```

### Step 9
Tom: It's drawn. The title is 'people and messages', and the panel on the right says Nodes 13, Edges 23, 'From 2 files'. I counted the dots myself: 13. Good. But the dots have no names on them, so I can't tell who is who. The one sitting off on its own at the top with a single line going to it -- I bet that's the mystery p13. I'll click it.
`node tool/real.mjs --step $S --click-at 895,118`

```
at 895,118: node with id "p13"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s41/09.png
```

### Step 10
Tom: Yes, that's p13, one link, and nothing else known about it -- no name, no team, which is right, it wasn't on the staff list. Now I want to be sure the real staff came with their names and teams, not just codes. The dot that p13's line comes from should be p11, Kemi Bello. I'll click it.
`node tool/real.mjs --step $S --click-at 918,338`

```
at 918,338: node with id "p11"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s41/10.png
```

### Step 11 (end)
Tom: p11 is Kemi Bello, Operations, 4 links. So the names and teams came over from the staff list. 13 people (my 12 plus p13), 23 links, matching the 23 rows. I'm done.
`node tool/real.mjs --end $S`

```
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s41
```

## At the end (Tom, in his own words)

**Did I finish?** Yes. Both spreadsheets are in as one drawing, called "people and messages". The
side panel said 13 nodes and 23 edges, I counted 13 dots, and 23 is the number of rows in
messages.csv. Clicking a dot showed the person's name and team, so the staff list came across too.

**What did not fit:** one row in messages.csv, line 24: Kemi Bello (p11) emailed someone called
p13 six times, and p13 is not on the staff list. The program told me that before loading, showed me
the exact row, and let me choose to add p13 or leave the row out. I added p13 so every link would
arrive, so the network has 13 people, not 12; p13 has no name or team. Someone should tell me who
p13 is.

**Ease:** 6 out of 7.

**What confused me or slowed me down:**
- I opened the staff list the way I always do and it did not draw anything; it showed a table
  instead. That turned out to be right, but I had to notice the small plus beside "Tables" to add
  the second file. I nearly missed it; it is a tiny mark at the top of a long empty column.
- "Add" and "Leave out" sit next to each other with no word on what "Add" adds. I guessed it meant
  "add p13 as a person", and the count going from 12 to 13 told me I was right. I would not have
  pressed it if the count had not been there to check.
- "Weight: none (each edge counts 1)" -- my file has how many emails each pair sent. I don't know if
  that means the email counts were thrown away or just not used for something. I left it alone.
- "Direction: As the file says" -- I didn't know what else it could be, so I left it.
- The dots have no names on them. I had to click each one to find out who it was. When I clicked
  Kemi Bello, the heading at the top of the side panel still said "p11", not her name.
- What I liked: before anything went in, the start page said files are read on this computer and
  never uploaded. That's the first thing I look for with office data.
