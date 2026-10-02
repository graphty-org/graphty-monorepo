# Grades: export a slide-ready picture of the current drawing

The task: "You need a picture of the drawing as it looks right now, sharp enough to paste into
Friday's slides. The data on screen is a sample: characters of the novel Les Miserables, linked when
they appear in the same chapter. If that is not your line of work, treat them as your own people or
things."

The intended path: open the menu on the project name ("Les Miserables", top left) or press Ctrl+E,
choose Export..., which opens the Export dialog on Image; check or set the size (the default preset
is "To share -- PNG, 2x", 1,802 x 1,638) and press Export. A toast then reads "Exported
les-miserables.png to Downloads".

Grading rule: success means the dialog was reached directly, the size or sharpness was looked at and
judged or set for slides, and an image was produced. Success with difficulty means the participant
first looked somewhere else (the main menu, a toolbar button, a camera, Present) or searched before
finding Export. Failure means a screenshot, no export, or a wrong conclusion about what was made.
Grades go by what was on screen at the end and what the participant concluded, not by how they rated
themselves.

Two judgment calls, stated so they can be challenged:

- **Keeping the default size counts as setting it**, when the participant read the size and decided
  it suits a projector. The 2x default is a reasonable slide size, and two participants chose it
  after reading every alternative.
- **Copy counts as making the export.** Copy is a button in the same dialog and produces the same
  image on the clipboard; its toast names the size. For "paste into slides" it is arguably the
  better route.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Genomics Cytoscape user | success | success | Went to the project name first ("the nearest thing to a File menu"), then Export.... Looked at every control, chose "For print -- PNG, 4x, sharper" and a White background (07.png shows the preset now reads Custom, 4x -- 3,604 x 3,276, White), then exported; toast "Exported les-miserables.png to Downloads" (08.png). Concluded correctly that the file has no legend. |
| Computational biologist | success | success | Same first click, same dialog. Opened Preset, Format, Advanced and View looking for a legend switch, then kept "To share -- PNG, 2x" on purpose ("plenty for a projector") and exported; same toast (07.png). Concluded correctly that the legend is not in the file. |
| Explorer Elena (first-time user) | success | success, with a false belief | Three clicks: project name, Export..., Export; same toast (03.png). She read the preset ("2x, I think that means it's sharp") and chose it, which meets the rule. But she skipped the gray "Full graph - legend not drawn" line and believes the file matches her screen, legend included. The task as written does not require the legend, so the grade stands; her belief is the most serious finding below. |
| Gephi user | success with difficulty | success with difficulty | Opened the main menu (the three-line icon) first: New, Open, Settings, Help, no Save or Export. Then the project name, Export..., switched to the 4x print preset (08.png) and exported (09.png). Concluded correctly that the legend is missing. |
| Criminal intelligence analyst | success with difficulty | success with difficulty | Looked for a button called Export (none on screen), then the main menu, then the project name. In the dialog he ticked Sharper in Advanced and exported; toast confirmed (08.png). Concluded correctly that the legend is missing; could not tell from the toast whether Sharper applied. |
| Marketing analyst | success with difficulty | success with difficulty | Looked for Export, Share or a camera; tried the word Export, then the main menu ("this is where I'd normally give up and take a screenshot"), then the project name on the third try. Kept the 2x preset and pressed Copy; toast "Copied a 1,802 x 1,638 image of les-miserables to the clipboard" (07.png). Concluded correctly that the legend is missing. |

Totals: 3 success, 3 success with difficulty, 0 failure, 0 gave up. Six of six produced an image of
the current view at 2x or larger without leaving the dialog's defaults in doubt; nobody took a
screenshot, opened Present or looked for a camera icon on the canvas.

Ease scores (1 to 7): 7, 6, 5, 5, 5, 4. Direct finders averaged 6; those who tried the main menu
first averaged under 5.

## Findings

1. **The legend on screen is not in the exported picture, and nothing in the dialog can put it
   there (6 of 6 affected; 5 of 6 read the "legend not drawn" line and searched for a switch).**
   Every participant called the legend the part a slide audience needs ("the first question from
   the sergeant is what do the dark ones mean"; "the VP asks what orange means"). Four opened
   Preset, Advanced or View specifically to find a legend option. All five who noticed said they
   would rebuild the key by hand in PowerPoint, which is their current chore and the main reason
   they gave for not preferring this over their present tool. The task says "as it looks right
   now"; to every participant that includes the legend. Severity 4 (catastrophic for this job): the
   default output of "To share" is unreadable to its audience.

2. **A first-time user exported without noticing the legend was missing (1 of 6, the only
   participant without a graph-tool background).** The "Full graph - legend not drawn" line is
   small gray text under the heading, and she skipped it. The preview is cut off at the bottom of
   the dialog, so it could not have shown her either. She left believing the file matches her
   screen. Single voice, but it is the persona most like a general audience, and the consequence
   lands on Friday in front of a room, not today. Severity 3. This finding goes away if the legend
   is included by default; if it is not, the omission needs to be visible in the preview, not
   only in a subtitle.

3. **Export and Save are not in the main menu, where New and Open are (3 of 6 went there first:
   Gephi user, intelligence analyst, marketing analyst).** All three said File is split across two
   menus. The marketing analyst said she would normally have given up at that point. The three
   who went straight to the project name all named a web convention (Google Slides, "where a File
   menu would live in a web app"). Severity 3: it costs half the participants a wrong menu on a
   frequent, deadline-driven task. Either Export (and Save) also appear in the main menu, or the
   main menu points to the project name.

4. **No preset is named for slides, and the default image is taller than wide (4 of 6:
   biologist, Gephi user, intelligence analyst, marketing analyst).** Each had to guess whether
   "To share" or "For print" fits a projector; the marketing analyst noted 1,802 x 1,638 will leave
   bars on a 16:9 slide. Severity 2.

5. **Advanced shows two pixel widths that disagree (2 of 6: Gephi user, intelligence analyst;
   confirmed on screen).** Pixels reads 1802 wide; the line under Print width reads "2,055 pixels
   wide" (174 mm at 300 dpi). Both asked which one the file will be. Severity 2: wrong numbers in
   a dialog read by people who quote sizes in exhibits and journal submissions.

6. **The preview does not confirm what was chosen (3 of 6: Cytoscape user, Gephi user,
   Elena).** After choosing White, the preview still shows the gray canvas (confirmed in the
   Cytoscape user's 07.png). After choosing 4x, the preview shows only the top of the graph, so
   framing cannot be checked. For Elena the preview was cut off below the fold. Severity 2.

7. **No vector format: SVG is listed as "Not available yet" (4 of 6 remarked).** Not a blocker
   for slides, and every one said so; all four said their paper figures stay in their current tool
   until it exists. Severity 1 for this task, higher for the figure task.

8. **Opening a menu switched the right-hand panel from the selected PageRank layer to the graph
   summary (2 of 6: biologist, marketing analyst; visible in every render with the dialog open).**
   Harmless here but unexplained. Severity 1. This may be how the skeleton routes the state rather
   than intended behavior; check before treating it as a design finding.

9. **The Export toast does not say the size or whether Sharper applied (1 of 6, intelligence
   analyst), while the Copy toast does name the size.** Small inconsistency between two outcomes of
   the same dialog. Severity 1.

## What worked

- Export in the project-name menu with Ctrl+E printed next to it: found on the first click by 3 of
  6, and remembered by the others ("I'll remember Ctrl+E next time").
- "Current camera" as the default view: 3 of 6 read it as "as it looks right now".
- "Saved to this computer only; nothing is uploaded." in the footer: noticed and valued by 5 of 6,
  three of whom handle sensitive or unpublished data.
- The honest "legend not drawn" label was praised by 4 of 6 as better than finding out later --
  while all of them would rather not need it.
- Copy with a toast that names the pixel size: the marketing analyst's preferred route into slides,
  and considered by two others.
