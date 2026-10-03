# Session r8-t09 -- Analyst Alex

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. Make the drawing show which characters the network depends on most: the
more it depends on a character, the bigger that character's dot. Leave the colors as they are."

Start screen: shots/tasks/r8-t09/01.png. Renders: tmp/round-8-sessions/r8-t09--analyst-alex/.
All commands were run from design/ui/prototype; `P=tmp/round-8-sessions/r8-t09--analyst-alex`.
Every command below begins `timeout 120 node app-b/study.mjs --try $P/NN.png task:r8-t09`; only
the steps are listed.

Outcome: GAVE UP. No dot changed size. SEQ 2 of 7.

## Think-aloud

**Start screen.** "Files are read on this computer and never uploaded" -- good, right where I'd
load a file. That was my first question. The usage-data box at the bottom: no thanks. Les
Miserables is right there in Samples, 77 characters. Open it.

- 01: `--click "No thanks" --click "Les Miserables"`

**01.** A lot already on here: PageRank, Louvain, shortest paths, a "For the report" folder.
Everything is orange because PageRank is painting color -- there's a legend top left, "Color:
PageRank 0.00330 to 0.0754". Fine, that's the color I'm told to leave alone. "Depends on most" to
me means betweenness -- who sits on the routes between everyone else. There's a Betweenness row
in "For the report" but its eye is crossed out. Click it.

- 02: `... --click "Betweenness"`

**02.** Right panel: Betweenness, a yellow-to-orange color, "Paints 77 nodes, none visible",
"Covered by PageRank for Color". So it exists, it's a color ramp, it's switched off. I don't want
color, I want size. There's "Shape" with a plus. Size probably lives there.

- 03: `... --click "Shape"` -- nothing happened. The word isn't the button.
- 04: `... --hover "Add Shape"` -- "nothing on screen is called Add Shape".
- 05: `... --hover "Add"` / `"Add shape"` / `"+"` -- the plus is "Add to Shape". (In real life I'd
  have just pointed at it; the plus with no word next to it is not obvious.)
- 06: `... --click "Add to Shape"` -- a little menu: Shape, Size. Good.
- 07: `... --click "Size"`

**07.** A Size row with "1" in a box and a database-looking icon. One fixed number for every dot.
I want it to come from betweenness. What's the icon? Guessed names:

- 08: `... --hover` "Use data", "From data", "Data", "Bind", "Size from data", "Map", "column",
  "Link", "Set from", "measure", "value", "Remove" -- none was the icon. "column" matched
  something, so I clicked it (`... --click "column"`): it opened the table at the bottom and a
  Columns picker, and threw away the Betweenness panel I was on. Not what I wanted.
- 09: `... --hover` "Use a column", "Use a value", "Bind to data", "Data-driven", "Calculate",
  "Size by", "Drive", "Scale" -- "Size by" found it: **Size by attribute**. Like Gephi's ranking.
- 09: `... --click "Add to Shape" --click "Size" --click "Size by attribute"`

**09.** "Pick an attribute": nodes -- betweenness, degree; Results -- PageRank; Notes -- Note count.
Odd: I'm sitting on a row called Betweenness and under "Results" there's only PageRank, not
Betweenness. Whatever, the nodes have a betweenness column. Pick it.

- 10: `... --click "betweenness"`

**10.** "Size by betweenness", Linear, Sizes "0.5 to 3 px", Fit to data, Clamp, "Smallest mark 2
px, print 1 pt", Detach. Half a pixel? The units confuse me but fine. The dots didn't change,
though. Close it and look.

- 11: `... --key Escape`

**11.** Size box still says 1, all dots the same. Oh -- "none visible". The row is switched off.
Turning it on: will that wreck the colors? It says PageRank covers it for color, so I think the
colors stay. I'd have liked it to say that outright.

- 12: `... --hover "Show"` -> "Show Betweenness. Alt-click or Alt+Space: show only this row".
  `... --key Escape --click "Show Betweenness"`

**12.** Eye now says "Hide Betweenness", so it's on. Panel still says "none visible". Size still
1. Dots the same. Did my choice even save?

- 13: `... --click "Show Betweenness" --click "Size by attribute"` -- back to "Pick an attribute".
  It forgot. So Escape cancels? Nothing told me.
- 14: `... --click "Betweenness" --click "Show Betweenness" --click "Add to Shape" --click "Size"
  --click "Size by attribute" --click "betweenness" --click "Close"` -- closed with the X this
  time. Still "none visible", still 1, still all the same size.

**14.** Two tries, nothing. Maybe this saved-up Betweenness row is a dead end. The panel said
"Measure from Analyze", and the flask at the bottom looks like analyze. Run it fresh.

- 15: `... --click "Les Miserables" --click "Analyze"`

**15.** Now this I like: a searchable list, Recent, then "Rank nodes and edges" with one-line
descriptions. "Betweenness -- which nodes sit on the most shortest paths between..." Yes. Little
clock icon -- maybe slow. 77 nodes, I'm not worried.

- 16: `... --click "Which nodes sit on the most shortest paths"`

**16.** Weight: value (loaded weight), Higher means Stronger, and "Betweenness reads a weight as
distance: it uses 1/value." That's the thing I'd have to remember to do by hand in NetworkX --
good. Bottom left: "Under a second". Exactly what I want before I click. Run.

- 17: `... --click "Run"`

**17.** New row "Betweenness 2" near the top with a spinner and a progress bar. Picture
unchanged so far. Right panel still on the graph summary.

- 18: `... --click "Betweenness 2"` -- still spinning, panel didn't even switch to it.
- 19: `... --click "Run" --hover "PageRank" --hover "Louvain" --click "Betweenness 2"` -- gave it a
  moment. Same spinner, same bar at the same width.

**19.** It said under a second. It's sitting there. "Is it doing anything? I don't know if I should
wait or kill it." I'm not waiting. Stopping here.

## After the task

**Did I succeed?** No. No dot got bigger. The first route -- the existing Betweenness row, Add to
Shape, Size, Size by attribute, betweenness -- forgot my pick twice (once with Escape, once with
the X) and never changed a single dot, even after I turned the row on. The second route -- run
Betweenness from Analyze -- never finished, and I never got to the point of choosing size.

**Single Ease Question:** 2 of 7.

**What took longest:** finding out what the little icons are called. The plus next to "Shape" and
the database icon next to "Size" have no words; "Size by attribute" is the thing I needed and it
was hiding behind an icon. Then not knowing whether my choice had saved: the box still said "1"
after I'd picked betweenness, so I couldn't tell from the panel whether size was set or not.

**Other things I noticed:**
- "Size" lives under "Shape". In Gephi size is its own thing; I'd never look under Shape first.
- "0.5 to 3 px" with "Smallest mark 2 px" right below it -- which one wins? Half a pixel makes no
  sense to me.
- "Covered by PageRank for Color" -- I think that meant my colors were safe, but the "Move above"
  button next to it looked like the thing that would ruin them. Glad I didn't press it.
- The Analyze list with one-line descriptions and a time estimate before running is the best thing
  I saw. If that had finished and handed me a size control, I'd probably have been done in a
  minute.
- Two betweenness things in one list ("betweenness" column vs a "Betweenness" measure, and now
  "Betweenness 2") -- which one is the real one for the deck?

**Would I use this instead of Gephi?** Not on this showing. The "files never uploaded" line and
the run-time estimate are things Gephi doesn't give me, and the weight-as-distance note is better
than what I get in NetworkX. But I couldn't make the one picture I make every month -- size by
betweenness -- and the run that promised under a second hung. In Gephi it's Ranking, Size,
betweenness, min, max, Apply, and I can see it change. I'd check back once that works.
