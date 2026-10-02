# Session: first day at work, privacy first, then the Les Miserables sample

Participant: Morgan Reyes (screen-reader analyst; NVDA, keyboard only, works from text and tables).

Task as given by the moderator: "This is your first time opening graphty at work. Your IT policy says
nothing about your work may leave your computer. Decide what you are comfortable with, then start on
the sample of characters. The data on screen is a sample: characters of the novel Les Miserables,
linked when they appear in the same chapter."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t27--screen-reader-analyst/`. Each run replays from the start screen.

## Step 0 -- the start screen (shots/tasks/t27/01.png)

Think-aloud: "Page title says graphty. Headings: Start, Recent projects, Samples. Fine, the parts have
names. 'Open project or file', 'New from data'. Then a line: 'Files are read on this computer and
never uploaded.' Good, that is the first thing I ask, and it is here before I ask it. Top right,
'Local only'. And at the bottom a banner: 'Your data is yours, but please help us.' It wants usage
data. 'We will never see the data you analyze' -- I have heard that sentence before. There is a
'What is collected' disclosure. Opening it before I answer anything."

## Step 1 -- what is collected

    timeout 120 node app-b/study.mjs --try .../01.png task:t27 --click "What is collected"

Think-aloud: "Four bullets. 'A replay of each session, with every node name, attribute value, label
and file content masked.' A replay of my session. Masked or not, that is a recording of my work
leaving the building. 'Anonymous task events with their timings.' 'Errors and performance.' The
last line is in bold: 'No file contents ever leave your computer.' Bold does not reach me; it is
just another line. Policy says nothing about my work leaves. A session replay is my work. No."

Credit: it says 'Nothing is collected until you answer.' That is the right default, and the list is
short and concrete. I could forward it to IT.

## Step 2 -- No thanks

    timeout 120 node app-b/study.mjs --try .../02.png task:t27 --click "What is collected" --click "No thanks"

Think-aloud: "Toast: 'Usage data stays off.' With a 'Settings' button in it. Short, important word
first-ish. I hope that toast is not the only place this lives, because it is gone by the time I hear
the next thing." (It is also in Settings, see below, so it is not lost. Good.)

## Step 3 -- what does 'Local only' mean?

    timeout 120 node app-b/study.mjs --try .../03.png task:t27 --click "No thanks" --click "Local only"

Think-aloud: "I pressed 'Local only' expecting it to tell me what local means. It did -- a Settings
dialog, Privacy page. But behind the dialog the whole page changed: I am now inside a project
called Les Miserables. I did not open a project. A screen that changes under me when I press
something else is exactly what I hate. I will note it and move on.

Privacy page. 'Share usage data', a switch, off. Then a section 'Where your data goes', described
as 'a plain statement you can forward to whoever asks.' That is the right idea. Files you open:
read on this computer, never uploaded. Usage data: off, nothing is sent. Then: 'The Assistant:
only when you ask it something, it sends your question with node names and statistics to
Anthropic. Never the file.' Node names. For me node names are clinic and provider names. That is
patient-adjacent. That is out. 'Data sources: a source you connect receives only the request.' Fine.
And a paragraph called 'What this does not promise', which says a browser extension or anyone at
this computer can read what is in the browser, keys included. I respect that more than I respect
'WCAG compliant'. This page is the best thing so far."

## Step 4 -- the Assistant settings

    timeout 120 node app-b/study.mjs --try .../04.png task:t27 --click "No thanks" --click "Local only" --click "Assistant"

Think-aloud: "Provider: Anthropic. Model: listed from Anthropic. Key: a password field that is
already filled. On my first day. Whose key is that? Remember keys on this device: on. I want the
Assistant off. I am looking for a switch that says off. There is not one."

## Step 5 -- accessibility settings, while I am here

    timeout 120 node app-b/study.mjs --try .../05.png task:t27 --click "No thanks" --click "Local only" --click "Accessibility and input"

Think-aloud: "Reduced motion, single-key shortcuts with a reason given (speech input), override
selection highlight, pin a node when I drag it. Single-key shortcuts being switchable is a good
sign; someone thought about it. There is a 'Keyboard shortcuts' link. I will come back to it.
No 'accessibility mode'. Good. I would not have pressed it."

## Steps 6-8 -- trying to choose a provider that stays on this computer

    timeout 120 node app-b/study.mjs --try .../06.png task:t27 ... --click "Assistant" --click "Anthropic"
    -> nothing on screen is called "Anthropic"
    timeout 120 node app-b/study.mjs --try .../07.png task:t27 ... --click "Assistant" --click "Provider"
    timeout 120 node app-b/study.mjs --try .../08.png task:t27 ... --click "Provider" --click "In this browser"
    -> nothing on screen is called "In this browser"

Think-aloud: "The combo box answers to 'Provider', not to what it shows. Fine, that is normal. It
opens: OpenAI, Anthropic, Google, 'In this browser'. 'In this browser' -- that sounds like what I
want, a model that never leaves the machine. I go to choose it and it is not there to choose. The
list showed it, I could not pick it. That is a dead end, and the worst kind: the one option that
matches my policy is the one I cannot reach. And there is still no 'off'."

## Steps 9-10 -- forget the key instead

    timeout 120 node app-b/study.mjs --try .../09.png task:t27 --click "No thanks" --click "Local only" --click "Assistant" --click "Forget all keys"
    timeout 120 node app-b/study.mjs --try .../10.png task:t27 ... --click "Forget all keys" --click "Forget"

Think-aloud: "Confirm dialog: 'Every provider's key is removed from this browser, and the Assistant
stops until you paste a key again.' Clear. Forget. Toast: 'All keys forgotten'. The key field now
says 'Paste your Anthropic key'. So the Assistant cannot send anything because it has no key. That
is 'off' by accident, not off by choice. If a colleague pastes a key on this laptop next week, it
is on again and nothing tells me. I still left 'Remember keys on this device' on; I did not notice
it until later, which tells you how buried it is."

## Step 11 -- close Settings, the project

    timeout 120 node app-b/study.mjs --try .../11.png task:t27 ... --click "Forget" --key Escape

Think-aloud: "Escape closes it. The panel on the right now talks about PageRank instead of the
graph summary I saw behind the dialog. Something moved without me. Before the dialog, behind it,
there was a Summary: Nodes 77, Edges 254, Direction undirected, Density 0.0868, Connected
components 1, Average degree 6.6, Highest degree 36. That is exactly what I ask for in minute two,
and it was there without running anything. But this sample is not empty: the left list already has
PageRank, Louvain, Shortest paths, a Watchlist, 'For the report', four notes. Someone has already
done the work. For a first look I would rather hear the summary first, not a pile of somebody's
layers."

## Step 12 -- the table

    timeout 120 node app-b/study.mjs --try .../12.png task:t27 ... --key Escape --click "Table"

Think-aloud: "Table opens. '77 nodes.' Then a sentence: 'Valjean is first on all three measures;
Gavroche is in the top 3 on all three.' A one-line summary over a table. That is what I keep asking
for. Columns: label, group, Degree (full graph), PageRank (full graph), Rank by PageRank,
Betweenness (full graph). Sorted by degree, descending. Valjean 36, 0.0754, rank 1, betweenness
0.570. NetworkX gives me about 0.570 for Valjean with normalization on. So the numbers agree with
mine."

## Step 13-14 -- what is that betweenness?

    timeout 120 node app-b/study.mjs --try .../13.png task:t27 ... --click "Table" --click "Valjean"
    timeout 120 node app-b/study.mjs --try .../14.png task:t27 ... --click "Table" --hover "Betweenness (full graph)"

Think-aloud: "Header tooltip: 'Number, Exact, every node a source, on all 77 nodes.' Exact, good.
It does not say normalized. The number matches the normalized one, so I can infer it -- but I
should not have to infer it. One word, 'normalized', would have saved me a check.

Selecting Valjean: the right panel says 'Valjean, Node', 'Why this look' with a list of layers
and what each paints. A small floating label 'Valjean, 36 connections'. And a row of five icon
buttons I have no names for yet."

## Step 15 -- the Data tab, which is not the Data tab

    timeout 120 node app-b/study.mjs --try .../15.png task:t27 ... --click "Valjean" --click "Data"

Think-aloud: "I wanted Valjean's data. I said 'Data'. I got the Data section of the app instead --
Sources, Filters, Attributes -- and my Valjean is gone from the right panel. There are two things
called Data and they sound identical. I am not going to guess which one I will get next time."

## Steps 16-18 -- finding 'who is next to Valjean'

    timeout 120 node app-b/study.mjs --try .../16.png ... --click "Valjean" --click "Neighbors"
    -> nothing on screen is called "Neighbors"
    timeout 120 node app-b/study.mjs --try .../17.png ... --click "Valjean" --key Tab
    timeout 120 node app-b/study.mjs --try .../18.png ... --click "Valjean" --hover "Select neighbors"
    -> nothing on screen is called "Select neighbors"
    ... --hover "Expand"
    -> nothing on screen is called "Expand"
    ... --hover "Neighborhood"

Think-aloud: "Tab did nothing I could hear. Guessing names. 'Neighbors', no. 'Select neighbors', no.
'Expand', no. 'Neighborhood' -- yes, that is the first icon. Three guesses to find a word. It does
have a name, at least; it is not 'button'."

## Step 19 -- Neighborhood

    timeout 120 node app-b/study.mjs --try .../19.png ... --click "Valjean" --click "Neighborhood"

Think-aloud: "A panel: 'Neighborhood of Valjean.' Hops 1, 2, 3. Direction: undirected graph -- it
said which, good. 'Selected: Valjean and his 36 neighbors.' Count in words. Two buttons: 'Add as
steps', 'Filter to neighbors'. But the table I had open has closed under me. And the Selection row
on the left still says 1, while the panel says Valjean and 36 neighbors. Which is it? I do not
have the 36 names anywhere I can read."

## Step 20 -- Filter to neighbors

    timeout 120 node app-b/study.mjs --try .../20.png ... --click "Neighborhood" --click "Filter to neighbors"

Think-aloud: "Toast: 'Added filter step: Neighbors of Valjean, 1 hop', with Undo. The top bar now
says '37 of 77 nodes'. The table is back, and it says '77 nodes'. Thirty-seven at the top, seventy-
seven in the table. One of these is wrong, or they mean different things, and nothing tells me
which. I want the table to be the 37."

## Steps 21-22 -- trying to get back

    timeout 120 node app-b/study.mjs --try .../21.png ... --click "Filter to neighbors" --click "37 of 77 nodes"
    timeout 120 node app-b/study.mjs --try .../22.png ... --click "37 of 77 nodes" --click "Undo"

Think-aloud: "I press '37 of 77 nodes' to see my filter. Now the project is called 'Transfers, March
2026'. Three thousand accounts. A file called accounts-2026-03.csv. These are not my characters. I
did not open this. I press Undo: 'Nothing to undo.' So I cannot undo my way back, and I do not know
how I got here.

That is my two dead ends in a row: the provider I could not pick, and now this. Actually three,
counting the jump into a project when I pressed 'Local only'. I stop here. In real life I would
reload the page and hope."

## Outcome

- Did I succeed? Half. The privacy part: yes, mostly. Usage data is off and I understood what it
  would have sent. The Assistant cannot send anything because I deleted the key, but I did not
  find a way to switch it off, and the local option I wanted was listed and not selectable.
  Starting on the characters: I got the summary and the table and they were good, and then I lost
  the sample entirely and could not get back.
- Single Ease Question: 3 out of 7.
- Would I use this instead of my NetworkX scripts? Not yet. The privacy statement and the table
  with its one-line summary are better than anything Gephi gave me, and the numbers matched mine.
  But a tool that moves me to a different dataset when I press a filter chip, and says 'nothing to
  undo' afterwards, is a tool where I cannot get back to where I was. That is one of my two
  first-five-minutes questions, and it failed. I would use it for a quick look at someone else's
  sample, with a sighted colleague nearby. That is the thing I came here to stop needing.

## What I would take away (problems, in my order)

1. Pressing '37 of 77 nodes' put me in a different project (Transfers, March 2026), and Undo said
   there was nothing to undo. Lost, no way back.
2. Pressing 'Local only' on the start screen opened a project behind the Settings dialog without
   being asked.
3. The Assistant provider 'In this browser' was listed but could not be chosen; there is no plain
   'off' for the Assistant. Forgetting the key is the only route, and it lasts only until someone
   pastes one.
4. A key was already filled in on a first run.
5. After filtering, the top bar says 37 of 77 and the table says 77 nodes.
6. Neighborhood says Valjean and 36 neighbors are selected; the Selection row still says 1; the
   36 names are not anywhere I could read them.
7. Two things called 'Data' (the app section and the inspector tab); pressing one when I meant the
   other dropped my selected node from view.
8. Betweenness header does not say it is normalized (the value matches NetworkX normalized).
9. The selection toolbar's buttons have names, but I had to guess three times to find 'Neighborhood'.
10. Opening the table closed and reopened around the Neighborhood panel; panels on the right
    changed subject (graph summary to PageRank) when I closed a dialog.

## What worked

- 'Files are read on this computer and never uploaded' on the start screen, before I asked.
- 'Nothing is collected until you answer' and a short, concrete 'What is collected' list.
- The Privacy page's 'Where your data goes' table, written to be forwarded, including what it
  does not promise.
- The graph Summary: nodes, edges, direction, density, components, degrees, without running
  anything.
- The table's one-line finding above the rows, and column names that say 'full graph'.
- Neighborhood said the graph was undirected and gave the count in words.
