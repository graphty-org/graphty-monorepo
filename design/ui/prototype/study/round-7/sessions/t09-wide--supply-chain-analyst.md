# Session: shade hosts by peak CPU -- supply chain risk analyst (Dana)

Task as given: "Shade the hosts by how hard their processors work at their busiest moments, so the
overloaded ones stand out. The data on screen is a sample: a company's IT estate, hosts and the
network connections between them, with dozens of things recorded about each. If that is not your
line of work, treat it as your own wide spreadsheet."

Start screen: shots/tasks/t09-wide/01.png. Renders: tmp/round-7-sessions/t09-wide--supply-chain-analyst/.
All commands were run from design/ui/prototype with `timeout 120 node app-b/study.mjs --try <png> task:t09-wide ...`;
only the steps after `task:t09-wide` are listed below.

## Think-aloud

**Start.** "Hosts. Not my world, but fine -- a wide spreadsheet. 'Shade by' is conditional
formatting to me. Top right says Style and Data. Style sounds like formatting."

1. `--click "Style"` -> 01.png. "Background, print-safe colors, layout method... page settings.
   Nothing about coloring by a column."

2. `--click "Nothing is colored or sized by a row"` -> 02.png. "That note at the top looked like it
   was talking about my problem. Clicking it does nothing. It's just a label." (It also flipped
   the right panel back to Data.)

3. `--click "Table"` -> 03.png. "I live in tables. There's the host list, 300 rows. 'Columns: 8 of
   69' -- the CPU stuff must be hidden."

4. `--click "Table" --click "Columns: 8 of 69"` -> 04.png. "A list of columns with checkboxes.
   cpu_cores, cpu_model... the list runs off the bottom."

5. `--click "Table" --click "Columns: 8 of 69" --type "cpu"` -> 05.png. "Tried typing cpu in the
   find box. Nothing filtered. Anyway, unhiding a column in a table won't shade the dots."

6. `--click "Everything" --click "Style"` -> 06.png. "'Everything' on the left -- 'Paints 300 nodes,
   default look'. Fill, Color 6366F1. That's a purple code but the dots look gray to me. One
   solid color; I need it to vary by CPU."

7. `--click "Everything" --click "Style" --click "6366F1"` -> 07.png. "A paint picker. One color.
   And a warning about orange and vermilion for 'group 2 and group 3' -- what groups? I didn't
   make any groups. A little cylinder icon showed up next to the color box. Same picture as Data
   on the left rail."

8. `--click "Everything" --click "Style" --key Escape --hover "Color"` -> 08.png. "Escape to close
   the picker threw me all the way out of Everything. Annoying."

9. `--click "Everything" --click "Style" --hover "Color"` -> 09.png. "'The default look; change it
   to override.' The cylinder is there to the right of the color. I don't know what it's called."

10. Tried to reach the cylinder by name: `--hover "column"`, `--hover "data"`, `--hover "Data"`
    (10.png kept the "column" try, which landed on the Columns button at the bottom instead), then
    `--click "Color by"`, `--click "From a column"`, `--click "Bind"` -- each "nothing on screen is
    called ...". "No label, no tooltip I can find. I give up on that icon."

11. `--click "Data"` -> 11.png. "Data on the far left. Sources, filters, attributes -- columns.
    cpu_util_max_pct, cpu_util_p50_pct, cpu_util_p95_pct. 'Busiest moments' says max to me. p95 is
    a statistics thing -- I know percentiles from lead-time reports, but 'busiest' is the max."

12. `--click "Data" --click "cpu_util_max_pct"` -> 12.png. "Range 20.1 to 94.4, median 57.7, every
    host has a value. That's what I'd check in Excel first, good. 'Painted by: No row paints from
    cpu_util_max_pct.' So it knows what I want, but there's no button that says 'paint with this'."

13. `... --click "No row paints from cpu_util_max_pct."` -> 13.png. "Nothing."

14. `--click "Data" --click "cpu_util_max_pct" --click "More"` -> 14.png. "The three dots at the top
    right. Color by, Size by, Label by... There it is. Why is the one thing I came for behind three
    dots? It should be a button right on that panel, next to 'Painted by'."

15. `... --click "Color by"` -> 15.png. "Dots are colored now. The legend top left says 20.1 to
    94.4, orange to brown. But do the overloaded ones stand out? At this size it's all orange and
    brown. I can't tell a 90 from a 60 without my glasses. And the legend doesn't say which end is
    high."

16. `... --click "Orange to brown"` -> 16.png. "Source, Scale 'Linear', Palette, Values from, Clamp,
    No value, Detach. I don't know what Clamp or Detach means and I'm not touching them. The
    palette swatch goes light orange to dark brown, so dark is the busy ones. That's what was
    asked. I'd rather have red for anything over 85, like conditional formatting, but I'll call it
    done."

Stopped here.

## After the task

- **Did I succeed?** I think so: the hosts are shaded by their peak CPU. Whether "the overloaded
  ones stand out" -- not really. Brown on brown at that dot size doesn't jump out. I'd want a
  threshold color, or the top ten hosts called out.
- **Single Ease Question:** 3 of 7. It took me about ten tries. The obvious places (Style, the
  "nothing is colored" note, the color box) were dead ends, and the real way in was three dots on
  a column I had to go find on a different page.
- **Would I use this instead of what I use now?** No, not for this. In Excel I'd sort by the max
  CPU column and color-scale it in ten seconds, and I'd get a list I can paste on a slide. The
  colored network is nice once it's there, and the column summary (range, median, every host has
  a value) is a good touch -- that's the check I'd do anyway. But to beat a pivot, the "Color by"
  needs to be where I first look, and the result needs to show me the overloaded ones, not just a
  gradient. And I'd still be asking where the data goes and whether it gets into Power BI.

## Problems I hit

- The note on the graph ("Nothing is colored or sized by a row") reads like a way in but does
  nothing when clicked.
- Style on the whole graph shows only page settings; nothing about coloring by a column.
- The color picker on "Everything" offers only a single paint color; the only hint of "use a
  column" is an unlabeled cylinder icon I could not identify or reach.
- Color-blindness warning mentions "group 2 and group 3" that I never created.
- Escape closed the picker and also dropped me out of the item I was editing.
- "Color by" lives only in a three-dot menu on a column's detail panel, which is on the Data page,
  not where I was styling.
- The legend chip shows the range but not which color means high; "orange to brown" doesn't make
  the high values pop.
- The ramp settings use words I don't know (Clamp, Detach, Linear).
- Three CPU columns (max, p50, p95) and nothing to tell me which one matches "busiest moments".
