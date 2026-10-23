# Grade: session r2-s54 -- Nadia (level-1 alert reviewer), something to try it on, Florentine families

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (07.png),
the opened drawing (03.png, 04.png) and the transcript. No files were downloaded (the task asks
for none).

## Grade: S (success)

- **Success definition met.** A sample is drawn: Florentine families, 15 dots and 20 lines, with
  the Overview reading "Nodes 15, Edges 20" (03.png); the drawing is still behind the Settings
  dialog in the last screenshot (07.png). Nadia's one-sentence account -- "15 Renaissance Florence
  families as dots, 20 marriage ties as lines" -- matches the sample card ("Marriages between the
  leading families of Renaissance Florence", "15 families", 01.png) and the Overview counts.
- **Direct path, no detour:** she declined the usage card, then opened the sample card. No file
  chooser was opened. Clicking Medici (step 4) was exploration after the drawing, not a wrong turn.
- **Failure codes:** none. **Build-decided:** no. **Void:** no.

## Counts

|                                 | This session                                           | Reference           |
| ------------------------------- | ------------------------------------------------------ | ------------------- |
| Steps to the drawing (real.mjs) | 2 after the start (No thanks, Florentine families)     | 1 (any sample card) |
| Steps in all                    | 6 after the start (3 more to check the privacy answer) | --                  |
| Wrong turns                     | 0                                                      | --                  |

## "Change it later" measure (not graded)

Right and checked on screen. After "No thanks" she read the line "Usage data stays off. Change this
in Settings > Privacy" (02.png), then went menu > Settings... > Privacy and found the "Share usage
data" switch, off, with "Usage data: off. Nothing is sent." (05.png-07.png).

## False "done"

None. "PART 1 DONE" (step 4) and "PART 2 DONE" (step 7) both match the screen.

## Problems

Severity 0-4 (Nielsen). All are from this one participant; none is a build defect, so none is
confirmed until a second participant meets it.

| #   | Sev | Kind     | Problem                                                                                                                                                              | Evidence                   |
| --- | --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | 2   | behavior | The sample opens with no names on the dots; she had to click a dot to learn it was Medici. For her work a picture with no account names "can't go in an alert file". | Steps 3-4, 03.png, 04.png. |
| 2   | 2   | wording  | The Overview line "Undirected, from the file: directed 0" reads to her "like a glitch".                                                                              | Step 3, 03.png.            |
| 3   | 1   | wording  | The Overview label "Edges per n..." is cut off at the default 1440 x 900 window, so the row's meaning cannot be read.                                                | Step 3, 03.png.            |
| 4   | 1   | wording  | "Degree 6" and "Density 0.1905" carry no plain meaning for her; she guessed degree meant 6 ties.                                                                     | Steps 3-4, 03.png, 04.png. |
| 5   | 0   | opinion  | No sample looks like money moving between accounts, so she could not judge whether it would save her time per alert. (Held one level down as opinion.)               | Closing remarks; 01.png.   |

What worked: the samples were on the first screen with a one-line description and a count each;
one click drew the graph; the privacy line after "No thanks" named the exact place to change it,
and that place was where it said.
