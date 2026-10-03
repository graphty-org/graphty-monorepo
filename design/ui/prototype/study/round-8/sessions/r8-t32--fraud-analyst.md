# Session: fraud analyst (Sarah), select every flagged account in Great Britain

Task as given: "March's card transfers are open (example data if you do not work in banking).
Pick out, all at once, every account in Great Britain that was flagged, so you can work on just
those. Say how many there are."

Mode: first impression, not mandated. Start screen: shots/tasks/r8-t32/01.png.
Renders: tmp/round-8-sessions/r8-t32--fraud-analyst/02.png to 29.png.
All commands run from design/ui/prototype; prefix `timeout 120 node app-b/study.mjs --try <render> task:r8-t32`.

## Think-aloud, step by step

1. Start screen. "Three thousand accounts in a grey blob. GB and flagged is two filters in Excel.
   There's a 'Table' at the bottom."
   `--click "Table"` -> 02.png. Table of account ids, links in/out, total amount in. No country,
   no flag visible. "Columns: 11 of 13" but I see five.

2. `--click "Table" --click "Columns: 11 of 13"` -> 03.png. country and flagged exist and are
   ticked; they are just off the right edge of the table. No horizontal scroll I can find.

3. "The 'Full graph' button has a funnel. Funnel means filter."
   `--click "Table" --click "Full graph"` -> 04.png. Opens the Data page: Sources, Filters ("No
   filters. Filters change what is computed; the eye in the Graph tree only hides." -- I don't
   know what 'computed' means), Attributes.

4. `... --click "Add filter step"` -> 05.png. "Keep: Pick one". Options include "By an attribute
   or computed value".
   `... --click "By an attribute or computed value"` -> 06.png. Attribute list.
   `... --click "country"` -> 07.png. Went to the country attribute page instead of the menu item
   (tool picked the left-panel item). Retried naming the menu item:
   `... --click "country, accounts"` -> 08.png. "country is [blank]".

5. "Is it GB, UK, GBR? No hint how the file spells it." Typed GB.
   `... --key G --key B` -> 09.png; `... --key Enter` -> 10.png. Step renamed "country is GB",
   but "This step: 3,000 of 3,000 nodes" and the table still says 3,000 nodes. It did nothing
   I can see.
   `... --click "is"` -> 11.png: is / is not / is one of / is empty / is not empty. No pick list
   of actual values. Gave up on the filter.

6. "The task says pick out. There was a 'Selection' row on the first screen."
   `--click "Selection"` -> 12.png. Only the selection's look (yellow, size, opacity). Useless.

7. "Search box. Type GB."
   `--click "Find rows and notes" --key G --key B` -> 13.png. "No match for GB". So that box does
   not search my accounts either.

8. `--hover "More"` -> 14.png. Tooltip "More actions Shift+F10". Tells me nothing.
   `--click "Table" --click "Abc country"` -> 15.png. "Nothing on screen is called" that: the
   country column header is off-screen, I can't reach it like an Excel AutoFilter.
   `--click "Table" --hover "Table actions"` -> 16.png. Nothing called that.
   `--click "Table" --click "More actions"` -> 17.png. Graph menu: Select all visible, Invert
   selection, Reselect previous, layout stuff. No "select where".

9. "Back to the Data page; click country itself, maybe it lists the values."
   `--click "Data" --click "country" --click "Read from accounts-2026-03.csv on the Data page"`
   -> 18.png. Country page says where it came from, "Category", 3,000 nodes. No list of countries,
   no counts. A pivot table gives me that in one drag.

10. `--click "Data" --click "country" --click "More actions"` -> 19.png. Finally: "Select where
    country is...", also "Filter to...", "Show as groups". Buried behind three dots.
    `... --click "Select where country is..."` -> 20.png. A Select dialog with a query box
    pre-filled "country" and the hint "Finish the query with a comparison ... such as
    kind == 'personal'". "Oh no, a query box. I don't write code."

11. "'+ condition' looks like a form." `... --click "+ condition"` -> 21.png. It typed "and"
    into the box and opened an attribute list. `... --click "flagged, accounts"` -> 22.png.
    Box reads "country and flagged". "Select 0", grayed out. The builder wrote me a query that
    doesn't work.

12. Retyped by hand, copying their example:
    `... --click "Query" --key Control+a` then keys for `country == 'GB' and flagged` -> 23.png.
    Still "Select 0", no message. `--key Enter` -> 24.png. Same. No error saying what is wrong.

13. Tested the flag alone: `flagged == true` -> 25.png. "14 of 3,000 nodes match", Select 14,
    some yellow dots. So "flagged" alone silently matches nothing; it needs "== true".

14. `country == 'GB' and flagged == true` -> 26.png. "1 of 3,000 nodes match". "One? Out of 14
    flagged? I never saw what values country holds."
    Checked `country == 'UK' and flagged == true` -> 27.png. "0 of 3,000 nodes match. Clear the
    query". So GB is probably the spelling.

15. Back to GB, `--click "Select 1"` -> 28.png. Toast: "Selected 1 of 3,000 nodes where
    country == 'GB' and flagged == true", with "Create set from rule". Right panel: "1 node".
    I can't see the account on the picture. The left list now also shows "Louvain, 35 groups"
    and "Links in (count)", which I never asked for.

16. `... --click "Select 1" --click "Table"` -> 29.png. Table still lists all 3,000 accounts,
    doesn't jump to or mark my one, footer still says "select rows to total them". I have a
    selection of one account and no account number. Stopped.

## Answer given

One flagged account in Great Britain (country == 'GB' and flagged == true; 'UK' matched none).
I could not see which account it is.

## Did I succeed?

Probably. The count is 1 and it is selected. Confidence: moderate. I never saw the list of
country values, so if the file has 'gb', 'United Kingdom' or 'GBR' rows I missed them, and I can't
name the account I selected.

## Single Ease Question: 2 / 7

## Would I use this instead of my current tool?

No, not for this. In Excel this is two AutoFilter dropdowns on the country and flagged columns,
and the dropdowns show me every value with a count, so I'd never have to guess "GB". Here:
- The obvious places (the funnel filter, the search box, the table) all failed. The filter step
  accepted "country is GB" and still said 3,000 of 3,000 -- no explanation.
- The working path is three dots on an attribute page, then writing code with double equals and
  quotes. The "+ condition" helper wrote a broken query ("country and flagged"), and "flagged" on
  its own silently matched nothing. No error message, just a grayed "Select 0".
- After selecting, I can't see the account, the table doesn't show it, and I don't get its id.
  I can't put "1 account" in a case file without the account number behind it.
- Things appeared in the left list (Louvain) that I didn't do. That worries me for an audit trail.
What was fine: once the query was right it told me live how many matched ("1 of 3,000"), and the
confirmation repeated exactly what rule it used. That sentence I could paste into my notes.
