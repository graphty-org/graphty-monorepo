# First-click test -- Explorer Elena

Elena is a product manager who has never used a graph tool. She looked at one still screen per
prompt and said the one thing she would click first. Her confidence runs from 1 (a guess) to
7 (certain). Her answers were marked against the correct targets only after she had given them,
and were not changed.

## Les Miserables, nothing selected

**fc-1. A picture of the network for the paper.**
"There's no Share or Download button anywhere. Views has little camera icons... a camera is a
picture, right? I'd click 'The whole novel'."
Clicked: the "The whole novel" row under Views (camera icon). Confidence 3. **Incorrect.**
She read the camera icon as "take a photo". She never considered the menu button or the project name.

**fc-2. Show how the earlier bridges calculation was set up.**
"Bridges, 'done', on the right under Results. That's the thing that ran. Click it."
Clicked: the Bridges row under Results. Confidence 5. **Correct.**

**fc-3. Rank the characters a second way.**
"The table says 'Sorted by degree'. I'd click a different column header and sort by that
instead. Group, maybe? I don't know what else there is."
Clicked: the "group" column header in the table. Confidence 3. **Incorrect.**
She treated "rank another way" as re-sorting the columns that were already there. She did not
see the + beside Results or the lightning button as a way to make a new number.

**fc-4. Groups 2 and 3 look alike; change one.**
"The little box by the 2 in the legend. 3 isn't even there, it's in '6 more', so I'd change 2."
Clicked: the orange swatch for group 2 in the legend. Confidence 5. **Correct.**

**fc-5. Get back a selection a stray click cleared.**
"Undo. Where's undo? There's no arrow. The three lines at the top-left is usually where Edit is."
Clicked: the main menu button (three lines, top left), looking for Undo. Confidence 2. **Correct**
(though she was looking for Undo, not for a "previous selection" item).

## Les Miserables, Valjean selected

**fc-6. What is painting Valjean this color?**
"He's orange. The legend box says orange is 2. So it's group 2. I'd click the 2 in the legend."
Clicked: the group 2 row in the legend on the canvas. Confidence 4. **Incorrect.**
She never looked at the Appearance list on the right. The legend told her "which group", and to
her that was the same answer as "what is painting him".

**fc-7. Where does Valjean's betweenness number come from?**
"Right side, Results, betweenness 0.57, highest. Whatever betweenness is. Click that."
Clicked: the betweenness row under Results. Confidence 4. **Correct.**

## Transfers, March 2026, nothing selected

**fc-8. Bring in next month's file so everything carries over.**
"Honestly I'd drag it onto the window. If I have to click, the little file chip under the name,
'transfers-2026...', and swap it."
Clicked: the file-name chip under the project name. Confidence 3. **Incorrect.**
The chip is the closest match on screen to "the file", so she went straight past the project
name, Data and the menu.

**fc-9. Accounts that take in far more money than they send out.**
"There's nothing about money here. Open the table at the bottom and sort by... whatever the
money column is?"
Clicked: the Table strip at the bottom. Confidence 2. **Incorrect.**
She is looking for a column to sort. She did not connect "in versus out" to making a new number,
and she did not know what the + on Results would add.

**fc-10. Cheapest route between two accounts, bigger transfer costs more.**
"That squiggly icon on the toolbar looks like a route on a map. That one."
Clicked: the path tool on the floating toolbar. Confidence 4. **Correct.**
She clicked it for "route" and ignored the "bigger costs more" part. She did not read the
"amount not used yet" line.

**fc-11. Has anything left the computer?**
"It literally says it, under the name: 'Nothing has been sent from this project', with a lock.
I'd click that to be sure."
Clicked: the line under the project name. Confidence 6. **Correct.**

## Human protein interactions, nothing selected

**fc-12. Ribosome and Spliceosome are two blues; change one.**
"The blue box next to Ribosome in the legend."
Clicked: the Ribosome swatch in the legend. Confidence 6. **Correct.**

**fc-13. Bring in the lab's file of team colors and sizes.**
"Colors... there's a paint palette icon at the top right next to Graph. That's where colors live."
Clicked: the palette icon beside "Graph" in the right panel. Confidence 3. **Incorrect.**
She read "colors" in the prompt and looked for a color icon. She did not think of it as a file to
import, so the menu and Data never came up.

**fc-14. How is the Ribosome module different from the rest?**
"The light blue bunch is Ribosome. I'd click on it, one of the dots there, RPL28, and see what it
says."
Clicked: a light blue dot in the Ribosome cluster on the canvas. Confidence 3. **Incorrect.**
She tried the picture before any panel. She did not expect a legend label to select the whole group.

## Score

7 of 14 correct (fc-2, fc-4, fc-5, fc-7, fc-10, fc-11, fc-12).

What her misses have in common:
- She looks for things that are named for what she wants. A camera icon means "picture". A
  palette icon means "colors". The file chip means "the file". Each time she took the icon that
  matched a word in her task over the control that actually does the job.
- "Make a new ranking" and "accounts that take in more than they send" both read to her as
  "sort the table". She has no idea that she can add a new number with the + on Results or the
  lightning button.
- She got the legend and the Results rows right when the words on screen matched her task
  (Ribosome, Bridges, betweenness). She missed the Appearance list for Valjean, because the
  legend already answered "which group".
- The line saying nothing has been sent is the most confident answer she gave.
