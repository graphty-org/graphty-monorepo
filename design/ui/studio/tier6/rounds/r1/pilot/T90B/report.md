# Pilot: T90 B, getting the Assistant going on sources.graphml

Build 8fa33aa786, served from .study-builds/tier6-r1-8fa33aa786. Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T90B/ (each path below is
relative to that folder).

Result: the task can be finished by pointer and by keyboard alone. The network stayed 24 nodes and
59 edges from sources.graphml on every walk, with nothing selected or filtered at the end. Every
session was ended and its key check was clean.

## Routes walked

| Folder   | Route                                                                                     | Outcome                                  |
| -------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| success  | Pointer: open the file, Assistant, OpenAI key, failure, model label, Google key, reply     | Reached, success/19.png                  |
| keyboard | The same by keys, in screen-reader mode, plus Send again                                   | Reached, keyboard/94.png                 |
| detour-1 | Settings on the start screen first; then Settings in the workspace; key typed, then Done   | Dead end, then recovered with Save       |
| detour-2 | Find box, Main menu, right-click, Local only chip, Quick actions, shortcuts, Analyze       | Quick actions and the chip lead to setup |
| detour-3 | Each key under the wrong provider; Stop; Send again by pointer; Forget key                 | Shape check works one way only           |
| detour-4 | Keys only: Control+I with no provider saved                                                | Works; lands on AI provider...           |

## Pointer success path

1. Open a file, sources.graphml: 24 nodes, 59 edges (success/02.png).
2. Assistant: "Ask about this graph or change it. It can be wrong." and AI provider... (03).
3. AI provider...: Settings opens on the AI provider section, with the disclosure on screen (04).
4. Provider, OpenAI: the model becomes GPT-4o and the disclosure names OpenAI (05, 07).
5. API key, typed. Enter did nothing (08). Save closed Settings, put focus in the composer, and the
   status bar turned to "Sends to OpenAI" (09).
6. The question and Enter: "Sending to OpenAI" for about 10 seconds, then "Could not reach OpenAI:
   the connection failed. Nothing changed." with Send again, the question back in the composer (11).
7. The GPT-4o label (tooltip "Change provider or model") reopened the section (13). Provider, Google;
   the field is empty for the new provider (14). Key typed, Save (15, 16).
8. Enter: "Sending to Google" with a growing step count, then the reply (17, 18, 19).

The reply named Marcus Lee and Eileen Park first, as the most connected people on the record, then
Silverline Media and Paula Greene. Recomputed from the file: Marcus Lee and Eileen Park have degree
6, the highest of anyone with on_record true. The two other walks gave the same four names or a
subset of them, in a different order.

## Keyboard walk

Focus names, in order: start screen links, "Switch to dark mode", "Settings...", "Open a file CSV,
GraphML, GEXF, Cytoscape, or a saved project". After the file loads, focus lands on heading "Graph,
sources: 24 nodes, 59 edges" in the inspector, then "From sources.graphml", "Graph actions", tab
"Values", "About Direction", "About Degree", separator "Resize inspector", "Local only", "Main menu",
"Project: sources", "Undo", "Redo", "Graph" (12 Tabs). ArrowDown moves to "Assistant"; Enter opens it
and focus goes to "AI provider...". Enter there: focus lands on "Close" in the dialog, then gridcell
"AI provider", combobox "Provider", combobox "Model", textbox "API key", link "Get a key from
OpenAI", checkbox "Remember on this device", "Save", "Forget key", "Delete all conversations".
After Save, focus is in textbox "Message the assistant". Then "GPT-4o", "Talk", "Send", separator
"Resize left panel". Backward from the composer after a failure: "Send again", region "Conversation",
"Close", "New conversation".

Focus never fell to the page body after the file loaded. It fell to region "Conversation" when Send
again was pressed and its button went away.

Fields: the API key takes no Enter; Tab moves on; Escape closes Settings and drops what was typed.
The composer: Enter sends, Shift+Enter adds a line, Tab goes to the model label, Escape keeps the text
when idle and stops a run. The Find box: Enter selects the first hit and reframes the canvas, Escape
clears it. Quick actions: Escape closes it.

## Mismatches with the answer key

- "B under --keys: the rail by Tab or Control+I". Tab does not reach Assistant on the rail. It stops
  on Graph and the next Tab enters the panel; only ArrowDown or Control+I gets there
  (keyboard/28.png, keyboard/30.png).
- "Picking Google with the OpenAI key ... is a wrong turn." On screen it is not one: Save accepts the
  key, and the session swaps in the real key, so a reply arrives (detour-3/05.png, detour-3/08.png).
  A session that does this meets no failure and shows nothing wrong.
- The key lists "The model label, Settings or AI provider..." as ways out of the failure. Once a key
  is saved the panel has no AI provider... button; it is only in Quick actions. The status bar's
  "Sends to OpenAI" is a further way, which the key does not list (success/21.png).

Everything else on the route matched, including the wording of the failure, the question returning
to the composer, and the disclosure naming the provider and who pays.

## Defects

Severity is 0 to 4. The failure row reading as a connection fault, the "name" starter and Google's
missing key shape check are known and kept in this build, so they are not listed.

1. (3) Settings, Privacy, "Where your data goes" says nothing about the Assistant, and still says
   "Files you open: read on this computer, never uploaded" with "Sends to Google" in the status bar.
   A reader answering the follow-up from there gets the wrong answer. detour-1/14.png
2. (3) A typed key is dropped with no word when the reader presses Done or Escape instead of Save.
   Done is the green button at the bottom; the panel stays on the no-key screen. detour-1/09.png,
   detour-1/10.png, detour-1/12.png
3. (2) Settings on the start screen has no AI provider section and nothing says one appears after a
   file is open. detour-1/02.png
4. (2) Enter in the API key box does nothing. success/08.png
5. (2) "and 1 more" under the change lines is a button that does nothing, by click or Enter.
   success/20.png, keyboard/104.png
6. (2) The reply says no changes were made, directly above "Computed Connections for 24 nodes" and
   an Undo, with Undo lit in the top bar. success/19.png, keyboard/94.png, detour-3/08.png
7. (2) Open run lands on an empty Style tab. It opens one run of four, called Degree where the line
   above says Connections. success/23.png
8. (2) The run's Values tab lists ids (s18, s23), not the names the reply gave, so the answer cannot
   be checked there. The spoken news does the same: "Degree finished: s18 ranks first, 7". "Top 10"
   shows 7 rows. success/24.png, keyboard/94.png
9. (2) After Send again the transcript does not follow the new turn: the failure is cut off and Send
   again is out of view. detour-3/11.png, detour-3/12.png
10. (2) Old failures are spoken again as alerts: pressing Enter with Google working reads "Could not
    reach OpenAI" first, Send again reads the failure before anything was tried, and reopening the
    panel reads every old failure. The words run together: "failed.Nothing changed.Send again".
    keyboard/94.png, keyboard/76.png, keyboard/108.png
11. (2) Forget key hides the whole conversation behind the no-key screen, with no confirmation, and
    the status bar returns to "Local only" after data was sent. detour-3/13.png, detour-3/14.png
12. (2) The show-key button cannot be reached by Tab, and its name is "Show the password".
    keyboard/52.png
13. (2) The model label's name is only "GPT-4o". The tooltip's "Change provider or model" is not in
    its name, so a screen-reader user after a failure has no sign it is the way on. keyboard/69.png
14. (2) Twelve Tabs from the loaded file to the rail, and the rail then needs arrow keys, with
    nothing announcing that. keyboard/28.png
15. (1) AI provider... and the model label open Settings with focus on Close, two Tabs from Provider.
    detour-2/16.png
16. (1) Send looks the same empty (disabled) as ready. success/09.png, keyboard/59.png
17. (1) A fresh conversation has two buttons named "New conversation": the list ("New conversation,
    Conversations") and the plus. keyboard/59.png
18. (1) Quick actions for "AI" offers AI provider... but not Assistant, under a disabled "Select what
    it paints" that matched inside a word. detour-2/15.png
19. (1) "Sending to Google" stays unchanged for over 20 seconds while tools run. success/18.png
20. (1) "Stopped. Changes taken back." after a stop with no changes. detour-3/07.png
21. (1) Control+I closing the panel sends focus to the rail from the composer, but to the inspector
    heading from the no-key screen. detour-4/05.png
22. (1) Send again leaves focus on region "Conversation", two Tabs from the composer. keyboard/76.png
23. (1) The whole page sits 1 px higher once Settings is opened from the status bar, and stays there
    after it closes. success/21.png, success/23.png
24. (1) Find for "AI" matches inside emails; Enter selects a stranger and moves the camera, which
    stays moved after Escape. The Main menu and right-click offer nothing for the AI. detour-2/03.png,
    detour-2/04.png, detour-2/06.png, detour-2/07.png
