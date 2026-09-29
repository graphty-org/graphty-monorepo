# Tree test transcript: Dr. Min-ji Kim, knowledge graph engineer

Simulated participant, played from `../../personas/knowledge-engineer.md`. She saw only the text
outline in `../tree-test.md`, one level at a time. Answers were given before the answer key was
seen; the key was used only to mark each one correct or not and direct or not.

Confidence is on a 1 to 7 scale (7 = certain).

## Summary

| Task | First top-level pick | Final pick | Confidence | Correct | Direct |
|---|---|---|---:|---|---|
| tt-1-start-a-ranking | Main menu | Main menu > Algorithms > Centrality | 6 | yes | yes |
| tt-2-one-node-score | Right panel, node or set selected | Right panel, with a node or a set selected > Results | 6 | yes | yes |
| tt-3-run-settings | Data | Right panel, with a result selected > Details | 5 | yes | no |
| tt-4-whole-ranking | Bottom table | Bottom table > Nodes tab, Edges tab, and a tab for each opened result | 6 | yes | yes |
| tt-5-change-a-color | Canvas | Canvas > Legend | 6 | yes | yes |
| tt-6-team-style-file | Right panel, nothing selected | Main menu > Recipes > Apply a recipe... | 3 | no | no |
| tt-7-wrong-middle-step | Filter chip | Filter chip > Filter steps | 7 | yes | yes |
| tt-8-next-months-file | Data | Data > Sources > Update with new data... | 6 | yes | yes |
| tt-9-attach-owner-list | Data | Data > Sources > Add a table... | 5 | yes | yes |
| tt-10-before-this-month | Data | Data > Versions > Each version | 6 | yes | yes |
| tt-11-picture-for-paper | Main menu | Project name menu > Export... | 4 | yes | no |
| tt-12-ranked-list-spreadsheet | Bottom table | Bottom table > More (...) > Export table... | 6 | yes | yes |
| tt-13-anything-left | Data | Data > Sent and saved | 6 | yes | yes |
| tt-14-why-kept | Graph | Right panel, with a node or a set selected > Notes | 5 | yes | no |

13 of 14 correct, 9 of 14 direct.

## Tasks, in the order she took them

### tt-7-wrong-middle-step

Path: Filter chip > Filter steps. Stop.

"Filter steps, each with delete. That is exactly it. I would not touch Undo history for this --
undo takes out the third step too."

Confidence 7.

### tt-13-anything-left

Path: Data > Sent and saved. Stop.

"I saw the line under the project name that says nothing has been sent. I do not answer IT with a
one-line status. I want the log: every file written, everything sent. Data > Sent and saved is
the log, so that is where I end."

Confidence 6.

### tt-3-run-settings

Path: Data > Sources > Its columns (each numeric one saying whether it is used as a weight) --
back up to the top -- Right panel, with a result selected > Details.

"Edge column made me think of the data first. The columns list tells me what is used as a weight
now, not what that run used last week. That is the wrong question. Back out. The run record has to
be on the run. Details: method, seed, settings. If the weight column is not in Details I would
check the State line next, but I pick Details."

Confidence 5.

### tt-1-start-a-ranking

Path: Main menu > Algorithms > Centrality. Stop.

"A second ranking is a second centrality measure. Which one was done already? Betweenness,
presumably. I would pick closeness or eigenvector and compare. The list names them, which I
appreciate. I noticed Results > Run a measure in the right panel too, but I go where the
algorithms are listed by family."

Confidence 6.

### tt-10-before-this-month

Path: Data > Versions > Each version. Stop.

"Versions, open one to read the graph as it was. Fine, provided it tells me which import produced
that version."

Confidence 6.

### tt-5-change-a-color

Path: Canvas > Legend. Stop.

"This happens to me every week, I cannot tell red from green. The legend entry has change color.
I did not want to dig through a stack of layers to find which one paints those two groups."

Confidence 6.

### tt-11-picture-for-paper

Path: Main menu > File -- no Export in File (Open, Open sample, Connect to data source) -- back up
to the top -- Project name menu > Export...

"Export lives under File in every tool I have used. It is not there. That is annoying. I scanned
the top level again, and the project name menu has Export with a shortcut. I would also have
accepted Data > Export, but that sounded like exporting data, not a picture. I need SVG. If it
only gives PNG I will be unhappy."

Confidence 4.

### tt-2-one-node-score

Path: Right panel, with a node or a set selected > Results. Stop.

"Select Valjean, look at his panel. Attributes is where his properties are; Results says this
node's value and rank in each run. That is the one. I would check it names the measure, because
'hold the groups together' is betweenness, and I want it to say so."

Confidence 6.

### tt-9-attach-owner-list

Path: Data > Sources > Add a table... Stop.

"This is a join on account id. I considered the column header menu in the table, which lists
join..., but I bring data in through sources. My worry: does Add a table turn every row into a new
node? If it asks me which column matches the account id, fine. If it invents owner nodes, no."

Confidence 5.

### tt-6-team-style-file

Path: Right panel, with nothing selected > Style stack > Add a layer -- no import there -- back up
to the top -- Main menu > Recipes > Apply a recipe...

"Colors and sizes are presentation, so I looked in the style stack first. Add a layer, but nothing
says load a file. Back up. I did see Data > Recipes and style files, but colors are not data and
I do not expect to find a stylesheet next to my sources. Recipes in the main menu sounds like a
saved set of steps; a colleague's style file is the closest thing to that. I am guessing."

Confidence 3.

### tt-8-next-months-file

Path: Data > Sources > Update with new data... Stop.

"Same source, new month. Update, not Open -- Open would start over and lose my set-up. Under the
source is where I would look."

Confidence 6.

### tt-14-why-kept

Path: Graph > Sets and paths -- each kept set, but nothing to annotate it -- back up to the top --
Right panel, with a node or a set selected > Notes.

"The reason belongs to the set, not floating in a notes list, so I went to the kept sets. No note
there. Back up. Select the set and the right panel has Notes. That keeps it attached, which is
what I want. A free-floating note in a Notes rail would lose the link to the five accounts."

Confidence 5.

### tt-4-whole-ranking

Path: Bottom table > Nodes tab, Edges tab, and a tab for each opened result. Stop.

"A sorted list is a table. Open the result's tab, sort by the score. I would have gone to the
column header menu to sort, but the tab is where the list is."

Confidence 6.

### tt-12-ranked-list-spreadsheet

Path: Bottom table > More (...) > Export table... Stop.

"The list is the table, so export the table. I want CSV, with the measure name in the column
header, not 'score'."

Confidence 6.

## What she said overall

- "The Data panel is where I expected sources, versions and the send log. Good."
- "Export not being under File cost me a step. Everyone puts it there."
- "Style files under Data is wrong to me. Colors are not data. I would never have picked it."
- "Results in the right panel is fine once I know selection changes the panel. But I read the
  result record on the result, not on the data."
