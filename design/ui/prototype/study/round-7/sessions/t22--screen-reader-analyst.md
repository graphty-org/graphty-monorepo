# Session: size hosts by long-unfixed critical vulnerabilities -- Morgan Reyes (screen-reader analyst)

Task given by the moderator: "Among the 69 things recorded about each host, pick out the one that
tallies serious security holes left unfixed for more than a month, and make hosts with more of
them look bigger in the drawing."

Start screen: shots/tasks/t22/01.png. Renders: tmp/round-7-sessions/t22--screen-reader-analyst/.
All commands run from design/ui/prototype. Each `--try` replays from the start screen.

## Think-aloud

**Start (01.png of the task).** Title is "IT estate, March 2026". Left side reads "Graph, Hosts",
then a search box, then three rows: Selection, Notes, Everything. Right side reads Hosts, a Summary:
300 nodes, 1,105 edges, directed. Good, that is the overview I want first. There is a status line
over the drawing: "Nothing is colored or sized by a row". At the bottom: "Columns: 8 of 69". So
the 69 things are columns. My instinct is the table first: find the column, then work out how to
size by it.

**Step 1 -- the column list.** I press "Columns: 8 of 69".

    timeout 120 node app-b/study.mjs --try .../01.png task:t22 --click "Columns: 8 of 69"

A "Columns" popover with "Find attribute" focused. Two in use (id, hostname), then "Other
attributes" alphabetically: backup_last_success_at, backup_policy, cmdb_... I would rather type
than arrow through 69 names.

**Step 2 -- type "vuln" into Find attribute.**

    ... --try .../02.png task:t22 --click "Columns: 8 of 69" --click "Find attribute" --type "vuln"

The list did not change; still starts at backup_last_success_at. Either my typing did not land or
the filter does nothing. I cannot tell which, and nothing told me. (Moderator note: the study tool
may not support typing; I record it as I experienced it -- typed, heard nothing change.) Also,
this list only shows and hides table columns. It is not where I make something bigger. Leaving it.

**Step 3 -- the status line.** "Nothing is colored or sized by a row" sounds like it is about
exactly my job, so I press it.

    ... --try .../03.png task:t22 --click "Nothing is colored or sized by a row"

Nothing happened. It is a statement, not a door. Fine, but a status that names the very thing I
want to do and gives me no way in is a small tease. Also "by a row" -- a row of what? The table has
rows; I think it means one of the rows in the left list. Unclear.

**Step 4 -- the Style tab on the right.**

    ... --try .../04.png task:t22 --click "Style"

Canvas and Layout settings for the whole graph: background, print-safe colors, layout method,
seed 7. A seed, good, I like a seed. Nothing about node size. Dead end number one.

**Step 5 -- "Everything" in the left list.** If "row" means one of those three, then "Everything"
is probably the default look for every node.

    ... --try .../05.png task:t22 --click "Everything"

Yes. Right side now says "Everything, Built-in row", "Paints 300 nodes, 1,105 edges. Default
look, under every other row." Nodes and Edges tabs, Fill color, Shape, Size = 1. That sentence is
good: it says what this thing is, and the count first. Size is a number box set to 1. I want it to
come from a column instead.

**Step 6 -- focus Size.**

    ... --try .../06.png task:t22 --click "Everything" --click "Size"

An icon button appeared next to the Size box only after I focused it. A sighted person would see
it; I only find it if I tab past the box. Next key press tells me.

**Step 7 -- Tab from Size.**

    ... --try .../07.png task:t22 --click "Everything" --click "Size" --key Tab

Focus lands on a button whose name is "Use a field or result for Size". That is a real name that
says what it does, with the important word first. Good. (I call these columns, it calls them
fields, the column list called them attributes. Three words for one thing.)

**Step 8 -- press it.**

    ... --try .../08.png task:t22 --click "Everything" --click "Size" --click "Use a field or result for Size"

"Size from data", Source "Pick a field", and a list under "hosts" with a "Find attribute" box.
Only the number columns are listed, marked with a number sign. Sensible -- you cannot size by a
hostname. Starts cpu_cores, cpu_util_max_pct ... alphabetical.

**Step 9 -- type "vuln" again.**

    ... --try .../09.png task:t22 --click "Everything" --click "Size" --click "Use a field or result for Size" --type "vuln"

Again nothing changed. Same as step 2. Either typing never works for me here or the filter is
broken. Two strikes on the search box.

**Step 10 -- End key.**

    ... --try .../10.png ... --click "Use a field or result for Size" --key End

Nothing moved. End does not jump to the last item. OK, the slow way.

**Step 11 -- arrow down through the list (30 presses).**

    ... --try .../11.png ... --click "Use a field or result for Size" --key ArrowDown (x30)

Now I am at the bottom, on "Note count" under a "Notes" group, so the arrow keys move through the
list. On the way past I heard, in order: monthly_cost_usd, net_in/out mbps, patch_pending_count,
patch_pending_critical_count, uptime_days, vuln_count_critical, vuln_count_critical_unremediated
_over_30_days, vuln_count_high, vuln_count_low, vuln_count_medium, then "Not a number (45)".
The candidates:

- patch_pending_critical_count -- critical patches pending. Pending since when? No age. Not it.
- vuln_count_critical -- critical vulnerabilities, any age. Not it.
- vuln_count_critical_unremediated_over_30_days -- critical, not fixed, over 30 days. That is the
  one. "More than a month" = over 30 days, close enough.

On screen the long one is cut in the middle ("vuln_count_critica...iated_over_30_days"). My reader
gives me the full name, but a sighted colleague would see a truncated name and the two critical
counts look alike. No description of any column anywhere -- I am trusting the column name.

**Step 12 -- pick it.**

    ... --try .../12.png ... --click "Use a field or result for Size" --click "vuln_count_critical_unremediated_over_30_days"

Heading becomes "Size from vuln_count_cri..._over_30_days". Source set. Scale Linear, sizes 0.5 to
3 px, "Values from: Fit to data", "Range 0 to 6", Clamp checked, "Below 0: sized by absolute
value", smallest mark 2 px, print 1 pt, and a Detach button. Range 0 to 6 is the useful number:
the worst host has six long-unfixed critical holes. The rest I would leave alone. "Detach" with no
explanation -- I am not pressing that.

**Step 13 -- Escape to close and check.**

    ... --try .../13.png ... --click "vuln_count_critical_unremediated_over_30_days" --key Escape

The status line over the drawing changed from "Nothing is colored or sized by a row" to a legend:
"Size: vuln_count_..._over_30_days", 0, 2, 4, 6, "Linear scale (radius), 0 to 6". That is the
text form I wanted: the drawing now says in words what size means. Back in the panel, Size now
reads "0.5 to 3" with a number sign -- it does not say which column. The subtitle says "Your change
is in the Everything lay..." -- cut off. And the moderator tells me some dots are now bigger.

I believe I am done.

## Verdict

- **Succeeded?** Yes, I think so. Size now comes from
  vuln_count_critical_unremediated_over_30_days, and the legend over the drawing says so in words.
- **Single Ease Question:** 4 of 7. The binding itself was clean once found. Getting there cost
  two dead ends (Style tab, the status line), a search box that did nothing for me twice, and a
  button that only exists after you focus the Size box.
- **Would I use this instead of my current tool?** Not for this. In pandas this is one
  `sort_values` and I would get the list of the six-hole hosts by name, which is what I would
  actually report. Making dots bigger helps my sighted colleagues, not me. What I would use it for:
  handing a colleague a picture whose legend says, in words, what size means -- that legend is the
  first thing in a graph tool that has told me what a visual encoding is without me asking.

## Problems I hit

1. Typing into "Find attribute" (in the column list and in the size picker) changed nothing; I
   had to arrow through ~30 names. Possibly the study tool, but nothing told me my typing landed
   or failed.
2. "Nothing is colored or sized by a row" names my exact job but is not a control and does not
   say where to do it. "Row" is unclear: I took it to mean the left list, not a table row.
3. The Style tab on the graph has no size at all; size lives under "Everything", which I found by
   guessing that "row" meant the left list.
4. The "Use a field or result for Size" button appears only once the Size box has focus.
5. Long column names are cut in the middle on screen; vuln_count_critical and
   vuln_count_critical_unremediated_over_30_days look alike to a sighted reader. No column has a
   description.
6. After binding, the Size row says "0.5 to 3" but not which column; I have to read the legend
   over the drawing to know. The "Your change is in the Everything lay..." line is cut off.
7. Same thing called three names: column (table), attribute (search box), field (button).
8. End key did nothing in the field list.
9. Popover controls I could not judge and would not touch: "Detach", "Below 0: sized by absolute
   value", "Smallest mark ... print 1 pt".
