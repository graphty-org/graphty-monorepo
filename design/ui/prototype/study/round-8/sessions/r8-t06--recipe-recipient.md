# Session: open the Les Miserables sample and say what it holds -- Tom, the recipe recipient

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Get it on screen and work out what you have: how many characters there are, how many
connections between them, whether every character can be reached from every other, and what facts
are recorded about each character."

All commands were run from
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype.
Renders are in tmp/round-8-sessions/r8-t06--recipe-recipient/.

## Step 1 -- the start screen (shots/tasks/r8-t06/01.png)

Think-aloud: "OK. No sign-in, nothing to install, it's a web page. Good. There's a box along the
bottom about usage data. 'We will never see the data you analyze.' Fine, but I'm not sharing
anything until I've asked IT, so: No thanks. On the right, 'Samples', and the first one is Les
Miserables, '77 characters'. So that's one answer already, if it's true. 'Opens with worked
examples: measures, groups, paths and notes already added.' Hm. So it won't be the plain thing.
I'll click the name."

## Step 2 -- dismiss the banner and open the sample (02.png)

    timeout 120 node app-b/study.mjs --try .../r8-t06--recipe-recipient/02.png task:r8-t06 --click "No thanks" --click "Les Miserables"

Think-aloud: "There's the picture. Dots and lines, orange to brown, a few names: Valjean, Javert,
Cosette. Fine. Now the left side is a long list: Selection, Notes, Labels, PageRank, Louvain,
Shortest paths, Density, Link prediction, Top 9 by de-something, Watchlist, For the report... I
don't know what half of these are and I'm not learning PageRank at 4 pm. Is this someone else's
work already? The right side says 'Paints 77 nodes'. 77 again, so that matches the sample card.
But nowhere here tells me how many connections, or whether they're all joined up. The bottom says
'Table', 'Nodes', 'Edges'. On the far left there's a 'Data' button with a word under it. I want the
data, so I'll try that before the table."

## Step 3 -- the Data section (03.png)

    timeout 120 node app-b/study.mjs --try .../r8-t06--recipe-recipient/03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"

(The tool noted two controls are called "Data", a left-side button and a tab on the right; the
left button was clicked, which is the one I meant.)

Think-aloud: "Now this is better. Top left: 'miserables.gexf, 77 nodes, 254 edges'. And on the
right a 'Summary' with numbers I can read: Nodes 77, Edges 254 'each a distinct pair', Undirected,
Density, 'Connected components 1', Average degree 6.60, Highest degree 36. So 77 characters, 254
connections. It says nodes and edges, the sample card said characters; I'll take it that a node
is a character.

'Connected components 1.' I think that means it's all one piece, nobody off on their own. That's
what the moderator asked. It doesn't actually say 'everyone can reach everyone', though; I'm
reading that into it. I'd probably ask her about this bit.

What's recorded about each one: 'Attributes', 'Nodes', 'In use (2)': label and group. Then 'Other
attributes': betweenness and degree, with a little stacked icon I don't understand. Then
'Results': Louvain and PageRank. Is betweenness something that was in the file, or something the
program worked out? Degree sounds worked out. I can't tell which of these came with the file."

## Step 4 -- open the table to look at the actual facts (04.png)

    timeout 120 node app-b/study.mjs --try .../r8-t06--recipe-recipient/04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "Table"

Think-aloud: "A table, like Excel. '77 nodes', 'Rows 1 to 77 of 77'. Good, the count agrees with
itself, three times now. Columns: label, Notes, group, Degree (full graph), Rank by degree,
PageRank, Rank by Page... and it runs off the side. 'Columns: 9 of 9'. So label is the name,
group is a number with a colored square. Valjean is degree 36, which matches 'Highest degree 36'
on the right. That's reassuring. But the table is mixing what the file says with rankings the
program made up. I'd want to know which columns the person who made the file actually wrote down."

## Step 5 -- try to find out what "Connected components 1" means (05.png)

    timeout 120 node app-b/study.mjs --try .../r8-t06--recipe-recipient/05.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "Connected components"

Think-aloud: "I clicked the '1' to see what it is. The left side flipped back to that long list,
and every row in the table went blue. I suppose that's it telling me the one piece is all 77 of
them? It didn't say so in words. I'll go with 'yes, everyone is connected'. That's enough; I'm
stopping here."

## My answers

- Characters: 77.
- Connections: 254 (it says each is a distinct pair and they have no direction).
- Can everyone reach everyone: I think yes -- it says one connected component, and clicking it
  lit up all the rows. I'm fairly, not fully, sure that's what it means.
- Facts per character: a name (label) and a group number. Degree and betweenness are also listed,
  but I can't tell whether they came in the file or were worked out by the program. PageRank and
  Louvain are listed as "Results", so those I take to be the program's.

## After the task

Did I succeed? Mostly. The counts I'm sure of; the "reached from every other" answer is my reading
of a term I don't really use; the "what's recorded" answer has a gap about which columns came with
the file.

Single Ease Question (1-7): 5. Once I found the Data button the numbers were right there and they
agreed with each other. Getting there meant walking past a long list of things I don't understand,
and "connected components" is not English to me.

Would I use this instead of my current tool? For this, maybe. Nothing to install, it says "Local
only" and that files are never uploaded, and the counts were in one place. But the sample opened
full of someone else's extras (paths, watchlists, "for the report"), and I spent the first minute
wondering whether I was supposed to understand them. If she sent me the file and a PNG, I'd still
look at the PNG first.
