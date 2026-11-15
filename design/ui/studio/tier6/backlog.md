# Tier 6 backlog

Everything the dry run sent past: friction, wording, cosmetic and accessibility rows. The rounds' decide-and-fix loop takes them between rounds, never the dry run. Accessibility rows are also checked by the accessibility expert's walkthrough. Paths are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/. A row ending in `[Round 3: name]` is taken by that unit of `rounds/round-2/decisions.md`.

## First in line

- A failed step says no reason anywhere: 'Style failed. Nothing changed.' with names and times only in the steps (T91 A). [Round 3: failed-step-says-why]
- What the model saves or filters leaves nothing to find: no set in the Graph place, no filter card in the Data place, Undo the only way back (T95 A).
- A run the model removes itself leaves Open run dead and 'Changed the graph' under 'No changes were made' (T95 A): results' remove returns no effect of its own. Same family as T94 B's dead Open run and Open layer. [Round 3: open-run-and-layer-tell-the-truth]
- Enter on Answer sends focus to an earlier turn's Undo, so a second Enter undoes it; `Waiting.tsx` raises `composerCalls` for Change this and not for Answer (T95 A). [Round 3: focus-after-a-press]
- After a decline the model answered 'remove' with a hide (T93 A). [Round 3: model-stops-at-a-no]
- The model acts after a no: Keep them hid the seven (T93 A), and the model changes the reader's selection on a plain question (T91 B, T92 A, T92 B, T93 B). [Round 3: model-stops-at-a-no]
- Undo in a turn takes focus off the conversation; it fails bar 8 as written (T94 A, T94 B, T95 A). [Round 3: focus-after-a-press]
- 'Or type an answer' refuses a typed answer, against design 4.8 (T95 A). [Round 3: typed-answer-goes-through]
- Raw rule text and field paths in app-drawn rows count on bar 10 (T91 A, T95 B). [Round 3: no-raw-text-on-app-rows]
- A change line that leaves out what the reply says was made counts on bar 11 (T95 B). [Round 3: run-says-it-painted]
- The question's text is the palest on the panel and can hold the only caveat (T93 A, T95 A). [Round 3: question-at-body-size]

## From the first dry run pass (build 8fa33aa786)

### T90A

- friction, sev 3, detour-1: Done with a typed key drops it with no word; two primary buttons; panel still says it needs a key. Nothing false on screen: the panel still asks for a key, and retyping with Save recovers. Friction. [T90A/detour-1/10.png] [Round 3: key-page-keeps-what-was-typed]
- friction, sev 2, keyboard, detour-1: Enter in API key does nothing. Save is the visible route. [T90A/keyboard/51.png] [Round 3: enter-saves-the-key]
- friction, sev 2, success, keyboard, detours 3-5: The Select step, and Enter in Find, moves the camera and cuts nodes off; the view stays moved. No value or node is wrong; Fit recovers. Follows the selection glide, in every selection route. [T90A/success/16.png, keyboard/103.png, detour-3/16.png, detour-2/05.png]
- wording, sev 2, success, detour-3: One measure, two names: Computed Reach, step Reach and layer Reach against Closeness. Wording; the study's answer does not hang on the name. [T90A/success/16.png, detour-3/16.png] [Round 3: one-name-per-measure]
- accessibility, sev 2, keyboard: On the next send the old failure is announced again, assertively. Only a screen-reader user meets it. [T90A/keyboard/93.png] [Round 3: spoken-once]
- accessibility, sev 2, detour-3: Closing the conversations list replays every earlier failure as an alert. Only a screen-reader user meets it. [T90A/detour-3/07.png] [Round 3: spoken-once]
- friction, sev 2, detour-3: Send again stacks a duplicate question and an identical failure each time. answers.md calls pressing it a wrong turn, not a failure of the task; the model label still leads on. [T90A/detour-3/05.png]
- accessibility, sev 2, keyboard: The show-key eye is out of the tab order and named 'Show the password'. Only a keyboard or screen-reader user meets it. [T90A/keyboard/51.png] [Round 3: key-page-keeps-what-was-typed]
- accessibility, sev 2, keyboard: The model label's name is only 'GPT-4o'; its purpose is in a tooltip. Only a screen-reader user meets it. [T90A/keyboard/82.png] [Round 3: panel-names-say-what]
- friction, sev 2, keyboard: Forget key clears a typed, unsaved key and is live with nothing saved; no word follows. Retyping recovers. [T90A/keyboard/64.png] [Round 3: key-page-keeps-what-was-typed]
- friction, sev 2, detour-3: Forget key on a saved key has no confirmation or notice. The panel goes to the no-key screen at once, and retyping recovers. [T90A/detour-3/08.png]
- friction, sev 2, detour-4: Enter during a run does nothing and says nothing; the message waits unsent. The text stays; Enter after the run sends it. [T90A/detour-4/05.png]
- friction, sev 1, detour-3: After Forget key and Save, New conversation is undone and the failed conversation returns. The next message still works. [T90A/detour-3/10.png]
- friction, sev 1, detour-1: Escape in API key closes Settings and drops the key and provider with no word. Retyping recovers. [T90A/detour-1/07.png, 09.png]
- wording, sev 1, detour-3: 'Stopped. Changes taken back.' when nothing had changed. Wording of design 6.4's row; harmless. [T90A/detour-3/13.png] [Round 3: end-rows-tell-the-truth]
- accessibility, sev 1, keyboard: The alert's text runs together and includes the button. Only a screen-reader user meets it. [T90A/keyboard/72.png] [Round 3: spoken-once]
- wording, sev 1, success: With a selection the placeholder still reads 'Ask about this graph' over 'Selection 1'. The scope line above it is right. [T90A/success/15.png] [Round 3: composer-says-its-scope]
- cosmetic, sev 1, keyboard, detour-1: The whole page sits 1 px higher after some focus moves. Cosmetic. [T90A/keyboard/51.png, detour-1/17.png]
- accessibility, sev 1, keyboard: Undo and Redo are tab stops while disabled. Only a keyboard user meets it. [T90A/keyboard/23.png, 24.png]
- accessibility, sev 1, detour-6: Tab in the open Provider list does nothing. Only a keyboard user meets it; Enter and Escape work. [T90A/detour-6, last steps]
- accessibility, sev 1, keyboard: The first Shift+Tab after a --read stayed in the composer, twice. Not separated from the tool; the accessibility walk checks it. [T90A/keyboard/74.png, 95.png]

### T90B

- friction, sev 3, detour-1: A typed key is dropped with no word on Done or Escape; the panel stays on the no-key screen. As T90 A: nothing false on screen, and Save recovers. Friction, so it does not block. [T90B/detour-1/10.png, 12.png] [Round 3: key-page-keeps-what-was-typed]
- friction, sev 2, success: Enter in the API key box does nothing. Save is the visible route. [T90B/success/08.png] [Round 3: enter-saves-the-key]
- friction, sev 2, success, keyboard: 'and 1 more' under the change lines seems to do nothing. The extra line stays in the steps; no answer depends on it. [T90B/success/20.png, keyboard/104.png] [Round 3: change-lines-read-once]
- wording, sev 2, success, keyboard, detour-3: The reply says no changes above 'Computed Connections for 24 nodes' and an Undo. Model prose beside a true change line; answers.md, T95, expects the run left behind. [T90B/success/19.png, keyboard/94.png, detour-3/08.png]
- friction, sev 2, success: Open run lands on an empty Style tab, and opens one run of four, called Degree. One more click to Values; the reader gets the numbers. [T90B/success/23.png] [Round 3: open-run-and-layer-tell-the-truth]
- wording, sev 2, success, keyboard: The run's Values list ids, not names; spoken news the same; 'Top 10' shows 7 rows. answers.md takes the id as a right answer. [T90B/success/24.png, keyboard/94.png]
- friction, sev 2, detour-3: After Send again the transcript does not follow the new turn. A scroll recovers it. [T90B/detour-3/11.png, 12.png] [Round 3: reply-end-in-view]
- accessibility, sev 2, keyboard: Old failures are spoken again as alerts, and the words run together. Only a screen-reader user meets it. [T90B/keyboard/94.png, 76.png, 108.png] [Round 3: spoken-once]
- friction, sev 2, detour-3: Forget key hides the conversation behind the no-key screen; the status bar returns to 'Local only'. Saving a key brings it back. [T90B/detour-3/13.png, 14.png]
- accessibility, sev 2, keyboard: The show-key button cannot be reached by Tab and is named 'Show the password'. Only a keyboard or screen-reader user meets it. [T90B/keyboard/52.png] [Round 3: key-page-keeps-what-was-typed]
- accessibility, sev 2, keyboard: The model label's name is only 'GPT-4o'. Only a screen-reader user meets it. [T90B/keyboard/69.png] [Round 3: panel-names-say-what]
- accessibility, sev 2, keyboard: Twelve Tabs to the rail, and arrow keys with nothing announcing them. Only a keyboard user meets it. [T90B/keyboard/28.png]
- accessibility, sev 1, keyboard, detour-2: AI provider... and the model label open Settings with focus on Close. Only a keyboard user meets it. [T90B/detour-2/16.png]
- cosmetic, sev 1, success, keyboard: Send looks the same empty and disabled as ready. Reads as ready but its name says disabled; nothing is blocked. A shared Figma-locked look, so it needs care between rounds. [T90B/success/09.png, keyboard/59.png] [Round 3: disabled-looks-disabled]
- accessibility, sev 1, keyboard: Two buttons named 'New conversation'. Only a screen-reader user meets it. [T90B/keyboard/59.png] [Round 3: panel-names-say-what]
- friction, sev 1, detour-2: Quick actions for 'AI' offers AI provider... but not Assistant. The rail is in view; AI provider... leads on. [T90B/detour-2/15.png] [Round 3: assistant-door]
- wording, sev 1, success: 'Sending to Google' stays unchanged for over 20 seconds while tools run. The step count moves. [T90B/success/18.png]
- wording, sev 1, detour-3: 'Stopped. Changes taken back.' after a stop with no changes. Harmless wording. [T90B/detour-3/07.png] [Round 3: end-rows-tell-the-truth]
- accessibility, sev 1, detour-4, keyboard: Control+I sends focus to different places from the composer and the no-key screen. Only a keyboard user meets it. [T90B/detour-4/05.png] [Round 3: assistant-door]
- accessibility, sev 1, keyboard: Send again leaves focus on region 'Conversation'. Only a keyboard user meets it; focus is not lost. [T90B/keyboard/76.png] [Round 3: focus-after-a-press]
- cosmetic, sev 1, success, detour-2: The whole page sits 1 px higher once Settings is opened from the status bar. Cosmetic. [T90B/success/21.png, 23.png]
- friction, sev 1, detour-2: Find for 'AI' matches inside emails; Enter selects a stranger and moves the camera. Escape clears it; the rail stays in view. [T90B/detour-2/04.png, 06.png, 07.png]

### T91A

- friction, sev 3, detour-1: Ctrl+K then 'AI' lists 'Select what it paints' first; Enter selects all 24 and rescopes. The scope line says so and a click clears it. Friction, so it does not block. [T91A/detour-1/11.png, 12.png, 17.png] [Round 3: assistant-door]
- wording, sev 2, success: The AI's layer reads 'Picked by hand: 9 nodes'. The nine are right. The first row's fix should bring the rule back. [T91A/success/11.png] [Round 3: no-raw-text-on-app-rows]
- wording, sev 2, keyboard: Raw rule text 'data.trained == false' on screen in the steps. Friction, but it counts on bar 10 between rounds. [T91A/keyboard/36.png] [Round 3: no-raw-text-on-app-rows]
- wording, sev 2, success: The reply names ids though the file has names. answers.md takes ids. [T91A/success/08.png]
- friction, sev 2, keyboard: After Escape the list ends at a cut-off 'Assistant' heading. A scroll shows it. [T91A/keyboard/36.png]
- accessibility, sev 2, keyboard: Open layer keeps focus and announces nothing. Only a screen-reader user meets it. [T91A/keyboard/32.png] [Round 3: open-run-and-layer-tell-the-truth]
- cosmetic, sev 1, detour-3: The model painted the selection's own yellow and named the layer 'Selection Highlight'. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. [T91A/detour-3/07.png]
- wording, sev 1, detour-3: The sort label for a yes/no column reads 'A to Z'. Wording. [T91A/detour-3/05.png]

### T91B

- friction, sev 2, detour-3: The Assistant cleared the selection unasked and reported 'Selected 0 nodes' as a change. The clearing is the model's act; a retyped message works. The zero line goes with the chip-row unit. [T91B/detour-3/11.png]
- friction, sev 2, detour-2: Show in table opens all rows in load order with none of the nine on screen, and selects them. Two clicks on the heading bring them up, shaded. [T91B/detour-2/04.png] [Round 3: show-in-table-lists-its-rows]
- cosmetic, sev 2, detour-2: With the table open the drawing is too small to tell the nine apart. Closing the table restores it. [T91B/detour-2/04.png]
- wording, sev 2, detour-1: 'Sized 9 nodes' twice in one turn. True, and it follows the model's calls. [T91B/detour-1/17.png] [Round 3: change-lines-read-once]
- accessibility, sev 2, keyboard: Two chip rows inside the opened steps share one name. Only a screen-reader user meets the duplicate name; the turn itself shows one row. [T91B/keyboard/49.png] [Round 3: panel-names-say-what]
- friction, sev 2, success, keyboard: Selecting shifts and shrinks the drawing about 7%. Not the Assistant's alone; no value is wrong. [T91B/success/08.png]
- accessibility, sev 2, keyboard: Open layer is silent to a screen reader. Only a screen-reader user meets it. [T91B/keyboard/52.png] [Round 3: open-run-and-layer-tell-the-truth]
- cosmetic, sev 1, success, keyboard: Send is the full green primary while disabled. Reads as ready but its name says disabled; nothing is blocked. A shared Figma-locked look, so it needs care between rounds. [T91B/success/02.png] [Round 3: disabled-looks-disabled]
- wording, sev 1, detour-1: The undo notice quotes the reader with no marks and shows with the panel open. Wording. decided.md's one-notice entry covers a turn's change notice; Undid's place is settled between rounds. [T91B/detour-1/21.png] [Round 3: undo-notice]
- wording, sev 1, success: 'Sending to Google' stays unchanged for up to a minute. The step count moves. [T91B/success/05.png]
- wording, sev 1, success, detour-3: Steps name a family, not an act; 'Style failed.' inherits it. Wording. [T91B/success/06.png]
- wording, sev 1, success: 'Rule: data.gal4RGexp < -1' is code to a first-time reader. Wording. [T91B/success/09.png] [Round 3: no-raw-text-on-app-rows]
- wording, sev 1, success, detour-1: The placeholder says 'Ask about this graph' while scoped to a selection. The scope line is right. [T91B/success/08.png] [Round 3: composer-says-its-scope]
- cosmetic, sev 1, success: The chip has cursor default and no tooltip. Hover peeks and click works. [T91B/success/07.png]
- accessibility, sev 1, keyboard: 'New conversation, Conversations' and 'New conversation' side by side; Close does not say what it closes. Only a screen-reader user meets it. [T91B/keyboard/12.png] [Round 3: panel-names-say-what]
- accessibility, sev 1, keyboard: The rail is one tab stop with no spoken hint. Only a keyboard user meets it; Control+I also goes there. [T91B/keyboard/07.png]
- friction, sev 1, detour-1: 'AI' in the Analyze filter matches letters inside names. Escape leaves it. [T91B/detour-1/10.png]
- friction, sev 1, detour-3: A retried turn loses its failure lines. Should close with the words-stay unit; the re-walk says. [T91B/detour-3/11.png]
- friction, sev 1, keyboard: Closing and reopening the panel collapses opened steps. One press reopens them. [T91B/keyboard/71.png]

### T92A

- friction, sev 3, keyboard: The model changed the selection on a plain question. The model's act, and the screen says so ('Selected ...'); answers.md keeps the selection as T92 A's subject. First in line between rounds. [T92A/keyboard/70.png] [Round 3: model-stops-at-a-no]
- friction, sev 3, keyboard: With Whole graph on the line the reply still led with '6 of the 9'. The message did go as whole graph: its facts line says so, 'whatever is selected'. The model carried its earlier words. Reported as the model's; a new conversation gave 7 of 12. [--read output, keyboard walk]
- friction, sev 2, detour-1, keyboard: A rolled-back turn leaves Redo lit with Undo dim. Nothing is wrong in the graph. Should go with the run-scope unit on this route. [T92A/detour-1/04.png, keyboard/70.png] [Round 3: rollback-leaves-nothing]
- friction, sev 2, keyboard: One turn sat on 'Sending to Google' with a stale '7 steps' for about three minutes. It ended by itself; Stop is on screen. [--read output, keyboard walk]
- accessibility, sev 2, keyboard: The scope x sends focus to different places. Only a keyboard user meets it. [focus output, keyboard walk] [Round 3: focus-after-a-press]
- wording, sev 2, success, keyboard: The reply, Top 10 and spoken news use ids. answers.md takes ids. [T92A/success/04.png, 08.png]
- wording, sev 2, success: 'No visual changes were made' above 'Computed Bridges for 24 nodes' and an Undo. Model prose beside a true line. [T92A/success/04.png] [Round 3: one-name-per-measure]
- friction, sev 2, success: Open run lands on an empty Style tab. One more click to Values; the reader gets the numbers. [T92A/success/06.png, 07.png] [Round 3: open-run-and-layer-tell-the-truth]
- friction, sev 2, detour-2: Two change lines and one Open run. The other run is in Analyze's Recent. [T92A/detour-2/04.png, 07.png]
- friction, sev 2, success: Clicking a Top 10 row moves the canvas and replaces the selection. The selection glide again; the scope line says so. [T92A/success/11.png]
- cosmetic, sev 2, success: A disabled Send looks enabled. Reads as ready but its name says disabled; nothing is blocked. A shared Figma-locked look, so it needs care between rounds. [T92A/success/02.png, 04.png] [Round 3: disabled-looks-disabled]
- friction, sev 2, detour-3: A right-click on an edge replaces the selection before the menu opens. The scope line says so. The stray selection is the input of T91 B's row. [T92A/detour-3/05.png]
- accessibility, sev 2, keyboard: The status news reports a run the turn then takes back. Only a screen-reader user meets it. Should go with the run-scope unit on this route. [--read output, keyboard walk] [Round 3: spoken-once]
- cosmetic, sev 1, keyboard: 'No microphone found.' stays under the composer. Cosmetic. [T92A/keyboard/70.png]
- wording, sev 1, success: The gear mark under 'Made with' has no words. Wording. [T92A/success/08.png]
- cosmetic, sev 1, success: The Find box wears its focus ring at the start. Cosmetic. [T92A/success/01.png]
- cosmetic, sev 1, success: One node sits under the inspector's edge on the opening view. Cosmetic; Fit recovers. [T92A/success/01.png]

### T92B

- friction, sev 3, detour-2: Fact 2 with the model's selection on returned 'at least 6 genes above 1.1'. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. Asking again gave 7; three walks gave 7, 7 and this. [T92B/detour-2/05.png]
- friction, sev 3, detour-2: Show in table selects but does not sort or scroll to the rows. One click on the heading sorts them (T92 B success did). Friction, so it does not block. [T92B/detour-2/10.png] [Round 3: show-in-table-lists-its-rows]
- friction, sev 2, success, detour-2, keyboard: The model clears the selection inside a question; 'Selected 0 nodes' under 'There are 7 genes'. The clearing is the model's act. The zero line goes with the chip-row unit. [T92B/success/12.png, detour-2/05.png]
- wording, sev 2, success, detour-2, keyboard: One measure, two names: 'Computed Bridges' beside 'Betweenness'. Wording. [T92B/success/03.png, detour-2/03.png] [Round 3: one-name-per-measure]
- wording, sev 2, success: Ids for fact 1, names for fact 2; Top 10 ids only. answers.md takes ids. [T92B/success/07.png, 12.png]
- friction, sev 2, detour-1: Undo of the filter restores the nodes to a different drawing. No count or style is wrong; the layout moved. [T92B/detour-1/04.png, 07.png]
- friction, sev 2, detour-1: Open run on a run that painted nothing lands on an empty Style tab. One more click to Values; the reader gets the numbers. [T92B/detour-1/04.png, success/06.png] [Round 3: open-run-and-layer-tell-the-truth]
- cosmetic, sev 2, detour-2: A long transcript draws a second scrollbar; 'Jump to newest' sits over the text. Cosmetic; the reply can be reached. [T92B/detour-2/07.png, 08.png] [Round 3: reply-end-in-view]
- accessibility, sev 2, keyboard: Open run gives no signal. Only a screen-reader user meets it. [keyboard walk, step after 'Open run'] [Round 3: open-run-and-layer-tell-the-truth]
- wording, sev 1, success: 'No matches.' rows do not say what was searched. Wording. [T92B/success/12.png]
- wording, sev 1, detour-2: A reply saying it selected five has no 'Selected 5 nodes' line. The selection shows on the scope line. [T92B/detour-2/03.png] [Round 3: top-with-select-has-its-line]
- wording, sev 1, success: The run's Style tab says 0 to 16120 where the key card says 16,124. A rounded scale end; Values and the key card hold the number. [T92B/success/06.png]
- friction, sev 1, detour-3: Quick actions finds nothing for 'ask'. 'assistant' finds it. [T92B/detour-3/09.png, 12.png] [Round 3: assistant-door]
- wording, sev 1, keyboard: 'Stopped. Changes taken back.' on a turn that changed nothing. Harmless wording. [keyboard walk, near the end] [Round 3: end-rows-tell-the-truth]
- wording, sev 1, detour-1: 'Undid Show me those 7 genes.' with the panel open beside Undone. Wording. [T92B/detour-1/07.png] [Round 3: undo-notice]

### T93A

- friction, sev 3, detour-1: Keep them did not keep them: the model hid the seven instead. The screen is truthful ('Filtered to 17 of 24 nodes', 7 hidden, Undo), and answers.md grades that state. The model's act after a no. First in line between rounds. [T93A/detour-1/15.png, 16.png] [Round 3: model-stops-at-a-no]
- friction, sev 2, detour-2, detour-1: A held request changes the selection while saying nothing changed. Likely the held batch's measuring removal leaving the selection remapped; the scope line says so, and no count or removal is wrong. Friction. [T93A/detour-2/03.png, 04.png, detour-1/05.png, 06.png, 10.png]
- wording, sev 2, detour-1, detour-4: The model offered 'only the 3 untrained'. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. answers.md grades both choices. [T93A/detour-1/03.png, detour-4/03.png]
- wording, sev 2, detour-1, detour-2: The model's 'permanent' and 'irreversible' against 'Undo can bring them back.'. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. [T93A/detour-1/06.png, detour-2/04.png, 06.png]
- cosmetic, sev 2, detour-1, detour-4: The question's text is the smallest and palest on the panel. Cosmetic, but it can hold the only caveat, so it comes early. [T93A/detour-1/03.png, detour-4/03.png] [Round 3: question-at-body-size]
- friction, sev 2, detour-1: Change this ends the turn with a model call and 'Declined. Nothing changed.'. Focus goes to the composer, as designed; typing goes on. [T93A/detour-1/09.png, 10.png]
- wording, sev 2, detour-2, detour-1: Undo and Redo notices quote the sentence and double its period. Wording. [T93A/detour-2/06.png, 08.png, detour-1/17.png] [Round 3: undo-notice]
- accessibility, sev 2, keyboard: Escape from the conversation list puts focus in the composer. Only a keyboard user meets it. [T93A/keyboard/24.png, 25.png] [Round 3: assistant-door]
- wording, sev 2, detour-3: A reply gave ids where a reader needs names. Other replies give names. [T93A/detour-3/03.png]
- cosmetic, sev 2, success, detour-1: Count chips have no pointer cursor and no tooltip. Hover peeks and click works. [T93A/success/04.png, detour-1/08.png]
- friction, sev 2, detour-3: The find box with 'phone' offers only the 17 with a value. The Assistant is the task's route. [T93A/detour-3/07.png, 08.png]
- friction, sev 2, detour-3: Right-clicking a node moved the drawing far from the pointer. No value is wrong; Fit recovers. Same glide as the Select step. [T93A/detour-3/06.png]
- cosmetic, sev 1, detour-1: The whole page sits 1 px higher from one screen on. Cosmetic. [T93A/detour-1/07.png onward]

### T93B

- wording, sev 2, keyboard, detour-1: The reply says 'an irreversible change' above 'Undo can bring them back.'. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. [T93B/keyboard/22.png, detour-1/06.png, success/07.png]
- friction, sev 2, detour-2: A question while a request waits cancels it and erases the reply; 'Not run' does not say what. Asking again brings the card back. The words go with the words-stay unit. [T93B/detour-2/14.png]
- wording, sev 2, detour-1: After Keep them the reply says 'Please confirm the action in the prompt on your screen'. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. [T93B/detour-1/07.png]
- friction, sev 2, detour-2: The turn's Undo above a waiting request breaks it. The model recovered by itself; the stale request says so. [T93B/detour-2/16.png, 18.png]
- friction, sev 2, detour-2: Open run lands on an empty Style tab. One more click to Values; the reader gets the numbers. [T93B/detour-2/09.png] [Round 3: open-run-and-layer-tell-the-truth]
- wording, sev 2, success, detour-2: The undo notice shows with the panel open and is cut off. Wording and layout. [T93B/success/13.png, detour-2/16.png, 18.png] [Round 3: undo-notice]
- accessibility, sev 2, keyboard: The request's buttons carry no context for a screen reader. Only a screen-reader user meets it. [T93B/keyboard/22.png] [Round 3: panel-names-say-what]
- accessibility, sev 1, keyboard: The second chip is reachable only by arrows. Only a keyboard user meets it. [T93B/keyboard/22.png]
- accessibility, sev 1, keyboard: Two controls named '82 nodes, select'. Only a screen-reader user meets it. [T93B/keyboard/22.png] [Round 3: panel-names-say-what]
- friction, sev 1, keyboard: A step's chips change after the removal. A live count by design; the first steps' rows are not the card. [T93B/keyboard/37.png]
- wording, sev 1, success, detour-2: Two names for one analysis; a stale 'for 331 nodes'. Wording. [T93B/success/07.png, detour-2/09.png] [Round 3: one-name-per-measure]
- friction, sev 1, detour-1: Change this offers nothing to change. Typing goes on. [T93B/detour-1/03.png]
- wording, sev 1, detour-1: The change line 'Changed the graph' says nothing. Wording. [T93B/detour-1/05.png] [Round 3: run-says-it-painted]
- wording, sev 1, detour-1: Only Other has a count in the key card. Wording. [T93B/detour-1/05.png]
- wording, sev 1, detour-3: 'Sending to Google' stays for up to a minute. The step count moves. [T93B/detour-3/07.png, 08.png, 10.png]
- cosmetic, sev 1, success: The chips give no pointer cue or tooltip. Hover peeks and click works. [T93B/success/04.png]

### T94A

- accessibility, sev 2, keyboard: Undo in the turn lands focus on the top bar's disabled Undo. Only a keyboard user meets it; the accessibility walk counts it on bar 8. [T94A/keyboard/28.png, 29.png] [Round 3: focus-after-a-press]
- friction, sev 2, setup, any route: In 1 of 8 starts a click on Assistant just after the project opened stayed on Graph. A second click works; a start that fails is run again. Likely AssistantPlace's effect sending the place to Graph when the new element reports no features for a moment, not proven. [T94A/setup-race/03.png, setup.log] [Round 3: assistant-door]
- friction, sev 1, detour-3: The run's Style tab is a blank pane. One more click to Values; the reader gets the numbers. [T94A/detour-3/08.png] [Round 3: open-run-and-layer-tell-the-truth]
- wording, sev 1, detour-1: The change line 'Changed the graph' says less than the reply. Wording. [T94A/detour-1/03.png] [Round 3: run-says-it-painted]
- friction, sev 1, detour-4: New conversation reads as a fresh start with the colors still on. The arrow still takes it back. [T94A/detour-4/04.png]
- accessibility, sev 1, keyboard: Tab into the layer list lands on the bottom row. Only a keyboard user meets it. [T94A/keyboard, step after 'Add a layer or a folder']
- cosmetic, sev 1, success: Send is the full green primary while disabled. Reads as ready but its name says disabled; nothing is blocked. A shared Figma-locked look, so it needs care between rounds. [T94A/success/05.png] [Round 3: disabled-looks-disabled]
- wording, sev 1, detour-3: One result carries several names: Communities, Louvain, Group 1 to 6, Groups. Wording. [T94A/detour-3/03.png, 08.png] [Round 3: one-name-per-measure]

### T94B

- accessibility, sev 2, keyboard: Undo in a turn takes focus away from the conversation; a typed letter is refused. Only a keyboard user meets it, so it goes to the backlog under this pass's rule; it fails bar 8 as written and comes first there. [T94B/keyboard/22.png, 29.png] [Round 3: focus-after-a-press]
- friction, sev 2, detour-1: Open layer and Open run do nothing once the layer or run is gone. No wrong value; the Graph place shows the truth. [T94B/detour-1/08.png, 09.png] [Round 3: open-run-and-layer-tell-the-truth]
- wording, sev 2, detour-1: 'Changed the graph' twice, and the reversed turns show no sign. The look and the layers are right. [T94B/detour-1/06.png] [Round 3: run-says-it-painted]
- friction, sev 2, detour-1, detour-2: Enter while a reply is arriving does nothing and says nothing. A second Enter sends it. [T94B/detour-1/03.png, 04.png, 05.png, detour-2/03.png]
- accessibility, sev 2, keyboard: The turn's button is named only 'Undo'. Only a screen-reader user meets it. [T94B/keyboard] [Round 3: panel-names-say-what]
- friction, sev 2, detour-2: Open run lands on an empty Style tab. One more click to Values; the reader gets the numbers. [T94B/detour-2/11.png] [Round 3: open-run-and-layer-tell-the-truth]
- wording, sev 2, detour-1: Steps read 'Algorithm results 15 ms'; opening them pushes Undo half out. Wording; a scroll recovers it. [T94B/detour-1/07.png, 11.png]
- wording, sev 1, success: The key card says 'Color: Louvain' to a reader who asked for crews. Wording. [T94B/success/04.png]
- cosmetic, sev 1, success: Rows change height between 'Open run, Undo' and 'Undone'. Cosmetic. [T94B/success/06.png, 07.png]
- wording, sev 1, detour-1: Undo's notice puts the reader's sentence after the verb. Wording. [T94B/detour-1/11.png] [Round 3: undo-notice]
- friction, sev 1, detour-3: A draft survives New conversation. Cosmetic; it can be cleared. [T94B/detour-3/07.png]
- friction, sev 1, tool: SETUP FAILED: the first --start missed 'AI provider...' although the screenshot shows it. The tool, not the app: match.mjs does not wait for a setup click. A start that fails is run again; five walks started clean. [T94B/setup-miss-1/01.png]

### T95A

- friction, sev 3, keyboard: Undo on 'Selected 6 nodes' undoes the other turn's run; both rows read Undone; 6 stay selected. Not a wrong step: an answer goes on with the message it answers, so the two turns hold one step, and selection is not undoable. Two Undos for one step is friction. [T95A/keyboard/33.png, 47.png]
- friction, sev 2, detour-2: 'Saved as a named set' appears in neither the Graph nor the Data place. The task needs no set. [T95A/detour-2/07.png, 11.png, 12.png]
- accessibility, sev 2, keyboard: Spoken 'Degree finished: v02 ranks first, 8' sounds like the answer. Only a screen-reader user meets it. [status line, keyboard walk] [Round 3: spoken-once]
- friction, sev 2, detour-4: 'Or type an answer' refuses 'lowest hours'. The radios answer it, and a typed choice works. Against design 4.8, first in line between rounds. [T95A/detour-4/09.png, 10.png] [Round 3: typed-answer-goes-through]
- friction, sev 2, keyboard, detour-4: The transcript rewrites itself while an answer runs. It settles when the reply lands. May close with the words-stay unit. [T95A/keyboard/31.png, detour-4/11.png]
- wording, sev 2, success: 'No changes were made' above 'Computed Connections for 24 nodes'. Model prose beside a true line; answers.md allows the run left behind. [T95A/success/04.png]
- cosmetic, sev 2, keyboard: The question's text is the smallest and palest on the panel. Cosmetic, but it can hold the only caveat, so it comes early. [T95A/keyboard/26.png] [Round 3: question-at-body-size]
- wording, sev 2, success, detour-3: Three names for one thing: Connections, Degree; PageRank, Influence. Wording. [T95A/success/07.png, detour-3/06.png] [Round 3: one-name-per-measure]
- wording, sev 2, success, detour-3: Run details and a reply use ids where the file has names. answers.md's id column. [T95A/success/08.png, detour-3/06.png]
- friction, sev 2, success: Open run lands on an empty Style tab. One more click to Values; the reader gets the numbers. [T95A/success/07.png, 09.png] [Round 3: open-run-and-layer-tell-the-truth]
- friction, sev 2, detour-3: Right-clicking a node moves the drawing. No value is wrong; Fit recovers. [T95A/detour-3/01.png, 02.png]
- cosmetic, sev 1, detour-4: A disabled Answer is the filled green primary with no reason shown. Reads as ready but its name says disabled; nothing is blocked. A shared Figma-locked look, so it needs care between rounds. [T95A/detour-4/06.png, 07.png] [Round 3: failed-step-says-why]
- wording, sev 1, detour-2, keyboard: The Undid notice quotes the whole message and ends in two periods. Wording. [T95A/detour-2/05.png, keyboard/47.png] [Round 3: undo-notice]
- accessibility, sev 1, keyboard: The top-bar Undo's name is the whole message. Only a screen-reader user meets it. [Shift+Tab walk, keyboard] [Round 3: panel-names-say-what]
- accessibility, sev 1, keyboard: After the turn's Undo, focus lands on the top bar's disabled Undo. Only a keyboard user meets it. [T95A/keyboard/47.png] [Round 3: focus-after-a-press]
- accessibility, sev 1, keyboard: Control+I in the composer can send focus to the top-bar Undo. Only a keyboard user meets it. [after the forward Tab walk, keyboard] [Round 3: assistant-door]
- wording, sev 1, success: Bare 16 chips under three identical 'Query data' steps. Wording. [T95A/success/05.png]
- cosmetic, sev 1, detour-4: The Analyze filter's no-match state is a large empty panel. Cosmetic. [T95A/detour-4/03.png]
- wording, sev 1, detour-4: The camera moved with no 'Moved the view' line. Wording. [T95A/detour-4/12.png]

### T95B

- wording, sev 2, success: 'It can be wrong.' goes with the starters after the first message. Wording, and T95's result may say where it belongs. [T95B/success/02.png, 04.png]
- accessibility, sev 2, keyboard: Control+I with Settings open moves focus behind the dialog. Only a keyboard user meets it. [T95B/keyboard/37.png] [Round 3: a-dialog-holds-the-keys]
- wording, sev 2, detour-3: Raw field path in a change line: 'Sized 331 nodes by results.degree.value'. Friction, but it counts on bar 10 between rounds. [T95B/detour-3/04.png] [Round 3: no-raw-text-on-app-rows]
- wording, sev 2, detour-3, detour-1: One measure has three names in a turn. Wording. [T95B/detour-3/04.png, detour-1/03.png] [Round 3: one-name-per-measure]
- wording, sev 2, detour-3: The change line leaves out the color and the selection the reply says were made. The picture shows them. Counts on bar 11 between rounds. [T95B/detour-3/04.png] [Round 3: run-says-it-painted]
- friction, sev 2, detour-2, detour-3: Show in table opens all rows in load order. One click sorts. [T95B/detour-2/16.png, detour-3/08.png] [Round 3: show-in-table-lists-its-rows]
- cosmetic, sev 2, detour-3: A long conversation adds an outer scrollbar and moves the header 15 px. Cosmetic. [T95B/detour-3/05.png, 06.png] [Round 3: reply-end-in-view]
- friction, sev 2, detour-2: The Data place's Attributes group lists no columns; its chip does nothing. The table shows the columns. [T95B/detour-2/04.png, 05.png, 11.png]
- friction, sev 2, detour-2: Right-clicking a gene moves the drawing about 135 px. No value is wrong. [T95B/detour-2/11.png, 12.png]
- wording, sev 1, success: 'No matches for essential.' with a warning mark under a correct answer. Wording. [T95B/success/04.png, 05.png]
- wording, sev 1, detour-3, detour-2: Step names are the tool's, with bare chips. Wording. [T95B/detour-3/06.png, detour-2/15.png]
- wording, sev 1, detour-1: 'Undid Which nodes matter most?.' with the panel open. Wording. [T95B/detour-1/08.png] [Round 3: undo-notice]
- wording, sev 1, keyboard: 'Stopped. Changes taken back.' when nothing had changed. Harmless wording. [T95B/keyboard/45.png] [Round 3: end-rows-tell-the-truth]
- wording, sev 1, success, detour-3: 20 to 25 seconds in, only 'Sending to Google' and a step count. The step count moves. [T95B/success/03.png, detour-3/02.png]

## From the second dry run pass (build 3549e11129)

Paths here are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/. Rows marked carried repeat an entry above with a newer screenshot.

### T90A

- friction, sev 2, touched-26, touched-26-names: With the transcript overflowing, opening the steps list makes the whole panel body scroll too: a second scrollbar, the composer jumps up, the title row scrolls away. The composer still works and the text can be reached. Same fault as T92A's and T93B's two scrollbars. [T90A/touched-26/20.png, T90A/touched-26-names/10.png] [Round 3: reply-end-in-view]
- friction, sev 1, touched-26-names: 'and 8 more' under the change lines opens the steps list instead of the remaining lines. The steps hold them; one more read. [T90A/touched-26-names/09.png, 10.png] [Round 3: change-lines-read-once]
- wording, sev 1, touched-26-names: A warning row 'No matches.' is the last line of a right reply, with nothing saying which lookup it belongs to. The reply is right and stands. The chip-row rule puts a found result first where the turn has one. [T90A/touched-26-names/05.png]
- friction, sev 2, success, touched-26, touched-30: The Select step moves the camera and cuts nodes off at the left and bottom of the canvas. Carried from the first pass. No value or node is wrong; Fit recovers. [T90A/success/14.png]
- wording, sev 2, success, touched-26, touched-30: 'Computed Reach' and step Reach against Closeness in the key card, inspector and reply. Carried. Wording; the study's answer does not hang on the name. [T90A/success/14.png] [Round 3: one-name-per-measure]
- friction, sev 2, touched-26: Closing the conversations list replays each earlier failure as a notice, three at once. Carried. Nothing is lost and the notices go. [T90A/touched-26/07.png] [Round 3: spoken-once]
- friction, sev 2, touched-26: Send again stacks a duplicate question and failure each time. Carried. answers.md calls pressing it a wrong turn; the model label still leads on. [T90A/touched-26/05.png]
- friction, sev 2, touched-26: Forget key has no confirmation or notice. Carried. Retyping recovers. [T90A/touched-26/08.png]
- friction, sev 2, touched-26-names: Enter during a run does nothing and says nothing; the message waits unsent. Carried. The text stays and Enter after the run sends it. [T90A/touched-26-names/04.png]
- friction, sev 1, touched-26: After Forget key and Save, New conversation is undone and the failed conversation returns. Carried. The next message still works. [T90A/touched-26/10.png]
- wording, sev 1, touched-26: 'Stopped. Changes taken back.' when nothing had changed. Carried. Harmless wording. [T90A/touched-26/14.png] [Round 3: end-rows-tell-the-truth]
- wording, sev 1, success: With a selection the placeholder still reads 'Ask about this graph' over the scope 'Selection 1'. Carried. The scope line above it is right. [T90A/success/14.png] [Round 3: composer-says-its-scope]

### T91B

- wording, sev 1, touched-27: A bare 'No matches.' ends a turn with no Send again and without saying what found nothing. Same turn as the first row; a next message recovers. [T91B/touched-27/12.png]

### T92A

- friction, sev 2, success, keyboard: The Whole graph scope does not reach the model's memory of the conversation: the reply still led with six or 'the 9'. Carried. The message went as whole graph; the model carried on. answers.md grades the report, and the reply holds 7. [T92A/success/11.png, T92A/keyboard/54.png, T92A/touched-13/02.png]
- wording, sev 2, touched-29: A failed reply gives advice the screen has overtaken: 'Please clear your selection and ask again' under a line reading Whole graph. A next message recovers. It has the chip-row unit's cause, so check on the re-walk that it has gone. [T92A/touched-29/05.png]
- friction, sev 2, touched-29: After a canvas right-click, then x and Send again, focus stays on the graph drawing, not in the composer. One click reaches the composer. Whether typing is lost was not tried. [T92A/touched-29/07.png, 08.png] [Round 3: focus-after-a-press]
- friction, sev 2, touched-33: The model selects on a plain question, which replaces the reader's selection and becomes the next message's scope. Carried; first in line in the backlog. The model's act; the screen says what happened and a next message recovers. Not a blocked route. [T92A/touched-33/02.png] [Round 3: model-stops-at-a-no]
- friction, sev 2, touched-19: Redo lit with Undo dim after a rolled-back turn. Carried. Nothing is wrong in the graph. [T92A/touched-19/08.png] [Round 3: rollback-leaves-nothing]
- cosmetic, sev 1, touched-16: Two scrollbars side by side once the conversation is long, narrowing the composer row by about 15 px. The panel still works. [T92A/touched-16/05.png] [Round 3: reply-end-in-view]
- wording, sev 1, touched-16: 'Changed the graph' is a change line that says nothing, under two exact lines. Wording; the two exact lines are true. [T92A/touched-16/03.png] [Round 3: run-says-it-painted]
- accessibility, sev 1, touched-13, success: Open steps give several chips one accessible name. Only a screen-reader user meets it. [T92A/touched-13/03.png, T92A/success/12.png] [Round 3: panel-names-say-what]
- wording, sev 1, touched-19, touched-29: One request named its layer two ways on two walks. The model's wording; either name is a working layer. [T92A/touched-19/09.png, T92A/touched-29/08.png]
- accessibility, sev 1, keyboard: Control+I closing the panel put focus on inspector tab 'Values', where the earlier pilot had it on the Assistant rail button. Only a keyboard user meets it; Control+I still reopens the panel. [T92A/keyboard/63.png] [Round 3: assistant-door]
- cosmetic, sev 1, success: The whole page sits about 1 px higher once the inspector shows a run. Cosmetic. [T92A/success/05.png, 07.png]
- friction, sev 1, tool: A session folder under the main checkout's tmp/design-studio/tier6 is not read as tier 6 by real.mjs, so a start without REAL_TIER=6 fails with SETUP FAILED: nothing called Assistant. The study tool, not the app. Start every walk with REAL_TIER=6, as the tool's README already says for sessions.

### T93A

- friction, sev 2, touched-20 (detour-1: Change this and Keep them): After a decline, a plain request to remove became a hide with no request card: 'I hid the 7 people', 'Filtered to 17 of 24 nodes', '7 hidden' on the scope line. Seen once. The screen says hid three ways and 'for good, not just hide them' brought the card back, so no route is blocked and a reader reporting them gone has misread: the key's F is fair. Joins the model acting after a no, first in line. [T93A/touched-20/06.png] [Round 3: model-stops-at-a-no]

### T93B

- wording, sev 1, touched-22: A turn that colored the drawing does not say so; detour-1 read 'Changed the graph' for the same coloring. The drawing and the key card show it. [T93B/touched-22/03.png] [Round 3: run-says-it-painted]
- wording, sev 1, detour-1: 'Declined. Nothing changed.' leaves the turn after the next message, while 'Not run: you sent a new message.' stays. The turn's words stay; the end row goes. Nothing false. [T93B/detour-1/05.png, 06.png, T93B/touched-23/04.png] [Round 3: end-rows-tell-the-truth]
- friction, sev 1, detour-1: After a message the conversation stopped on the previous turn with 'Jump to newest', with the message and reply below the fold. The pill is the way down. Mechanism not traced. [T93B/detour-1/07.png] [Round 3: reply-end-in-view]
- cosmetic, sev 1, touched-22: With 8 steps open on a long conversation and a waiting request, a second outer scrollbar, and the header and composer move in about 15 px. Same fault as T90A's row. The request stays reachable. [T93B/touched-22/10.png] [Round 3: reply-end-in-view]

### T94A

- friction, sev 2, setup, any route: A click on Assistant just after the project opens is thrown back to Graph, one start of six; a second click a second later was thrown back too, and a third opened the panel. Carried, and it corrects the backlog: a second click does not always work. A failed start is run again, and a participant's first click comes well after the open. [T94A/setup-race/02.png, 04.png, setup.log] [Round 3: assistant-door]

### T95A

- friction, sev 3, success, detour-2: Open run does nothing and says nothing, because the model removed its own run. Not a step of T95: answers.md says Open run doing nothing is neither a step nor a wrong turn, and the grade rests on the report. Same family as T94B's 'Open run does nothing once the run is gone'. Mechanism now read in source and fitting success/05.png: the results tool's remove returns no effect of its own, so it draws 'Changed the graph', and nothing tells the turn the run left. Every T92 walk that asked fact 1 kept its run, so that check is not touched. First in line. [T95A/success/06.png, 09.png, 12.png, T95A/detour-2/04.png, T95A/keyboard/19.png] [Round 3: open-run-and-layer-tell-the-truth]
- accessibility, sev 2, keyboard: Enter on Answer sends focus to the first turn's Undo, so a second Enter takes that turn's changes back. Only a keyboard user meets it, and Undo's Redo brings it back. First in line. [T95A/keyboard/34.png, 36.png] [Round 3: focus-after-a-press]
- wording, sev 2, success: 'No changes were made to the graph' sits directly over 'Changed the graph' with Undo. answers.md rules it no wrong turn. The same cause as Open run; the words go when that is fixed. [T95A/success/04.png] [Round 3: open-run-and-layer-tell-the-truth]
- friction, sev 2, detour-2: The transcript jumps to the top after Undo, so the turn just undone and its Undone mark go out of view. Scrolling recovers; the graph is right. [T95A/detour-2/12.png, 10.png] [Round 3: reply-end-in-view]
- wording, sev 1, touched-39, keyboard: Change lines repeat ('Selected 5 nodes' twice; 'Selected 2, 0, 2 nodes'), and the status line speaks them the same way. Wording; the zero goes with chip-row. [T95A/touched-39/02.png, T95A/keyboard/36.png] [Round 3: change-lines-read-once]
- wording, sev 1, detour-2: 'The five volunteers ... followed by Omar Haddad' names six. The model's wording. [T95A/detour-2/06.png]
- wording, sev 1, detour-2: Nothing but the reply says a file was saved, and it says 'ready for download'; no line names the file. The browser shows the download. [T95A/detour-2/10.png]
- accessibility, sev 1, keyboard: The spoken news 'Degree finished: v02 ranks first, 8' sounds like the answer. Only a screen-reader user meets it. [T95A/keyboard/11.png] [Round 3: spoken-once]
- accessibility, sev 1, keyboard: The Undid status quotes the whole message and ends in two periods, and focus lands on the top bar's disabled Undo. Carried; only a keyboard or screen-reader user meets it. [T95A/keyboard/52.png] [Round 3: undo-notice]
- cosmetic, sev 1, success, keyboard: A disabled Send (composer empty) is drawn as the filled green primary button. Reads as ready, and its name says disabled; nothing is blocked. A shared Figma-locked look. [T95A/success/04.png, T95A/keyboard/11.png] [Round 3: disabled-looks-disabled]

## From the dry run of build 48879618c4

Paths here are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/. Rows marked carried repeat an entry above with a newer screenshot. Walks of build 3549e11129 moved to the folders beside it named for that build, so the section above's paths may be found there.

### T90A

- friction, sev 2, success, touched-26, touched-30: The Select step moves the camera and cuts nodes off at the left and bottom of the canvas. Carried. No value or node is wrong; Fit recovers. [T90A/success/14.png]
- wording, sev 2, success, touched-26, touched-30: One measure has two names, 'Computed Reach' and step Reach against Closeness in the key card, inspector and reply. Carried. The study's answer does not hang on the name. [T90A/success/15.png] [Round 3: one-name-per-measure]
- friction, sev 2, touched-26: Closing the conversations list replays each earlier failure as a notice, three at once. Carried. Nothing is lost and the notices go. [T90A/touched-26/07.png] [Round 3: spoken-once]
- friction, sev 2, touched-26: Send again stacks a duplicate question and failure each time. Carried. answers.md calls pressing it a wrong turn; the model label still leads on. [T90A/touched-26/05.png]
- friction, sev 2, touched-26: Forget key has no confirmation or notice. Carried. Retyping recovers. [T90A/touched-26/08.png]
- friction, sev 1, touched-26: After Forget key and Save, New conversation is undone and the failed conversation returns. Carried. The next message still works. [T90A/touched-26/10.png]
- wording, sev 1, touched-26: 'Stopped. Changes taken back.' when nothing had changed. Carried. Harmless wording. [T90A/touched-26/13.png] [Round 3: end-rows-tell-the-truth]
- wording, sev 1, success, touched-30: With a selection the placeholder still reads 'Ask about this graph' over the scope 'Selection 1'. Carried. The scope line above it is right. [T90A/success/14.png] [Round 3: composer-says-its-scope]
- cosmetic, sev 1, touched-42: The whole page sits 1 px higher after some focus moves. Cosmetic. [T90A/touched-42/18.png]

### T91A

- friction, sev 2, detour-2: Selection 15 stays as the scope, so 'Make them stand out' ended in 'Style failed. Nothing changed.', with no reason shown anywhere. Nothing was painted on the wrong people, and the scope x then Send again is a way out the screen offered, as answers.md records. Follows from the row above. The missing reason joins first in line. [T91A/detour-2/07.png, 08.png, 11.png] [Round 3: failed-step-says-why]
- friction, sev 1, detour-2: After that recovery the model only resized the nine, to the top of the ranking's own range, with no color, so they barely read apart. The model's act. The reader can see it and ask for more, which answers.md puts on the path. [T91A/detour-2/11.png, 12.png]
- wording, sev 1, detour-2-plain: 'Sized 9 nodes' appears twice in one reply when the model writes size twice. True both times. [T91A/detour-2-plain/06.png] [Round 3: change-lines-read-once]

### T91B

- wording, sev 1, detour-3: stray selection: A bare 'No matches.' four times, not saying what found nothing, with no way forward. Same turn as the false count; a next message recovers. [T91B/touched-27-48879618c4/11.png]
- friction, sev 1, tool: The study tool: a walk folder under the main checkout needs REAL_TIER=6; --replay calls a console error that differs only by port a divergence; --start refuses a folder holding screenshots. The tool, not the app. Each has a route past it, and none touches a session.

### T92A

- wording, sev 2, touched-29: 'please clear your selection and ask again' under a line already reading Whole graph. A next message recovers. It has the chip-row unit's cause, so check on the re-walk that it has gone. [T92A/touched-29/08.png]
- friction, sev 2, touched-33, keyboard: The model selects on a plain question, and that becomes the next message's scope. Carried; first in line. The screen says what happened and a next message recovers. [T92A/touched-33/02.png, T92A/keyboard/19.png, 54.png] [Round 3: model-stops-at-a-no]
- cosmetic, sev 1, success: Two scrollbars once the conversation is long. Carried. The panel still works. [T92A/success/16.png] [Round 3: reply-end-in-view]
- accessibility, sev 1, success: Open steps give two controls one name, '9 nodes, select' and '12 nodes, select'. Carried. Only a screen-reader user meets it. [T92A/success/12.png] [Round 3: panel-names-say-what]
- friction, sev 1, success: Two change lines and one Open run, so the 14-node Betweenness run cannot be opened from the turn. Carried. answers.md: Open run is the 24-node run, which holds the answer. [T92A/success/06.png]
- accessibility, sev 1, keyboard: Enter on a Top 10 row moves focus to tab 'Values' because the row goes, so a keyboard reader lands above the list. Only a keyboard user meets it. [T92A/keyboard/49.png]
- accessibility, sev 1, keyboard: Control+I closes the panel with focus on tab 'Values', not the Assistant rail button. Carried. Only a keyboard user meets it; Control+I reopens the panel. [T92A/keyboard/75.png] [Round 3: assistant-door]

### T93A

- cosmetic, sev 1, touched-20: The Jump to newest pill lost its box and lay over the transcript's text just after Keep them, while the card was going. Same as on the earlier build; it clears as the card goes. [T93A/touched-20/09.png] [Round 3: focus-after-a-press]
- cosmetic, sev 1, touched-12: The request's count chip has no pointer cursor and no tooltip on a button whose click selects. The click works. [T93A/touched-12/06.png]

### T93B

- wording, sev 1, detour-1: A turn that colored the drawing says only 'Changed the graph'. The drawing and the key card show it. [T93B/detour-1/06.png] [Round 3: run-says-it-painted]
- wording, sev 1, detour-1, touched-23: 'Declined. Nothing changed.' goes from the turn after the next message, while 'Not run: you sent a new message.' stays. The turn's words stay; the end row goes. Nothing false. [T93B/detour-1/04.png, 05.png, T93B/touched-23/05.png] [Round 3: end-rows-tell-the-truth]
- friction, sev 1, detour-1: After a message the conversation can stop short of the newest reply, with Jump to newest over it. The pill is the way down. Mechanism not traced. [T93B/detour-1/07.png] [Round 3: reply-end-in-view]
- friction, sev 1, detour-1: Enter while a turn is running does nothing and says nothing; the typed message stays unsent in the composer. Carried. The text stays and Enter after the run sends it. [T93B/detour-1/06.png]
- wording, sev 1, touched-28: The failed turn's reply says to clear a selection that is already gone, under a line reading Whole graph; Send again beside it works. It has the chip-row unit's cause, so check on the re-walk that it has gone. [T93B/touched-28/09.png]
- cosmetic, sev 1, success path, Undo: The undo notice shows with the panel open, quoting the reader's message across the canvas, cut off at both ends. decided.md keeps a turn's notice for a closed panel, so this is a gap, but the notice is true and goes by itself. [T93B/success/13.png] [Round 3: undo-notice]
- wording, sev 1, touched-22: The model's reply says 'an irreversible change' while the card says 'Undo can bring them back.'. The model's word; the card, which T93 grades, is right. [T93B/touched-22/09.png]
- friction, sev 1, touched-36: Open run lands on a blank Style tab, and the reader must find Values. answers.md records it; one more click. [T93B/touched-36/09.png] [Round 3: open-run-and-layer-tell-the-truth]
- accessibility, sev 1, touched-22, touched-37: Two controls can be called '82 nodes, select' when a turn's chip row sits beside the request. Only a screen-reader user meets it. [T93B/touched-22/09.png] [Round 3: panel-names-say-what]

### T94A

- accessibility, sev 1, touched-38 (keyboard): Enter on the turn's Undo removes that button and focus lands on the top bar's disabled Undo; the next Tab reaches Redo. Only a keyboard user meets it; focus stays on the page and the task is not spoiled. Seen on the earlier build too. [T94A/touched-38-keyboard-48879618c4/44.png] [Round 3: focus-after-a-press]

### T95A

- friction, sev 2, detour-2: 'Saved as a named set called Lowest Hours Volunteers' appears nowhere a reader can look. T95 grades the report, and a set is not its result. Joins first in line. [T95A/detour-2-48879618c4/13.png, 14.png]
- friction, sev 2, detour-2: 'Filtered to 5 of 24 nodes' leaves no trace in the Data place: five nodes drawn, Filters empty, Everything still 24. Undo is the only way back shown, and it works. The way back works and the change line said what happened. Joins first in line. [T95A/detour-2-48879618c4/13.png, 14.png, 17.png]
- accessibility, sev 2, keyboard: After Answer, focus goes to region 'Conversation', six Tabs from the composer. Only a keyboard user meets it; Enter is harmless there. [T95A/keyboard-48879618c4/17.png] [Round 3: focus-after-a-press]
- accessibility, sev 1, keyboard: The spoken status 'Degree finished: v02 ranks first, 8' sounds like the answer, gives an id, and is for a run nobody asked for. Carried. Only a screen-reader user meets it. [T95A/keyboard-48879618c4/11.png] [Round 3: spoken-once]
- accessibility, sev 1, keyboard: The Undid notice quotes the whole message and ends in two periods; focus then lands on the top bar's disabled Undo. Carried. Only a keyboard or screen-reader user meets it. [T95A/keyboard-48879618c4/22.png] [Round 3: undo-notice]
- wording, sev 1, detour-2, touched-39: Nothing but the reply says a file was saved: no notice or line names it. Carried. The browser shows the download. [T95A/detour-2-48879618c4/10.png, 12.png]
- friction, sev 1, detour-2, keyboard: Open run lands on an empty Style tab; Values holds everything. Carried. answers.md records it; not a step of T95. [T95A/detour-2-48879618c4/04.png, T95A/keyboard-48879618c4/14.png] [Round 3: open-run-and-layer-tell-the-truth]
