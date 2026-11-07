# Session r2-s09 -- Ruth, returning

Step 0. Command: real.mjs --start <folder> setup:connected-lesmis-poster.txt -> 01.png. Tool said the drawing is still moving.

Step 1. Saw (01.png): lesmis-poster, 77 nodes, 254 edges, 1 component, three orange dots; layers Hovered 0, Selected 0, Poster 3, Everything 77; key card "Color: Poster, 3 of 77 nodes"; "Sends to Google" bottom right; undo arrows top. Wrote this down as my "before". Will open Assistant.
Command: --step --click "Assistant" -> 02.png

Step 2. Saw (02.png): Assistant panel, "Ask about this graph or change it. It can be wrong." Three suggested questions, Whole graph 77 / 254, Gemini 3.8 Flash, Talk, Send. Will ask in plain words. (AI question 1 of my 8.)
Command: --step --click "Ask about this graph" --type "Color every character by the circle of friends they belong to." --click "Send" -> 03.png

Step 3. Saw (03.png): my message, "Sending to Google", Stop Esc button; picture unchanged. Waiting.
Command: --step --wait 10000 -> 04.png

Step 4. Saw (04.png): all dots recolored in six colors; key card now "Color: Louvain", Group 1 to Group 6 (no sizes, no names). Reply: "I ran Louvain community detection, which identified 6 distinct communities across the 77 characters and colored each node accordingly." Line "Computed Communities for 77 nodes", "Open run", Undo button. Undo arrow at the top lit. Autosave: saved -- so is it already in Noor's project? Will open "1 step" to see what it did.
Command: --step --click "1 step" -> 05.png

Step 5. Saw (05.png): "1 step" opens to one line, "Communities 30 ms". Not much to check. Will try "Open run" to see what actually changed.
Command: --step --click "Open run" -> 06.png

Step 6. Saw (06.png): "Open run" put a Louvain item in the right panel: "Groups, ran Nov 5, 10:53:23 PM"; Style tab with Fill Color "Louvain" and six swatches. Will read the Values tab for group counts.
Command: --step --click "role=tab:Values" -> 07.png

Step 7. Saw (07.png): Values: Groups 6, Modularity 0.5556; sizes 20, 17, 11, 11, 10, 8 = 77, everyone counted. Made with Louvain, Nov 5, 10:53:23 PM, Weight None, each edge counts as 1, Resolution 1. No names of who is in which group here. Will check the Graph list to see what it added and whether Poster is still there.
Command: --step --click "Graph" -> 08.png

Step 8. Saw (08.png): new layer "Communities 77" above Poster; layers now Hovered, Selected, Communities, Poster, Everything. Poster's "3" is replaced by a small icon I don't understand. Orange dots gone from picture. Noor calls: put it back. Will use the Undo next to the AI's result.
Command: --step --click "Assistant" --click "Undo" -> 09.png

Step 9. Saw (09.png): "Undone" where the Undo button was; notice "Undid Color every character by the circle of friends they belong to.."; three orange dots back; key card "Color: Poster, 3 of 77 nodes"; right panel back to Graph overview 77/254; redo arrow lit at top. Looks right, but will compare the layer list with my notes.
Command: --step --click "Graph" -> 10.png

Step 10. Saw (10.png): layer list matches my notes: Hovered 0, Selected 0, Poster 3, Everything 77; Communities gone; same dots in same places as 01.png; key card and Overview as before. Now checking Data for any leftover Louvain column.
Command: --step --click "Data" -> 11.png

Step 11. Saw (11.png): Data panel: source Les Miserables 77 / 254, Attributes section with nothing shown, Direction Auto, Filters empty. No computed result listed. It doesn't show columns, so will open the Table.
Command: --step --click-at 793,840 (button "Table") -> 12.png

Step 12. Saw (12.png): Table: 77 nodes, "Columns: 2 of 2", id and name; no group or Louvain column left behind. Autosave ran while the AI colors were on, so will close the table and reopen to see which version was kept.
Command: --step --click-at 1180,448 (button "Close table") --reopen -> 13.png. Tool printed: failed request for venice-transit.webp (a sample thumbnail, nothing I did).

Step 13. Saw (13.png): start page, no project open. Recent projects should be lower down; scrolling.
Command: --step --wheel 300,700,900 -> 14.png

Step 14. Saw (14.png): wheel did not scroll the page; still at the top (the sample drawing moved on its own). Trying the End key.
Command: --step --key End -> 15.png

Step 15. Saw (15.png): bottom of the start page: generated samples, "Your data is yours, but please help us" box with Share usage data / No thanks. No Recent projects here. Declined the sharing; going to one screen below the top.
Command: --step --click "No thanks" --key Home --key PageDown -> 16.png

Step 16. Saw (16.png): Sample library, no Recent projects on the start page. Going back to the top and trying "Open a file".
Command: --step --key Home --click "Open a file" -> 17.png. A computer file chooser opened.

Step 17. Saw (17.png): only the file chooser; that would load the original file, not what the app kept, so it proves nothing. No Recent projects on this page. Will get into the program with New project and look in the main menu.
Command: --step --key Escape --click "New project" -> 18.png

Step 18. Saw (18.png): empty Untitled project, "No nodes to draw", bottom right now says "Local only". Opening the main menu to find Recent projects.
Command: --step --click "Main menu" -> 19.png

Step 19. Saw (19.png): main menu: Back to start, New project, Open project or file..., Open sample, Save, Save as..., Save local copy..., Export..., Rename, Settings..., Keyboard shortcuts, Help. No Recent projects. Trying "Open project or file...".
Command: --step --click "Open project or file..." -> 20.png. File chooser again.

Step 20. Saw (20.png): file chooser again, no list of recent work. Last place to look: Back to start.
Command: --step --key Escape --click "Main menu" --click "Back to start" -> 21.png

Step 21. Saw (21.png): same start page, no Recent projects. One button left: Open network data.
Command: --step --click "Open network data" -> 22.png

Step 22. Saw (22.png): "Open network data" dialog: NDEx, Neo4j, Web API, web address, Open a file. Nothing about my own recent work. Stopping here; session left for the facilitator to end.

## At the end (Ruth, in character)

Did I finish? Mostly. The AI job: yes, one question to the AI, and I got six groups. Putting it back: yes, one click on Undo beside the AI's result.

How I know it is back, while the project was open. I wrote down the "before" first and compared after Undo:
- Layers: Hovered 0, Selected 0, Poster 3, Everything 77. Same as before. Communities layer gone.
- Key card: "Color: Poster, 3 of 77 nodes". Same.
- Three orange dots, every dot in the same spot as the first screenshot (01.png against 10.png, compared by eye).
- Overview: 77 nodes, 254 edges, density 0.08681, 1 component. Same.
- Table: 77 nodes, "Columns: 2 of 2", id and name. No Louvain or group column left behind. I did not take the table before the AI ran, so this is "nothing of the AI's there", not a before-and-after match.
- The app itself said "Undone" and "Undid Color every character by the circle of friends they belong to..".

What I can't confirm. Whether the kept copy of Noor's project is also back. Autosave said "saved" while the AI's colors were on, and "saved" again after Undo, with no time or version. So I closed and reopened to check, and the app came back to the start page with no project open and no Recent projects anywhere I looked: start page top and bottom, main menu, Open project or file (just the computer's picker), Open network data. Reloading the original file would only prove the file is fine, not what autosave kept. So I can tell Noor it was back on screen. I can't tell her it is back in what was saved, and I can't reopen it from here. My own reopen is also what lost me the open project. If I'd left it alone I'd have nothing more to report, but I'd still have her poster on screen.

Ease: 6 of 7 for the ask and the undo. 3 of 7 for proving it stayed back. Overall 5.

What confused me:
- Where Recent projects went. I have used it before. After reopening it wasn't there, and nothing said why or where this project was kept.
- Autosave: saved. Saved what, when? While the AI's colors were on, that word worried me, and nothing says Undo also reached the saved copy.
- "Open run" changes the right-hand panel and nothing else; the words don't say that.
- The AI's answer calls the circles "Group 1" to "Group 6": sizes 20, 17, 11, 11, 10, 8, which add to 77. Good. But I never saw who is in which group by name, only colors. A circle of friends without names is not an answer I could check. "I ran Louvain" also doesn't say what Louvain groups on; Values says each edge counts as 1, which helps.
- The small icon that replaced Poster's count of 3 while the Communities layer sat above it. I don't know what it meant, and nothing told me Poster was being covered rather than changed.
- The wheel did not scroll the start page.

What I liked: the warning "It can be wrong", the Undo right next to the result, "Undone" staying in the conversation so there is a record, and "Sends to Google" against "Local only" in the corner.

AI questions used: 1 of about 8.
