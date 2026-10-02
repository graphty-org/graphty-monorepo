# Session: wide host data, applying a colleague's colors and analysis steps -- Tom (recipe recipient)

Task as given: "A colleague sent the colors and analysis steps their team uses on host data,
without their data. Two of the things they expect to find about each host are called differently
in your hosts. Put them to use on your hosts so that nothing in them is silently skipped."

All commands run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t15-wide--recipe-recipient/.

## Step 1 -- the start screen (shots/tasks/t15-wide/01.png)

"OK. 'IT estate, March 2026'. Gray dots, lots of lines. A note says 'Nothing is colored or sized
by a row', so no colors yet, fine, that's what the colleague's file is for. 300 nodes. Top says
'Local only' -- good, I'll take that to mean my data stays on this laptop, though I'd still want
IT to tell me so. Now, where do I put the file they sent? There's no big 'open the file' button.
I'll try the menu in the corner, that's usually File."

## Step 2 -- the menu

    timeout 120 node app-b/study.mjs --try .../02.png task:t15-wide --hover "Menu"
    timeout 120 node app-b/study.mjs --try .../03.png task:t15-wide --click "Menu"

"New project, Open..., Open recent, Select where, Settings, Help. 'Open...' is what I'd use. I'm
not touching Settings."

## Step 3 -- Open...

    timeout 120 node app-b/study.mjs --try .../04.png task:t15-wide --click "Menu" --click "Open..."

"'Choose a file': transfers-2026-04.csv, mule-ring-triage.graphty, risk-review-look.json. None of
these says 'hosts'. The colleague sent colors -- 'look' sounds like colors. Transfers and mule
ring sound like somebody else's work. I'll take risk-review-look.json."

## Step 4 -- risk-review-look.json

    timeout 120 node app-b/study.mjs --try .../05.png task:t15-wide --click "Menu" --click "Open..." --click "risk-review-look.json"

"Hang on. A box: 'Apply style file: Risk review look', saved by Dana Reyes. 'Expects: a transfer
network of accounts'. That's not hosts. And behind the box the title has changed to 'Transfers,
March 2026', 3,000 nodes. Where did my hosts go? I didn't ask to open somebody's transfers. There's
an 'alertRule' row with 'Choose an attribute' and 'Leave unbound' -- I don't know what 'unbound'
means and I'm not choosing anything on a file that isn't for my data. Wrong file. Cancel."

## Step 5 -- Cancel

    timeout 120 node app-b/study.mjs --try .../06.png task:t15-wide --click "Menu" --click "Open..." --click "risk-review-look.json" --click "Cancel"

"Now it's 'Les Miserables'?? Orange circles with names, PageRank, Louvain, Shortest paths. I
pressed Cancel. I expected to be back on my hosts. Instead I'm in a third thing I never opened.
Did I just lose my IT estate? This is exactly the 'I only wanted to look' problem."

## Step 6 -- maybe it's under Open recent

    timeout 120 node app-b/study.mjs --try .../07.png task:t15-wide --click "Menu" --click "Open recent"

"Mule ring review, Knockdown screen, March transfers, Patent citations. Nothing from the colleague,
nothing about hosts. That's not it either."

## Step 7 -- second try: Views

    timeout 120 node app-b/study.mjs --try .../08.png task:t15-wide --click "Views"

"A colleague's 'way of looking at it' -- maybe that's a View. 'No saved views. Save view (+)'.
Empty. So it isn't here."

## Where I stopped

"That's two goes. The only file that looked like colors was for transfers, not hosts, it swapped
my whole screen for somebody else's project, and Cancel put me in a third one. And I never saw
anything with the colleague's name on it, or anything about the two things being 'called
differently'. I'd email them and ask for a picture and a spreadsheet of what each color means.
I'm not spending the afternoon on this."

## Afterwards

- Did I succeed? No. I never found the colleague's file for host data, so nothing got applied,
  and I never got as far as the two things that are named differently.
- Single Ease Question (1 = very difficult, 7 = very easy): 2.
- Would I use this instead of what I use now? Not on this showing. With the PNG and a
  spreadsheet I at least know what I'm looking at. Here the one file that looked like colors was
  for a different kind of data, it changed my whole screen to another project, and Cancel took me
  somewhere else again, so I couldn't trust that I hadn't wrecked my own data. The 'Local only'
  label at the top was the one thing I liked.
