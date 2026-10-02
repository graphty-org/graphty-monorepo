# Session: size hosts by long-unfixed critical vulnerabilities -- Analyst Alex

Task as given by the moderator: "Among the 69 things recorded about each host, pick out the one
that tallies serious security holes left unfixed for more than a month, and make hosts with more
of them look bigger in the drawing."

Start screen: shots/tasks/t22/01.png. All renders are in
tmp/round-7-sessions/t22--analyst-alex/. Every command was run from design/ui/prototype with
`timeout 120 node app-b/study.mjs --try <png> task:t22 ...`; only the steps are listed below.

Outcome: failure. I ended with the hosts colored by the right column, not sized by it.

## Think-aloud

**Start (t22/01.png).** OK, IT estate, 300 nodes, 1,105 edges, says "Local only" at the top, fine.
There's a chip on the drawing saying "Nothing is colored or sized by a row". Sized -- that's my
word. "By a row" is odd; I'd say by a column. Right panel has Style and Data tabs. In Gephi this
is Appearance, nodes, size, ranking. Style seems like the place.

**01 -- `--click "Style"`.** Canvas background, print-safe colors, layout method and seed. No node
size anywhere. So "Style" here is the page style, not node style. Hm.

**02 -- `--click "Nothing is colored or sized by a row"`.** It's telling me nothing is sized, so
maybe clicking it lets me size something. Nothing happened. It's just a label. Annoying, it looks
like a button.

**03 -- `--click "Table"`.** Fine, find the column first. Table opens, 300 nodes, from
hosts-2026-03.csv, and "Columns: 8 of 69". 69 matches what I was told.

**04 -- `--click "Table" --click "Columns: 8 of 69"`.** Column picker, alphabetical, with a
"Find attribute" box. Good, I want to search.

**05 -- `... --type "vuln"`.** Nothing typed (that's on me, wrong way of typing). Same list.

**06 -- `--click "Table" --click "role"`.** Wanted to see whether a column header has a menu like
"size by this". It just sorted by role. There's a little chevron by the header but I can't tell
what it is.

**07 -- `--click "Data"` (left rail).** Sources, filters, and an Attributes list with a search
box. Same alphabetical list. The vuln stuff will be at the bottom.

**08 -- `--click "Data" --click "Find attribute" --key v --key u --key l --key n`.** 7 matches:
vuln_count_critical, _high, _medium, _low, "vuln_count_cr...over_30_days" (cut off), scan
timestamp, scan policy. The cut-off one is mine -- critical, over 30 days. Annoying that the one
I actually want is the one that gets truncated.

**09 -- same, then `--click "vuln_count_cr...over_30_days"`.** Right panel shows the full name,
vuln_count_critical_unremediated_over_30_days, Number, every host has a value, histogram 0 to 6,
"27 have at least 1". That's useful -- I'd put "27 hosts" in a sentence. But "Painted by: No row
paints from this attribute" and no button to make it paint anything. I've found the column, now
where's the "use it for size" button? Also the search box cleared itself after I clicked.

**10 -- same, then `--hover "..."`.** Tried the three-dot menu on that panel; got a tooltip on some
other row instead. Not helpful.

**11 -- `--click "Everything"`.** Back on Graph. "Everything -- Built-in row, Default look, under
every other row". There it is: Fill color, Shape, Size = 1. So "row" means a styling rule. Didn't
know that. OK, size.

**12 -- `--click "Everything" --click "Size"`.** A little database icon appears to the right of
the Size box when I'm on it. Guessing that means "from data". I rest the pointer on it to see
what it's called.

**13 (first try) -- `--hover "Bind to data"`, `"Size from data"`, `"Size by attribute"`,
`"Use an attribute"`.** Nothing on screen is called any of those. I don't know what the icon's
called; it shows no name for me. I'll just go to it with the keyboard.

**13 -- `--click "Everything" --click "Size" --key Tab --key Enter`.** A popup: "Color from data",
Source: pick a field. Wait, color? I was on Size. Maybe it's a generic title. The field list has
the same search box. I'll carry on.

**14 -- `--hover "From data"`, `"Link to data"`, `"Drive from data"`, `"Data"`.** Still can't
find the icon's name; "Data" just lit up the rail.

**15 -- `... --key Tab --key Enter --key v --key u --key l --key n`.** Search works here too, 7
matches.

**16 -- then `--click "vuln_count_critica...iated_over_30_days"`.** Popup now says "Color from
vuln_count_cri..._over_30_days", Scale Linear, Palette Orange to brown, Range 0 to 6. That's a
color scale. I wanted size.

**17 -- same, then `--key Escape`.** Yep. All the hosts went orange, a few dark brown. The chip
says "Color: vuln_count_critical_unremediated_over_30_..., 0 to 6", Fill Color now "Orange to
brown", and Size is still 1. Everything is the same size. And orange-to-brown on 300 dots -- I
can barely pick out the brown ones. I asked for size, I got color.

**18 -- `--click "Everything" --click "1" --key Tab --key Enter`.** Tried to land on the Size box
directly. Got the color picker instead (it also warns orange and vermilion are too close for
red-green color blindness -- which, fair, that's me).

**19 -- `--click "Everything" --click "Size" --key Tab --key Tab --key Enter`.** One more along
went to the Effects plus menu (Outline, Glow, Wireframe, Flat shading). So the thing right after
Size really is that data icon, and it gives me "Color from data". Either it's mislabeled or it's
wired to the wrong thing. Either way I can't get size out of it.

**20 / 21 / 22 -- Table, column picker, search vuln, tick
vuln_count_critical_unremediated_over_30_days, Escape, hover the header.** Trying the Gephi-ish
route from the column end. The column is in the table now, values mostly 0, a chevron on the
header.

**23 -- `--hover "Column menu"` (nothing), then `--click "vuln_count_critical_unremediated_over_30_days" --key Tab --key Enter`.**
That selected some random host, app-dev-sgp-01, and popped node actions. Not what I wanted. I'm
done.

## Verdict

- **Did I succeed?** No. I found the column fine (search "vuln", it's
  vuln_count_critical_unremediated_over_30_days, 27 hosts have at least one), but the drawing ends
  up colored by it, not sized by it. Every host is still size 1.
- **Single Ease Question (1-7):** 2. Finding the column was a 5. Making it drive size I never
  managed.
- **Would I use this instead of Gephi?** Not for this. In Gephi it's Appearance, Nodes, Size,
  Ranking, pick the column, Apply. Here the size control is a number box with an unlabeled icon
  that only shows up when you're on it, and when I used it I got a color scale. If the size icon
  actually did size I'd like it: the attribute panel (0 to 6, 27 with at least one, nothing
  missing) is better than what Gephi shows me. But right now it would have put a color chart in
  front of my manager when I said "size".

## Problems as I saw them

1. The data icon beside Size opens "Color from data" and binds color, not size (13, 16, 17, 19).
   Severity: blocks the task.
2. That icon has no name I could find and only appears when the Size row is focused or hovered
   (12, 13, 14). Severity: high.
3. "Nothing is colored or sized by a row" looks clickable and does nothing; "row" means a style
   rule, which I only worked out by clicking "Everything" (02, 11). Severity: medium.
4. The right panel's Style tab on the graph shows canvas and layout, not node size, so my first
   instinct went nowhere (01). Severity: medium.
5. The attribute's own panel says "No row paints from this attribute" but offers no way to make
   one paint from it -- the obvious place to say "size by this" (09). Severity: medium.
6. The one column I needed is the one whose name is truncated in every list (08, 15).
   Severity: low.
7. Orange-to-brown default on small dots is hard for me to read (17). Severity: low.

## Commands

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/01.png task:t22 --click "Style"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/02.png task:t22 --click "Nothing is colored or sized by a row"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/03.png task:t22 --click "Table"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/04.png task:t22 --click "Table" --click "Columns: 8 of 69"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/05.png task:t22 --click "Table" --click "Columns: 8 of 69" --type "vuln"   (run twice)
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/06.png task:t22 --click "Table" --click "role"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/07.png task:t22 --click "Data"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/08.png task:t22 --click "Data" --click "Find attribute" --key v --key u --key l --key n
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/09.png task:t22 --click "Data" --click "Find attribute" --key v --key u --key l --key n --click "vuln_count_cr...over_30_days"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/10.png task:t22 --click "Data" --click "Find attribute" --key v --key u --key l --key n --click "vuln_count_cr...over_30_days" --hover "..."
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/11.png task:t22 --click "Everything"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/12.png task:t22 --click "Everything" --click "Size"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/13.png task:t22 --click "Everything" --click "Size" --hover "Bind to data"        -> nothing on screen is called "Bind to data"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/13.png task:t22 --click "Everything" --click "Size" --hover "Size from data"      -> nothing on screen is called ...
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/13.png task:t22 --click "Everything" --click "Size" --hover "Size by attribute"   -> nothing on screen is called ...
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/13.png task:t22 --click "Everything" --click "Size" --hover "Use an attribute"    -> nothing on screen is called ...
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/13.png task:t22 --click "Everything" --click "Size" --key Tab --key Enter
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/14.png task:t22 --click "Everything" --click "Size" --hover "From data"           -> nothing on screen is called ...
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/14.png task:t22 --click "Everything" --click "Size" --hover "Link to data"        -> nothing on screen is called ...
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/14.png task:t22 --click "Everything" --click "Size" --hover "Drive from data"     -> nothing on screen is called ...
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/14.png task:t22 --click "Everything" --click "Size" --hover "Data"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/15.png task:t22 --click "Everything" --click "Size" --key Tab --key Enter --key v --key u --key l --key n
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/16.png task:t22 --click "Everything" --click "Size" --key Tab --key Enter --key v --key u --key l --key n --click "vuln_count_critica...iated_over_30_days"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/17.png task:t22 --click "Everything" --click "Size" --key Tab --key Enter --key v --key u --key l --key n --click "vuln_count_critica...iated_over_30_days" --key Escape
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/18.png task:t22 --click "Everything" --click "1" --key Tab --key Enter
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/19.png task:t22 --click "Everything" --hover "Size" --hover "Size from data"   (also "From data", "Bind to data", "Use data": nothing on screen is called ...)
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/19.png task:t22 --click "Everything" --click "Size" --key Tab --key Tab --key Enter
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/20.png task:t22 --click "Table" --click "Columns: 8 of 69" --key v --key u --key l --key n --click "vuln_count_critica...iated_over_30_days"   -> nothing on screen is called ...
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/21.png task:t22 --click "Table" --click "Columns: 8 of 69" --key v --key u --key l --key n --click "vuln_count_critical_unremediated_over_30_days" --key Escape
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/22.png task:t22 --click "Table" --click "Columns: 8 of 69" --key v --key u --key l --key n --click "vuln_count_critical_unremediated_over_30_days" --key Escape --hover "vuln_count_critical_unremediated_over_30_days"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/23.png task:t22 --click "Table" --click "Columns: 8 of 69" --key v --key u --key l --key n --click "vuln_count_critical_unremediated_over_30_days" --key Escape --hover "vuln_count_critical_unremediated_over_30_days" --hover "Column menu"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--analyst-alex/23.png task:t22 --click "Table" --click "Columns: 8 of 69" --key v --key u --key l --key n --click "vuln_count_critical_unremediated_over_30_days" --key Escape --click "vuln_count_critical_unremediated_over_30_days" --key Tab --key Enter
```

Note for the moderator: `--type` is not a step the tool accepts (it was ignored silently); typing
was done with one `--key` per letter.
