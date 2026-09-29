# Session: monthly update, played by the level-1 alert reviewer (Nadia)

Task as read by the moderator: "Last month's transfers project needs this month's file. Update
it, and explain why the number of groups changed."

Screens used: weekly-return (steps 1-13), data-panel (Update with new data, Versions),
version-history (What changed), replace-and-recipe (the replay report), comparison (March
against April). Renders at 1536 x 740, the size of her browser window at 125 percent scaling:
shots/r6-nadia-wu-weekly-return.png, -data-panel.png, -version-history.png,
-replace-and-recipe.png, -comparison.png.

## Think-aloud

**Start screen.** "Case 0314, mule ring. Transfers, 3,000 accounts, edited Apr 3. That's the one
Sarah made, I'm guessing. Open it." Clicks the card.

**Project reopened.** "It kept fourteen things selected. I didn't select anything, but fine,
there's Clear." Clears. "Legend says Louvain community, Community 1 to 7 and 'Other, 28
communities'. So 35 groups. I'm writing that down: 35 in March." Notes the right panel: "Last
import: March data, accounts-2026-03.csv, transfers-2026-03.csv. Good, it tells me which files.
QA would ask that."

**Finding the update.** First instinct is the Data icon on the left, not the menu. On the data
panel she sees "Update with new data..." under the file. "OK, that's the button." In the
weekly-return pages she also finds it under the hamburger, File, as the first item: "Update
with new data... New files under this analysis; March kept as a version. 1 slow result will
wait for Re-run." "'March kept as a version' -- good, so I'm not wiping last month. That's the
thing I'd be scared of. 'Slow result will wait' -- whatever, I'm not running slow things."

"There's also 'Add data...' right under it. 'More rows on top of the data loaded now.' I would
not have known which one. Month two is 'update', not 'add', I suppose. If I'd hit Add data by
mistake..." Looks at the Add data page (step 6): the warning says the files have the same
columns as March and offers "Replace data instead". "OK, it catches me. It says 3,132 accounts
if I add, 3,093 if I replace. I'd have read that twice. It's fine."

**Picking files.** "accounts-2026-04 and transfers-2026-04, today 08:40, both already ticked.
It even shows March's files below. 'Nothing is sent.' Good, compliance would ask." Open.

**The load step.** Reads the right-hand table: April 3,093 accounts, March 3,000; 132 new, 39
not in April, 26 with no transfers; transfers 8,370 against 9,113; rows dropped 0. "This is the
table I'd have built in Excel with a VLOOKUP. Rows dropped zero, good, that's the first thing QA
asks." Reads the issue: "26 accounts have no transfers in April. All 26 were in March. Each will
be a component of its own." "Component. I don't know what a component is. Is that bad? It
says it will be, so it's not asking me." "What replays: Degree; Louvain with its 5 seeded
re-runs, seconds. Modularity vs randomized baseline, a few minutes: waits." "Seeded re-runs --
no idea. Skip." Clicks Load.

**After loading, the report.** Right panel, Version history, April data today 09:14, March data
Apr 3. Replay report. Scrolls to Results: "2 of 3 replayed. Louvain: 35 groups in March, 65 in
April: 39 new, 9 lost. 26 of the new groups are single accounts with no April transfers. Lost,
their accounts now in other groups: Communities 13, 19, 20..."

"There it is. That's my answer, it's just buried in the sidebar under 'Results' under
'Replay report'. So: 35 went to 65. Twenty-six of the new ones are just accounts that did
nothing in April -- each sits alone, so each counts as a group. That's not a real group, that's
a dormant account. Take those out and it's 13 genuinely new groups and 9 that merged into
others. 35 minus 9 plus 39 is 65. OK, the maths works."

She pauses on the numbers. "Wait. 39 new groups. And 39 accounts not in April. Same number. Are
those the same 39? ... No. One's groups, one's accounts. That's a coincidence and I'd have
written it wrong in the file the first time. On a day-29 afternoon I'd absolutely write '39 new
groups because 39 accounts left'." (She does not find anything on screen that says the two 39s
are unrelated.)

"And it says 'groups' here and 'communities' in the legend and 'components' on the load page.
Are those three different things? Groups and communities are the same, I think. Components is
something else because it says 27 components. I'd ask Sarah."

**The out-of-date result.** "Modularity vs randomized, out of date, Re-run. I don't need that
to answer the question. Leaving it." She notes the yellow "1 out of date" warning stays in the
Results list. "QA screenshot would show a warning triangle. I'd rather it didn't."

**Data panel, What changed.** Opens Data, Versions, April data current. "What changed, against
March data. 65 communities (was 35), large change, 26 are single accounts with no transfers in
this version." "This is the shorter version of the same sentence. This is the one I'd copy.
Can I copy it?" Looks for a copy button next to What changed or the replay report. "Copy
methods text exists somewhere else, for the figure. Not here. So I'm retyping it or taking a
screenshot of a sidebar. That's how I do it now anyway." She also notices the date: "This one
says April data, May 4, and March data Apr 2. The other screen said today 09:14 and Apr 3. Which
is it? If I paste two different dates into the file, QA sends it back."

**Comparison (step 10-12).** She finds "Compare with..." only because the replay report and the
Versions list both offer it. Picks "March data, Apr 3, 35". "Two pictures side by side. Groups:
35 in March, 65 in April: 39 new, 9 lost. Matched groups 26. Same sentence a third time. The
agreement '3 in 10 pairs of accounts that shared a group still share one' -- I don't know what
to do with that. Is 3 in 10 bad? It doesn't say." Skims the Grew table: Community 1 +62,
Community 27 +106 percent, Community 33 22 to 32. "Community 33 has the watchlist people in it,
7 of 9. That's the one Sarah cares about. Not my question though." She does not open the edges
table.

"Lost groups: Community 13, 86 accounts, most now in Community 36. Community 36 didn't exist in
March. So it didn't disappear, it got renamed, kind of. I'd write 'merged'."

**Her write-up (what she would paste into the file).** "Updated with April files
(accounts-2026-04.csv 3,093 rows, transfers-2026-04.csv 8,370 rows, 0 dropped). Groups went
from 35 to 65. 26 of the 30 extra are accounts that were in March but had no transfers in April,
so each counts as its own group. The remaining change is 13 new groups and 9 March groups whose
accounts moved into other groups." "That's two minutes of typing, the rest took maybe six."

## Single Ease Question

**5 of 7.** "The update itself was easy -- one menu item, it picked the right files, it told me
March is kept, it told me nothing was dropped. The 'why' was on screen, but I had to find it in
the third panel down, and it uses three words for groups, and the two 39s nearly got me. I
couldn't copy the sentence out."

## Would she use this instead of her current tool?

"Not instead -- I don't have a tool for this, it would be Sarah's spreadsheet and a pivot table
of the community column. For a monthly refresh, yes, I'd rather this than a VLOOKUP, because the
matched / new / not-in-April table is exactly what I'd build by hand and it came free. But I
don't choose tools, and I would only open this for an alert where the counterparties matter.
For my normal alert it's a minute I don't have."

## Observed problems (moderator notes)

1. The answer to "why did the groups change" is only in the replay report and What changed,
   both in side panels reached after the load; nothing on the canvas or legend says it. She
   found it, but by reading down a long sidebar.
2. "39 new groups" and "39 accounts not in April" sit next to each other in the replay report
   and the comparison. She nearly linked them causally; nothing marks them as unrelated.
3. Three words for related things -- groups (report, comparison), communities (legend, What
   changed), components (load step, What changed) -- with no explanation of the difference.
   "Component" was not understood at all.
4. No Copy on the What changed text or the replay report, though a methods-text Copy exists for
   figures. Her output is text in an alert file, so she retypes it.
5. Dates disagree between screens: March data "Apr 3" (weekly return, comparison picker) versus
   "Apr 2" (Versions, file picker); April data "today 09:14" versus "May 4". The project is
   "Case 0314, mule ring" on one screen and "Payments network review" on another. She treats
   inconsistent dates as a QA rejection risk.
6. "Update with new data..." and "Add data..." are adjacent with one-line explanations; she would
   not have known which to choose, and was saved only by the warning on Add data.
7. The agreement figure ("3 in 10 pairs still share a group") has no reading of whether that is
   high or low; she ignored it.
8. The unrelated out-of-date warning stays visible after the update and would appear in any
   screenshot she files.

## What worked for her

- One menu item, both April files pre-selected, "March kept as a version" in the menu line.
- The April-against-March counts table on the load step, with "rows dropped 0".
- The replay report's single sentence "35 groups in March, 65 in April: 39 new, 9 lost. 26 of
  the new groups are single accounts with no April transfers", which is the answer almost word
  for word.
- "Nothing is sent" on the file picker.
