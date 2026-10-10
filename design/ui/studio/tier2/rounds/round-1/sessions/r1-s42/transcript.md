# Session r1-s42 -- Elena (returning), Florentine families reminders

Build: 946256efb876 (frozen copy tier2-r1d4-946256efb). Setup: florentine-ranked.txt.

## Step 1 -- start

Command: `with-browser.sh node real.mjs --start r1-s42 setup:florentine-ranked.txt` -> 01.png

Elena: OK, the Florentine marriages are open, dots sized and colored by that "who matters most"
thing I ran last time. On the left there's Graph, Data, and... Notes? I don't remember that one.
I need to leave myself two reminders, one on the Medici and one for the whole thing. First I'd
click the big dot in the middle, that's probably the Medici.

## Step 2 -- click the big dot

Command: `--step --click-at 707,395` -> 02.png (tool: node "Medici")

Elena: Yes, it's the Medici, #1 of 15. The right side shows its name and numbers, but nowhere to
type anything. There's a "..." up in the corner of that panel -- maybe there's a "comment" in
there, like in Google Slides.

## Step 3 -- open the "..." menu on Medici

Command: `--step --click-at 1419,74` -> 03.png (tool: button "Node actions")

Elena: Neighborhood, Path between, Frame selection, and "Add note". A note is a reminder, so
that's it. Clicking "Add note".

## Step 4 -- Add note

Command: `--step --click "Add note"` -> 04.png

Elena: The left side switched to "Notes" with a box "About Medici" and Save note / Cancel. The
box looks ready for typing. Typing my reminder.

## Step 5 -- type the Medici reminder

Command: `--step --type "Check the 1434 return from exile"` -> 05.png

Elena: The text is in the box. Clicking "Save note".

## Step 6 -- Save note

Command: `--step --click "Save note"` -> 06.png

Elena: There it is, my reminder with a little "Medici" tag and the date, and the Medici panel on
the right now says "1 note". Nice. Now one for the whole network. There's a "+" next to "Notes" at
the top. Medici is still highlighted though -- I hope it doesn't tie this one to Medici too.
Clicking the "+".

## Step 7 -- "+" next to Notes

Command: `--step --click-at 276,60` -> 07.png (tool: button "Add note")

Elena: Ugh, it says "About Medici" again -- because Medici is still picked. That's not what I
want. I'll Cancel, click on the empty background to unpick Medici, then try the "+" again.
Cancel first.

## Step 8 -- Cancel

Command: `--step --click "Cancel"` -> 08.png

Elena: OK, back to just the one reminder. Now click on the empty white area to unpick Medici.

## Step 9 -- click empty background

Command: `--step --click-at 1050,700` -> 09.png (tool: empty canvas)

Elena: Medici's not highlighted anymore, and the right side says "Graph" with the whole network's
numbers. Now the "+" next to Notes again.

## Step 10 -- "+" with nothing picked

Command: `--step --click-at 276,60` -> 10.png (tool: button "Add note")

Elena: "About Graph" this time. Good, that's the whole thing. Typing the second reminder.

## Step 11 -- type the network reminder

Command: `--step --type "Marriages only; business ties are a separate list"` -> 11.png

Elena: Text is in. Save note.

## Step 12 -- Save note

Command: `--step --click "Save note"` -> 12.png

Elena: Both reminders are listed now, one tagged "Graph" and one tagged "Medici". Now, will they
still be here next time? Last time I never saved anything and just closed the tab. Up top it
says "Local only" next to a lock -- I'm not sure what that means. Is it saved on my computer or
not saved at all? I'll point at it and see if it explains itself.

## Step 13 -- point at "Local only"

Command: `--step --hover "Local only"` -> 13.png (tooltip: "Nothing is sent. Opens Settings > Privacy")

Elena: Oh, that's about privacy, not about saving. So it doesn't tell me if my reminders are kept.
I'll try the menu with three lines in the top left -- that's usually where the file stuff is.

## Step 14 -- main menu

Command: `--step --click-at 23,20` -> 14.png (tool: button "Main menu")

Elena: Save, Save as..., Save local copy... -- three saves, I don't know the difference between
"Save" and "Save local copy". I'll just take plain "Save".

## Step 15 -- Save

Command: `--step --click "Save"` -> 15.png

Elena: It asks for a name, already "Florentine families". Fine. Clicking the blue Save.

## Step 16 -- confirm the save

Command: `--step --click-at 922,500` -> 16.png (tool: button "Save")

Elena: "Saved Florentine families in this browser." OK. I don't fully trust it until I see it,
so let me close and come back like I would next week.

## Step 17 -- close and come back

Command: `--step --reopen` -> 17.png

Elena: Start screen. Under "Recent projects" there's my "Florentine families, In this browser,
11:53 PM", and also the sample with the same name on the right -- I'll make sure to click mine in
the middle, not the sample. There's a small line saying the browser can clear projects and to
"Save a local copy" of anything I need to keep. Hmm. First let me check my reminders survived.

## Step 18 -- open my recent project

Command: `--step --click-at 624,108` -> 18.png (tool: Recent projects row "Florentine families In this browser")

Elena: "Opened Florentine families", same picture. The right side says "1 note" up top next to
"From Florentine families". The left went back to Graph, so I'll click "Notes" on the far left to
check both reminders are there.

## Step 19 -- Notes after coming back

Command: `--step --click-at 27,188` -> 19.png (tool: button "Notes")

Elena: Both are there: "Marriages only; business ties are a separate list" tagged Graph, and
"Check the 1434 return from exile" tagged Medici. This is where I'd read them -- the Notes button
on the left. Done.

Command: `--end r1-s42`

## Wrap-up (in character)

**Did I finish?** Yes. Both reminders are in, the Medici one tied to the Medici and the other to
the whole network, they were still there after I closed the tab and opened my project from Recent
projects, and I'd read them under "Notes" on the left (the Medici one also shows as "1 note" when
I click the Medici dot).

**Ease:** 5 of 7.

**What confused me:**
- The "+" next to Notes quietly attached my second reminder to the Medici, because the Medici was
  still picked. The "About Medici" label caught it, but only because I was reading carefully; I
  had to Cancel, click the background, and try again. Nothing on the "+" told me it would go to
  whatever was picked.
- I wasn't sure the reminders were kept until I saved. The reminders panel never said whether
  they were saved; "Local only" at the top turned out to be about privacy, not about saving.
- The menu has Save, Save as and Save local copy, and I don't know which one keeps my stuff. Plain
  Save said "in this browser", and then the start screen warned the browser can clear projects
  and I should "Save a local copy" of anything I need to keep. So is it kept or isn't it? I'd
  probably ignore it, but it left me a little uneasy.
- On the start screen my saved project and the ready-made sample have the same name,
  "Florentine families"; I had to look at which column I was clicking.
- Finding where to write the Medici reminder took a guess: the "..." on the Medici panel. Once I
  opened it, "Add note" was obvious.
