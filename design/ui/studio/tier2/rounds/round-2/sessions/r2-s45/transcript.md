# Session r2-s45 -- Dev (returning student), task T19, dataset A (running club, friends.csv)

Build: frozen build 8f0d5a6f7791 (`.study-builds/tier2-r2d4-8f0d5a6f7/`). Tool commands run from `design/ui/studio/tool`, with `S=../tier2/rounds/round-2/sessions/r2-s45` and `REAL_DIST` set to the frozen build.

## Step 1 -- start

    REAL_DIST=<frozen build> node real.mjs --start $S setup:friends-ranked.txt

Screenshot 01.png. Okay, it's the running club map from last time: dots colored and sized by PageRank, the key in the top left, a PageRank panel on the right. Two reminders, one on Farah and one for the whole club. Wait -- on the far left there is a rail with Graph, Data and... "Notes". I never clicked that before. That looks like exactly the place. I'll try Notes first.

## Step 2

    node real.mjs --step $S --click "Notes"

Screenshot 02.png. A Notes panel: "No notes." and a little plus next to the heading. That's the place. I'll hover the plus first to see what it says, then click it.

## Step 3

    node real.mjs --step $S --hover-at 276,60

Screenshot 03.png. Tooltip: "Add note N". Nice, N is a shortcut. (The pointer stayed an arrow, not a hand, over the button -- small thing.) I'll click it and see if it lets me pick who the note is about.

## Step 4

    node real.mjs --step $S --click "Add note"

Screenshot 04.png. A box opened with "About PageRank" above it, and Cancel / Save note. Wait -- "About PageRank"? I didn't pick PageRank, it just grabbed whatever is open on the right. Neither of my reminders is about PageRank: one is about Farah, one is about the whole club. Can I change what it's about? I'll hover "About PageRank" to see if it's a control.

## Step 5

    node real.mjs --step $S --hover-at 118,91

Screenshot 05.png. Nothing -- it's just a label, not a menu. So the note is about whatever is picked on the right. I guess I need to pick Farah first. I'll cancel, go back to Graph, and search for Farah in the find box (the names aren't drawn on the dots, so I can't click her directly).

## Step 6

    node real.mjs --step $S --click "Cancel" --click "Graph"

Screenshot 06.png. Back on the Graph list: Selection, PageRank, Everything, and the find box. I'll type Farah into "Find nodes, edges, values".

## Step 7

    node real.mjs --step $S --click "Find nodes, edges, values" --type "Farah"

Screenshot 07.png. Found her: "Nodes 1 -- Farah", plus her four ties. I'll click Farah so she's what's picked.

## Step 8

    node real.mjs --step $S --click "role=option:Farah"

Screenshot 08.png. Farah is ringed in yellow at the bottom and the right side now says "Farah, Node", PageRank #1 of 20. Oh nice, she's the top one. Now back to Notes and Add note -- it should say "About Farah" this time.

## Step 9

    node real.mjs --step $S --click "Notes" --click "Add note"

Screenshot 09.png. "About Farah" -- yes! The box looks ready to type in. I'll type her reminder and press Save note.

## Step 10

    node real.mjs --step $S --type "Moving away in May; ask who takes over the Tuesday run" --click "Save note"

Screenshot 10.png. Oh nice, that's it: the note is in the list with a "Farah" tag and today's date, and the right side under Farah now says "1 note". Now the club one. It has to be about the whole club, not about Farah, so I need to un-pick her first. I'll click on empty background and then Add note again to see what it says it's about.

## Step 11

    node real.mjs --step $S --click-at 1100,820 --click "Add note"

Screenshot 11.png. Farah's ring is gone, the right side says "Graph, From friends.csv" with 20 nodes and 41 edges, and the new box says "About Graph". That's the whole club. Typing the second reminder and saving.

## Step 12

    node real.mjs --step $S --type "Spring list, checked against the sign-up sheet" --click "Save note"

Screenshot 12.png. Both reminders are in the Notes list: the club one tagged "Graph", Farah's tagged "Farah". Now, will they still be here next time? Last assignment I saved the project from the menu. Up top it says "friends" and "Local only" -- I don't know if that means it's already kept. I'll hover "Local only" first to see what it means.

## Step 13

    node real.mjs --step $S --hover "Local only"

Tooltip: "Nothing is sent. Opens Settings > Privacy". Okay, that's about privacy, not about saving. So I still don't know if my notes are kept. I'll open the menu (the three lines top left) like I did when I saved last time.

## Step 14

    node real.mjs --step $S --click-at 23,20

Screenshot 14.png. The menu: Save, Save as..., Save local copy..., Export... I'll just do Save like last time.

## Step 15

    node real.mjs --step $S --click "Save"

Screenshot 15.png. A box: "Save friends as", Name "friends". Wait, it's asking for a name like it was never saved? I thought I saved this last time. Maybe it's a new copy. Whatever -- "friends" is fine, pressing Save.

## Step 16

    node real.mjs --step $S --click "role=button:Save"

Screenshot 16.png. "Saved friends in this browser." Okay. But I want proof, deadline nerves. I'll close it and open the program again like I would tomorrow.

## Step 17

    node real.mjs --step $S --reopen

Screenshot 17.png. Start screen. Under Recent projects: "friends -- In this browser - 20 nodes - Oct 9, 8:55 PM". Under it: "This browser can clear projects kept here. Save a local copy of any project you need to keep." Wait, so it might disappear? Uh oh. First let me open it and check my notes are in there.

## Step 18

    node real.mjs --step $S --click "friends"

Screenshot 18.png. "Opened friends". The colors and sizes are back, and the right side still says "From friends.csv, 1 note". The drawing moved a little but that's fine. Clicking Notes to see both reminders.

## Step 19

    node real.mjs --step $S --click "Notes"

Screenshot 19.png. Both reminders are back: "Spring list, checked against the sign-up sheet" (Graph) and "Moving away in May; ask who takes over the Tuesday run" (Farah). Phew. But the start screen said the browser can clear projects, so to be safe before the deadline I'll also do "Save local copy..." from the menu, like it told me to.

## Step 20

    node real.mjs --step $S --click "Main menu" --click "Save local copy..."

Screenshot 20.png. The browser downloaded friends.graphty.json (8,416 bytes). The app itself didn't show any "saved" message this time -- I only know because the download showed up. Okay, I'm done. Where I'd read them next time: the Notes button on the left rail; Farah's also shows as "1 note" on her panel when I pick her, and "1 note" on the Graph panel for the club one.

    node real.mjs --end $S

## At the end (in character)

**Did I finish?** Yes. Both reminders are in, the Farah one tagged "Farah" and the club one tagged "Graph", and after closing and reopening the program they were both still there under Notes. I also saved a copy to my computer in case the browser clears things.

**Ease:** 5 out of 7.

**What confused me:**

- When I first pressed "Add note" it said "About PageRank" -- it just stuck the note on whatever was open on the right, and there's no way to change it inside the note box. I had to cancel, go find Farah with the search box, pick her, then add the note again. And for the club note I had to guess that clicking empty background would make it "About Graph". It worked, but I figured it out by trial; nothing told me "pick what the note is about first".
- I couldn't click Farah on the drawing because the names aren't shown on the dots, so I needed the search box to pick her.
- I thought I'd saved this project last time, but Save asked me for a name like it was brand new ("Save friends as"). Then "Saved friends in this browser" -- and the start screen afterwards says the browser can clear projects and to save a local copy. So "saved" isn't really saved? That made me nervous; I'd want one obvious way to keep my work.
- "Save local copy..." downloaded a file but the program itself didn't say anything.
- Small things: the "Local only" label at the top is about privacy, not saving, which I first hoped it was. The pointer over the Add note plus stayed an arrow.

**Essay-style sentence:** "I left two reminders on the map: one attached to Farah (moving away in May; ask who takes over the Tuesday run) and one on the whole network (spring list, checked against the sign-up sheet), and both were still there when I reopened the project."
