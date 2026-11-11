# Pilot of tier 6 task T90A: getting the Assistant going on volunteers.graphml

Build 8fa33aa786 from .study-builds/tier6-r1-8fa33aa786, 1440 x 900, started empty on every walk.
Screenshots and step files are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T90A/ (shortened to `T90A/`
below). The data stayed the 24 volunteers and 63 edges on every walk.

Result: reached on the pointer path and on the keyboard path. Nothing asked for was skipped.

## Routes walked

### Success path by pointer (T90A/success)

Open a file, volunteers.graphml (02); Assistant on the rail (03); AI provider... (04); Provider,
OpenAI (05, 06); API key, typed the OpenAI key (07); Save closes Settings and puts focus in the
composer (08); typed the question, Enter (09); after about ten seconds "Could not reach OpenAI: the
connection failed. Nothing changed." with Send again, and the question back in the composer (10);
the model label, tooltip "Change provider or model" (11, 12); Provider, Google (13); API key, typed
the Google key, Save (14); Enter (15). The reply named v09 (555-0109) and v02 (555-0102). The inspector
showed v09 as Hannah Weiss. Expanding the steps read Reach, Query data, Select (16). Fifteen steps, as
the answer key says.

### Keyboard (T90A/keyboard, started --keys --sr)

Reached the end. Tab from the top reaches the start screen's controls in reading order. Enter on Open
a file opens the chooser. After the file opens, focus is on the heading "Graph, volunteers: 24 nodes,
63 edges", and Tab goes inspector, status bar, Main menu, Project, Undo, Redo, rail. The rail is one
tab stop; ArrowDown reaches "Assistant"; Enter opens the panel and moves focus to "AI provider...".
Enter opens Settings with focus on "Close". Tab reaches gridcell "AI provider", combobox "Provider",
combobox "Model", textbox "API key", link "Get a key from OpenAI", checkbox "Remember on this device",
"Save", "Forget key", "Delete all conversations", "Done", then wraps to "Close". The Provider list
works with Enter, arrows, Enter. Save moves focus to textbox "Message the assistant". The failure is
read as an alert. In the panel: "Assistant, Conversations", "New conversation", "Close", region
"Conversation", "Send again", the composer, "GPT-4o", "Talk", "Send". After a reply: "Ask about the
whole graph" sits before the composer, "Undo" and "Open run" before that. Focus never fell to the page
body on this route. The reply named Hannah Weiss (phone 555-0109). Screenshots 01 to 103.

### Detour 1: Settings first, and the ways a key gets lost (T90A/detour-1)

From the start screen, Settings... has General, Privacy, Accessibility and input, Performance, and no
AI provider (02, 03). After opening the file, the rail's Settings has AI provider (05). Escape with
the key typed closes Settings and drops provider and key with no word (07, 09). Done with the key
typed closes Settings and drops it too; the panel still says it needs a key (10). The Google key under
OpenAI gets "OpenAI keys start with sk-." (11). The OpenAI key under Google saves with no check (12,
13) and the run goes ahead, because the tool swaps the key; the session ended before its reply (20). Enter in an empty composer does
nothing (14). A starter fills the composer and does not send (15). Escape in the composer keeps the
text (16). The privacy chip "Sends to Google" opens AI provider (17). Settings, Privacy says nothing
about the Assistant with a provider saved (18).

### Detour 2: looking for the AI elsewhere (T90A/detour-2)

Main menu has no Assistant entry (03). "AI" in Find matches Aisha Bello and Priya Nair (04); Enter
selects the first and moves the camera (05). Analyze lists analyses (06). Right-click on the canvas
has Fit, Select all and the like (08). Keyboard shortcuts lists Assistant, Ctrl+I and Talk (09). The
rail tooltip reads "Assistant Ctrl+I" (11). Ctrl+I opens the panel (12); Close closes it (13). Every
one of these leaves the reader able to see the rail's Assistant.

### Detour 3: stuck on the failure (T90A/detour-3)

Send again twice: each adds another copy of the question and another identical failure, with no new
hint (05). The conversations list opens with Open and Delete (06). New conversation keeps the typed
question (07). Settings, AI provider, Forget key clears the saved key with no word, and the panel
behind goes back to the no-key screen (08, 09). AI provider..., Google, Save: the failed conversation
returns in place of the new one, and the typed question survives (10). Enter then Escape stops the
run: "Stopped. Changes taken back." with the question back (13). Send by button gets a reply naming v09
and v02 (15). Ctrl+I in the composer closes the panel; Ctrl+I reopens it (16, 17). "What are their
names?" was still at "Sending to Google" after ten seconds when the session ended (18).

### Detour 4: straight to Google, then asking for the names (T90A/detour-4)

Leaving Provider on Google and typing the Google key works first time, as the key allows (02). The
reply took more than 20 seconds, 4 then 6 steps (03). A second message typed and entered during that
run was not sent, and it stayed in the composer with no word (05). The reply named Hannah Weiss and
Priya Nair (05).

### Detour 5: Send again after moving to Google (T90A/detour-5)

Failure, model label, Google, key, Save, then Send again rather than Enter. It goes to Google, clears
the composer and gets a reply naming v09 (05).

### Detour 6: keys in the Provider list (T90A/detour-6)

A short keyboard session for the open list: Ctrl+I from the workspace opens the panel with focus on
AI provider...; Escape closes the open list and leaves Settings open; Tab in the open list does
nothing.

## Enter, Tab and Escape in each field

| Field | Enter | Tab | Escape |
| --- | --- | --- | --- |
| API key | does nothing (defect) | to the "Get a key" link, skipping the eye | closes Settings, drops the key and provider with no word (defect) |
| Composer | sends; empty does nothing; during a run does nothing | to the model label | stops a run; otherwise keeps the text (as decided) |
| Find | selects the first match | to Add a layer | clears |
| Provider list, open | picks | does nothing, the list stays open (defect) | closes the list and leaves Settings open |
| Provider, closed | opens the list | to Model | not pressed |

## Answer key against the screen

These held: the failure's wording, Send again, the question returning, the model label as a way on,
fifteen steps, and the disclosure wording.

- The key expects names, but three of the five replies seen named only ids (v09, v02). A reader
  reports an id, or must click for it: the inspector shows v09's name and nothing shows v02's.
- The reference names cover degree and betweenness. Every reply ranked by closeness.
- The key lists the model label and Settings as ways on. The privacy chip is a third.
- The key calls Google with the OpenAI key a wrong turn. In a session it looks like success, since the
  tool replaces the key: no failure and a real reply. A grader sees only "Failure: none".
- Replies state phone numbers the question never asked for, on all five.

## Defects

Severity 0 to 4 as in the answer key. Paths are under `T90A/`.

| # | Severity | Route | Defect | Screenshot |
| --- | --- | --- | --- | --- |
| 1 | 3 | detour 1 | Done with a typed key drops it with no word; Done is the primary button beside a second primary, Save, and the panel still says it needs a key | detour-1/10.png |
| 2 | 2 | keyboard, detour 1 | Enter in API key does nothing | keyboard/51.png |
| 3 | 2 | success, keyboard, detours 3, 4, 5 | The Select step moves the camera to center the node, cutting nodes off at the left and bottom of the canvas, and the view stays cut off after the selection is cleared | success/16.png, keyboard/103.png, detour-3/16.png; before it, detour-1/20.png |
| 4 | 2 | success, keyboard | One measure has two names: "Computed Reach", step Reach and the layer Reach, against Closeness in the key card, inspector and reply | success/16.png, detour-3/16.png |
| 5 | 2 | keyboard | On the next send the old failure is announced again, assertively, as the new run starts | keyboard/93.png |
| 6 | 2 | detour 3 | Closing the conversations list replays every earlier failure as an alert (three at once) | detour-3/07.png |
| 7 | 2 | detour 3 | Send again stacks a duplicate question and failure each time | detour-3/05.png |
| 8 | 2 | detour 1 | Privacy, "Where your data goes" says files are never uploaded and does not mention the Assistant, with values going to Google | detour-1/18.png |
| 9 | 2 | detour 1 | An `sk-` key under Google is saved with no check, though the OpenAI check exists | detour-1/12.png, 13.png |
| 10 | 2 | detour 1 | Settings on the start screen has no AI provider, so a reader holding a key finds no home for it | detour-1/02.png |
| 11 | 2 | keyboard | The show-key eye is out of the tab order, and it is named "Show the password" for an API key | keyboard/51.png |
| 12 | 2 | keyboard | The model label's name is only "GPT-4o": its purpose is in a tooltip a screen reader does not get | keyboard/82.png |
| 13 | 2 | keyboard | Forget key clears a typed, unsaved key and is live with nothing saved; no word follows, and none is announced | keyboard/64.png |
| 14 | 2 | detour 3 | Forget key on a saved key has no confirmation or notice | detour-3/08.png |
| 15 | 2 | detour 4 | Enter during a run does nothing and says nothing; the typed message waits unsent | detour-4/05.png |
| 16 | 1 | detour 3 | After Forget key and Save, New conversation is undone and the failed conversation returns | detour-3/10.png |
| 17 | 1 | detour 1 | Escape in API key drops the key and provider with no word | detour-1/07.png, 09.png |
| 18 | 1 | detour 3 | "Stopped. Changes taken back." when nothing had changed | detour-3/13.png |
| 19 | 1 | keyboard | The alert's text runs together and includes the button: "failed.Nothing changed.Send again" | keyboard/72.png |
| 20 | 1 | success | With a selection the placeholder still reads "Ask about this graph" over the scope "Selection 1" | success/15.png |
| 21 | 1 | keyboard, detour 1 | The whole page sits 1 px higher after some focus moves | keyboard/51.png, detour-1/17.png |
| 22 | 1 | keyboard | Undo and Redo are tab stops while disabled | keyboard/23.png, 24.png |
| 23 | 1 | detour 6 | Tab in the open Provider list does nothing: the list stays open and focus stays put | detour-6, last steps |
| 24 | 1 | keyboard | The first Shift+Tab after a --read stayed in the composer, twice; the second moved. Not separated from the tool | keyboard/74.png, 95.png |

Known and kept for this round by the answer key, seen again here: the refused key reads as a
connection failure with Send again and no AI provider... button (success/10.png); the third starter
"Does name line up with the groups?" (success/08.png); a question repaints the network
(success/15.png).

The camera move of defect 3 also follows Enter in Find (detour-2/05.png), so it is not the Assistant's
alone.
