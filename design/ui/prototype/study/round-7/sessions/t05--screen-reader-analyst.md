# Writing a note about Valjean -- Morgan Reyes (screen-reader analyst)

Task as given: "You have just realized why Valjean matters to your argument. Write the thought
down so that next week you, or a colleague, can come back to it attached to him. You have never
typed your name into this program. The data on screen is a sample: characters of the novel Les
Miserables, linked when they appear in the same chapter."

Renders are in tmp/round-7-sessions/t05--screen-reader-analyst/. All commands were run from
design/ui/prototype. The tool cannot type into a field directly, so typed text is sent one key at a
time with --key; the note text is therefore short ("Val", "Hub") where I would have typed a
sentence.

## Start screen (shots/tasks/t05/01.png)

"Les Miserables" at the top, then "Local only". Good: that is the first thing I ask, where my data
goes. Left side: a rail with Graph, Data, Views, Notes, Assistant -- all labeled in words, which I
like. The panel lists Selection, Notes 4, PageRank, Louvain, Shortest paths, and so on. The middle
is the drawing. I don't start with the drawing; it will say "image" or nothing. I want a table, and
I want Valjean in it, because the note has to be attached to him, not floating.

## Step 1 -- open the table

    timeout 120 node app-b/study.mjs --try .../01.png task:t05 --click "Table"

A Nodes table opens: "77 nodes", then a one-line summary, "Valjean is first on all three measures;
Gavroche is in the top 3 on all three". Columns label, group, Degree (full graph), PageRank (full
graph), Rank by PageRank, Betweenness (full graph). Valjean is row one. Fine. "Betweenness 0.570" --
normalized, I'd guess, since NetworkX normalized gives a number of that size, but nothing next to it
says so. Not my task today; noted.

## Step 2 -- select Valjean

    ... --click "Table" --click "Valjean"

Selection now reads 1, the inspector on the right says "Valjean, Node". A caption appears,
"Valjean, 36 connections" -- good, that's text, and a row of five icon-only buttons floats above the
toolbar. Icon-only makes me nervous. If they have names I'll hear them on Tab. The inspector has a
"Why this look" section with a row called "Notes -- Label below". That is about styling, not about
notes I write. Two different things both called "Notes" a few lines apart; I can't tell yet whether
that is the place to write.

## Step 3 -- look for a way to add a note

    ... --click "Table" --click "Valjean" --click "Add note"

I guessed the name, as I would by tabbing through the floating buttons and listening. One of them
answered to "Add note". The left panel switched to Notes, and at the top is a draft: a "Valjean"
chip with a remove button, a text box ("Write a note"), Save with "Ctrl+Enter", and Cancel. So the
note is already attached to him, because he was selected. That is exactly what I wanted and I did
not have to find him a second time.

Below the draft are the existing notes, each with its chips (Valjean, Javert, Community 3) and a
"Cites" line (Betweenness, PageRank). One of them already says Valjean has the highest betweenness.
Someone got there before me.

## Step 4 -- type and save

    ... --click "Write a note" --type "..."      -> "nothing on screen is called 'Write a note'"
    ... --click "Add note" --type "..."          -> nothing typed, Save still dimmed

The text box answers to nothing by name. "Write a note" is only placeholder text, not a label. A
screen reader may or may not read a placeholder as the name, depending on browser; I would hear
"edit, multi line" and have to guess. In this case it did not matter, because focus was already in
the box after Add note -- the right behavior.

    ... --click "Add note" --key V --key a --key l --key Control+Enter     (render 06)

The note saved: "Val", with the Valjean chip, "Just now", and a "..." menu. No name or author is
shown, and it did not ask for one, which is correct since I never gave one. Ctrl+Enter worked, and
the shortcut was written next to the Save button, not hidden.

## Step 5 -- can I get back to it?

    ... --key H --key u --key b --key Control+Enter --click "Graph"            (render 07)

Back on the Graph panel, the row still says "Notes 4". I just added one. Either it counts something
else, or it didn't save. The Selection count is gone too -- Valjean is no longer selected, and the
inspector went back to PageRank. Nothing told me that happened.

    ... --click "Graph" --click "Notes"                                         (render 08)

The note is there at the top of the list: "Hub", Valjean chip, "Just now". So it saved. But the
inspector now shows the graph summary with a Notes section saying "1 note . Add note (N)". The list
on the left shows at least seven notes. Three counts -- 4, 1, and seven-plus -- for what sounds like
the same thing. I can't tell them apart and I won't guess.

    ... --click "Graph" --click "Valjean" --click "Data"                        (render 09)

I tried to come back from Valjean's side: select him, then the inspector's Data tab, expecting his
notes. "Data" took me to the Data section on the left rail instead -- there are two controls called
"Data" -- and Valjean did not get selected from the Graph panel (the table row was not what my
click reached). I stop here. Coming back by Valjean, rather than by scrolling the notes list, is
unproven.

## Verdict

Succeeded? Yes, for writing it down. The note exists, it carries a Valjean tag, and it is in a list
I can reach by a labeled rail button. Whether next week I can start from Valjean and hear "this
node has 2 notes" I don't know; I didn't find it.

Single Ease Question: 5 of 7. Selecting him in the table and pressing Add note was short and the
attachment was automatic. It lost points for a text box with no real name, counts that disagree
(Notes 4, 1 note, and a longer list), the selection silently dropped when I moved panels, and two
controls both called "Data".

Would I use this instead of my current tool? For this job, my current tool is a plain-text file
next to my NetworkX script with "Valjean: ..." in it. That file never tells me three different
counts. What this has that my file doesn't is the tie to the node and to the measure it cites
("Cites Betweenness"), so a colleague opening the same graph finds it beside the number. If the
counts agree and the note is reachable from the node itself, I would use it for notes I'm sharing
with sighted colleagues. For my own notes, the text file stays.
