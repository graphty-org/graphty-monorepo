# Session: size hosts by unfixed critical holes -- Explorer Elena

Task as given: "Among the 69 things recorded about each host, pick out the one that tallies
serious security holes left unfixed for more than a month, and make hosts with more of them look
bigger in the drawing. The data on screen is a sample: a company's IT estate, hosts and the network
connections between them, with dozens of things recorded about each. If that is not your line of
work, treat it as your own wide spreadsheet."

Start screen: shots/tasks/t22/01.png. Renders: tmp/round-7-sessions/t22--explorer-elena/01.png to 19.png.
Every command was run from design/ui/prototype; P below is
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t22--explorer-elena.
Clock: curious afternoon (long clock).

## Think-aloud

**Start.** "OK, dots and a big gray web. There's a note up top: 'Nothing is colored or sized by
a row.' Sized -- that's my word. Let me click it."

1. `timeout 120 node app-b/study.mjs --try $P/01.png task:t22 --click "Nothing is colored or sized by a row"`
   Nothing happened. "Oh. It's just a label. It tells me nothing is sized but not how to size it."

2. `... --try $P/02.png task:t22 --click "Style"`
   Right panel Style tab: background, print-safe colors, labels, layout method, seed. "Making
   things bigger is style, right? No size in here. Hm."

3. `... --try $P/03.png task:t22 --click "Columns: 8 of 69"`
   "69 -- that's the number from the task." A Columns list opens with a "Find attribute" box and
   a table appears below. Alphabetical, cmdb this and cpu that. The list stops at cpu_model.

4. `... --try $P/04.png task:t22 --click "Columns: 8 of 69" --click "Find attribute" --type "vuln"`
   Box stayed empty (the type step did not register in my session; I treated it as a fumble).

5. `... --try $P/05.png task:t22 --hover "Style"` -- meant to find out what the little toolbar
   icons are; I don't know their names, so this only hovered the Style tab. Wasted.

6. `... --try $P/06.png task:t22 --click "Table" --click "role"`
   "In Sheets I'd click the column header." It sorted by role. Fine, like a spreadsheet.

7. `... --try $P/07.png task:t22 --click "Table" --hover "role"`
   Tooltip "Category" on the Abc thing. There's a little down arrow by the name.

8. `... --try $P/08.png task:t22 --click "Table" --click "Column menu"`
   A dark menu: Color by, **Size by** (grayed, "Not a number"), Label by, Show as groups, Filter
   to..., Read as... "Size by! That's it. So the arrow on a column is where sizing lives." But this
   menu was for "id".

9. `... --try $P/09.png task:t22 --click "Columns: 8 of 69" --hover "cpu_model" --key PageDown`
   Tried to scroll the column list. It barely moved.

10. `... --try $P/10.png task:t22 --click "Columns: 8 of 69" --click "Find attribute" --key v --key u --key l --key n`
    "7 matches." vuln_count_critical, _high, _medium, _low,
    **vuln_count_critical_unremediated_over_30_days**, scan timestamp, scan policy. "Critical,
    unremediated, over 30 days -- unremediated means not fixed, I think. That's the one."

11. `... --click "vuln_count_critical_unremediated_over_30_days"` (same steps first) -> $P/11.png
    Ticked. Counter says 9 of 69.

12. `... --key Escape --hover "vuln_count_critical_unremediated_over_30_days"` -> $P/12.png
    Escape closed the list AND the whole table. "nothing on screen is called ..." "Where'd it go?"

13. `... --key Escape --click "Table" --hover "vuln_count_critical_unremediated_over_30_days"` -> $P/13.png
    Table back; my column is at the far right, shortened to "vuln_count_cr...over_30_days", tooltip
    gives the full name. All zeros at the top. "Load balancers, guess they're clean."

14. `... --click "Table" --click "vuln_count_critical_unremediated_over_30_days column menu"` -> $P/14.png
    "nothing on screen is called ..." -- guessed the arrow's name wrong.

15. `... --click "Table" --hover "vuln_count_critical_unremediated_over_30_days" --click "Column menu"` -> $P/15.png
    Opened the menu for **id** again, not mine. "No! The other arrow."

16. `... --try $P/16.png task:t22 --hover "Nothing is colored or sized by a row"`
    No tooltip. "Thought it might tell me how."

17. `... --click "Table" --click "vuln_count_critical_unremediated_over_30_days" --key Tab --key Enter` -> $P/17.png
    Instead of the arrow, it picked a dot: app-dev-sgp-01, and a bar of icons popped up over the
    picture. "Whoa, what did I do? I didn't mean to pick a dot."

18. `... (same) --click "67 more attributes"` -> $P/18.png
    Right side lists every value for this one host. "That's one host's sheet row. Not where you
    make dots bigger."

19. `... --click "Table" --click "vuln_count_critical_unremediated_over_30_days" --click "Size by"` -> $P/19.png
    "nothing on screen is called 'Size by'". The header click sorted the table high to low: worst
    host has 6, then 6, 6, 5, 4, 4. The column's arrow is half cut off at the right edge of the
    table. Dots in the drawing all still the same size.

Engagement dropped after step 19. I stopped.

## Did I succeed?

No. I found the right column (I'm fairly sure -- "unremediated over 30 days" read as "left unfixed
for a month", though I had to guess what unremediated means) and I got it into the table and sorted
it. I never made the dots bigger. I saw "Size by" once, in the menu for the wrong column, and could
never get the same menu for my column.

## Single Ease Question

2 of 7.

## Would I use this instead of my current tool?

Not for this. In our dashboard or in Sheets I'd have sorted that column in ten seconds, which is
all I ended up doing here anyway. The one thing the drawing was supposed to add -- bigger dots for
the bad hosts -- I couldn't get to. I liked that typing "vuln" in the column search cut 69 down to
7; that part was quick. But the sizing lives behind a tiny arrow on a column header, the note at
the top that says "nothing is sized" doesn't let me do anything about it, and the Style tab, where
I looked first, has no size at all.

## Notes for the record (observed, not interpreted)

- The canvas note "Nothing is colored or sized by a row" is not clickable and has no tooltip; it
  was my first click.
- Style tab (graph selected) has no size or color-by control.
- Find attribute search worked once typed; it was the fastest step.
- Escape from the Columns popover also collapsed the table.
- The column menu (Color by / Size by / ...) is only reachable from a small arrow on a header; the
  added column landed at the far right with its arrow partly clipped. Clicking the header text
  sorts instead.
- Keyboard Tab from a header selected a node on the canvas.
