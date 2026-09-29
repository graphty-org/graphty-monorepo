# Session: how two accounts are connected, weighted by amount, with the transfers out -- Sarah, fraud investigator

Participant: Sarah, complex-case financial crime investigator (composite persona, study/personas/fraud-analyst.md).
Mode: first impression, not mandated. She is told nothing about the tool beyond the task.
Screens, in the order she met them: the inspector (two accounts selected), sets and paths (the
path tool, the found path, what amount means, no path), the bottom table (getting rows out).

Task as the moderator gave it: "Starting from two selected accounts, find how they are connected,
weighted by amount, and get the transfers with amounts and dates out."

## Transcript (think-aloud)

**1. Inspector, two things selected.**

"OK, first screen. 'Human protein interactions'? TP53, SMAD3... these aren't accounts. Is this the
right case? ... Fine, I'll pretend TP53 is an account. On the right it says '2 selected' and there's
a button, 'Paths between...'. That's the only thing on this panel that sounds like my question, so
that's what I click."

"A little box opens: From TP53, To SMAD3, 'Weight by: None: count hops'. Good -- it tells me it's
counting hops and not money, I'll give it that. 'Undirected.' Undirected is wrong for money; money
goes one way. Can I change it? I don't see where. There's a dropdown for weight, so I'd pick amount
there. Then Run."

**2. Sets and paths -- March transfers. Now we're talking.**

"This is more like it. 'March transfers', 3,000 accounts, ACC numbers. The bar at the bottom of the
picture: From ACC-271813, To ACC-233575, Scope, Weight. Weight already says amount. But it says
'amount (unknown role)'. Unknown role? It's dollars. It's the amount of the transfer. What role is
there to know?"

"And there's a yellow warning: 'From is outside the filtered graph. Set Scope to Full graph to
search it.' OK, somebody had a filter on. At least it tells me what to do. I'd switch Scope to Full
graph. Run is greyed out until I do -- fine."

(She notices the picture: a grey honeycomb.) "And what is this? Hexagons? Where are the accounts?
I see two dots. I'll trust the box at the bottom and not the picture."

**3. Found path.**

"Three hops. ACC-271813 to 946224 to 242954 to 233575. Arrows go the right way -- 'follows
transfers', good, so it's directed here even though the protein screen said undirected. The
table at the bottom switched to Edges on its own and shows step, source, target, amount:
$3,530.28, $9,782.05, $9,616.72. That's the thing I actually wanted. That I can read."

"But look at the header on the right: 'Found path (unweighted)'. And under it: 'Paths ignore
amount: hops were counted, not dollars.' Hold on. I set Weight to amount. It says amount right there
in the Weight row. And then it tells me it ignored it? So which is it? That's the kind of thing I get
asked about by QA -- 'you said weighted by amount, the tool says unweighted.'"

"'Ties: 1 of 2 as short.' So there's another three-hop route and it's showing me one. Which one did
it pick and why? I'd want both. The second one might be the mule."

**4. Trying to make it actually use the amount.**

(She clicks the Weight row, the only thing that mentions amount.) "A box: 'amount: what it means.
Applies to every result that reads amount. A bigger amount means: similarity: larger = closer. Read
as a distance by 1/w, so a path prefers big transfers.' ... 1 over w. I'm not a statistician. I get
the last half -- 'a path prefers big transfers' -- that's roughly what I mean. I'd leave it. But
'similarity'? Money isn't similar to anything. And 'Applies to every result that reads amount' --
does that change something else I already did? I don't know what else reads amount."

"'Other conversions' -- no. Not clicking that."

"So I pick that and then... what? Do I run it again? Nothing here says the path changed. The
header still says unweighted in the picture I have. I'd hit Run again and hope."

**5. The backwards case.**

(Moderator shows the no-path state.) "'No directed path; one exists ignoring direction. Ignore
direction.' OK, that's honest. For money I would NOT press that -- if it only connects backwards,
that's not a flow of funds, that's two accounts that both paid the same person. But at least it
said so instead of drawing me a fake chain. That one's good."

**6. Getting the transfers out.**

"Now the part that matters. Amounts and dates. The table has amount. Where's the date? Step,
source, target, amount. No date column. A transfer without a date is useless to me -- the whole
point is 'in Tuesday, out Wednesday'. Maybe it's hidden. There's a '...' on the table and a
magnifier. I'd try the '...'."

(Moderator shows the table-dock 'Getting rows out' page; she reads what Export table as CSV does.)
"'Export table as CSV...' -- right, there it is, on the table itself, not under 'Export files' at
the top. Found it on the second try. The dialog says 'Rows: All 300', 'Columns: 9, hidden ones
included', and shows me the first lines of the file. That I like: it tells me how many rows before
I press it. I don't have to wonder if it cut me off at 100."

"'Hidden ones included' -- so maybe the date comes out in the file even if I can't see it on
screen? Maybe. I'd have to open it in Excel to find out. That's not how I'd like to learn it."

"And the path table in that example says '5 edges on 2 paths' and 'on paths: 2 of 2, 1 of 2' -- so
both tied routes come out together. Good. That's what I asked for back at step 3, I just didn't know
where it was. Clicking '3 hops' opens it. I wouldn't have guessed to click a count."

"Amounts in the CSV preview are plain numbers, no dollar signs -- fine for Excel. The first column
is the original id. Good, I can VLOOKUP that against the statement export."

**7. Wrap-up.**

"So: I found how they're connected -- three hops, in order, with amounts. That part took about two
minutes and it's cleaner than i2, where I'd build it by hand. I could not tell whether it weighted
by amount; it said amount and then said it ignored amount. And I never saw a date. Without dates I
still go back to the statement export and rebuild the timeline in Excel, which is what I was going
to do anyway."

## Single Ease Question

3 of 7. "The finding part was easy. The 'weighted by' part confused me and I'm not sure it worked,
and the dates part I didn't get at all on screen."

## Would she use it instead of her current tool?

"Not instead of Excel, no. Maybe instead of drawing the chart in i2 for the big cases -- the path
with amounts on each hop, arrows the right way, and the tie shown, that's a nice start for the
narrative. But I need the date on every transfer, on screen, next to the amount, before I'd put this
in a case file. And if I say 'weighted by amount' in a SAR I need the tool to say the same thing I
said, not 'unweighted' in grey next to it. Plus I'd need IT to tell me where the data goes before
I load real accounts."

## Workarounds she said she would use

- Open the CSV in Excel to find out whether the date column came along, and sort by it there.
- Rebuild the timeline of the path from the statement export by hand.
- Write "3 hops" and the amounts into the narrative herself; nothing on screen gives her a sentence
  she could paste.

## Problems observed

1. **No date on transfers anywhere on screen (severity 4).** The Edges table for a found path shows
   step, source, target, amount -- no date, though the March file has a timestamp on every transfer.
   The task asked for dates; she could not see them and could only hope the CSV "hidden ones
   included" line meant the date was in the file.
2. **"Weight: amount" and "unweighted" shown together (severity 3).** The path bar and the inspector's
   Weight row say "amount (unknown role)", while the header says "Found path (unweighted)" and "Paths
   ignore amount: hops were counted, not dollars". She could not tell whether her choice was used,
   and nothing shows how to make it used and re-run.
3. **"unknown role", "similarity: larger = closer", "1/w" (severity 3).** The meaning of a dollar
   amount is asked in distance-and-similarity terms. She understood only "a path prefers big
   transfers". "Applies to every result that reads amount" worried her that other work would change.
4. **The tied second route is one click away but not visible from the found path (severity 2).**
   "Ties: 1 of 2 as short" tells her there is another route; getting both into the table needs a
   click on a hop count in Sets and paths, which she would not have guessed.
5. **Export table as CSV sits behind the table's "..." in the transfers screen (severity 2).** In the
   transfers mock the table header shows only a magnifier and "..."; the labelled "Export table as
   CSV..." button appears on the table-dock page. She found it on the second try.
6. **Protein data on the first screen (severity 1, study artefact).** The two-selected inspector state
   is drawn on protein interactions and says "Undirected"; she had to pretend TP53 was an account,
   and for a moment believed direction could not be set.
7. **Hexagon density picture hides the accounts (severity 1).** She ignored the picture and read the
   table; not a blocker for this task.

## What went well

- "Paths between..." on a two-account selection is exactly where she looked.
- The path follows transfer direction, draws start and end, and the Edges table switches to the three
  transfers in path order with amounts -- her words: "That's the thing I actually wanted."
- The out-of-scope warning names the fix ("Set Scope to Full graph").
- "No directed path; one exists ignoring direction" -- honest, and she would not press Ignore
  direction for a flow of funds.
- The CSV dialog states the row count and shows the first lines before writing; original ids first.
