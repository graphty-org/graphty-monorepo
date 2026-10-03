# Session: get a sample onto the screen -- supply chain risk analyst (Dana Okafor)

Task as given by the moderator: "You have just installed this program to see whether it could
help with your work, but your own data is not ready yet. Before you spend time on your own file,
you would like to see the program working on something. Get something onto the screen to try it
on, and tell us what it is."

Start screen: shots/tasks/r8-t02/01.png. All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t02--supply-chain-analyst/.

## Step 0 -- the start screen (01.png from the moderator)

Think-aloud: "OK. Start, Recent projects, Samples. Good, there are samples, I don't have to hunt.
First thing though, there's a box at the bottom asking to collect usage data. 'Your data is
yours, but please help us.' No. Supplier lists are under NDA; I am not explaining to IT why a tool
I installed is phoning home. I like that it says 'Files are read on this computer and never
uploaded' and 'Local only' up top -- that's the first thing IT will ask. I'll say no thanks."

Command:

    timeout 120 node app-b/study.mjs --try .../r8-t02--supply-chain-analyst/01.png task:r8-t02 --click "No thanks"

## Step 1 -- banner gone (01.png)

Saw: the banner is replaced by a small black strip, "Usage data stays off. Settings".

Think-aloud: "Good, it took no for an answer and told me so in one line. Now, samples. Les
Miserables -- that's a novel. Karate club. Proteins. None of these are supply chain. Nothing with
suppliers or parts or shipments. The closest thing to my world is 'Card and transfer transactions
-- a month of money moving between accounts, good for following money.' Money moving between
accounts is at least a flow between companies, like parts moving between suppliers. 3,000
accounts is about my scale too. The IT estate one says 'wide tables, 69 columns', which actually
sounds like my ERP export, but hosts and servers mean nothing to me. I'll take the money one."

Command:

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t02 --click "No thanks" --click "Card and transfer transactions"

## Step 2 -- something opened, but not what I clicked (02.png)

Saw: a full working screen. Top left says "Les Miserables". A network of orange dots with names
like Valjean, Javert, Cosette, Marius. A legend "Color: PageRank 0.00330 to 0.0754". Left list
with PageRank, Louvain, Shortest paths, Density, Link prediction, "Top 9 by de...", Watchlist,
"For the report". Right panel about PageRank paint.

Think-aloud: "Wait. I clicked the transactions one and I got Les Miserables. Did I click the wrong
thing? The title at the top definitely says Les Miserables, and those are character names. Let me
go back and click it again, maybe I hit the line above."

Command (clicked the description text of the transactions sample instead of its name):

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t02 --click "No thanks" --click "A month of money moving between accounts. Good for following money, finding rings and comparing months."

## Step 3 -- same thing again (03.png)

Saw: identical to step 2. Les Miserables again.

Think-aloud: "Same. So whatever sample I pick, I get Les Miserables. Either the other samples
aren't there yet or it's broken. That's not great -- if it opens a different file from the one I
clicked, what does it do with my file? I'm not going to fight it, though. The task is to get
something on screen, and something is on screen. Let me at least see if there's a table, because
that's where I'd actually check the numbers."

Think-aloud on the screen itself: "Lots of words I don't know. PageRank -- I know that's Google.
Louvain? No idea. Link prediction, density -- that's for a statistician. The left list is
crammed and half the names are cut off: 'Labels show...', 'Top 9 by de...', 'Valjean t...'. The
grey text is small; on my laptop I'd be squinting. There's a 'Table' at the bottom. That I
understand."

Command:

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t02 --click "No thanks" --click "Card and transfer transactions" --click "Table"

(The tool reported that "Table" matched two controls and it clicked the first.)

## Step 4 -- the table (04.png)

Saw: a table slides up under the picture. "77 nodes, sorted by degree". A line: "Valjean is first
on all three measures; Gavroche is in the top 3 on all three." Columns: label, Notes, group,
Degree (full graph), Rank by degree, PageRank, Rank by PageRank. Valjean 36, #1 of 77; Gavroche
22; Marius 19; Javert 17.

Think-aloud: "OK, this I can read. 77 rows, ranked, with a sentence on top that says who matters
and why. That's actually the thing I'd want for a supplier list -- 'this one is first on every
measure'. I don't know what 'degree' is, but '#1 of 77' I understand, and it looks like it means
how many others each one is connected to. Valjean has 36 connections. If those were suppliers
that would be my chokepoint list. I'll stop here; I've seen it working."

## Answer to the moderator

"What's on screen is the Les Miserables sample: 77 characters from the novel, linked when they
appear in the same chapter, drawn as a network and colored by some importance score, with a
ranked table underneath -- Valjean on top. I did NOT pick that one. I picked the card and
transfer transactions sample because it's the nearest thing to money or goods moving between
companies, and twice it opened Les Miserables instead."

## Debrief

- Did I succeed? Yes, in the sense that I got a working example on screen and can say what it is.
  No, in the sense that I didn't get the example I chose, and nothing told me why.
- Single Ease Question: 5 of 7. Getting something on screen was one click and the samples were
  right there on the first page. I take two points off because the sample I clicked silently
  turned into a different one, and because the screen that opened is full of terms I don't know
  (PageRank, Louvain, link prediction) and labels cut off mid-word.
- Would I use this instead of my current tool? Not yet, and not on this evidence. What I liked:
  "local only" and "files are never uploaded" on the first screen, which is my IT answer; it
  took "no" on usage data without a fight; and the ranked table with a one-line summary on top is
  exactly the shape of thing I take to the Thursday meeting. What stops me: there is no sample
  that looks like a supply chain, so I still don't know if it will understand suppliers, sites and
  parts; it opened the wrong file when I clicked; and I didn't see anything about Power BI or
  exporting the table. Excel and our risk platform still win until I see it on my own supplier
  export.

## Observations the session surfaced

1. Choosing "Card and transfer transactions" (by name, and again by its description) opened Les
   Miserables both times, with no message. The participant read this as "it opens a different
   file from the one I clicked" and it lowered trust in what the app would do with her own file.
2. No sample resembles business data (suppliers, orders, shipments). The participant picked by
   analogy ("money moving between accounts") and said the IT estate's "wide tables" description
   matched her ERP export better than its subject did.
3. The usage-data banner was declined at once; its "please help us" framing raised the data
   leaving the building question before anything else. The "Local only" and "never uploaded"
   lines were the first things she valued.
4. The opened sample's left list uses unexplained method names (PageRank, Louvain, Link
   prediction, Density) and truncates several rows ("Labels show...", "Top 9 by de...",
   "Valjean t..."); she skipped all of it and went to the Table.
5. The ranked table with its one-line summary ("Valjean is first on all three measures") was the
   one thing she would carry over to her own work.
