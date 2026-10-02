# Session: pick out flagged GB accounts as a named list -- Nadia, level-1 alert reviewer

Task as given: "Pick out every account the monitoring system marked as suspicious that is based in
Great Britain, all at once, and keep them as a named list you can come back to."

Start screen: shots/tasks/t10-transactions/01.png. Renders: tmp/round-7-sessions/t10-transactions--alert-reviewer/NN.png.
Every command was run from design/ui/prototype as
`timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10-transactions--alert-reviewer/NN.png task:t10-transactions <steps>`;
only the steps are listed below.

## Think-aloud

**Start.** A gray blob of hexagons, 3,000 nodes. No account numbers anywhere. "Okay, where's the
list. There's a search box, I'll start there."

**01** `--click "Find rows and notes"` -- Box is focused. Nothing else changes. Fine, I'll come
back to it.

**02** `--click "Table"` -- A table opens under the picture. Good, this I understand: id, links in,
links out, kind, country. GB on the first row. "Now I just need a filter on country and on the
suspicious flag, like Excel."

**03** `--click "Table" --click "country"` -- Clicking the header sorted it A to Z (BR, DE...). A
little arrow shows next to country. That's the filter arrow, surely.

**04** `... --click "Filter"` -- nothing on screen is called "Filter".

**05** `... --click "Column menu"` -- I got a tooltip "The id column menu", on the id column, not
country. No menu opened.

**06** `--click "Table" [--hover "country"] --click "The country column menu"` (three tries) --
nothing on screen is called that. I can't get the country arrow to do anything. "In Excel this is
one click."

**07** `--click "Selection"` -- The right side shows Color, Size, Opacity, "Paints 0 nodes". That's
how the selection is colored, not a way to select. Not what I want.

**08** `--click "Full graph"` -- The funnel at the top. Now it says "812 of 3,000 nodes" and the left
side is a Data panel with a filter "amount is at least 1,000" already ticked on. "Wait -- did I just
filter it, or was that already on? It said Full graph a second ago." I can't tell if I changed the
data or only the view. Under Attributes I can see **country** and **flagged** and **riskScore**.
That's my data.

**09** `--click "Full graph" --click "flagged"` -- The flagged row highlights, but the right side
shows "amount", the transfer amount histogram. I clicked flagged. Why am I looking at amount?

**10** `--click "Full graph" --click "Add filter"` -- The plus by Filters. A "New step" with a menu:
By an attribute or computed value, Top of a computed value, Largest component, k-core, Neighbors of
the selection. "k-core, no idea." First one sounds right.

**11** `... --click "By an attribute or computed value"` -- A field picker listing the same
attributes: country, flagged, riskScore... 

**12** `... --click "flagged"` -- It went back to the "amount" page again and the new step still
says "Kept all 812 nodes". Picking flagged did not take. Also I'm now worried: this is a filter. A
filter hides things. The task says keep them as a list. And there is that amount-over-1,000 step
still on, so any flagged GB account with small transfers would be missing from whatever I get. QA
would kill me for that.

**13** `--click "Views"` -- "No saved views. Save view (+)". A view is the picture, I think, not a
list of accounts. I haven't picked anything to save yet anyway.

**14** `--click "Find rows and notes" --key G --key B` -- typed GB. Nothing.

**15** `... --key Enter` -- "No match for GB". So the search box doesn't search the data. With 
an account number that's what I'd paste in first; good to know it probably wouldn't work either.

**16** `--click "Analyze"` -- A big list: Louvain, PageRank, Shortest path, Links count, Total
amount... "Search, or say what to find." Say what to find -- okay.

**17** `... --key f l a g g e d` -- No match for "flagged".

**18** `... --key s e l e c t` -- No match for "select". These are math things, not a filter.

**19** `--click "More actions"` -- Menu: Select all visible, Invert selection, Reselect previous,
Fit, Re-run layout... Add node, Clear graph data. Select all, but not select where.

**20** `--click "Assistant"` -- "Off. Nothing is sent. Turn on in Settings." I'm not turning on
anything that sends bank data anywhere. Compliance would have my head.

**21** `--click "Add"` -- Opened a blank note. Not what I meant. Cancel.

**22** `--click "Table" --click "Select"` -- It just took me to the Selection coloring page again.

**23** `--click "Selection" --click "Data"` -- Went to the Data panel, 812 of 3,000 again.

**24** `--click "Data" --click "country"` -- Clicking country also shows me "amount". Every
attribute I click shows amount.

**Stop.** That's well past the time I'd give one alert. I give up.

## Outcome

- **Succeeded?** No. I never got a single account picked, let alone the flagged GB ones, and never
  got to naming a list.
- **Single Ease Question:** 1 of 7.
- **Would I use this instead of my current tool?** No. In the case system or even a spreadsheet,
  "country = GB and flagged = yes" is two filter dropdowns and a copy-paste into the alert file.
  Here the obvious move (the arrow on the country column) did nothing I could reach, the search box
  does not search values, clicking any attribute showed me the transfer amount instead, and there
  was a filter on amount already switched on that I did not put there and that the top of the
  screen only admitted to on one panel. If I can't tell whether the list is complete, I can't write
  it in the file.

## What got in the way, in her words

1. "The arrow on the column header should filter. It's a table." (No reachable filter on the table
   column; the only column menu I found was id's, and it opened nothing.)
2. "I clicked flagged and got amount." (Clicking any attribute in the Data panel, and choosing one
   in the new filter step's picker, showed the amount attribute.)
3. "Was that filter mine?" (Top bar said Full graph in one place and 812 of 3,000 in another; an
   amount filter was already on.)
4. "Filter or list? The task says list." (Nothing told me how to turn a filtered set into a saved,
   named set of accounts; Views looks like saving a picture.)
5. "The search box doesn't find GB." (Find rows and notes does not match attribute values.)
6. "Say what to find" in Analyze found nothing for "flagged" or "select".
