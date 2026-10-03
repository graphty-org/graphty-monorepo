# Session: save, put away and reopen the Les Miserables sample -- the class-project student (Dev)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Open it, then imagine you have worked on it for an hour and must stop for the day. Make sure
the work is kept on this computer under a name you choose, put it away as you would at the end of
the day, and then bring it back as if it were tomorrow."

All commands were run from `design/ui/prototype`. `D` is
`tmp/round-8-sessions/r8-t14--class-project-student` (absolute path used in the real runs).
Each run replays from the start screen.

## 01 -- start screen (shots/tasks/r8-t14/01.png)

Reading everything first, like I always do. Left: "Open project or file...", "New from data...".
Middle: "Recent projects" -- empty, "They are kept in this browser." Right: samples, and Les
Miserables is right on top, "77 characters", "Opens with worked examples". Good, that is the one.
There is a big box at the bottom asking to share usage data. I don't want to share anything for a
class thing, so "No thanks", then the sample.

## 02 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t14 --click "No thanks" --click "Les Miserables"

OK, a network with names on it, orange dots, a long list on the left (PageRank, Louvain, Shortest
paths, Betweenness...). That's a lot of stuff already done -- that's the "hour of work" I'm
pretending I did. Now I need to save. I don't see a Save button or a File menu anywhere. In Word
I'd just press Save, so let me just try that.

## 03 -- look for "Save"

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Save"

Result: nothing on screen is called "Save". Hm. There's the three-lines icon in the top left;
that's usually the menu on websites.

## 04-05 -- the three-lines menu

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t14 --click "No thanks" --click "Les Miserables" --hover "Menu"
    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu"

Tooltip says "Main menu". It opens: New project, Open recent, Open project or file, Save (Ctrl+S),
Export, Apply recipe or style file, Version history, Settings, Help. There's Save. Weird though --
the panel on the right changed from PageRank to some "Co-appearances" summary when I opened the
menu. Not sure what I did.

## 06 -- Save from the main menu

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Save"

A little black "Saved" pops up at the bottom. But it never asked me for a name, and the title still
says "Les Miserables". Saved where? As what? The task said a name I choose. In Word, the first save
asks you for a name; this one didn't. So I don't think I'm done. Maybe the arrow next to the title
"Les Miserables" does something -- in Google Docs you click the title to rename.

## 07 -- the title's menu

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables, project menu"

A second menu: Rename (F2), Open project or file, Save, Export, Apply recipe, Version history,
Save as..., Close project. So there are two menus with mostly the same stuff in them? Confusing,
but "Save as..." is what I know from Word for giving it a name. Rename might only change the label,
so Save as feels safer.

## 08-10 -- Save as, type my name

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables, project menu" --click "Save as..."
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables, project menu" --click "Save as..." --type "Dev - Les Mis practice"
    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables, project menu" --click "Save as..." --key Control+a --type "Dev Les Mis practice"

A small box: "Save Les Miserables as", Name: "Les Miserables copy". I just started typing and it
went in FRONT of the old name: "Dev - Les Mis practiceLes M...". Ugh. Usually the old name is
highlighted so you type over it. Did it again with select-all first; now it says
"Dev Les Mis practice". There is no folder picker, just a name. Where does this go?

## 11 -- confirm

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables, project menu" --click "Save as..." --key Control+a --type "Dev Les Mis practice" --click "Save"

Box closed, title at the top now says "Dev Les Mis practice". No "Saved" message this time, which
is odd since the plain Save had one. I'll believe it because the name changed. It says "Local only"
up top, so I guess it's on my computer.

## 12 -- put it away: Close project

    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables, project menu" --click "Save as..." --key Control+a --type "Dev Les Mis practice" --click "Save" --click "Dev Les Mis practice, project menu" --click "Close project"

"Close project" was in the title menu. It went back to the start screen without asking anything,
and now Recent projects shows "Dev Les Mis practice, 77 nodes, ~/Documents/graphty/Dev ...,
Today 19:21". OK so it IS a file in my Documents folder -- that's reassuring, I could find it. But
the line under it says "This list is kept in this browser", and the first screen said projects are
"kept in this browser". So is my work in the browser or in Documents? If I clear my browser
history, do I lose it? I think the file is in Documents and only the list is in the browser, but I
had to work that out. The path is also cut off with "..." so I can't see the actual file name.

## 13 -- tomorrow: reopen

    timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables, project menu" --click "Save as..." --key Control+a --type "Dev Les Mis practice" --click "Save" --click "Dev Les Mis practice, project menu" --click "Close project" --click "Dev Les Mis practice"

Clicked it in Recent projects. Same picture, same names and colors, same list on the left,
title "Dev Les Mis practice". That's what I left. Done.

## Wrap-up

- **Did I succeed?** Yes, I think so. Saved under my own name, closed it, opened it back and it
  looks the same.
- **Single Ease Question:** 5 out of 7. The first Save tricked me: it said "Saved" but never asked
  for a name, so I had to go hunting in a second menu for Save as. Then the name box made me
  type in front of the old name. Closing and reopening was easy once I found them.
- **Would I use this instead of my current tool (Gephi from the tutorial)?** For saving, maybe --
  it is less scary than Gephi, and the Recent projects list with the date is nice for the night
  before the deadline. But I'd want one place for Save / Save as / Close; having two menus that
  both have Save and Open but only one of them has Save as and Close made me feel like I was
  missing something. And I'd want it to tell me plainly "your project is the file at
  Documents/graphty/..." instead of also saying "kept in this browser".

## Problems seen

1. Plain Save on a never-named sample says "Saved" without asking for a name or saying where. I
   thought I might be done when I wasn't.
2. Save as and Close project live only in the title's menu; the main menu has Save, Open, Export
   and Version history too, but not those two. Two menus, overlapping, neither complete.
3. Save as name box does not select the suggested name, so typing goes in front of it.
4. Save as gives no confirmation and never shows where the file went until you close the project.
5. Start screen says projects are "kept in this browser" while the recent entry shows a
   ~/Documents path -- mixed message about where my work lives. Path is cut off.
6. Opening either menu swapped the right-hand panel from PageRank to a graph summary; I did not
   mean to change anything.
