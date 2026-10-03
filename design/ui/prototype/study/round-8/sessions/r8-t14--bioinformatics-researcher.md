# Session: save, put away, and reopen the Les Miserables sample -- Dr. Chen (computational biologist)

Task as given: "You have never used this program before. You will practice on the ready-made network of
characters from the novel Les Miserables that comes with the program, not on your own data. Open it, then
imagine you have worked on it for an hour and must stop for the day. Make sure the work is kept on this
computer under a name you choose, put it away as you would at the end of the day, and then bring it back
as if it were tomorrow."

All commands were run from design/ui/prototype. D = tmp/round-8-sessions/r8-t14--bioinformatics-researcher
(absolute path in each real run). Every run starts again from the start screen.

## Step 1 -- start screen (shots/tasks/r8-t14/01.png)

Start column (Open project or file, New from data), an empty Recent projects list that says "They are
kept in this browser", samples on the right, and a usage-data banner at the bottom. "Files are read on
this computer and never uploaded" -- good, that's the first thing I look for. I don't share usage data
with anything, so "No thanks". Then Les Miserables.

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t14 --click "No thanks" --click "Les Miserables"

It opens with a lot already in it: PageRank, Louvain with 6 groups, two shortest paths, a watchlist, a
"For the report" folder, 4 notes. 77 nodes. Fine, that's my pretend "hour of work".

Now save. In Cytoscape that's File > Save Session As. No menu bar here. The name "Les Miserables" at
top left has a little arrow, so it's probably the file menu.

## Step 3 -- the name is the file menu

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables"

Rename, Open project or file, Save, Export, Apply recipe or style file, Version history, Save as, Close
project. That's a File menu, good. It has shortcuts listed too. I want my own name and I don't want to
overwrite a sample, so "Save as...". I'd also like to know about "Version history" -- that's the
reviewer-in-six-months problem -- but not today.

## Step 4 -- Save as dialog

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..."

"Save Les Miserables as", one field: Name, prefilled "Les Miserables copy". No folder, no location, no
file type. Where does this go? I'll find out after, I suppose.

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --type "lesmis practice oct2"

My text went in FRONT of the default: "lesmis practice oct2Les Mise...". The prefilled name was not
selected, so typing does not replace it. Every save dialog I use selects the name. Minor, but it is
exactly how you end up with a file called "lesmis practice oct2Les Miserables copy". Select all, retype.

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "lesmis practice oct2" --click "Save"

The title now reads "lesmis practice oct2". No "saved" message, no path, nothing about where it went.

## Step 5 -- where is it?

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "lesmis practice oct2" --click "Save" --click "lesmis practice oct2"

Same menu. No "last saved at", no location. The start screen said projects are "kept in this browser",
which worries me -- browser storage is what IT wipes.

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "lesmis practice oct2" --click "Save" --click "Local only"

The "Local only" chip opens Settings > Privacy. "Where your data goes": files you open are read on this
computer, never uploaded -- good. "Your project: Saved where you save it." I never chose where; I typed
a name. That line is circular. At least it confirms nothing leaves the machine.

## Step 6 -- put it away

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "lesmis practice oct2" --click "Save" --click "lesmis practice oct2" --click "Close project"

It closed without an "unsaved changes" warning, so the save held. Back on the start screen, and Recent
projects now shows: "lesmis practice oct2 -- 77 nodes -- ~/Documents/graphty/lesm... -- Today 19:22", and
under it "This list is kept in this browser". So it IS a file in my Documents folder; only the list is in
the browser. That's the answer I wanted, but I got it after I'd closed the project, not in the Save as
dialog where I needed it. And the path is cut off.

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "lesmis practice oct2" --click "Save" --click "lesmis practice oct2" --click "Close project" --hover "lesmis practice oct2"

Rested the pointer on it hoping for the full path. No tooltip. I still don't know the file name or
extension, so I couldn't find it in Finder or back it up on purpose.

## Step 7 -- "tomorrow"

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "lesmis practice oct2" --click "Save" --click "lesmis practice oct2" --click "Close project" --click "lesmis practice oct2"

It comes back identical: same name, PageRank, Louvain 6 groups, both shortest paths, Watchlist, "For the
report" with Group 2, Group 8 and Betweenness, 4 notes, 77 nodes, the same layout, even PageRank still
selected in the right panel. That's better than Cytoscape sessions have treated me. I didn't test
reopening it in a different version of the program, which is where Cytoscape actually fails.

I stopped here.

## Verdict

Succeeded: yes. Saved under my own name, closed, reopened, everything was there.

Single Ease Question: 6 out of 7. The path was obvious once I guessed the name is the File menu. Points
off for the name field that doesn't select its text, and for never being told where the file goes
until after I'd closed it.

Would I use this instead of my current tool? For saving work, it already beats Cytoscape: no Java, it
reopened exactly, and it told me plainly nothing is uploaded. But saving isn't why I'd switch. I'd use it
for looking at a network if I can see the full path and file format of the saved project (so I can put
it under version control next to my R scripts) and if I can get the node table out as a TSV. Without a
scripting path it's a viewer, not part of my pipeline -- that's still R and igraph.

## Problems, in my words

1. Save as never says where the file will be written. I only learned "~/Documents/graphty/..." from the
   recent list after closing. Show the folder in the dialog, and let me change it.
2. The prefilled name in Save as is not selected; typing a new name prepends it to "Les Miserables copy".
3. Settings > Privacy says "Your project: Saved where you save it" -- circular when the dialog never asked
   me where.
4. The recent-project path is truncated and has no tooltip; I can't see the full file name or extension.
5. No "saved" confirmation after Save; I inferred it from the title changing and from Close not
   warning me.
6. Start screen's empty state says projects "are kept in this browser"; after a save it says "This list
   is kept in this browser". The first wording made me think my work itself lived in browser storage.
