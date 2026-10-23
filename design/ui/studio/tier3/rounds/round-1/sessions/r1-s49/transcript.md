# Transcript r1-s49 (Tom, the recipe recipient)

Task: open lesmis-poster.graphty.json, find which characters are orange and what they have in common.

## Step 1 (start)
Command: real.mjs --start <folder> empty
Saw: a front page, "Analyze any network", a big green "Open a file" button that says "or a saved project", and "It never leaves your computer". Good, that answers my data question. There is a demo picture with orange balls too, but that's not her file.
Next: click the big "Open a file" button and give it her file.

## Step 2
Command: --step --click "Open a file" --upload lesmis-poster.graphty.json
Saw: it opened, "Opened lesmis-poster". Blue balls, three orange ones. A box at the top says "Color: Poster, 3 of 77 nodes". "Local only" at the top, fine. No names on the balls though. On the left there's a list with "Poster 3".
Next: click "Poster" on the left, that's the orange thing, to see which 3 and why.

## Step 3
Command: --step --click "Poster"
Saw: the right side changed to "Poster". Under "Which nodes" it says "name contains Mlle, 3 nodes". So that's why: their names have "Mlle" in them, the French "Miss". Colour FFA500, that's the orange. Now I still need the three names. Nothing on the picture has names.
Next: click the "name contains Mlle, 3 nodes" box and hope it lists them.

## Step 4
Command: --step --click "name contains Mlle, 3 nodes"
Saw: that opened an editing box: "Contains", "Mlle", "Match case", "Add a condition", a green "Done". I didn't want to edit her file. No names listed. I'm backing out without touching it.
Next: press Escape to get out of the editing box.

## Step 5
Command: --step --key Escape
Saw: nothing changed, the editing box is still open. It still says "Autosave: saved", so I hope I didn't change anything. I'll leave it alone.
Next: use the search box on the left, "Find nodes, edges, values", and type Mlle to get the names.

## Step 6
Command: --step --click "Find nodes, edges, values" --type "Mlle"
Saw: a list. "Nodes 3": MlleBaptistine, MlleGillenormand, MlleVaubois. Three, same as the "3 of 77 nodes" on the orange box, so the counts agree. The editing box on the right closed by itself and still says "name contains Mlle, 3 nodes", still FFA500, Autosave still says saved. I don't think I changed her file.
Stopping here: I have my answer.

## End (in character)

Did I finish? Yes. The orange characters are Mlle Baptistine, Mlle Gillenormand and Mlle Vaubois. What they have in common: their names have "Mlle" in them (Mademoiselle, the unmarried women addressed as "Miss"). The project's "Poster" layer colours every character whose name contains "Mlle" orange; it says so in plain words, "name contains Mlle, 3 nodes".

How easy: 5 out of 7.

What went well: the file opened first time, no install, no sign-in, and the top bar said "Local only". The orange box said "3 of 77 nodes" straight away, and clicking "Poster" told me the reason in one line.

What confused me:
- The picture has no names on it. I could see three orange balls but had no idea who they were until I searched. A slide of this would mean nothing to the PI.
- When I clicked the "name contains Mlle" box hoping for the names, it opened an editing box instead (Contains, Mlle, Match case, Add a condition, Done). That made me nervous that I was about to change her file. Escape did nothing, and it stayed open until I went somewhere else.
- I had to guess that typing "Mlle" in the search box would give me the list. The editor never showed me which three nodes it meant, only the number.
- The "Poster" name and the hex code FFA500 mean nothing to me; I'd probably ask her what "Poster" was for.
