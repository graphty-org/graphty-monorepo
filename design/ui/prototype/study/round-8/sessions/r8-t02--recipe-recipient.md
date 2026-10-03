# Session: try the program on a sample before using your own data -- the recipe recipient (Tom)

Task as given: "You have just installed this program to see whether it could help with your work,
but your own data is not ready yet. Before you spend time on your own file, you would like to see
the program working on something. Get something onto the screen to try it on, and tell us what it is."

Participant: Tom, a lab manager in a cell biology lab. He opens files colleagues send him and never
builds networks himself.

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t02--recipe-recipient/.

## Step 1 -- start screen (shots/tasks/r8-t02/01.png)

Think-aloud: "OK. 'Start', 'Recent projects', 'Samples'. Samples, that's what I want, something
already in there. Good, there's a line on the left that says files are read on this computer and
never uploaded, and 'Local only' at the top. I like that. There's a box across the bottom asking me
to share usage data. No. 'No thanks'. Samples: Les Miserables, a karate club, protein interactions,
card transactions... Protein interactions is the only one that's anything like what we do. 300
proteins, hubs and paths. I'll take that one."

## Step 2 -- open the protein sample

    timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t02--recipe-recipient/02.png task:r8-t02 --click "No thanks" --click "Protein interactions"

Result (02.png): a network opened, but the title at the top left says "Les Miserables" and the
labels on the dots are Fantine, Valjean, Javert, Cosette, Marius. A left list with "PageRank",
"Louvain", "Shortest paths", "Link prediction", "Density", "Betweenness", "Watchlist", "For the
report". A box on the picture says "Color: PageRank 0.00330 to 0.0754". A right panel about
"Paints 77 nodes".

Think-aloud: "Hang on. I clicked protein interactions. That's not proteins, those are names from
the novel. Did it open the wrong one, or did I click the wrong thing? Maybe I hit the line above
it. Let me try again."

## Step 3 -- second try, clicking the protein sample's count instead

    timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t02--recipe-recipient/03.png task:r8-t02 --click "No thanks" --click "300 proteins"

Result (03.png): identical to 02.png. Les Miserables again.

Think-aloud: "Same thing. So it's not me. Whatever I pick, I get Les Miserables. Fine, that's
something on the screen, but it isn't what it said it would be. If it does that with a sample, what
does it do with my file?

And this isn't a fresh 'here's a network' either. It's someone's finished work: PageRank, Louvain,
link prediction, a watchlist, a folder 'For the report', 'Show rows removed from list'. I don't
know what Louvain or PageRank is and I'm not learning it today. The dots are all orange-ish; the
key says 'PageRank 0.00330 to 0.0754' -- what is that in English? The darker ones matter more, I
suppose. At least it's not red and green.

I'm stopping here. Two tries, same wrong result."

## What Tom says is on the screen

"It's the Les Miserables one: characters from the novel, joined when they're in the same chapter,
with Valjean in the middle. It's colored by something called PageRank. It's not the protein one I
asked for."

## Outcome

- Succeeded? "Partly. I got something on the screen and I can tell you what it is, but it's not
  the one I chose. I asked for proteins twice and got a novel twice."
- Single Ease Question (1-7): 3. "Finding the samples was easy; that part I'd give a 6. But
  it gave me the wrong one, and then a screen full of words I don't know."
- Would he use it instead of his current tool? "Not yet. I liked that it said nothing gets uploaded
  and I didn't have to install anything; that's better than Cytoscape and IT tickets. But if I pick
  proteins and get Les Miserables, I don't trust it with our gene list. I'd ask her to just send me
  a PNG and the Excel file."

## Problems observed

1. Clicking the "Protein interactions" sample (by its name, then by "300 proteins") opened Les
   Miserables both times. Either every sample opens the same project, or the sample row's click
   target is wrong. For a skeptical first-time user this reads as the tool being broken.
2. A sample opens as a finished, dense analysis (PageRank, Louvain, Shortest paths, Link
   prediction, Density, Betweenness, Watchlist, a report folder, "1 row not listed still paints",
   "Show rows removed from list") rather than a plain network to look at. Tom cannot tell what is
   the data and what is someone's work on it.
3. The legend gives "PageRank 0.00330 to 0.0754": an algorithm name and raw decimals, with nothing
   in plain words about what darker means.
4. The usage-data box covers the bottom of the start screen until it is answered; Tom answered it
   first (No thanks) before doing anything else.

## What worked

- The Samples column with a one-line plain description and a size for each sample was found
  immediately.
- "Files are read on this computer and never uploaded" and "Local only" were read and trusted.
- Nothing to install or sign in to.
