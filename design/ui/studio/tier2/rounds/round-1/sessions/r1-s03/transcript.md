# Session r1-s03 -- Alex (returning operations analyst), task T20 prompt A (bus stops)

Build: tier2-r1d4-946256efb (served with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/).
Tool: design/ui/studio/tool/real.mjs, session folder tier2/rounds/round-1/sessions/r1-s03.

Contamination note for the facilitator: while locating the task, the participant agent saw the
task section's "Words avoided" list (it is inside the T20 section) and the persona file's
facilitator notes. Both name parts of the intended route. Weigh this session's discovery findings
accordingly.

## Steps

### 01 -- start

Command: `with-browser.sh node tool/real.mjs --start <session> empty`
Alex: Start screen, same as last week. Bottom card about usage data; I'll say no thanks. Then "Open project or file..." for the CSV.

### 02 -- open the CSV

Command: `--step <s> --click "No thanks" --click "Open project or file..." --upload bus-stops.csv`
Alex: It loaded straight away, no import screen. 10 nodes and 17 edges -- that matches what my colleague said. Directed. But no stop names on the dots, and nothing tells me what it did with the minutes column. I'll check the Data tab on the left to see if minutes came in.

### 03 -- Data tab

Command: `--step <s> --click "Data"`
Alex: Good, "minutes" came in as a number on the edges. Nodes only have an id. Nothing says how calculations will use minutes. I'll click "minutes" and see if there are settings for it.

### 04 -- the minutes attribute

Command: `--step <s> --click "minutes"`
Alex: Summary: edges, kind "Amount", from the file, 2 to 15. "Amount" -- amount of what? Nothing here says whether bigger means further or stronger. Maybe "Amount" is a dropdown. I'll click it.

### 05 -- click "Amount"

Command: `--step <s> --click "Amount"`
Alex: Nothing happened; it's just a label. There's a "..." in the top right of this panel. I'll try that.

### 06 -- attribute "..." menu

Command: `--step <s> --click-at 1419,73` (button "Attribute actions")
Alex: Only "Filter to..." and "Show in table". Not what I need. Maybe the import settings live on the file itself -- I'll close this and click bus-stops.csv under Sources.

### 07 -- the source

Command: `--step <s> --key Escape --click "bus-stops.csv"`
Alex: The source panel just says it added 10 nodes and 17 edges. A table popped up at the bottom with From, To, minutes -- Depot to Market 4, Market to Library 6, Library to Harbor 5, Depot to School 9. Fine, the data's right. But there's no import setting about what minutes means. I'll go to the analysis button in the toolbar, like every week, and look for shortest path; maybe it asks which column to use.

### 08 -- analysis list

Command: `--step <s> --click-at 679,623` (button "Analyze")
Alex: The usual list, with a filter box. I'll type "shortest" like I would in any tool.

### 09 -- filter "shortest"

Command: `--step <s> --type "shortest"`
Alex: "Shortest path -- the fewest steps, or the shortest route by weight, between two nodes." "By weight" -- my column is called minutes, not weight. Let's open it and see what it asks.

### 10 -- Shortest path form

Command: `--step <s> --click "Shortest path"`
Alex: From, To, Follow (Out / All), Weight: None, Advanced. Weight None is the trap -- that's fewest stops. I'll fill From first: Depot.

### 11 -- From: Depot

Command: `--step <s> --click "Where the path starts" --type "Depot"`
Alex: It suggests Depot. Enter to take it, then the same for Harbor in To.

### 12 -- From Depot, To Harbor

Command: `--step <s> --key Enter --click "Where the path ends" --type "Harbor" --key Enter`
Alex: Both filled. Now Weight -- I'll open it and pick minutes.

### 13 -- Weight list

Command: `--step <s> --click "Weight"`
Alex: "None" or "minutes (farther)". Farther -- OK, so it already thinks more minutes is farther. I didn't tell it that anywhere, it guessed. That's what I want, but I'd like to know where it decided that. Pick it and run.

### 14 -- run

Command: `--step <s> --click "minutes (farther)" --click "Find path"`
Alex: There it is. Depot, Market, Park, Clinic, Harbor -- 5 stops, 4 links, "Total distance 14". And under "Made with" it says Weight: minutes (farther). That's the line I'd screenshot to show it used the minutes. Sanity check by hand: Depot-Market-Library-Harbor is 4+6+5 = 15, fewer stops but slower, so 14 beating it makes sense -- it really is using minutes, not stop count. Two things bug me: it says "distance" when these are minutes, and "Follow: All" -- buses run one way, so I want to know it isn't driving the wrong way down a link. I'll hover the Follow buttons first.

### 15 -- check the links on the path

Command: `--step <s> --click "Shortest path"` (meant to hover Follow; the name matched the column header in the table first, so it clicked that)
Alex: Oops, I hit the table header instead -- but that's actually useful: it sorted the edges table by "Shortest path", and the four Yes rows are Depot->Market 4, Market->Park 3, Park->Clinic 4, Clinic->Harbor 3. Every one goes in the From->To direction of the file, so it isn't riding a bus backwards, and 4+3+4+3 = 14 matches the total. I have my answer. Stopping here.

### 16 -- end

Command: `--end <s>`

## Debrief (in character)

**Did I finish?** Yes. Quickest Depot to Harbor: Depot, Market, Park, Clinic, Harbor -- 14 minutes,
4 links. Where it says it used the minutes: the result panel's "Made with" section, "Weight:
minutes (farther)", plus the edges table where the minutes on the four "Yes" rows add up to the 14. The one-stop-shorter route Depot-Market-Library-Harbor is 15 minutes, so the answer is not the
fewest-stops route.

**Ease: 5 of 7.** The run itself was quick once I found it: type "shortest", fill two boxes,
pick the weight, Find path. What cost me time was the first half of the job.

**What confused me:**

- "Bring it in so every calculation treats more minutes as longer" -- I never found a place to say
  that. The file opened with no import step. I went looking on the minutes column in Data
  (it just says Kind: "Amount", and clicking Amount does nothing; its "..." menu has only Filter
  and Show in table) and on the source file (just counts). Then the Weight list in Shortest path
  already offered "minutes (farther)". So the program decided "farther" on its own, and I only
  learned that from a word in brackets in a dropdown. I can't tell you whether betweenness or
  closeness will treat minutes the same way, or where I'd change it if it guessed wrong (for
  something like capacity it would be wrong). For a weekly routine I'd want that set once, on the
  column, where I can see it.
- Weight defaults to "None" in Shortest path even though the program already knows minutes is a
  "farther" number. If I'd hit Find path without opening it I'd have gotten fewest stops and
  probably not noticed.
- The result says "Total distance 14". It's minutes, not distance. I'd want "14 minutes" or at least
  the column name next to the number before I put it in a slide.
- "Follow: All" was the default on a directed bus network. Here the answer happened to follow the
  links forward, but I only knew that by checking the table myself. I don't know what "All" did.
- No stop names on the dots in the picture, so the drawing alone doesn't tell me the route; I read
  it off the panel.

**Good:** the counts matched on load (10 stops, 17 links), the "Nodes in order" list is exactly
what I'd paste, and sorting the edge table by the path column gave me a check I trust.
