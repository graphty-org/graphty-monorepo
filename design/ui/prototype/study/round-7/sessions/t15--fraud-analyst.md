# Session: applying a colleague's saved colors and analysis steps -- Sarah, fraud analyst

Task as given: "A colleague in another team emailed you their team's colors and analysis steps,
saved from their own copy of graphty, with none of their data. Put them to use on the transfers
you have open, and make sure everything in them landed on something."

Mode: first impression, not mandated. Starting screen: shots/tasks/t15/01.png.
All commands run from design/ui/prototype. Renders are in tmp/round-7-sessions/t15--fraud-analyst/.

## Start (01.png from shots/tasks/t15)

"Transfers, March 2026. A big gray blob of 3,000 accounts, nothing colored. Fine. My colleague
sent me a file. In Excel I'd go File, Open. There's no File menu, but the name of the case at the
top has a little arrow, so that's probably it."

## Step 1 -- the case name menu

    timeout 120 node app-b/study.mjs --try .../01.png task:t15 --click "Transfers, March 2026"

"Rename, Save, Save as, Export, 'Apply recipe or style file...', Version history, Close project.
Recipe is a weird word for it, but 'style file' is the colors and I'd guess recipe is the
steps. That's the one. Found it in under a minute, good."

## Step 2 -- Apply recipe or style file...

    timeout 120 node app-b/study.mjs --try .../02.png task:t15 --click "Transfers, March 2026" --click "Apply recipe or style file..."

"Hang on, it didn't ask me which file. It just opened 'Mule ring triage,
mule-ring-triage.graphty, saved Mar 28'. OK, I suppose that's the one from the email, but in
real life I'd want to pick it from my downloads, and I'd want to know it didn't come from
somewhere else.

It says it brings styles, 1 set, 3 runs, and I supply a network with an account column. Then a
list: Watchlist, Personalized PageRank from Watchlist, Max flow Watchlist to merchants, Cycles up
to 4 transfers, riskScore, alertRule.

Two things bother me straight away.
- Watchlist, 19 accounts. The email said none of their data. Whose 19 accounts are these? If
  that's their watchlist of their customers, I shouldn't have it, and if it's 19 of mine,
  how did it pick them? It doesn't say.
- 'Personalized PageRank'. I don't know what that is. I'd skip it if I could, but there's no
  tick box to leave a row out.
Cycles up to 4 transfers I like -- that's round-tripping. Max flow to merchants, sort of,
if it tells me how much went where. 'merchants' -- defined how? My accounts say business or
personal, not merchant.

'4 of 4 matched by name and type.' Four of what? There are six rows. Let me see."

## Step 3 -- Show all

    timeout 120 node app-b/study.mjs --try .../03.png task:t15 --click "Transfers, March 2026" --click "Apply recipe or style file..." --click "Show all"

"Now it shows the column pairs: fee -> fee, time -> timestamp, riskScore -> riskScore,
alertRule -> alertRule. So the four are columns. time to timestamp, it guessed -- fine, that's
probably right, but I'd want to see a sample date before trusting it, because order is the
whole case.

Do I even have a riskScore and an alertRule column on these accounts? It says matched, so I
suppose so. The Watchlist line still says 19 accounts with no arrow, and PageRank says 'Weight:
loaded weight', no arrow either. Did those match or not? 'Loaded weight' means nothing to me.
Is that amount? The button says Hide matched but nothing got hidden, so I can't tell which rows
are the matched ones and which aren't.

Bottom line it says 'Adds 6 rows on top of the tree, one undo step'. One undo step is good.
Apply."

## Step 4 -- Apply

    timeout 120 node app-b/study.mjs --try .../04.png task:t15 --click "Transfers, March 2026" --click "Apply recipe or style file..." --click "Show all" --click "Apply"

"Toast: 'Mule ring triage added 6 rows on top of the tree. Undo.' And... nothing. The panel on
the left still says Selection, Notes, Everything. The chart is still gray. The label up top
still says 'Nothing is colored or sized by a row'. So where are my six rows? Where's the
watchlist outline, the cycle edges, the risk colors?"

## Step 5 -- Style tab on the right

    timeout 120 node app-b/study.mjs --try .../05.png task:t15 --click "Transfers, March 2026" --click "Apply recipe or style file..." --click "Apply" --click "Style"

"Background, print-safe colors, layout 'Spread Out', seed 7. Nothing from the recipe here
either."

## Step 6 and 7 -- Views, then the table

    timeout 120 node app-b/study.mjs --try .../06.png task:t15 --click "Transfers, March 2026" --click "Apply recipe or style file..." --click "Apply" --click "Views"
    timeout 120 node app-b/study.mjs --try .../07.png task:t15 --click "Transfers, March 2026" --click "Apply recipe or style file..." --click "Apply" --click "Table"

"Views: 'No saved views.' Table: accounts with links in, links out, kind, country. No riskScore
column visible, no watchlist flag, nothing new that I can see. Columns 10 of 12 -- maybe two are
hidden, but I'm not going hunting."

## Step 8 -- try clicking the rows it said it added

    timeout 120 node app-b/study.mjs --try .../08.png task:t15 --click "Transfers, March 2026" --click "Apply recipe or style file..." --click "Apply" --click "Watchlist"
    -> nothing on screen is called "Watchlist"
    timeout 120 node app-b/study.mjs --try .../09.png task:t15 --click "Transfers, March 2026" --click "Apply recipe or style file..." --click "Cycles up to 4 transfers"

"There is no Watchlist anywhere after applying. And in the dialog the rows don't do anything
when you click them -- I wanted to see what the cycles row's little comment bubble with a 1
said, and what the 19 accounts were.

I'm stopping. It told me it added six things and I can't find one of them. That's worse than an
error message. If I can't see what it did, I can't write it in the case file."

## Wrap-up

Did I succeed? No. I applied it -- I think -- but the task was to make sure everything landed
on something, and I can't. The preview before applying was the only place I could check
anything, and even there I couldn't tell which of the six rows were matched and which weren't,
and the watchlist and the PageRank weight had no mapping shown. After applying, nothing on the
screen changed except a toast.

Single Ease Question: 3 out of 7. Finding the command was easy. Knowing what happened was not.

Would I use this instead of my current tool? Not for this. Reusing another team's setup is
exactly the kind of thing that sounds like it saves an afternoon, but only if I can see, row by
row, what it hooked onto in my data, and leave out the bits I don't trust. Today I'd ask my
colleague for the thresholds and the column names in an email and rebuild it in a pivot, and at
least I'd know what I built.

## What went wrong, in her words

- "It said it added six rows and I can't find any of them." After Apply, the left panel, the
  chart and the 'Nothing is colored' label were unchanged; nothing called Watchlist existed.
- "Whose 19 accounts?" The Watchlist row says 19 accounts in a file that supposedly has none of
  the sender's data; nothing explains whether those are the sender's accounts or a rule run on
  mine.
- "Four of four what? There are six rows." The match count counts columns, the list shows rows;
  'Show all' / 'Hide matched' didn't visibly change which rows were shown.
- "Loaded weight -- is that amount?" Two rows show no source-to-mine mapping at all.
- "It never asked me which file." No file picker; the recipe was already chosen.
- "Can't leave PageRank out." No way to untick a step I don't understand.
- "What's the 1 on the cycles row?" The dialog rows can't be opened.

## What worked

- The case-name menu was the first place I looked, and 'Apply recipe or style file...' was there.
- The preview before applying, with column pairs like time -> timestamp, is the right idea.
- 'One undo step' and an Undo on the toast.
