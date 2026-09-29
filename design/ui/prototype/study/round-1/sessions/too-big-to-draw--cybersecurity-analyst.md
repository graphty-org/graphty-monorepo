# Session: a graph too big to draw -- Priya, threat hunter

Participant: Priya, senior threat hunter in a bank's security operations team (persona file:
study/personas/cybersecurity-analyst.md). She thinks in Splunk searches, works matches from a
table sorted by count, and writes queries rather than clicking them together.

Task, as the moderator gave it: "Here is last period's citation data. Find anything worth a
closer look."

Screens used, in order: the frame past the drawing limit (a 124,318-patent citation graph that
is too big to draw), Find, and the filter chip with its list of steps. She worked from the
rendered screenshots; where she clicked something, the page's markup was read to see what the
click would do, as in a clickable prototype.

Outcome: success with difficulty. She reached a drawn subset of 612 patents and named three to
look at, but only after she stopped trying to type a query and built one from dropdowns, and she
could not get the matches out as rows.

---

## Transcript

**Moderator:** Here is last period's citation data. Find anything worth a closer look.

**Priya:** Okay. Before I touch it -- is this on the approved list, where does it run, does it
call out? ... Nothing on the screen tells me. There's an "A" avatar top right, so somebody's
signed in to something. In real life I'd stop here. It's a study, so, fine, going on.

Also: "citation data". Patents. This isn't my world. I don't know what normal looks like for a
patent, so I can't sanity-check against ground truth the way I would with my own hosts. Keep
that in mind when I say "I don't know if this is right".

"Last period" -- which period? First thing I look for is the time range. ... Top left says
"Patent citations", chip under it says "Full graph". No date picker. The table has a grantYear
column, header says "1999 to 2001". So "last period" is three years of grants? Okay, that's
actually the only place on the page that tells me the time range, and it's in a column header in
tiny grey text. I'd want that up top next to the file name. Every Splunk search has its range
right in the bar.

### Screen 1: the not-drawn state

**Priya:** The canvas is empty. Big black rectangle. My gut says "it's hung" -- I've seen
BloodHound go white on me. Let me look... bottom left, small box: "124,318 nodes not drawn: more
than this browser draws at once (50,000). Narrow the graph..."

Okay. So it didn't crash, it decided not to. That's fine, actually -- I prefer that to it trying
and melting my laptop. But I found that line on my second look, not my first. It's small and down
in the corner, and the empty canvas is the loudest thing on the screen. If I'd been glancing
between monitors I'd have thought it was still loading.

The numbers on the right, Statistics: 124,318 nodes, 1,480,221 edges, density, average degree
23.8, isolates 2,406, components 3,912, one of them 116,905 nodes, 94.0%. So it loaded
everything and counted everything. Good. Nothing silently dropped -- or at least it's telling me
the totals, I'd need the source row count to check that. It says "Last import:
patent-citations-sa..." -- truncated. I want the whole file name and the row count it read.

And the table. This is what I'd actually use. Sorted by citationsReceived, highest first. 779,
702, 655... That's my Splunk habit: sort by count, work from the top. Honestly I could stop here
and do the task off the table.

What's "isolates"? Nodes with no edges, I assume. Fine. "Components" -- clusters that aren't
connected to each other. Okay.

The toolbar in the middle -- some icons are greyed out. Don't know what they are, not hovering
every one. "Run layout" on the right is greyed with "waits for a narrower graph". Fine, I don't
care about layout.

**Moderator:** What would you do next?

**Priya:** Look for somewhere to type. I want "category = X and citationsReceived > N" or, in my
head, something like `where citationsReceived > 100 | stats count by category`. Is there a query
box?

### Screen 2: looking for a query box -- Find

**Priya:** There's a magnifier next to "Graphs" on the left, and one on the table. I'd try "/"
and Ctrl+F first. Let me click the left one.

(Find opens: a field reading "Name, id or value" and a tooltip.)

"Finds nodes, edges, sets, paths, results, style layers, attributes, notes and views by name, id
or value. Paste a list of ids to find them all." Okay -- paste a list of ids. That is actually
useful for me. In my world that's an IOC list: paste fifty hashes or hostnames, see which are in
here. That's a real thing I'd do. I'd want it to tell me which of the fifty were NOT found, too.

But this is a search box, not a query box. It takes a name or a value. Can I type
`citationsReceived > 100`? The tooltip doesn't say it can, and I'd bet it treats that as a string.

(Moderator shows the pasted-ids state: three patent numbers typed in, "3 results in all 124,318
nodes".)

**Priya:** Okay, three hits, it found them even though nothing is drawn, and the right panel says
"Not drawn: the graph is past the drawing limit. Counted everywhere." Good, that's honest. The
row in the table is highlighted. That's the behaviour I want.

The canvas line changed here though. On the first screen it said "not drawn: more than this
browser draws at once (50,000)". Here it just says "124,318 nodes not drawn. Narrow the
graph..." -- no reason. Same app, two wordings. Minor, but I notice that stuff.

(Moderator shows the state where a verb is typed into Find: "betweenness".)

**Priya:** 0 matches, then "Run Betweenness centrality... in Quick actions". So Find will run
commands if I type the name of one. Okay. That's closer to a command line. Still not a query.

And -- this is the other thing -- those Find screens aren't my data. They're "Les Miserables",
Valjean, Thenardier. I'm looking at 28 of 77 nodes from a novel. The pasted-ids one was patents
but the rest aren't. That threw me for a second. I don't know if the betweenness thing would
even run on 124,000 patents or would spin for half an hour like BloodHound did.

**Moderator:** How would you narrow the graph, then?

**Priya:** Go back to that "Narrow the graph..." link, I guess, since there's no query box.

### Screen 3: Narrow the graph -- the filter steps and the rule editor

**Priya:** (reads the popover) "Filter steps. No filter steps. Every number reads the full
graph..." then "Suggested for this graph" -- something like "top 3 by degree, with neighbors: a
sample, favors hubs, 586". Then "Add step".

The suggestion -- no. I'm not letting the tool pick "top 3 by degree" for me. That's exactly how
you miss the thing. Although I'll give it credit, it says right there it's a sample and it
favours hubs. Most tools wouldn't say that.

Add step... Rule... Okay, a rule editor. "Keep: Nodes / Edges". "Where category is Drugs and
medical", AND, "Where citationsReceived >= 25". Add condition. Scope: "Full graph, no steps
above".

So it's the dropdown builder. Grudgingly -- fine. I'd use it. Where's the text version? Can I
see the query it built, copy it, paste it into something? Nothing shows me that. I want a
little "view as text" or just a text field where I can type
`category = "Drugs and medical" AND citationsReceived >= 25`. If I have to build this out of
three dropdowns every month, I'll stop doing it.

Then the good bit: "612 nodes, 1,843 edges will draw". It tells me before I commit how many I
get and whether it will render. That is what I wanted from BloodHound. I'd have killed for that.
If I'd set it too loose, it says so -- (moderator shows the "still too many" and "nothing
matches" versions) -- yes, "still too many to draw", and for zero it turns the button off and
tells me the highest value there is. That's good. That's the "is my range too narrow or too
broad" problem, answered before I run it.

Why "Filter to"? I'd call it "Apply" or "Run". "Filter to" reads like it's missing a word. I
clicked it anyway.

**Priya:** Hang on, why Drugs and medical? I picked it because it was top of the table. In real
life I'd want to do this per category, like a stats-by. There's no group-by. I'd have to make six
rules.

### Screen 4: narrowed and drawn

**Priya:** Okay, chip top left now says "Filtered: 612 of 124K nodes -- 1 step". Notification:
"Filtered to 612 of 124,318 nodes. Undo." Canvas draws a blob. Grey blob with some labels --
patent numbers. And a bunch of little pairs and dots off to the right. That's the hairball. The
picture tells me nothing yet. No colours, no legend.

Right panel: 612 nodes, 1,843 of 1,480,221 edges, 44 components, one of them 545 nodes. Layout
"Engine: WebGPU". Fine, I don't care, but I'll note it didn't say "CPU" -- on my locked-down Edge
it would probably say CPU, and apparently it says so plainly. Good.

The table dropped back to a third of the screen. Annoying -- I was using it. Header says "1
value" for category and "25 to 779" for citations. That's a nice touch, the header tells me my
filter's in effect.

**Moderator:** So, anything worth a closer look?

**Priya:** From the table: 6,117,075 with 779 citations, 6,231,106 with 611, 6,287,586 with 517.
Those are the top of a heavy tail. And the ones off on their own on the right of the canvas --
little isolated pairs inside a category where everything else is one big component. In my world
the thing that's NOT connected to the main cluster is often more interesting than the hub. I'd
want to click one of those and see why it's alone. I can't tell from here which patents those
are; there's no label on them.

What I can't do: I can't tell you if any of this is unusual, because there's no baseline. Is 779
a lot for 2000? Compared to what? In Splunk I'd compare to the previous period. There's one file,
one period, no "compared to last period".

**Moderator:** How would you hand this to your lead?

**Priya:** Export... top right. I'd look for CSV of these 612 rows. The table has a "..." menu
but I can't see what's in it. Nothing on any of these screens says CSV. If it's not there, I'm
screenshotting the table and retyping it, which I will say is ridiculous.

And I'd want to save the rule. The filter chip -- (moderator shows the filter steps list) -- ok,
the rule's listed as a step, there's a pencil to edit, a checkbox to turn it off, and the count
"612, -123,706". "Each count is what is left after that step; the small number is what the step
took out." Good. That's a record of what I did, sort of like my notebook. But can I save it and
run it on next month's file? I don't see a "save" on the step. There's "Create rule set" up top
-- maybe that? It doesn't say it'll survive a new file.

### Screen 5: the filter chip, stacked steps

**Priya:** (looks at the three-step version) "Filter to Largest component 76, Filter to degree
>= 5 41, Filter out group = 8 28". Okay, that I like: it's a pipeline, each step has its count.
That's basically SPL -- search, where, where -- with the count after each pipe. Tick one off and
the counts change. If I could type that, it'd be great.

Editing a step: "Step 2: Filter to degree >= 5. Scope: After step 1: 76 nodes. Result: Leaves 41;
takes out 35." Yes. Clear. "Degree counts neighbors in the graph this step reads" -- good, that
answers my usual question of "degree before or after the filter?".

The zero case: "Filtered: 0 of 77 nodes", table empty, "emptied by Filter to degree >= 40. Turn
off step". Tells me exactly which pipe killed it. That's better than Splunk, honestly. Splunk just
gives me "no results" and I bisect by hand.

But again it's Les Miserables. It's the same widget, fine, I get it.

---

## After the task

**Moderator:** On a scale of 1 to 7, how easy or hard was that?

**Priya:** 4. The narrowing part was easy once I found it, and the count-before-commit is the best
thing I saw. But the start was an empty black box with a small line in the corner, there's no
query box, no time range up top, no baseline, and I don't know how the rows get out. Middle.

**Moderator:** Would you use this instead of what you use now?

**Priya:** Not instead. Next to, maybe. For patents, no idea, not my job. For my auth logs: if it
told me it runs locally and doesn't call out, and I could paste my rule as text, and get the
matches out as a CSV, I'd use it for the triage step between Splunk and my notebook, because the
"here's how many you'll get before you commit" and the step list with a count per step are
genuinely better than what I do by hand. Right now it's a nice rule builder with a table. My
notebook already does that, and my notebook keeps every query I ran.

---

## Problems observed

1. **Empty canvas reads as loading or hung.** The not-drawn line is small, bottom left, on a
   large blank canvas; she found it on a second look. Severity 3.
   "My gut says it's hung. I found that line on my second look, not my first."
2. **No query box; the rule can only be built from dropdowns, and the built rule cannot be seen
   or copied as text.** Severity 3.
   "Where's the text version? If I have to build this out of three dropdowns every month, I'll
   stop doing it."
3. **No way to get matches out as rows (CSV) is visible on any screen.** Export... and the
   table's "..." menu do not show it. Severity 4.
   "If it's not there, I'm screenshotting the table and retyping it."
4. **The time range is not stated at the top; only a column header ("1999 to 2001") shows it.**
   Severity 2.
   "Every Splunk search has its range right in the bar."
5. **No way to save a rule and run it on the next period's file, and no comparison to a
   baseline or previous period.** "Create rule set" does not say it survives a new file.
   Severity 3.
   "Can I save it and run it on next month's file? If not, it's a toy."
6. **No group-by: to look at every category she would need one rule per category.** Severity 2.
7. **The not-drawn line has two wordings** (with the reason and limit on one screen, without them
   in Find). Severity 1.
8. **Nothing answers "is this approved, where does it run, does it call out" before loading;**
   an avatar suggests an account. Severity 3 (in real life she stops here).
9. **"Filter to" as a button label reads unfinished.** Severity 1.
10. **Isolated nodes and small components in the drawn subset have no labels,** so the most
    interesting ones cannot be identified without clicking each. Severity 2.
11. **Last import file name is truncated and gives no row count,** so she cannot check that
    nothing was dropped on import. Severity 2.
12. **The drawn state shrinks the table back to a third** while she was working from it.
    Severity 1.

## What worked

- The count before the commit: "612 nodes, 1,843 edges will draw", plus the "still too many" and
  "nothing matches" versions. "That is what I wanted from BloodHound."
- The filter steps as a pipeline with a count after each step, and the zero case naming the step
  that emptied the result. "That's better than Splunk, honestly."
- Pasting a list of ids into Find, and it finding them even when nothing is drawn.
- The offered sample says in its own name that it is a sample and favours hubs; Statistics say
  it again.
- Every total counted even when nothing is drawn; the table stands in for the picture.
