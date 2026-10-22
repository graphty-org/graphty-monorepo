# Session r1-s39 -- Tom (returning), task T19, dataset A (running club, friends.csv)

Build: 946256efb876 (served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`).
Tool: `real.mjs`, run from `design/ui/studio/tier2`, with `REAL_DIST` set to that build.

## Step 1 -- start

Command: `node real.mjs --start <session> setup:friends-ranked.txt`

Screenshot 01.png. The running club list is open, the dots are sized and colored by the ranking
I had it do before ("PageRank" in the list, a size and color key at top left). Down the left edge
there are three things: Graph, Data, and Notes. "Notes" is about the only word on this screen that
sounds like somewhere you leave yourself a reminder, so I will try that first.

## Step 2 -- open Notes

Command: `--step --click "Notes"`

Screenshot 02.png. A panel called Notes opened on the left. It says "No notes." and there is a small
plus sign next to the heading. That plus is the only thing to press here, so I will start with the
reminder about the whole club, since I don't know which dot is Farah yet (none of the dots have
names on them).

## Step 3 -- press the plus ("Add note")

Command: `--step --click-at 276,60` (the tool reported: button "Add note")

Screenshot 03.png. A box to type in appeared, with "Cancel" and "Save note". Above the box, in small
letters, it says "About PageRank". That is not what I want: this reminder is about the club list as
a whole, not about the ranking the program did. I don't want it stuck to the ranking, because if
someone redoes the ranking I might lose it. I'll cancel and find a way to make it about the whole
thing.

## Step 4 -- cancel

Command: `--step --click "Cancel"`

Screenshot 04.png. Back to "No notes." The right side still has "PageRank" at the top, so I think
the note goes to whatever is picked there. On the first screen, the Graph list had a line called
"Everything" under PageRank. That sounds like the whole club. I'll go back to Graph and pick it.

## Step 5 -- back to Graph

Command: `--step --click "Graph"`

Screenshot 05.png. The Graph list is back: Selection, PageRank (highlighted), Everything. I'll click
"Everything".

## Step 6 -- pick "Everything"

Command: `--step --click "Everything"`

Screenshot 06.png. The right side now says "Everything" at the top, with color and size boxes that I
am not going to touch. The dots didn't change. Now I'll go to Notes and press the plus again, and
see what it says it is about.

## Step 7 -- Notes again

Command: `--step --click "Notes"`

Screenshot 07.png. Notes, "No notes.", the right side still says "Everything". Plus sign again.

## Step 8 -- plus again

Command: `--step --click "Add note"`

Screenshot 08.png. This time the small line above the box says "About Graph". "Graph" is what the
whole list is called on the Graph tab ("Graph friends.csv"), so I take that to mean the whole club.
Good. I'll click in the box and type the club reminder.

## Step 9 -- type the club reminder

Command: `--step --click-at 180,132 --type "Spring list, checked against the sign-up sheet"`

Screenshot 09.png. The words are in the box. I'll press the blue "Save note".

## Step 10 -- "Save note"

Command: `--step --click "Save note"`

Screenshot 10.png. The reminder is in the Notes list with a little "Graph" tag and today's date and
time, and a bin icon I won't touch. One down. Now Farah. None of the dots have names on them, so I
can't just click her. On the Graph tab there was a box that says "Find nodes, edges, values". I'll
go there and type her name.

## Step 11 -- back to Graph

Command: `--step --click "Graph"` (the tool said two buttons are called "Graph" -- the side tab and
the tag on my saved reminder -- and took the first; the Graph tab opened)

Screenshot 11.png. Graph list again. I'll click the "Find nodes, edges, values" box and type Farah.

## Step 12 -- search for Farah

Command: `--step --click "Find nodes, edges, values" --type "Farah"`

Screenshot 12.png. It found her: "Nodes 1 -- Farah", and four lines with arrows (Chloe -> Farah and
so on). I want the person, so I'll click "Farah" under Nodes.

## Step 13 -- click Farah

Command: `--step --click-at 112,153` (option "Farah")

Screenshot 13.png. A dot near the bottom lit up yellow -- that's her, partly hidden behind another
dot. The right side now says "Farah, Node", with her ranking, "#1 of 20". Interesting -- she is the
top one, which is exactly why the Tuesday run matters. Now that she is picked, I'll go to Notes and
press the plus, the way it worked for the club.

## Step 14 -- Notes

Command: `--step --click "Notes"`

Screenshot 14.png. My club reminder is still there, Farah is still lit up and named on the right.
Plus sign.

## Step 15 -- plus with Farah picked

Command: `--step --click "Add note"`

Screenshot 15.png. "About Farah" above the box. That's right. I'll type her reminder.

## Step 16 -- type Farah's reminder

Command: `--step --click-at 180,132 --type "Moving away in May; ask who takes over the Tuesday run"`

Screenshot 16.png. Typed, under "About Farah". Save note.

## Step 17 -- "Save note" for Farah

Command: `--step --click "Save note"`

Screenshot 17.png. Both reminders are in the Notes list now: Farah's on top with a "Farah" tag, the
club one below with a "Graph" tag. On the right, under Farah's name, it now says "1 note". Good.
But "Save note" only put it in this list. Last time I kept this map by saving it as a project and
opened it again from Recent projects. Nothing here tells me the project itself has been kept. The
top just says "friends" and "Local only". I'll open the menu at the top left, where I'd expect a
save.

## Step 18 -- main menu

Command: `--step --click-at 24,20` (button "Main menu")

Screenshot 18.png. The menu has Save, Save as..., Save local copy..., Export... I'll press plain
"Save" -- that's what I did before to keep the map.

## Step 19 -- Save

Command: `--step --click "Save"`

Screenshot 19.png. A box: "Save friends as", Name: friends. So this list had never been kept as a
project before -- good thing I checked. "friends" is fine as a name. I'll press the blue Save.

## Step 20 -- confirm Save

Command: `--step --click "Save"`

Screenshot 20.png. A message at the bottom: "Saved friends in this browser." Fine -- that's this
laptop, which is what I want. But I won't believe it until I've closed it and opened it again the
way I would next week. I'll close the tab and come back.

## Step 21 -- close and come back

Command: `--step --reopen`

Screenshot 21.png. The start screen, like the times I came back before. Under "Recent projects":
"friends -- In this browser -- 20 nodes -- Oct 8, 2026, 11:52 PM". There is some small grey writing
under it that I skimmed past. I'll click "friends" and check my reminders are in it.

## Step 22 -- open "friends" from Recent projects

Command: `--step --click "friends"`

Screenshot 22.png. "Opened friends". It looks the same as I left it -- same colors and sizes, Farah
even still lit up, and on the right under her name it still says "1 note". Now the place I'd read
them: Notes on the left.

## Step 23 -- Notes after coming back

Command: `--step --click "Notes"`

Screenshot 23.png. Both reminders are there after closing and reopening: "Moving away in May; ask
who takes over the Tuesday run" tagged Farah, and "Spring list, checked against the sign-up sheet"
tagged Graph, each with its date. This is where I'd read them: the Notes tab on the left. Farah's
also shows as "1 note" under her name on the right when she's picked. I'm done.

Command: `--end`

## Debrief (in character)

**Did I finish?** Yes. Both reminders are in, the project is saved, and I closed it, opened it again
from Recent projects and both reminders were still there. I'd read them on the Notes tab.

**Ease: 5 out of 7.**

**What confused me:**

- The first time I pressed the plus it said "About PageRank". I didn't want the club reminder stuck
  to the ranking. It turned out the note goes to whatever happens to be picked on the right side,
  and nothing told me that before I pressed the plus. I had to back out, go to the Graph tab, pick
  "Everything", come back to Notes and press the plus again. Then it said "About Graph", not
  "Everything" -- so I picked one name and it called it another. I took "Graph" to mean the whole
  club, but I was guessing.
- None of the dots have names, so I couldn't just click Farah. The find box worked, but I only knew
  to use it because I'd seen it on the Graph tab. The dot it lit up was half hidden behind another.
- "Save note" didn't keep anything past this sitting. I only knew to save the project because I'd
  done it before. Nothing on the Notes tab said the reminders weren't kept yet, and the top bar never
  showed that there were unsaved changes. Someone new would have stopped after "Save note".
- After saving it said "Saved friends in this browser", and on the start screen there was small grey
  writing under the project that I skimmed past. I'd want to be told plainly whether "in this
  browser" means it is safe until next month or not.
- Two things on the screen are both called "Graph" (the side tab and the tag on my reminder).
