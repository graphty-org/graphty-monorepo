# Grade: session r2-s44 -- Ruth (data journalist), a file that will not read

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (07.png),
the transcript and one scripted re-run on the same build. No files were downloaded (the task asks
for none). The dataset, `tool/files/club-members.graphml`, really is cut off: it ends partway
through line 9.

## Grade: S (success)

- **Success definition met at step 3.** "Open project or file..." with the file produced the
  refusal "club-members could not be opened: the file is incomplete or damaged near line 9, so
  nothing was read. Ask for the file again." (03.png, still there after 8 seconds in 04.png). Ruth
  read it correctly: nothing was loaded, the file is incomplete or damaged, near line 9, and it must
  be sent again. Her message to the coworker says exactly that.
- **The last screenshot (07.png)** shows the second door's refusal ("could not be read as GraphML"),
  the Tables list empty and Load disabled: nothing loaded, consistent with her conclusion. It no
  longer shows the line number, but she had already written it down from 03.png and 04.png.
- **Why S, not SD:** she understood the refusal at the first attempt; the detour through "New from
  data..." was a check, not a second attempt to understand. Two wrong turns, within what S allows.
- **Failure codes:** none. **Build-decided:** no. **Void:** no (one rejected `--upload` path at
  step 3 never reached the app).

## Counts

|                  | This session                                     | Reference |
| ---------------- | ------------------------------------------------ | --------- |
| Steps (real.mjs) | 6 after the start (1 for the usage card, 1 wait) | 2         |
| Wrong turns      | 2                                                | --        |

Wrong turns (abandoned):

1. Steps 5-6 (05.png, 06.png): "New from data..." and the same file again, to get a second opinion.
2. Step 7 (07.png): opened "File settings" looking for a reason or a line number; found neither.

## False "done"

None. Ruth's closing claim ("the file is incomplete or damaged near line 9, nothing was read, send
it again") matches what 03.png and 04.png said, and 07.png shows nothing loaded.

## Problems

Severity 0-4 (Nielsen). The scripted re-run is `rounds/round-2/repro/r2-s44/repro.sh` (output in
`run/` and `run.log`); it behaved the same as the session.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Evidence                                                                                    |
| --- | --- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect | The same truncated file gets two different refusals. "Open project or file..." says incomplete or damaged near line 9, nothing read, ask for the file again; "New from data..." says only "could not be read as GraphML. Check the file, or pick another format in File settings." -- no "incomplete", no line, and a remedy (change the format) that is wrong for a cut-off file. A user who goes in by "New from data..." first has nothing correct to tell the sender and may waste time trying formats. | Steps 3 and 6, 03.png, 06.png. Repro: `run/03.png` against `run/05.png`, every run.         |
| 2   | 2   | behavior     | The start page's refusal disappears as soon as the user opens "New from data..."; the line number survives only if the user copied it down first, and the refusal cannot be found again.                                                                                                                                                                                                                                                                                                                    | Step 5, 05.png. Repro: `run/04.png`. One participant; behavior, unconfirmed until a second. |
| 3   | 1   | wording      | "Incomplete or damaged" does not say which, and the difference changes what the sender is asked to do (send it again whole, or fix the export). This file is cut off. Held one level down as opinion.                                                                                                                                                                                                                                                                                                       | Step 3, 03.png; debrief.                                                                    |
| 4   | 1   | wording      | File settings offers "Error limit -- Bad rows read past before the file is refused" for a file refused for being cut off; nothing says whether raising it would apply, which invites a partial load. Ruth chose not to try.                                                                                                                                                                                                                                                                                 | Step 7, 07.png.                                                                             |

Noted as working: "No thanks" on the usage card was confirmed at once ("Usage data stays off..."),
and the start page states files are read on this computer and never uploaded (02.png).
