# Session: size hosts by unfixed critical security holes -- Dana Okafor (supply chain risk analyst)

Task given by the moderator: "Among the 69 things recorded about each host, pick out the one that
tallies serious security holes left unfixed for more than a month, and make hosts with more of
them look bigger in the drawing."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t22--supply-chain-analyst/. Abbreviation used below:
`TRY NN` = `timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t22--supply-chain-analyst/NN.png task:t22`.

## Start screen (shots/tasks/t22/01.png)

"OK, not my data, so this is my wide spreadsheet. A big gray hairball, a summary panel on the
right. Top left of the drawing there's a little box saying 'Nothing is colored or sized by a
row'. That is literally what I want to change, so I'll click it. And bottom right it says
'Columns: 8 of 69' -- there are my 69 things."

## Step 1 -- click the "nothing is sized" box

    TRY 01 --click "Nothing is colored or sized by a row"

"Nothing happened. It looks like a button, it's talking about exactly my job, and it's just a
label. Mildly annoying."

## Step 2 -- the Style tab on the right

    TRY 02 --click "Style"

"Style for the whole graph: background, print-safe colors, layout 'Spread Out'. Nothing about
size of the dots. Wrong place."

## Step 3 -- the column count

    TRY 03 --click "Columns: 8 of 69"

"A Columns list with a 'Find attribute' box, and the table opened underneath. 69 things,
alphabetical, backup, cmdb, cpu... I'm not scrolling 69 rows, I'll search."

    TRY 04 --click "Columns: 8 of 69" --type "vuln"

"My typing didn't land -- box still empty. I'll click into the box first."

    TRY 05 --click "Columns: 8 of 69" --click "Find attribute" --key v --key u --key l --key n

"There we go. 7 matches. 'vuln_count_critical_unremediated_over_30_days'. Ugly name but it says
exactly what the moderator said: critical, not fixed, over 30 days. That's the one. Not
vuln_count_critical -- that's all of them, fixed or not."

    TRY 06 ... --click vuln_count_critical_unremediated_over_30_days

"It ticked a box. Columns now 9 of 69. So this just adds it to the table -- which I can't even see,
it's off the right edge. Nothing in the drawing changed. This is the 'show column' list, not a
'size by' list."

    TRY 07 ... --key Escape --click vuln_count_critical_unremediated_over_30_days

"Escape closed the list AND the whole table. Now I can't find the column header to right-click.
'Nothing on screen is called' that. Hmm."

## Step 4 -- the Data section on the left

    TRY 08 --click "Data"

"Sources, Filters, and an Attributes list on the left. Same list, same search box. Let me try it
here."

    TRY 09 --click "Data" --click "Find attribute" --key v --key u --key l --key n --click vuln_count_critical_unremediated_over_30_days

"Now the right panel is about my column: Number, every host has a value, 0 to 6, 27 hosts have
at least 1. That bar chart is useful -- most hosts are zero. 'Painted by: No row paints from this
attribute.' I don't know what 'row' means there -- I thought rows were hosts. Still no Size
button. There's a '...' at the top."

    TRY 10 ... --hover "More"
    TRY 11 ... --click "More actions"

"'More actions'. Menu: Color by, Size by, Label by, Show as groups, Filter to... There it is. It
popped up over on the left side of the screen, not under the button I clicked, and the list
behind it had scrolled. A bit disorienting, but fine."

    TRY 12 ... --click "More actions" --click "Size by"

"Done. The box at the top now reads 'Size: vuln_count_...er_30_days' with a little key, 0, 2, 4,
6. A couple dozen hosts are big gray dots, the rest are specks. Right panel says 'Paints 300
hosts', Size 0.5 to 3. That's what was asked."

"One complaint: the zeros went tiny. They didn't vanish, but on my laptop screen the hosts with
nothing wrong are basically dust -- if I wanted to see the network AND the problem hosts I'd want
a bigger minimum. I see a Size '0.5 to 3' box on the right, so I could probably change it."

## Wrap-up

- **Succeeded?** Yes. The right attribute is driving size, and the key at the top proves it.
- **Single Ease Question:** 4 of 7. Finding the column was easy once search worked. Getting it to
  drive size took three wrong turns: the "nothing is sized" box that looks clickable but isn't, the
  column picker that only adds a table column, and the Size command hidden behind a "..." with no
  label.
- **Would I use this instead of my current tool?** Not for this. In Excel I'd sort by that column
  and have the 27 hosts in a list in ten seconds -- and that list is what my boss wants. Bigger dots
  on a hairball is a nice picture for a slide, and the 0-to-6 histogram was genuinely handy. But
  the drawing doesn't tell me which host is which without hovering, and I'd still have to ask IT
  where this data goes before I loaded anything real.

## Problems observed

1. The box "Nothing is colored or sized by a row" names the exact job but does nothing when clicked
   (render 01). Severity: medium.
2. The Columns picker (from "Columns: 8 of 69") only adds a table column; ticking an attribute
   there gives no route to Size by (render 06). Severity: medium.
3. Escape closed the Columns list and collapsed the table at once, losing my place (render 07).
   Severity: low.
4. Size by lives only behind an unlabeled "..." ("More actions") in the attribute inspector; the
   inspector's own panel shows no Size control until after it is applied (renders 09-11).
   Severity: high.
5. The More actions menu opened at the far left over the attribute list, not at the button, and
   the list had scrolled behind it (render 11). Severity: low.
6. "Painted by: No row paints from this attribute" -- "row" here does not mean a row of data,
   which is what a spreadsheet person reads (render 09). Severity: medium.
7. With a 0-to-6 scale most hosts (value 0) shrink to specks (render 12). Severity: low.
