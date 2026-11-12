# T67 B pilot -- targeted re-walk on build ff17391bb1

Task: "Before you pass this gauge list on, check whether the program thinks anything in it looks
wrong. Where the program can put something right for you, do it. Tell us what it found and what you
changed." Start: setup `gauges.txt` (gauges.csv, 11 gauges G01-G11, Data place open, table open).
Build: ff17391bb1, served from `.study-builds/tier4-r1d2-ff17391bb1`.

This re-walk covers the success path by pointer, whose first click is the source row's issues
chip. It was replayed with `real.mjs --replay` from the pointer route walked earlier on this build;
every one of its 10 steps matched (exit 0), and the key screenshots were looked at again. The data
stayed gauges.csv's own 11 gauges the whole way.

Result: **reached**. No crash, no block, no wrong result that would spoil grading. No mismatch with
the answer key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T67B/d1-pointer/NN.png

## Success path by pointer (d1-pointer)

- 02-03: the Sources row reads "gauges...." 11 with a warning mark and "3" (name "3 issues in
  gauges.csv"); clicking it opens "Issues in gauges.csv": depth_cm "1 not a number" (Make blank,
  Ignore), station "1 value with padded spaces" (Trim, Ignore), telemetry "11 values could be
  yes/no" (Read as yes/no, Ignore), and "Ignore in all columns". The table shows "With issues 11"
  and warning marks on depth_cm and station.
- 04-06: Make blank, Trim, Read as yes/no; the chip counts 2, 1, 0. Stone Weir's depth turns
  blank ("No value"), depth_cm becomes a number column, "With issues" goes away.
- 07: "Resolved 3" lists the three fixes, each button dimmed. 08: Escape closes the list; the chip
  is gone from the row.
- 10: scrolled right, telemetry reads Yes/No with no warning mark. Matches the answer key.
- 11: Undo brings back the telemetry issue and the notice "Undid fixing a data issue." -- and also
  selects all 11 nodes (defect 1).

## Defects

1. **Undo of a data fix selects every node.** Undo after fixing an issue restores it but also
   selects all 11 nodes: rings on the canvas, every table row highlighted, the inspector switches
   to "11 nodes selected". Nothing the person did asked for a selection. d1-pointer/11.png.
2. **The source chip reads a warning mark and "0"** while the issue list is still open after the
   last fix (it goes away when the list closes). d1-pointer/07.png.

Neither blocks the task or changes what the participant ends with.

## Not walked

The other routes in this re-pilot's list belong to other tasks (T60-T66, T68) and start from their
own files; none starts from gauges.csv. Only "T67A/T67B success path (the issue chip is the path's
first click)" belongs to T67 B, and it is the success path above. The detours and the keyboard walk
were not part of this targeted re-walk.
