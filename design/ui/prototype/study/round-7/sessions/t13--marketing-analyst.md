# Session: swap March's transfers for April's -- Jordan, marketing network analyst

Task as given: "April's transfers have arrived as a new export. You want everything you built on
March -- the rings, the rankings, the colors -- to run again on April's numbers in place of
March's, without rebuilding anything."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t13--marketing-analyst/ (D below).

## Start (shots/tasks/t13/01.png)

Map colored by Louvain, 35 groups, legend Community 1 = 297 ... Community 7 = 120. Title
"Transfers, March 2026".

> OK, my March map with the cluster colors. I want to drop April's file in and have all of this
> rerun. The title has a little arrow, or there's "Data" on the left. Data sounds like files.

## 02 -- Data

    timeout 120 node app-b/study.mjs --try D/02.png task:t13 --click "Data"

> Whoa, the colors are gone, gray hexagons. Hopefully that's just this view. But there:
> Sources, transfers-2026-03.csv. That's what I swap. There's a filter too, "amount is at least
> 1,000", 812 of 3,000 nodes. Good, I remember setting that.

## 03, 04 -- click the file, then its name

    timeout 120 node app-b/study.mjs --try D/03.png task:t13 --click "Data" --click "transfers-2026-03.csv"
    timeout 120 node app-b/study.mjs --try D/04.png task:t13 --click "Data" --click "transfers-2026-03.csv" --click "transfers-2026-03.csv"

> This is the column-mapping screen, "Edit: transfers". Nice that it remembers from/to/amount.
> But no "replace" or "choose another file". Clicking the filename next to "CSV, comma" does
> nothing. Back out.

## 05 to 08 -- finding the dots menu on the file row

    timeout 120 node app-b/study.mjs --try D/05.png task:t13 --click "Data" --hover "More"
    timeout 120 node app-b/study.mjs --try D/06.png task:t13 --click "Data" --hover "More actions for transfers-2026-03.csv"
    timeout 120 node app-b/study.mjs --try D/06.png task:t13 --click "Data" --hover "transfers-2026-03.csv actions"
    timeout 120 node app-b/study.mjs --try D/07.png task:t13 --click "Data" --click "transfers-2026-03.csv actions"
    timeout 120 node app-b/study.mjs --try D/08.png task:t13 --click "Data" --hover "Source actions"   (and "More options", "transfers actions", "Actions")

> "More" grabbed the dots in the right panel, the whole graph's menu. I want the dots on the
> file row. (Several guesses at its name missed; with a real mouse I would just have clicked
> it.) Resting on it: "Actions for accounts-2026-03.csv". So the next one down is for transfers.

## 09 -- Actions for transfers-2026-03.csv

    timeout 120 node app-b/study.mjs --try D/09.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv"

> Rename, Replace with file..., Edit source..., Refresh. "Replace with file" -- those are exactly
> my words. Go.

## 10 -- Replace with file...

    timeout 120 node app-b/study.mjs --try D/10.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..."

> "Replace: transfers-2026-03.csv", it picked transfers-2026-04.csv, 8,370 rows, and the report
> says "all 4 columns of transfers-2026-03.csv are here, so every role carried over." Good, I
> don't redo the mapping. That saves me the step I hate most.
>
> But wait -- the preview rows say 2026-03-29, 2026-03-25, 2026-03-11. Those are March dates, and
> the account IDs are the same ones I saw on the March file. Is this showing April or the old
> file? That is the "dashboard says 4,000, download says 3,100" feeling. The row count did
> change, 9,113 to 8,370, so I'll go with it. Load.

## 11 -- Load

    timeout 120 node app-b/study.mjs --try D/11.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load"

> It still says transfers-2026-03.csv, 9,113 rows, 9,113 edges. The summary says 9,113 edges.
> The screen before told me 8,370. So did April load or not? And my filter is GONE. I had "amount
> is at least 1,000" and now it says "No filters". I didn't touch it. The title still says March
> 2026. No message, no "updated", nothing. This is exactly what I was afraid of.

## 12 -- back to the map

    timeout 120 node app-b/study.mjs --try D/12.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load" --click "Graph"

> Pixel for pixel what I started with. Community 1 is 297, Community 2 is 182, "Run from
> Louvain, Sep 28". If it reran on 743 fewer transfers I'd expect at least one number to move.
> Nothing says "rerun on new data" or "out of date".

## 13, 14 -- looking for a rerun-everything

    timeout 120 node app-b/study.mjs --try D/13.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load" --click "More actions"
    timeout 120 node app-b/study.mjs --try D/14.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load" --click "Transfers, March 2026"

> Graph menu: selection, layout, "Clear graph data" -- not touching that. Project menu: Save,
> Export, "Apply recipe or style file...", Version history. Maybe "recipe" is how they want me to
> do it: open April fresh and apply March's recipe?

## 15 -- Apply recipe or style file... (from the start screen)

    timeout 120 node app-b/study.mjs --try D/15.png task:t13 --click "Transfers, March 2026" --click "Apply recipe or style file..."

> "Apply recipe: Mule ring triage" -- somebody's saved analysis that adds six rows on top of mine.
> That's a different analysis, not April. Cancel. I'm stopping.

## Wrap-up

**Did I succeed?** I don't think so, or at least I can't prove it. I found "Replace with file",
and I liked that it carried the column setup over. But after Load the file is still called
-03, the counts are still March's, the cluster sizes didn't move, nothing told me anything reran,
and my amount filter disappeared. I would not put these numbers in a deck.

**Single Ease Question:** 2 of 7. Finding the replace took a while (it's behind the dots on the
file row, not on the file itself), and then the result contradicted the screen before it.

**Would I use this instead of what I use now?** Not for this job yet. Re-running last month's
analysis on this month's export is the thing I'd actually switch tools for -- in Gephi I rebuild
it by hand every month, and the listening suite just gives me whatever it gives me. If after
Load it said "April loaded: 8,370 transfers. Louvain, rankings and colors reran" and showed me
what changed, plus kept my filter, I'd be very interested. Right now it lost a setting silently
and I can't tell which month I'm looking at, which is worse than rebuilding, because at least
then I know.

(And honestly, half the reason I rebuild every month is that the export columns change on the
vendor's whim. If April had come with a renamed column, I'd want to see how this handles it.)
