# Pilot: T1, first launch and usage data

Walked on the local production build of the graphty app (commit a1e6b91ff, build
`0196d46212aa graphty@0.8.53`, opened at `/?next`, 1440 x 900), with `tool/real.mjs`, empty start.

## Result

**The end state is reached.** The usage card is answered, what is collected is on screen, and the
place to change the answer later is both stated on screen and confirmed by opening it. No script
error, `console.error` or failed request was printed at any step, and `session.log` is empty.

One blocker: the answer key's third step (`--hover "Local only"`) proves nothing, because the
privacy chip has no tooltip. The key should click the chip instead (see "Blockers").

## Steps

| # | Step | Printed | Screenshot | What the screen shows |
|---|---|---|---|---|
| 0 | `--start rounds/pilot/T1 empty` | the commit and build | `01.png` | Start screen: Start, Recent projects, four sample cards; header chip "Local only" (lock icon) and a gear. The usage card sits at the bottom: "Your data is yours, but please help us.", the owner's paragraph ("We will never see the data you analyze ..."), a closed "What is collected" disclosure, "Nothing is collected until you answer.", and "Share usage data" / "No thanks". |
| 1 | `--click "What is collected"` | path only | `02.png` | The disclosure opens: a session replay with every node name, attribute value, label and file content masked; anonymous task events with timings; errors and performance; a feedback widget; "No file contents ever leave your computer." |
| 2 | `--click "No thanks"` | path only | `03.png` | The card is gone. A line at the bottom reads "Usage data stays off. Change this in Settings > Privacy" (the second part a link). Header chip still "Local only". |
| 3 | `--hover "Local only"` | `tooltip: null` | `04.png` | Only the chip's hover background. No tooltip, so nothing tells the participant what the chip is or where it leads. |
| 4 (extra) | `--click "Local only"` | path only | `05.png` | Settings opens on Privacy: "Share usage data" switch (off), the owner's paragraph, "What is collected", and "Where your data goes" ("Usage data: off. Nothing is sent."). |

`--end` closed the session cleanly.

## Blockers

1. **Answer key: the third step does not confirm "change it later".** `answers.md`, T1, path step
   3 is `--hover "Local only"` (marked for confirmation). In the build the chip
   (`graphty/src/workspace/privacy/PrivacyChip.tsx`) is a plain button with no tooltip; the hover
   prints `tooltip: null` (step 3, `04.png`). A participant who hovers learns nothing, and under
   the key's own partial rule ("SD if ... 'change later' is a guess not checked on screen") the
   hover would not count as a check. Replace the step with `--click "Local only"`, which opens
   Settings > Privacy (`05.png`). The path stays 3 steps. Reading the post-answer line "Change
   this in Settings > Privacy" (`03.png`) is also an on-screen check and should count.

## Observations, not blockers

- **No tooltip on the privacy chip (app, minor).** Whether a hover tooltip is wanted is a design
  call; the chip works when clicked. Worth noting because the key expected one.
- **Two of three steps print only the screenshot path.** The README says every command prints
  what a participant would notice; a click that opens a disclosure or removes a card prints
  nothing. Participants must read the PNG, which is the intent, so this is not a defect, but the
  README sentence overstates it.
- **The start waited about five minutes for a free browser slot** (`waiting for a free browser
  slot ...`), because other sessions held all four. Expected behavior of the gate, worth knowing
  for round timing.
- **Task wording:** no problem found. The prompt uses none of the control's words ("usage",
  "collected", "privacy", "settings"), and every part of it is answerable from the screen.
- **Key content matches the screen:** "how the app is used, never the data analyzed" and "a
  session replay with text masked" both appear in the card and the disclosure (`02.png`), and
  "the header's privacy chip or Settings > Privacy" is what the screen names (`03.png`, `05.png`).
