# Visible undo

Every step that changes the graph is named where you can see it, and can be taken back:

- **A toast beside the hand that acted**, for 2 seconds after each step: "Colored by PageRank --
  Undo". It appears once per step and is not redrawn while it shows. A step with no acting hand
  (from a panel, or the dry run) shows beside the dominant hand.
- **A strip above the graph**: an Undo button that names its step ("Undo: Color by PageRank"),
  Redo, and the last five steps, oldest on the left. Pressing a step, by ray or by fingertip,
  undoes it and every step after it.
- **Selections are not steps.** Selecting a node never shows a toast and never enters the strip,
  as in Figma.

Settings (gear panel): the toast on or off, how long it shows (1 to 5 s), the strip on or off.
With the technique off, the framework still names the step on the gear panel's Undo button.

## What it reuses

- The framework's command history and its one label formatter (`src/core/commands.ts`): the strip's
  words are the history's labels, so every technique's steps read the same way.
- Framework chips for the toast (one small texture, redrawn only when its text changes) and
  framework panels with GUI buttons for the strip, so ray and poke both work with no code here.
- No outside library. Babylon's GUI 3D controls (`NearMenu`, `HolographicSlate`) could hold the
  strip too; framework panels were used so it looks and presses like the rest of the sandbox.

## What we would fix or replace later

- **Undo is linear.** A strip step undoes it and everything after it. Selective undo of one earlier
  step, keeping the later ones, is a later experiment.
- **The toast's "Undo" is a word, not a button.** Undo is on the strip, the gear panel and the wrist
  menu. A toast you can poke beside the hand is worth trying.
- **The toast's past tense** is made from the label's first word ("Color" becomes "Colored"), not
  from the command and its parameters; a port to graphty-element would format it from those.
- **The strip is fixed above the graph** and moves when the graph is grabbed. A strip on the body
  or the wrist is the alternative to compare.
- **Redo** is enabled from the history changes this technique sees, because the framework does not
  expose the redo list to techniques.

## Checks

`dryrun/checks/visible-undo.mjs` runs on emulated Quest 3 controllers and hands, with the technique
on and off: the toast text, hand and 2 s lifetime; no redraw while it shows; the Undo button's words
and a press on it undoing; five steps then the third strip step leaving two steps and the state
after the second; selections never shown; and, switched off, no toast, no strip and nothing undone
by a press where the strip was. Poke is not checked; presses are by ray (trigger or pinch).
