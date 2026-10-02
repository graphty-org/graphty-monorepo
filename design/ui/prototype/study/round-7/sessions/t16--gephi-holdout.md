# Session: export a picture for slides -- Gephi holdout (Dr. Mara Lindqvist)

Task as given: "You need a picture of the drawing as it looks right now, sharp enough to paste into
Friday's slides. The data on screen is a sample: characters of the novel Les Miserables, linked when
they appear in the same chapter."

Start screen: shots/tasks/t16/01.png. All commands run from design/ui/prototype; renders in
tmp/round-7-sessions/t16--gephi-holdout/.

## Steps

1. Start screen. "A picture for slides. In Gephi that is Preview, then Export. I want File. The
   three-line icon at top left is presumably the menu."
   `timeout 120 node app-b/study.mjs --try .../01.png task:t16 --hover "Menu"`
   Tooltip: "Main menu." "Good, that's my File."

2. `--click "Main menu"` -> 02.png
   New project, Open, Open recent, Select where, Settings, Keyboard shortcuts, Help. "No Save, no
   Export. That is the first place anyone looks. Where did they put it?" (First dead end.)

3. `--click "Les Miserables"` -> 03.png
   The project-name dropdown: Rename, Save, Save as, Export (Ctrl+E), Apply recipe, Version history,
   Close project. "There it is. Why is Open in one menu and Save and Export in another? In every
   program I own those live together under File."

4. `--click "Les Miserables" --click "Export..."` -> 04.png
   Export dialog, Image tab: Preset "To share -- PNG, 2x", 1,802 x 1,638, Current camera, Canvas
   color, a preview. Subtitle reads "Full graph - legend not drawn". "The legend is sitting right
   there on the canvas and it won't go in the picture. Same as Gephi -- Inkscape again. At least it
   tells me before I find out on the slide."

5. `... --click "PNG"` -> 05.png
   Format list: PNG, JPEG, WebP, and SVG grayed out, "Not available yet". "For a slide, PNG is fine.
   For a paper figure this is a toy until that SVG line goes away. I'll grant it says so instead of
   pretending."

6. `... --click "Standard rendering"` -> 06.png
   Advanced popover: Sharper (renders larger, scales down), Pixels 1802 x 1638, Print width 174 mm
   at 300 dpi, with the note "2,055 pixels wide". "Sharper is what 'sharp enough' means. But the
   Pixels box says 1802 and the line underneath says 2,055 -- 174 mm at 300 dpi is 2,055. Which one
   am I getting? Two numbers for the same thing that don't agree. I read numbers." No legend switch
   here either.

7. `... --click "To share -- PNG, 2x"` -> 07.png
   Preset list: For print (PNG, 4x, sharper), To share, Thumbnail, For documentation (transparent).
   "No 'for slides', but print at 4x sharper covers it. I'd rather downscale than look fuzzy on a
   projector."

8. `... --click "For print -- PNG, 4x, sharper"` -> 08.png
   4x, 3,604 x 3,276, Sharper rendering, warning about 11.8 megapixels and 45 MB of memory. "45 MB.
   Gephi wants a gigabyte to open the file. Fine." The preview now shows only the top corner of the
   graph inside its box; I take it on faith that the whole thing is captured.

9. `... --click "Export"` -> 09.png
   Toast: "Exported les-miserables.png to Downloads." Back on the canvas. "Done."

Full final command:
`timeout 120 node app-b/study.mjs --try /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t16--gephi-holdout/09.png task:t16 --click "Les Miserables" --click "Export..." --click "To share -- PNG, 2x" --click "For print -- PNG, 4x, sharper" --click "Export"`

## Verdict

- Succeeded? Yes: a 4x sharper PNG of the current view is in Downloads. Without the legend, which
  is what my slide actually needs to be readable; I'll paste it in by hand.
- Single Ease Question: 5 of 7. One wrong menu first, then it was straightforward and the presets
  are sensible.
- Would I use this instead of Gephi? Not for this. For a quick slide it's about as fast as Gephi's
  Preview and nicer to look at, and "saved to this computer only, nothing is uploaded" is the right
  thing to say to me. But no SVG and no legend in the export means my paper figures still go
  Gephi -> SVG -> Inkscape. I'd stay on Gephi for figures.

## Problems noticed

- Export and Save are under the project-name dropdown, not the main menu, where New and Open are.
  My first try was the main menu.
- "Legend not drawn" with no way to include it, although the legend is on screen.
- SVG is "Not available yet".
- Advanced: Pixels says 1802 wide while the print-width line says 2,055 pixels wide for the same
  image.
- After choosing the 4x preset the preview shows only a corner of the graph, so I can't confirm
  the framing.
