# Session: save, put away and reopen the Les Miserables sample -- Nadia, level-1 alert reviewer

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. Open it, then imagine you have worked on it for an hour and must stop for
the day. Make sure the work is kept on this computer under a name you choose, put it away as you
would at the end of the day, and then bring it back as if it were tomorrow."

Renders are in tmp/round-8-sessions/r8-t14--alert-reviewer/ (under design/ui/prototype/).
Every command was run from design/ui/prototype and replays from the start screen. The ROOT
below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t14--alert-reviewer

## Start screen (shots/tasks/r8-t14/01.png)

"OK. Open, new, recent projects -- empty -- and samples on the right. Les Miserables is the
first one, fine. There's a box at the bottom asking about usage data. Bank laptop, I'm not
sharing anything with anyone. No thanks. Then the Les Mis one."

## Step 1 -- decline usage data, open the sample

    timeout 120 node app-b/study.mjs --try ROOT/01.png task:r8-t14 --click "No thanks" --click "Les Miserables"

"That's a lot. A list on the left with PageRank, Louvain, shortest paths, a watchlist... I don't
know what half of these are and the task doesn't need me to. I'm pretending I worked an hour.
Now I need to save it. No File menu. The name 'Les Miserables' up top has a little arrow --
in most programs that's where the file stuff hides."

## Step 2 -- the name at the top

    timeout 120 node app-b/study.mjs --try ROOT/02.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables"

"There it is. Rename, Open, Save, Export, Version history, Save as, Close project. Good, that's
a normal file menu. I want my own name, so Save as -- if I hit Save on a sample I don't know
what it overwrites."

## Step 3 -- Save as

    timeout 120 node app-b/study.mjs --try ROOT/03.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..."

"Name: 'Les Miserables copy'. One box, Cancel, Save. It doesn't say where it's saving to. The
task said on this computer -- the top bar says 'Local only', so I guess it's local. I'll type
my own name."

## Step 4 -- type a name

    timeout 120 node app-b/study.mjs --try ROOT/04.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --type "Practice - Les Mis"

"Ugh. It says 'Practice - Les MisLes Misera...'. It stuck my text in front of the old name. In
Windows the name is usually highlighted so you just type over it. Fine, select all first."

## Step 5 -- select all, then type

    timeout 120 node app-b/study.mjs --try ROOT/05.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Practice - Les Mis"

"'Practice - Les Mis'. Good. Save."

## Step 6 -- Save

    timeout 120 node app-b/study.mjs --try ROOT/06.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Practice - Les Mis" --click "Save"

"The name at the top changed to 'Practice - Les Mis'. That's it? No 'saved', no tick, no file
location. I assume it worked because the name changed. I'd want something telling me where the
file went -- if QA asked me where my working is, I couldn't tell them right now."

## Step 7 -- put it away (Close project)

    timeout 120 node app-b/study.mjs --try ROOT/07.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Practice - Les Mis" --click "Save" --click "Practice - Les Mis" --click "Close project"

"End of day, I close it. Same menu, Close project. It didn't ask me anything, which I suppose
means it thought everything was saved. Back on the start page, and under Recent projects:
'Practice - Les Mis, 77 nodes, ~/Documents/graphty/Prac...' Today 19:19. OK, so NOW I see it
went into Documents, in a graphty folder. Cut off, but fine.

Then underneath: 'This list is kept in this browser.' Hm. So is my work in the browser or in
Documents? I read that as: the file is in Documents, the list is the browser's. But if IT wipes
the browser, does the list go and I have to dig in Documents? Probably. I'd remember Documents."

## Step 8 -- tomorrow: reopen

    timeout 120 node app-b/study.mjs --try ROOT/08.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Practice - Les Mis" --click "Save" --click "Practice - Les Mis" --click "Close project" --click "Practice - Les Mis"

"Click it in Recent. It's back: 'Practice - Les Mis' at the top, same list on the left, same
picture. Looks like where I left it. I didn't actually change anything in my pretend hour, so
I can't swear my changes would be in there, but everything the sample had is there. Done."

## After the task

Did I succeed? Yes, I think so. Saved under my name, closed, reopened from the recent list, and
it came back the same.

Single Ease Question (1 = very difficult, 7 = very easy): 6.

What cost me the point:
- Save as did not highlight the old name, so my typing went in front of it and I had to
  select-all and retype.
- After Save nothing told me it saved or where. I only found out it went to
  ~/Documents/graphty/ when I was back on the start page, and that path is cut off.
- "Local only" at the top and "This list is kept in this browser" on the start page made me
  stop and wonder whether the work lives in the browser or on the disk.

Would I use this instead of my current tool? Not for this; saving isn't my problem, and I don't
pick the tools anyway. Saving and reopening was about as quick as a Word document, which is the
right amount of time. If Sarah's team used it on escalations, I wouldn't be scared of losing work
in it. What I'd still want to know before trusting it with an alert file: whether the saved file
is something I can attach or point QA to, and whether "kept in this browser" means IT's browser
cleanup could lose it.
