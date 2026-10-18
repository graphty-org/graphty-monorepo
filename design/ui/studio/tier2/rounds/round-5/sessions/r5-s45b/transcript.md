# Session r5-s45b -- Jordan, marketing network analyst (returning user)

Task: leave two reminders -- one on Farah ("Moving away in May; ask who takes over the Tuesday run"), one on the club as a whole ("Spring list, checked against the sign-up sheet") -- make sure they persist, and show where to read them.

All commands use `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/` and `node design/ui/studio/tool/real.mjs` with session folder `tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s45b`.

## 01 (start, already open)
friends.csv is open with a PageRank run colored and sized. Left rail has Graph, Data, Notes. "Notes" on the rail -- never used it, but that's the obvious place. Also says "Local only" in the top bar, which I like. Trying Notes.

## 02 -- `--click "Notes"`
Notes panel opened: "No notes." and a + at the top right. Fine, simple. I'll start with the club-wide one since that's the generic note; then figure out how to pin one to Farah. Hovering the + to see what it says.

## 03 -- `--hover-at 276,60`
Tooltip "Add note N". Clicking it.

## 04 -- `--click "Add note"`
Note box opened, but it says "About PageRank" -- it grabbed whatever was selected on the right (the PageRank run). That's not what I want; I don't want the club note buried under a measure I might delete. Cancel, and pick "Everything" in the Graph list first, which I'm guessing is the whole club.

## 05 -- `--click "Cancel" --click "Graph" --click "Everything"`
"Everything" is selected now and the right side shows its default style. Back to Notes and add again; hoping it now says "About Everything" or something like the whole graph.

## 06 -- `--click "Notes" --click "Add note"`
Now it says "About Graph". That's the whole club. Slightly odd that I picked "Everything" and it calls it "Graph", but close enough. Typing the club note and saving.

## 07 -- `--click-at 180,132 --type "Spring list, checked against the sign-up sheet" --click "Save note"`
Saved: the note shows with a "Graph" chip, a timestamp, and a trash can. Good. Now Farah. Like always, I'll go to the find box on the Graph panel and type her name, then select her.

## 08 -- `--click "Graph" --click "Find nodes, edges, values" --type "Farah"` (did nothing)
Tool said "Graph" was ambiguous: the rail button and the note's "Graph" chip share the name. Nothing happened. I meant the rail button on the far left. Retrying with that one.

## 09 -- `--click-at 28,75 --click "Find nodes, edges, values" --type "Farah"`
Found her: "Nodes 1 -- Farah", plus her four edges. Clicking Farah's row to select her.

## 10 -- `--click-at 112,153`
Farah selected: highlighted on the map, right panel shows her (degree 4, PageRank #1 of 20 -- ha, the one leaving is the top connector, figures). Same trick as before: go to Notes and Add note, hoping it says "About Farah".

## 11 -- `--click "Notes" --click "Add note"`
"About Farah". Exactly. Typing it and saving.

## 12 -- `--click-at 180,132 --type "Moving away in May; ask who takes over the Tuesday run" --click "Save note"`
Both notes in the list now: Farah's with a "Farah" chip, the club one with "Graph". And Farah's header on the right picked up a "1 note" link. Nice touch. Now the part I don't trust: will it still be there next time? Top bar says "Local only" with a lock -- I don't see a "Saved" anywhere. Checking the main menu for a Save.

## 13 -- `--click "Main menu"`
Menu has Save (Ctrl+S), Save as..., Save local copy..., Export... I'll just hit Save -- that's what I'd do in any app before closing.

## 14 -- `--click "Save"`
"Save friends as" dialog with the name "friends" prefilled. Fine, so it wasn't saved before (first Save asks for a name). "friends" is a fine name. Clicking Save in the dialog.

## 15 -- `--click "Save"` (in the dialog)
Toast: "Saved friends in this browser." Good -- in this browser, not on a server, which matches "Local only". But I've been burned by "saved" before. Closing the tab and coming back to check.

## 16 -- `--reopen`
Start screen. "friends -- In this browser - 20 nodes - Oct 11, 10:42 AM" under Recent projects. But right under it: "This browser can clear projects kept here. Save a local copy of any project you need to keep." Hm. So "saved" means "saved until IT wipes my Chrome profile". Noted. First let me open it and see the notes are actually in there.

## 17 -- `--click-at 593,108`
"Opened friends". It even kept Farah selected, and her header still says "1 note". Opening Notes to see both.

## 18 -- `--click "Notes"`
Both notes survived the reopen, with their Farah and Graph chips and times. But that start-screen line about the browser clearing projects bugs me -- our IT pushes Chrome profile resets. Doing "Save local copy..." from the menu so there's a file on disk too.

## 19 -- `--click "Main menu" --click "Save local copy..."`
The browser downloaded friends.graphty.json (8 KB). The app itself said nothing that I can see -- no toast like the Save one had. Fine, it's in my Downloads. Last thing: the "1 note" link in Farah's header -- that's the other place I'd read her reminder when I click on her next time. Clicking it to see where it goes.

## 20 -- `--click "1 note"`
Nothing visibly changed -- presumably it opens the Notes panel, which was already open, so I can't tell if it did anything (no highlight on Farah's note either). Whatever: that's where I'd read them. Notes on the left rail for both; Farah's also flagged by "1 note" when I click her. I'm done.

## End -- `--end`

### In my own words (Jordan)
**Finished?** Yes. Both reminders are in: Farah's ("Moving away in May; ask who takes over the Tuesday run", tagged Farah) and the club one ("Spring list, checked against the sign-up sheet", tagged Graph). I saved the project, closed the tab, reopened it from Recent projects and both were still there. I also saved a local copy file because the start screen warned me the browser can clear projects. Where I'd read them: the Notes button on the left rail lists both; when I click Farah her panel says "1 note".

**Ease: 6 / 7.** Quick. Notes was right there on the rail, and the "About ..." line told me what each note was pinned to before I typed.

**What confused me:**
- The first Add note silently grabbed the PageRank run because that was what happened to be selected. I only caught it because I read the little "About PageRank" label. If I'd typed fast, my club note would have been stuck to a measure. There's no way to change what the note is "about" in the box -- I had to cancel, go select something else, and come back.
- I picked "Everything" and the note said "About Graph". Same thing, I assume, but two names for it.
- "Saved" is fuzzy. Save said "Saved friends in this browser", which sounds permanent, and then the start screen tells me the browser can clear projects and I should save a local copy. So which one counts as "will be there next time"? I did both to be safe. Save local copy gave me no confirmation in the app at all -- I only know because the download appeared.
- Clicking "1 note" on Farah didn't visibly do anything since Notes was already open; I'd expect it to at least highlight her note.
- And honestly, the "Graph" chip on the club note and the "Graph" button on the rail have the same name -- minor, but I mis-aimed once.
