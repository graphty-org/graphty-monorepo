# Session: Explorer Elena -- get your network of characters into a new, empty project

Task given by the moderator: "You have just started a new, empty project. Get your network of
characters into it. The data on screen is a sample: characters of the novel Les Miserables, linked
when they appear in the same chapter. If that is not your line of work, treat them as your own
people or things."

Start screen: shots/tasks/t29/01.png. All commands were run from design/ui/prototype; renders are
in tmp/round-7-sessions/t29--explorer-elena/.

## Start (shots/tasks/t29/01.png)

The project is called Les Miserables, the middle says "No nodes to draw. This graph is empty." and
there is one big blue "Add data..." button.

> "OK, empty. That's easy, there's literally one blue button. Add data. I expect it to ask me for my
> file -- or let me drag it in."

## Step 1 -- click the big button

```
timeout 120 node app-b/study.mjs --try .../t29--explorer-elena/01.png task:t29 --click "Add data..."
```

It did not ask me for a file. It jumped straight to a full-screen table. The title at the top
changed from "Les Miserables" to "Door entries, March 2026". Tables called people (412), buildings
(9), entries (4,212). Rows like 1001 / B1 / 2026-03-02 07:58. Yellow warning signs: "Not in people",
"Not in buildings", "25 person_id values are not in people", something about leading zeros.

> "Wait. Whose data is this? I didn't pick anything. Door entries? Buildings? These aren't my
> characters. Did I click on someone's recent file? ... And there's a wall of yellow warnings. I'm
> not touching any of this."

I did not read the match report. I saw "Open as a new graph" at the top and a Cancel button at the
bottom.

## Step 2 -- back out

```
timeout 120 node app-b/study.mjs --try .../02.png task:t29 --click "Add data..." --click "Cancel"
```

Back to the empty Les Miserables project. Black message at the bottom: "Load cancelled: nothing was
loaded" with an Undo.

> "Good, nothing broke. Phew. OK, so the big button isn't it. Maybe the Data thing on the left is
> where you put data."

## Step 3 -- the Data icon on the left

```
timeout 120 node app-b/study.mjs --try .../03.png task:t29 --click "Data"
```

Suddenly the whole picture is there. Orange dots, lines, names: Valjean, Javert, Cosette, Marius,
Fantine. On the left: "miserables.gexf, 77 nodes, 254 edges". On the right, a box of numbers.

> "Ooh. Oh! There they are. ... Hang on, did I just do that? I only clicked Data. Was it in there the
> whole time and the other screen just didn't show it? That's kind of weird."
>
> "Valjean is the big dark one in the middle, so he's the most important character. That makes
> sense, he's the main guy." (She did not look at the legend in the corner, which says size is
> "Degree" and color is "PageRank".)

## Step 4 -- go back to the graph screen to check it's really there

```
timeout 120 node app-b/study.mjs --try .../04.png task:t29 --click "Data" --click "Graph"
```

The picture is still there, but now the left list has a lot of things I did not make: PageRank,
Louvain 6 groups, Shortest paths "Valjean to Jav...", "Myriel to Javert", Watchlist (with a lock),
a folder "For the report", Group 2, Group 8, Betweenness, "Notes 4", "1 hidden row still paints".

> "I didn't make a watchlist. Or a report. Or four notes. This is someone else's finished project,
> isn't it? I was supposed to be starting a new empty one. So I don't think I actually did the
> thing. I just... wandered into somebody else's."

## Step 5 -- start over and try the small "Add data" link on the left instead

```
timeout 120 node app-b/study.mjs --try .../05.png task:t29 --hover "Add data"
timeout 120 node app-b/study.mjs --try .../06.png task:t29 --click "Add data"
```

Hovering did nothing I could see. Clicking it gave me the same "Door entries, March 2026" screen.

> "Same thing. OK so every 'Add data' goes to the door-entries file. Maybe that's just what it does
> -- it shows you an example first and you swap in your own file somewhere?"

## Step 6 -- look for where to swap in my own file

```
timeout 120 node app-b/study.mjs --try .../07.png task:t29 --click "Add data..." --click "entries.csv"
timeout 120 node app-b/study.mjs --try .../09.png task:t29 --click "Add data..." --hover "Add table"
timeout 120 node app-b/study.mjs --try .../10.png task:t29 --click "Add data..." --click "Open as a new graph"
```

Clicking the file name "entries.csv" did nothing. I tried resting on the little plus next to
"Tables" but nothing is called "Add table" (I don't know what it is called; there was no label).
Clicking "Open as a new graph" at the top did nothing either.

> "I'd expect to click the file name and get my file picker. Nope. There's a plus, but no idea what
> it adds. I'm not going to guess on a screen full of warning signs."

## Step 7 -- give in and press Load

```
timeout 120 node app-b/study.mjs --try .../08.png task:t29 --click "Add data..." --click "Load"
```

"Reading 3 tables. people.csv, buildings.csv, entries.csv: 421 nodes, 4,180 edges..." The project is
now named "Door entries" and the left list says "Door entries".

> "Yeah, no. Now my project is door entries. That's not my characters."
>
> "OK."

Engagement dropped here; she stopped trying new things.

## Outcome

- **Did she think she succeeded?** No. "The characters showed up once, when I clicked Data, but I
  don't know how, and it came with a bunch of stuff that wasn't mine. Every Add data button gave me
  somebody's door-entry spreadsheet. I never got to pick my own file."
- **Single Ease Question (1-7):** 2. "Only not a 1 because Cancel worked and told me nothing
  happened."
- **Would she use this instead of her current tool?** "Not for this. In Sheets or Flourish I upload
  my file and I see my file. Here the add-data button opened a file that wasn't mine, with warnings
  all over it, and the one time my people appeared I didn't do anything to make it happen. I
  wouldn't trust that I'm looking at my data."

## What she did not notice

- She never read the match report or the "Makes person (412) --entries--> building (9)" line.
- She did not open the legend on the canvas and read node size as importance ("Valjean is the main
  guy") rather than as number of connections.
- She did not find any way to choose her own file, drag a file in, or pick a sample by name.
