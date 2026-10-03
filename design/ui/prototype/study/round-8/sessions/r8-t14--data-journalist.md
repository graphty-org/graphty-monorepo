# Session r8-t14 -- data journalist (Ruth)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Open it, then imagine you have worked on it for an hour and must stop for the day. Make sure
the work is kept on this computer under a name you choose, put it away as you would at the end of
the day, and then bring it back as if it were tomorrow."

Start screen: shots/tasks/r8-t14/01.png. All commands run from design/ui/prototype; renders in
tmp/round-8-sessions/r8-t14--data-journalist/.

## Step 1 -- start screen

Think-aloud: "OK, a start page. 'Files are read on this computer and never uploaded' -- good, that
is the first thing I look for. There's a box at the bottom asking to collect usage data. No. I
don't care how nice the wording is, I say no to that on anything I might put sources into. Les
Miserables is the first sample, top right. Click it."

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t14 --click "No thanks" --click "Les Miserables"

## Step 2 -- the sample is open (01.png)

"Whoa. That's a lot. A list down the left with PageRank, Louvain, shortest paths, a watchlist, a
folder called 'For the report'... the description said it opens with worked examples, so I guess
this is the 'hour of work'. Fine, I won't touch it. I need to save. There's no File menu. Top left
is the name 'Les Miserables' with a little arrow -- in Google Docs that's where the name is, so
I'll try that before the three-line menu."

    ... --click "No thanks" --click "Les Miserables" --click "Les Miserables"

## Step 3 -- the name menu (02.png)

"There it is: Rename, Open, Save, Export, Version history, Save as, Close project. That's a File
menu hiding under the name. I want my own name, so 'Save as...' rather than 'Save' -- if I hit
Save on a sample I don't know whether I'm writing over the sample."

    ... --click "Save as..."

## Step 4 -- Save as dialog (03.png)

"'Save Les Miserables as', Name: 'Les Miserables copy'. Just a name. It doesn't say WHERE. On
this computer? In the browser? In some cloud? The top bar says 'Local only', so I'll take that on
faith for now. I'll type my name."

First try: I typed straight in.

    ... --click "Save as..." --type "Les Mis practice" --click "Save"

(04.png) "Ugh. The title now says 'Les Mis practiceLes Miserables ...'. It didn't select the old
name, my text went in front of it, and I hit Save without looking. My fault partly, but every
other save box I use highlights the name so typing replaces it. Start again and clear it first."

    ... --click "Save as..." --key "Control+a" --type "Les Mis practice"

(05.png) "Name box now just says 'Les Mis practice'. Save."

    ... --key "Control+a" --type "Les Mis practice" --click "Save"

## Step 5 -- after saving (06.png)

"Title at the top is now 'Les Mis practice'. That's it? No 'Saved', no 'saved to ...', nothing.
The name changed, so I suppose it worked. I'd want to see a little 'Saved to Documents' line --
if I'm about to walk away I need to know it's actually on disk."

## Step 6 -- put it away

"End of the day, close it. Same menu under the name: 'Close project'."

    ... --click "Save" --click "Les Mis practice" --click "Close project"

(07.png) "Back to the start page, and under Recent projects: 'Les Mis practice, 77 nodes,
~/Documents/graphty/Les ...', Today 19:21. OK, NOW I believe it -- it's a file in my Documents
folder. That's the reassurance I wanted right after hitting Save, not after closing. The path is
cut off. And there's a note 'This list is kept in this browser' -- so the list lives in the
browser but the file is in Documents? I think that's what it means. If I clear my browser
tomorrow, is the work gone or just the shortcut? I'd guess just the shortcut, because the path is
a real folder. Let me see the full path."

    ... --click "Close project" --hover "Les Mis practice"

(09.png) "Nothing pops up when I rest on it. Can't see the whole file name. Annoying but not
fatal."

## Step 7 -- bring it back tomorrow

"It's tomorrow. Click it in Recent projects."

    ... --click "Close project" --click "Les Mis practice"

(08.png) "There it is. 'Les Mis practice' in the title, the same list on the left -- PageRank,
Louvain, the two shortest paths, Watchlist, 'For the report' with Group 2 and Group 8, notes
4 items. Same picture. Good, it all came back."

## Commands run (full form)

From /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype,
with OUT=/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t14--data-journalist:

1. `timeout 120 node app-b/study.mjs --try $OUT/01.png task:r8-t14 --click "No thanks" --click "Les Miserables"`
2. `timeout 120 node app-b/study.mjs --try $OUT/02.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables"`
3. `timeout 120 node app-b/study.mjs --try $OUT/03.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..."`
4. `timeout 120 node app-b/study.mjs --try $OUT/04.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --type "Les Mis practice" --click "Save"`
5. `timeout 120 node app-b/study.mjs --try $OUT/05.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key "Control+a" --type "Les Mis practice"`
6. `timeout 120 node app-b/study.mjs --try $OUT/06.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key "Control+a" --type "Les Mis practice" --click "Save"`
7. `timeout 120 node app-b/study.mjs --try $OUT/07.png task:r8-t14 ... --click "Save" --click "Les Mis practice" --click "Close project"`
8. `timeout 120 node app-b/study.mjs --try $OUT/08.png task:r8-t14 ... --click "Close project" --click "Les Mis practice"`
9. `timeout 120 node app-b/study.mjs --try $OUT/09.png task:r8-t14 ... --click "Close project" --hover "Les Mis practice"` (printed "tooltip: null")

## Verdict

- Succeeded? Yes. Saved as "Les Mis practice", closed, reopened from Recent projects with the
  work intact.
- Single Ease Question: 5 of 7. Finding Save under the project name took a guess, the name box
  didn't select the old name so my first try produced a garbled name, and nothing said "saved" or
  where until after I closed the project.
- Would I use it instead of what I use now? For this part, maybe. Saving to a file in my
  Documents folder that I can see is what I want -- I can back it up and nothing leaves the
  machine. But I'd want the save box to tell me the folder, and a "Saved" message, before I'd
  trust it with an unpublished story.

## Problems seen

1. Save as dialog does not say where the project goes (only a Name field). Location appears only
   later, truncated, on the start page. (03.png, 07.png)
2. Save as name field does not select the suggested name; typing prepends to "Les Miserables
   copy", giving "Les Mis practiceLes Miserables copy". (04.png)
3. No confirmation after Save: the title changes, nothing else. (06.png)
4. Recent project path is truncated ("~/Documents/graphty/Les ...") and resting the pointer shows
   nothing. (07.png, 09.png)
5. "This list is kept in this browser" next to a Documents path leaves me unsure whether
   clearing the browser loses the work or only the list entry. (07.png)
6. No File menu; the save commands live under the project name, found by guessing. (01.png, 02.png)
