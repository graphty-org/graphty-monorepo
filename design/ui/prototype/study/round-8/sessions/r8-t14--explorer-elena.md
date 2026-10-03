# Session: save, close and reopen a project -- Explorer Elena

Task given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Open it, then imagine you have worked on it for an hour and must stop for the day.
Make sure the work is kept on this computer under a name you choose, put it away as you would at
the end of the day, and then bring it back as if it were tomorrow."

Participant: Explorer Elena (first-time graph user, product manager). Start screen:
shots/tasks/r8-t14/01.png. Renders: tmp/round-8-sessions/r8-t14--explorer-elena/.

All commands were run from design/ui/prototype. P = /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype

## Step 0 -- the start screen (shots/tasks/r8-t14/01.png)

"OK, a start page. There's a big box at the bottom asking about usage data -- no thanks, I just want
to try it. On the right there are samples, and the first one is Les Miserables. Good, that's the
one they told me. 'Files are read on this computer and never uploaded' -- fine, nice to know."

## Step 1 -- dismiss the data box and open the sample (01.png)

    timeout 120 node app-b/study.mjs --try P/tmp/round-8-sessions/r8-t14--explorer-elena/01.png task:r8-t14 --click "No thanks" --click "Les Miserables"

"Whoa, that's a lot of stuff. Dots and lines in the middle, a long list on the left with things
like PageRank and Louvain I don't know, and numbers on the right. Valjean is in the middle, so I
guess he's the main character -- that makes sense, he's the hero. Anyway, I'm pretending I worked
on this for an hour. Now I need to save it with my own name. Where's save? There's no File menu
like in Excel... The name 'Les Miserables' up top has a little arrow next to it. Google Docs puts
stuff under the name, so let me try that."

## Step 2 -- click the project name (02.png)

    timeout 120 node app-b/study.mjs --try P/tmp/round-8-sessions/r8-t14--explorer-elena/02.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables"

"There it is. Rename, Open, Save, Export, Version history, Save as, Close project. OK, this is
basically a File menu. I want my own name, so 'Save as' -- 'Save' would probably just save it as
Les Miserables and I don't want to mess up their sample."

## Step 3 -- Save as (03.png)

    timeout 120 node app-b/study.mjs --try P/tmp/round-8-sessions/r8-t14--explorer-elena/03.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..."

"A little box: 'Save Les Miserables as', Name, and it says 'Les Miserables copy'. I'll just type my
name."

## Step 4 -- type a name and Save (04.png)

    timeout 120 node app-b/study.mjs --try P/tmp/round-8-sessions/r8-t14--explorer-elena/04.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --type "Elena practice" --click "Save"

"Hm. The name at the top says 'Elena practiceLes Miserables c...'. It stuck my words in front of the
old name. I thought typing would replace it -- usually the name is highlighted when the box opens.
I probably clicked wrong. And did it even save? Nothing said 'saved'. Let me do that again and
select everything in the box first."

## Step 5 -- redo with the old text selected (05.png)

    timeout 120 node app-b/study.mjs --try P/tmp/round-8-sessions/r8-t14--explorer-elena/05.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+A --type "Elena practice" --click "Save"

"OK, now it says 'Elena practice' at the top. Better. Still nothing told me it's saved, or where it
went. There's a 'Local only' thing up there with a little laptop -- I guess that means it's on my
computer? I'm going to trust it."

## Step 6 -- put it away for the day (06.png)

    timeout 120 node app-b/study.mjs --try P/tmp/round-8-sessions/r8-t14--explorer-elena/06.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+A --type "Elena practice" --click "Save" --click "Elena practice" --click "Close project"

"'Close project' is in the same menu, so that's putting it away. It didn't ask me if I wanted to
save, which I guess means it's saved? Back at the start page, and now under Recent projects there's
'Elena practice, 77 nodes, ~/Documents/graphty/Elen...', Today 19:18. OK, so it IS a file in my
Documents folder. That's reassuring -- I can't read the whole path though, it's cut off. And it
says 'This list is kept in this browser.' Wait, so if IT clears my browser does my project go away,
or just the list? I think the file is in Documents so it's fine. I think."

## Step 7 -- bring it back "tomorrow" (07.png)

    timeout 120 node app-b/study.mjs --try P/tmp/round-8-sessions/r8-t14--explorer-elena/07.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+A --type "Elena practice" --click "Save" --click "Elena practice" --click "Close project" --click "Elena practice"

"Click it in Recent... and it's back. 'Elena practice' at the top, same picture, same list on the
left, PageRank is still picked on the right. Looks like exactly what I had. Done."

## Wrap-up

**Did I succeed?** Yes, I think so. It's saved as "Elena practice", it showed up in Recent projects,
and it came back looking the same.

**Single Ease Question (1-7):** 6. The menu under the name was where I'd look in Google Docs, and
Recent projects made coming back easy. I lost a point because typing the name glued it onto the
old one, and because nothing ever said "saved".

**Would I use this instead of my current tool?** For saving and coming back -- sure, it worked like
a normal app, no account, no install. But that's not why I'd use it. I still don't know what
PageRank or Louvain mean, so whether I'd use it at all depends on whether I can get something out
of it for a meeting, not on whether it saves.

## Observations for the study team

- Found the save commands on the first guess: the menu under the project name reads as a File
  menu.
- The Save as name field opened with "Les Miserables copy" not selected, so typing put the new
  name in front of the old one ("Elena practiceLes Miserables c..."). She blamed herself and redid
  it with select-all. (The click-through tool may place the cursor differently than a real
  browser; check whether the default name is selected when the dialog opens.)
- No confirmation after Save as or on Close: she inferred "saved" from the absence of a prompt on
  close and from the Recent projects entry, not from anything that said so.
- The Recent projects entry gave the most reassurance (name, size, path, time), but the path is
  cut off, and "This list is kept in this browser" raised a worry about whether the project
  itself lives in the browser or in Documents.
- She misread an encoding along the way: "Valjean is in the middle, so he's the main character".
