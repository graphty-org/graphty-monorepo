# Session: check what came in overall (transfers, March 2026) -- Dana Okafor, supply chain risk analyst

Task given by the moderator: "Someone on your team brought this month's transfers into a project
and has started on them; you were just looking at one account. Before anyone works the month,
check what came in overall: how many accounts and transfers, whether the transfers run one way,
whether everything hangs together or falls into separate pieces, and whether anything looks off."

All commands were run from design/ui/prototype. D below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t01-transactions--supply-chain-analyst

## Start screen (shots/tasks/t01-transactions/01.png)

Think-aloud: "OK. A big gray blob of hexagons, like a beehive. That tells me nothing. On the
right is the one account my colleague was looking at, ACC-633005, a business in GB. That is not
what I want; I want the totals. Top bar says 'Full graph', 'Local only' -- local only is good,
that is the first thing IT asks. Down the left there is Graph, Data, Views, Notes, Assistant. The
counts I want are about the data, so: Data."

## Step 1 -- open Data

    timeout 120 node app-b/study.mjs --try D/01.png task:t01-transactions --click "Data"

Think-aloud: "Now we're talking. Left side lists the two files: accounts-2026-03.csv, 3,000
accounts, and transfers-2026-03.csv, 9,113 rows, 9,113 transfers. Rows equals transfers, so
nothing got dropped on the way in -- I like that it shows both numbers, that's the first thing I
check when I bring an ERP extract into anything.

Right side, Summary: Nodes 812 of 3,000. Hm, why 812? Oh -- there's a filter on the left that
somebody left on: 'amount is at least 1,000'. And the top bar now says '812 of 3,000 nodes'. My
colleague did that. Fine, but I need to keep it in mind, because then there's this gray box that
says '5 readings are for all 3,000 nodes' and a 'Compute on 812' button. So are these numbers for
everything or for the 812? I read it as: these numbers are for the whole month, the picture is
the filtered bit. That's what I want for this check anyway.

Direction: Directed. Weak components: 1. Reciprocity: 0. Highest total degree: 907. Average 6.08.
I don't know 'weak components' or 'reciprocity' or 'degree'. Degree I've heard -- number of
connections I think. 907 against an average of 6 jumps off the page though."

## Step 2 -- "4 more readings not computed"

    timeout 120 node app-b/study.mjs --try D/02.png task:t01-transactions --click "Data" --click "4 more readings not computed"

Think-aloud: "I clicked the blue link and got a menu: Select all visible, Invert selection, Fit,
Re-run layout, Reshuffle layout seed, Unpin all, Compute the overview, Add node, Clear graph
data. That's not what I expected from a link that says 'more readings'. 'Compute the overview'
sounds like what I want, I guess."

## Step 3 -- Compute the overview

    timeout 120 node app-b/study.mjs --try D/03.png task:t01-transactions --click "Data" --click "4 more readings not computed" --click "Compute the overview"

Think-aloud: "Wait. Now the right panel says 'Co-appearances', 'from miserables.gexf'. 77 nodes,
254 edges, Undirected. That is NOT my data. The left side still says my two CSV files and 3,000
accounts. So which one do I believe? This is exactly the kind of thing that makes me close a
tool. If it can swap someone else's file into my summary when I press a button, I can't put any
number from it in front of my VP. I'm going to ignore this and go back to what I saw first."

## Step 4 -- try the "Compute on 812" button

    timeout 120 node app-b/study.mjs --try D/04.png task:t01-transactions --click "Data" --click "Compute on 812"

Think-aloud: "Same menu popped up again. Not a computation, the same list of layout things. OK,
I'm not touching the compute buttons any more."

## Step 5 -- the table

    timeout 120 node app-b/study.mjs --try D/05.png task:t01-transactions --click "Data" --click "Table"

Think-aloud: "A table. Good, tables I can read. '3,000 nodes (before the filter)', from the
accounts file. Columns: Links in, Links out, Links total, kind, country. Sorted by total, biggest
first? But the first row is 15 links, and it says 'Rows 381 to 420 of 3,000'. Why am I on row 381?
Where's the account with 907? The top rows here are all businesses with zero links in and
everything out -- they only send. That's interesting: businesses paying out, nobody paying them?"

## Step 6 -- sort by Links in

    timeout 120 node app-b/study.mjs --try D/06.png task:t01-transactions --click "Data" --click "Table" --click "Links in (count, full graph)"

Think-aloud: "Sorted by links in. Still rows 381 to 420. These are personal accounts with 2-4
in. I still can't see the top of the list."

## Step 7 -- try to get to the first page

    timeout 120 node app-b/study.mjs --try D/07.png task:t01-transactions --click "Data" --click "Table" --click "Links in (count, full graph)" --click "Rows 381 to 420 of 3,000"
    timeout 120 node app-b/study.mjs --try D/08.png task:t01-transactions --click "Data" --click "Table" --click "Previous page"

Think-aloud: "Clicking the rows text does nothing. There are two little arrows next to it; I
tried 'Previous page' and the tool says nothing on screen is called that. I can't get to row 1.
In Excel I'd hit Ctrl+Home. I'm giving up on finding WHICH account is the 907 one."

## Step 8 -- hover the words I don't know

    timeout 120 node app-b/study.mjs --try D/09.png task:t01-transactions --click "Data" --hover "Weak components"
    timeout 120 node app-b/study.mjs --try D/10.png task:t01-transactions --click "Data" --hover "Highest total degree"
    timeout 120 node app-b/study.mjs --try D/11.png task:t01-transactions --click "Data" --hover "Reciprocity"

Think-aloud: "Weak components: 'Groups of nodes joined to each other, ignoring edge direction.'
So 1 means it's all one piece. That answers the 'separate pieces' question -- why not just say
'1 connected group' on the row? Highest total degree: 'The most edges on any one node, in and
out together.' So one account has 907 transfers on it, out of 9,113. That's ten percent of the
month on one account. Reciprocity: 'The share of edges returned: A to B and also B to A.' Zero.
So nobody sends money back to someone who sent to them. Transfers run one way.

These tooltips are fine, one line each, I read them. But I had to hover each one; the row labels
alone meant nothing to me."

## Where I stopped

What I'd tell the team:
- 3,000 accounts, 9,113 transfers, every row came in.
- Transfers go one way: directed, and none come back (reciprocity 0).
- It's all one connected piece.
- Off: one account has 907 transfers on it when the average is about 6. I could not find out
  which account from the table, because it opened on rows 381-420 and I couldn't page back.
- Also off: a lot of business accounts only send and never receive.
- Heads-up: someone left a filter on (amount at least 1,000, 812 of 3,000 accounts showing).

Did I succeed? Mostly. I have the counts, the direction and the one-piece answer, and I spotted
the big account, but I can't name it, and the "compute" step showed me a different dataset
entirely, which I don't trust.

Single Ease Question: 4 out of 7.

Would I use this instead of my current tool? Not as it is. The source panel (rows in vs. rows
loaded) and the summary numbers are faster than building a pivot, and "local only" is the right
answer for IT. But the summary flipping to some file called miserables.gexf after I pressed
"Compute the overview" is a deal-breaker for anything I'd show a VP, the table wouldn't let me get
to the top account, and nothing here goes to Power BI that I saw. I'd do this check in Excel with
two COUNTIFs and a pivot in ten minutes and I'd trust it.
