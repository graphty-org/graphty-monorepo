# Session: save, put away and reopen the Les Miserables sample -- Grace, nonprofit operations analyst

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Open it, then imagine you have worked on it for an hour and must stop for the day. Make sure
the work is kept on this computer under a name you choose, put it away as you would at the end of
the day, and then bring it back as if it were tomorrow."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t14--nonprofit-operations-analyst/. Below, S stands for that folder.

## 01 -- start screen (shots/tasks/r8-t14/01.png)

"OK, a start page. Open, New from data, and on the right a list of samples. Les Miserables is the
first one, 77 characters. Good. There is a big box at the bottom asking about usage data. It says
it will 'never see the data you analyze' -- fine, but I am not sharing anything from a work laptop
until someone in IT tells me I can. No thanks. I do like 'Files are read on this computer and
never uploaded' on the left. That is the sentence I would want for donor names."

## 02 -- open the sample

    timeout 120 node app-b/study.mjs --try S/02.png task:r8-t14 --click "No thanks" --click "Les Miserables"

"Wow, that is a lot at once. A list on the left with PageRank, Louvain, Shortest paths, Link
prediction... I do not know what half of these are. The picture in the middle is orange dots.
OK, the task says pretend I worked an hour, so I will not touch anything. Now I want to save.
In Excel that is File, then Save As. There is no File menu. The name 'Les Miserables' up top has
a little arrow, and there is a three-line button in the corner. I'll try the name with the arrow
first, because in Word online that is where you rename and save."

## 03 -- the project name menu

    timeout 120 node app-b/study.mjs --try S/03.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables"
    timeout 120 node app-b/study.mjs --try S/03b.png task:r8-t14 --click "No thanks" --click "Les Miserables" --hover "Menu"

"There it is: Rename, Open, Save Ctrl+S, Export, Version history, Save as, Close project. That
is basically a File menu, just hiding under the name. I would not have guessed to click the name
if I had not seen this in Office online. (I also rested on the three-line button: it just says
'Main menu', which tells me nothing.) The task says 'under a name you choose', so Save as."

## 04 -- Save as dialog

    timeout 120 node app-b/study.mjs --try S/04.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..."

"Small box: Name, 'Les Miserables copy'. Only a name. It does not say WHERE it saves -- is this
my Documents folder, the browser, the cloud? The top bar says 'Local only', so I guess this
computer. I'll just type my name over it."

## 05 -- typed the name, saved (first attempt)

    timeout 120 node app-b/study.mjs --try S/05.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --type "Grace practice Oct 2" --click "Save"

"Ugh. The name at the top now reads 'Grace practice Oct 2Les Misera...'. It did not replace the
old name, it stuck my words in front of it. In Excel the suggested name is highlighted, so you
just type. I would have to go fix that. Let me redo it and clear the box first."

## 06 -- select the box first, then type

    timeout 120 node app-b/study.mjs --try S/06.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Grace practice Oct 2"

"Ctrl+A, then type. Now the box says 'Grace practice Oct 2'. Good."

## 07, 08 -- saved, look at the menu again

    timeout 120 node app-b/study.mjs --try S/07.png task:r8-t14 [steps above] --click "Save"
    timeout 120 node app-b/study.mjs --try S/08.png task:r8-t14 [steps above] --click "Save" --click "Grace practice Oct 2"

"The name at the top changed to 'Grace practice Oct 2'. But nothing said 'Saved' -- no little
message, no checkmark. I am trusting the title change. I open the menu again looking for the
equivalent of closing the workbook: 'Close project'. That is how I put it away."

(The first try at the next step failed on my own typing of the quotes and said nothing was called
that; I reran it correctly. That was my mistake, not the program's.)

## 09 -- closed

    timeout 120 node app-b/study.mjs --try S/09.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Grace practice Oct 2" --click "Save" --click "Grace practice Oct 2" --click "Close project"

"Back to the start page. It did not ask me 'do you want to save', which is right since I just
saved. Under Recent projects: 'Grace practice Oct 2, 77 nodes, ~/Documents/graphty/Grac...,
Today 19:20'. OK, so that IS a file in my Documents folder. That is reassuring -- I can find it
and back it up. But right under it, it says 'This list is kept in this browser.' So... is my
work in the browser or in Documents? I think it means only the list is in the browser, and the
file is in Documents. If IT clears my browser, I would lose the list but not the file? I am
guessing. I would want the path shown in full, or a 'show in folder'. The path got cut off."

## 10 -- next day: reopen

    timeout 120 node app-b/study.mjs --try S/10.png task:r8-t14 [steps above] --click "Grace practice Oct 2"

"Tomorrow, I open the program, there it is in the recent list, click it. Same picture, same list
on the left, the name 'Grace practice Oct 2' at the top, 77 nodes. Everything seems to be where
I left it. Done."

## Wrap-up

**Did I succeed?** Yes, I think so. It saved under my name, closed, and came back.

**Single Ease Question (1-7):** 5. Save, close and reopen were all in one menu with the usual
keyboard shortcuts, and the recent list made coming back easy. I lost points on: the File menu
hiding under the project name; the Save as box not clearing the old name, so my first save got a
garbled name; no "Saved" message; and the mixed message between "~/Documents/graphty" and "This
list is kept in this browser".

**Would I use this instead of my current tool?** For this part, saving and coming back, it is
about as easy as Excel, so it would not stop me. But it would not decide it either -- what
decides it is whether I can bring in my donor export and refresh it next quarter. The fact that
my file sits in Documents and nothing is uploaded is a plus I could tell my director about.

## Problems seen

1. Save as box: the suggested name "Les Miserables copy" is not selected, so typing put my name
   in front of it ("Grace practice Oct 2Les Misera..."). (05)
2. No confirmation after Save as; only the title changed. (07)
3. The save dialog does not say where the work goes; I only learned it was ~/Documents/graphty
   after closing, and the path was cut off. (04, 09)
4. "This list is kept in this browser" next to a Documents path made me unsure where my work
   actually lives. (09)
5. Save and Close are under the project name; nothing looks like a File menu, and the three-line
   button's tooltip "Main menu" does not say what is in it. (03)
