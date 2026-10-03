# Session: save, close and reopen the Les Miserables sample -- Tom, the lab manager who receives files

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Open it, then imagine you have worked on it for an hour and must stop for the day.
Make sure the work is kept on this computer under a name you choose, put it away as you would at the
end of the day, and then bring it back as if it were tomorrow."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t14--recipe-recipient/`. The starting screen is `shots/tasks/r8-t14/01.png`.

## Step 1 -- the start screen (01.png, given)

"OK. A start page. On the left there's Open and New, in the middle there's 'Recent projects', which
is empty, and on the right there's a list of samples. Les Miserables is the first one, good, easy to
find. 'Files are read on this computer and never uploaded.' I read that one twice. Good.

There's a box across the bottom asking if I'll share usage data. 'We will never see the data you
analyze.' Fine, but I'm not saying yes to anything I haven't cleared with IT. No thanks. Then Les
Miserables."

## Step 2 -- decline usage data, open the sample (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t14 --click "No thanks" --click "Les Miserables"

"Right, a picture came up. Orange dots, some names. There's a long list down the left: PageRank,
Louvain, shortest paths, density, link prediction... I don't know most of those and I'm not going to
learn them today. It says it opens with worked examples already in it, so this is the 'hour of work'
I'm pretending I did.

Now, saving. I'm looking for File. There's no File menu across the top. Top says 'Les Miserables'
with a little arrow, undo, redo, 'Local only' -- I like 'local only' -- and 'Full graph'."

## Step 3 -- looking for File (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "File"

"I clicked what I thought was File and instead one of the rows in the left list got highlighted, the
'Labels shown...' one, and a black tag came up saying 'Labels shown anyway (this file): Valjean.
Opens in the inspector (not available yet)'. That's not what I wanted. I hope I didn't change
anything. Nothing seems to have moved. OK, first miss. Let me try the three lines in the corner,
that's usually the menu on my phone."

## Step 4 -- the three-line menu (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Menu"

(The tool reported that "Menu" matched two controls, "Main menu" and "Les Miserables, project menu",
and clicked the first.)

"There we go. New project, Open recent, Open project or file, Save, Export, 'Apply recipe or style
file', Version history, then some selection things I don't understand, Settings, Help. Save is right
there with Ctrl+S. That's the one."

## Step 5 -- Save (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Save"

"It said 'Saved', a little black tag near the bottom. But it didn't ask me for a name and it didn't
tell me where. And the menu is still open, which made me wonder if it really did anything. The
title still says 'Les Miserables'. The moderator said 'under a name you choose'. Saved as what? Saved
where? On a Windows machine Save would have popped up a box the first time. Did it just save over
the sample? I'd rather not have done that.

Let me try the arrow next to the name at the top. Maybe that's where the name is."

## Step 6 -- the project name menu (06.png)

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Save" --key Escape --click "Les Miserables, project menu"

"Another menu. Rename, Open, Save, Export, Apply recipe, Version history -- same as the other one,
mostly -- and then down at the bottom, 'Save as...' and 'Close project'. 'Save as' is what I wanted
in the first place. Why is it down here and not in the other menu next to Save? I nearly didn't find
it. Two menus with almost the same things in them -- I'd never remember which one has what."

## Step 7 -- Save as (07.png)

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Save" --key Escape --click "Les Miserables, project menu" --click "Save as..."

"'Save Les Miserables as'. A box with Name, 'Les Miserables copy'. Fine. I'll call it my own name and
the date. It doesn't say where it's going to go, though -- no folder. On my laptop I'd want to know
it's not going to the shared drive or somewhere outside."

## Step 8 -- type a name and save, first try (08.png)

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Save" --key Escape --click "Les Miserables, project menu" --click "Save as..." --type "Tom practice Oct 2" --click "Save"

"Oh, for heaven's sake. The title now says 'Tom practice Oct 2Les Miserabl...'. It stuck my words in
front of the old name instead of replacing it. The old name wasn't highlighted when the box opened,
so I typed in front of it. And no 'Saved' this time either, just the new title. Second thing that
went wrong. I'll do it once more, properly this time, wiping the box first."

## Step 9 -- Save as again, clearing the box (09.png)

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Save" --key Escape --click "Les Miserables, project menu" --click "Save as..." --key Control+a --type "Tom practice Oct 2" --click "Save"

"There. Title says 'Tom practice Oct 2'. Picture is the same, list on the left is the same. Still no
confirmation that tells me where it went, but the name is right. 'Local only' is still at the top,
so I'll take it that it's on this machine."

## Step 10 -- put it away (10.png)

    timeout 120 node app-b/study.mjs --try .../10.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Save" --key Escape --click "Les Miserables, project menu" --click "Save as..." --key Control+a --type "Tom practice Oct 2" --click "Save" --click "project menu" --click "Close project"

"Close project, in the name menu. It didn't ask me 'do you want to save?', which I suppose means it
already had everything. Back to the start page -- and now Recent projects has 'Tom practice Oct 2,
77 nodes, ~/Documents/graphty/Tom ...', 'Today 19:20'. That's the first time it told me where the
file lives: in Documents. That's what I wanted to see right after I saved, not now. And the folder
path is cut off, so I can't read the whole file name.

It also says 'This list is kept in this browser.' So the list is in the browser but the file is in
Documents? If IT wipes my browser, do I lose the list, the file, or both? I'd ask the postdoc."

## Step 11 -- bring it back tomorrow (11.png)

    timeout 120 node app-b/study.mjs --try .../11.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Save" --key Escape --click "Les Miserables, project menu" --click "Save as..." --key Control+a --type "Tom practice Oct 2" --click "Save" --click "project menu" --click "Close project" --click "Tom practice Oct 2"

"Clicked it under Recent. It came back: 'Tom practice Oct 2' at the top, the same orange picture,
the same list on the left, same names on the dots. Looks like exactly what I left. Good.

One thing nags me: that first plain Save, before I found Save as. Only my copy shows in Recent. So
where did that first Save go? Did it change the Les Miserables sample, or nothing? Nobody told me."

## Wrap-up

**Did I succeed?** Yes, I think so. It's kept under my name, I closed it, and it came back looking the
same. But I got there on the third go, and I'm not sure what my first Save did.

**Single Ease Question (1 = very difficult, 7 = very easy): 4.**
The opening and the reopening were easy -- the sample was right there and my file was right there
under Recent. The middle was the problem:
- Save didn't ask for a name or say where, and left its menu open, so I couldn't tell what it did.
- 'Save as' wasn't next to Save in the three-line menu; it was in a different menu under the title.
  Two menus with nearly the same things in them.
- The name box didn't clear when I started typing, so my first name came out as a mash-up.
- It only told me the file was in Documents after I'd closed it.
- 'This list is kept in this browser' next to a Documents path -- I don't know which part I'd lose
  if the browser got cleared.

**Would I use this instead of what I use now?** For opening something the postdoc sends, maybe -- it
opened without installing anything, it says 'Local only' and 'never uploaded', and that matters to
me more than anything else on the screen. For saving my own work, I wouldn't trust it yet. I'd want
it to tell me, the moment I save, the name and the folder, the way Excel does. Until then I'd keep
emailing her and asking for a PNG.
