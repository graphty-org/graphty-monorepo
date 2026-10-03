# Session: shortest chain between Fantine and Gavroche -- the reporter (Ruth)

Task as given by the moderator: "The Les Miserables network is open (example data, not your own).
Work out how Fantine and Gavroche are connected through the smallest number of go-betweens: say who
the go-betweens are, in order, and how many links it takes."

Start screen: shots/tasks/r8-t21/01.png. Renders: tmp/round-8-sessions/r8-t21--data-journalist/.
All commands were run from design/ui/prototype with `D=<that render folder, absolute>`.

## Step 1 -- the search box (render 01)

    timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t21 --click "Find rows and notes" --type "Fantine"

Ruth: "I always start by typing the name. I typed Fantine and nothing changed: same list, nothing
on the map lit up. It says 'Find rows and notes', so I guess it searches the list on the left, not
the people. Not the box I needed. There's a 'Shortest paths' row on the left with 'Valjean t...'
and 'Myriel to...' under it. That looks like what I want, just for other people."

## Step 2 -- the "Shortest paths" row (renders 02-04)

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t21 --click "Shortest paths"
    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t21 --click "Shortest paths" --hover "More"
    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t21 --click "Shortest paths" --click "More actions"

Ruth: "I clicked 'Shortest paths'. The row highlighted, but the panel on the right says 'Louvain',
and the tab at the bottom changed to Louvain. Then I opened the three dots on that row, and the
menu is headed 'Louvain' as well: Rerun, Lay out by these groups... nothing about a new path.
Whatever I touch on that row, the app seems to think I mean Louvain. I don't trust that. Backing
out."

## Step 3 -- Analyze (renders 05-06)

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t21 --hover "Analyze"
    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t21 --click "Analyze"

Ruth: "The flask at the bottom is 'Analyze'. Its list has 'Shortest path -- the fewest steps, or the
lightest route, between two nodes.' Fewest steps is my question."

## Step 4 -- the "Path between" form (renders 07-11)

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t21 --click "Analyze" --click "Shortest path"
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Type a name" --type "Fantine"
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Type a name" --type "Fantine" --click "Click to pick" --type "Gavroche"
    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Type a name" --type "Fantine" --key Enter
    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Type a name" --type "Fantine" --key Enter --type "Gavroche" --key Enter

Ruth: "From, To, Weight, Scope. I typed Fantine in From. No list of matching names came up, so I
couldn't tell if it knew who she was. Then I clicked To and typed Gavroche, and Fantine VANISHED
from From; it said 'Click to pick' again and Find path stayed gray. Nothing told me why. I guessed
Enter, and that worked: Fantine stuck and the cursor moved to To. Gavroche, Enter, and Find path
turned blue. If I hadn't thought of Enter I'd have been stuck there, or tried clicking dots on the
map."

## Step 5 -- the Weight setting (render 12)

    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Type a name" --type "Fantine" --key Enter --type "Gavroche" --key Enter --click "value (set at load)"

Ruth: "Weight is set to 'value (set at load)', and underneath it says 'reads a weight as distance:
it uses 1/value'. I don't know what that means, but I know the menu promised 'fewest steps OR the
lightest route', and I want fewest go-betweens. Opened the dropdown: 'None (fewest steps)'. That's
my question. So the default would have answered a different question than mine, and the button
would have let me run it without blinking. I only caught it because I don't trust defaults."

## Step 6 -- run it and read the answer (renders 13-15)

    timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Type a name" --type "Fantine" --key Enter --type "Gavroche" --key Enter --click "value (set at load)" --click "None (fewest steps)" --click "Find path"
    timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t21 <same steps> --click "Next route"
    timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t21 <same steps> --click "Next route" --click "Next route"

Ruth: "Green line on the map, and the right panel lists it in order: Fantine (start), Valjean
(hop 1), Gavroche (end). '2 steps. 3 routes tie.' I like that it says there's a tie. If it had
only shown me Valjean I would have written 'the link is Valjean', and that would have been wrong.
Route 2: Fantine, Thenardier, Gavroche. Route 3: Fantine, Javert, Gavroche. The panel also says
'Weight: None: fewest steps (this run's override)', so I could tell an editor exactly how I got
it.

One snag on route 2: the panel says 'Thenardier', but the nearest name on the map is
'Mme.Thenardier', and the green ring is on an unlabeled dot next to Javert. In the book those are
two different people. I'd go with the panel, but I'd check before printing it."

## Answer given

Two links, one go-between. There are three shortest routes, all the same length:
Fantine - Valjean - Gavroche; Fantine - Thenardier - Gavroche; Fantine - Javert - Gavroche.

## Wrap-up

- Succeeded? Yes, I believe so, including the tie.
- Single Ease Question: 4 of 7. The answer screen was good. Getting there wasn't: the search box
  didn't find people, the existing 'Shortest paths' row opened Louvain, the From name vanished
  until I guessed Enter, and the default weight would have quietly answered a different question.
- Would I use this instead of my current tool? I'd take it over Gephi for this kind of question,
  because it shows the steps in order, names the setting it used, and admits the ties. That's
  what I need for fact-checking. But I wouldn't trust it on my own data yet: a default that
  changes what 'shortest' means, and a name that disappears from a box, are the kinds of thing
  that put a wrong fact in print.
