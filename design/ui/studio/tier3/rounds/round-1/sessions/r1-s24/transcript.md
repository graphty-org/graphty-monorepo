# Session r1-s24 -- Explorer Elena (first-time user)

Task: bring sources.graphml in, find clusters (each its own color), keep cluster color only on on-the-record sources, others as when opened; count colored sources.

## Step 1 -- start
Command: real.mjs --start <folder> empty
Screenshot 01.png: a landing page, "Analyze any network". Big green "Open a file" button. A pretty colorful dot picture on the right. "Ooh."
Next: click "Open a file" and give it sources.graphml.

## Step 2
Command: --click "Open a file" --upload sources.graphml
02.png: a spreadsheet preview, "Open as a new graph", 24 rows, columns name, kind, donations, on_record (Yes/No). Nice, there's an on_record column -- that's the "agreed to speak" thing I think. Green "Load" bottom right.
Next: click Load.

## Step 3
Command: --click "Load"
03.png: all purple-blue dots, I can see three clumps already. No colors. The front page had a "Communities" button but I don't see it here. There's a row of icons at the bottom; the flask looks like "experiments". 
Next: hover the flask icon to see what it is.

## Step 4
Command: --hover-at 614,863
Tooltip "Analyze". OK, that's probably where clusters live.
Next: click Analyze.

## Step 5
Command: --click "Analyze"
05.png: a long list -- Degree, Betweenness, Katz, HITS... I don't know these words. There's a "Filter analyses" box.
Next: type "cluster" in it.

## Step 6
Command: --type "cluster"
06.png: a "Find groups" section. Louvain, Leiden... no idea which. Louvain says "Which nodes form densely linked groups" -- sounds right, and it's first.
Next: click Louvain.

## Step 7
Command: --click "Louvain"
07.png: a little box with Resolution 1, Weight None, and a green Run button. "Under a second". I won't touch the settings.
Next: click Run.

## Step 8
Command: --click "Run"
08.png: Ooh! Three colors: green group top-left, blue top-right, orange bottom. A little legend Group 1/2/3. A "Louvain" item appeared on the left list. Part one done.
Now only the on-the-record people should keep their color. The "Louvain" thing on the left seems to be the coloring. Maybe I can tell it "only Yes people".
Next: click "Louvain" in the left list.

## Step 9
Command: --click-at 118,216 (the Louvain row)
09.png: right panel now shows Louvain: "Which nodes -- 24 of 24 nodes". That sounds like where I say which people get the color.
Next: click "Which nodes".

## Step 10
Command: --click "Which nodes"
10.png: "Nodes that pass every condition", a Louvain card, and "+ Add a condition". That's it, I think -- add "on_record is Yes".
Next: click "Add a condition".

## Step 11
Command: --click "Add a condition"
11.png: a list of my columns: name, kind, donations, on_record (2 values), email. 
Next: click on_record.

## Step 12
Command: --click-at 1283,539 (on_record option)
12.png: It already picked "Yes" for me, "12 nodes". Half the dots went back to the original purple and the rest kept green/blue/orange. Legend says "12 of 24 nodes". I count about 11 colored dots on screen myself, maybe one is behind the legend box. 
Next: click Done.

## Step 13
Command: --click "Done"
13.png: The panel now says "Louvain" and "on_record: yes, 12 nodes", "12 of 24 nodes". Green, blue and orange only on the Yes people; everyone else is back to the purple they had when the file opened. I'm done.

## Wrap-up (in character)
- Finished? Yes. 12 sources still have a cluster color (the panel and the legend both say 12 of 24). When I counted dots on the picture myself I only found 11 -- I think one is hiding behind that little color key box at the top left, which covers part of the green group.
- Ease: 5 out of 7.
- What confused me: the front page had a "Communities" button, but inside the app it was gone and I had to guess that a flask icon called "Analyze" was the place. The list there was a wall of words I don't know (Betweenness, Katz, HITS); typing "cluster" saved me, and "Find groups" made sense, but I had no idea whether to pick Louvain or Leiden -- I just took the first one. I wasn't sure clicking the "Louvain" folder on the left was where I'd change who gets colored; "Which nodes" with a little arrow was small and easy to miss. Once I found "Add a condition" it was easy, and it picked "Yes" for me. The legend box sitting on top of the dots made my own count come out one short, which made me doubt the number for a second.
