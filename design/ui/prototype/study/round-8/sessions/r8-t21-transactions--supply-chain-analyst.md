# Session: money path between two accounts -- supply chain analyst (Dana Okafor)

Task as given: "A month of card transfers between accounts is open, and the program has already
sorted the accounts into groups. If you do not work in banking, this is example data, not your
own. Work out how money could have gone from account ACC-271813 to account ACC-233575 through the
smallest number of other accounts: say which accounts are in between, whether there is more than
one such way, and whether the dates allow it."

Start screen: shots/tasks/r8-t21-transactions/01.png
Renders: tmp/round-8-sessions/r8-t21-transactions--supply-chain-analyst/02.png to 15.png
All commands were run from design/ui/prototype with
`D=$PWD/tmp/round-8-sessions/r8-t21-transactions--supply-chain-analyst`.

## Think-aloud

**01 (start screen).** "OK, not my data -- banking. Big colored hairball, 3,000 dots. Colors are
'Community 1' to '7' and '28 more'. Means nothing to me. I have two account numbers, so I do
what I always do: type one in the search box top left. It says 'Find rows and notes', so rows
should include accounts."

```
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t21-transactions --click "Find rows and notes"
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t21-transactions --click "Find rows and notes" --type "ACC-271813"
```

**03.** "'No match for ACC-271813.' Really? It's an account in this file -- the task says so.
Maybe I need to press Enter."

```
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t21-transactions --click "Table"
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t21-transactions --click "Find rows and notes" --type "ACC-271813" --key Enter
```

**04.** "The Table at the bottom has accounts in an 'id' column -- ACC-393859 and so on, 3,000
of them. So the accounts ARE rows."
**05.** "Enter does nothing, still 'No match'. A search box called 'Find rows' that can't find a
row by its ID. In Excel that's Ctrl+F and done. That would make me distrust the whole thing on
day one. Let me try the little icons along the bottom."

```
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t21-transactions --hover "Analyze"
timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t21-transactions --click "Analyze"
```

**07.** "The flask is 'Analyze'. A list: Louvain, PageRank -- skip those, I don't know the words
-- and 'Shortest path: the fewest steps, or the lightest route, between two nodes.' That's my
question in plain words. Click."

```
timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t21-transactions --click "Analyze" --click "Shortest path"
```

**08.** "'Path between', with From and To. Good. 'Follow time order' -- that's my dates question,
I want that ticked. 'Weight: amount (set at load)', 'Stronger / Farther / Capacity', 'reads a
weight as distance: it uses 1/amount' -- no idea what that means and I'm not reading it. Fill in
the two accounts."

```
timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813"
timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --click "Click to pick" --type "ACC-233575" --key Enter
```

**09.** "The ID is typed in, but no dropdown says 'yes, that account exists'. After the search
box just told me it doesn't exist, I'm nervous."
**10.** "Enter took me to the To box, so the second ID landed there anyway. Both filled, 'Find
path' turned blue, so I suppose it accepted them."

```
timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "Follow time order" --click "Find path"
```

(The tool reported it could not click "Follow time order" -- the checkbox did not respond.)

**11.** "It ran. '3 steps. Weakest amount on the path: 3,530.28. Dates in order.' The right panel
lists it like a table, which I like: ACC-271813, then ACC-946224 on 4 Mar, then ACC-242954 on
7 Mar, then ACC-233575 on 8 Mar, with a 'Dates in order: Yes' column. Good -- that answers
the dates. But I couldn't tick the time-order box, so did it check dates or just report them? And
where's the path on the picture? The legend says the path is orange, and Community 5 is also
orange. I can't find it in that hairball. And the bar talks about 'weakest amount', so is this the
fewest accounts or the biggest money? The form said weight = amount. That was the bit I skipped."

```
timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)"
timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "Find path" --click "4 accounts, 3 transfers"
```

**12.** "The Weight list has 'None (fewest steps)'. THAT is the question I was asked. Why isn't it
the default on a box that's called 'fewest steps' in the menu?"
**13.** "Clicking '4 accounts, 3 transfers' only selects them -- the tooltip says so. Nothing
visible on the picture changes for me."

```
timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path"
```

**14.** "Now it's different: '3 steps. 2 routes tie. Dates in order.' Route 1 of 2:
ACC-271813 -> ACC-946224 (4 Mar) -> ACC-670564 (7 Mar) -> ACC-233575 (9 Mar). So the first
answer was one of two, and with the default I'd never have known there was a second. Glad I
looked; annoyed I had to."

```
timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path" --click "Next route"
```

**15.** "Route 2 of 2 is the first one again: through ACC-946224 and ACC-242954, 4, 7 and 8 March,
all 'Yes' in the dates column. I'm stopping here."

## My answer

- Smallest number of accounts in between: two (3 transfers).
- There are two such ways, and both start ACC-271813 -> ACC-946224 (4 Mar):
  - Route 1: ACC-946224 -> ACC-670564 (7 Mar) -> ACC-233575 (9 Mar)
  - Route 2: ACC-946224 -> ACC-242954 (7 Mar) -> ACC-233575 (8 Mar)
- Dates: in order on both routes (4 Mar, 7 Mar, then 8 or 9 Mar), per the "Dates in order"
  column. ACC-946224 is on both routes, so that's the chokepoint, in my words.
- Caveat: I never got "Follow time order" ticked, so I'm trusting the column, not a filter.

## Wrap-up

- **Succeeded?** I think so, about 80 percent sure. The two routes and the dates are on screen
  in a table. My doubt is the time-order box I couldn't tick. Also, the run with default
  settings gave one route with no hint of the tie, and I would have handed that in.
- **Single Ease Question: 4 of 7.** Once I found Analyze, the form and the result list were
  clear. Before that, the search box failing to find an account ID cost me trust. The default
  "weight = amount" nearly gave me the wrong kind of answer, and the path can't be seen on the
  picture.
- **Would I use this instead of my current tool?** Not for my job as it stands. For this kind of
  question -- how does A reach B, through whom -- it beats Excel. I can't do multi-hop routes
  with a pivot, and the stepped list with dates is exactly what I'd paste on a slide. But in my
  world, any route past Tier 1 needs Tier 2 links I mostly don't have ("where do I get that
  data?"). I also didn't see how to get that route table out to Excel or Power BI. "Local only"
  at the top is a good sign for IT, but I'd still have to ask. So it's a side tool, not a
  replacement.

## Problems seen

1. Search "Find rows and notes" returns "No match" for an account ID that is in the table
   (03, 05). Severity high: the first thing I tried, and it made me distrust the app.
2. The shortest-path form defaults Weight to amount, but the menu entry promises "the fewest
   steps". The default run gives a different single route and hides that two routes tie (11 vs
   14). Severity high: a wrong-kind answer that looks right.
3. The "Follow time order" checkbox could not be clicked (11). Severity medium.
4. The path's color on the canvas is the same orange as Community 5, so I could not see the path
   in the picture at all (11, 14). Severity medium.
5. Typing an ID into From gives no confirmation that the account was recognized (09). Severity
   low to medium.
6. Jargon in the form ("reads a weight as distance: it uses 1/amount", "Stronger / Farther /
   Capacity") and on the start screen (Louvain, modularity). Severity low: I skipped it, which
   is how I missed the weight setting.
