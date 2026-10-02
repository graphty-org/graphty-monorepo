# Session: export a slide-ready picture of the current drawing -- Dr. Chen, computational biologist

Task as given: "You need a picture of the drawing as it looks right now, sharp enough to paste into
Friday's slides. The data on screen is a sample: characters of the novel Les Miserables, linked when
they appear in the same chapter. If that is not your line of work, treat them as your own people or
things."

Start screen: shots/tasks/t16/01.png. All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t16--bioinformatics-researcher/.

## Steps

### 0. Start screen
"Fine, the co-appearance network, colored by PageRank, sized by degree, with a legend in the corner.
I want that, legend included, in a slide. In Cytoscape this is File > Export > Network to Image. Top
left there is the project name with a caret -- that is where a File menu would live in a web app."

### 1. Open the project menu
    timeout 120 node app-b/study.mjs --try .../01.png task:t16 --click "Les Miserables"
"Rename, Save, Save as, Export... Ctrl+E. Good, it is where I expected, and it has a shortcut.
Odd: the right-hand panel flipped from the PageRank layer to the graph summary when I opened a menu.
77 nodes, 254 edges, which is the Les Mis graph as I know it. Not what I asked for, but harmless."

### 2. Export...
    timeout 120 node app-b/study.mjs --try .../02.png task:t16 --click "Les Miserables" --click "Export..."
"An export dialog with Image, Video, Report (grayed), Recipe, Data. Image is chosen. Preset 'To
share -- PNG, 2x', 1,802 x 1,638, current camera, canvas background. There is a preview. And a line
under the title: 'Full graph - legend not drawn'. That is the one thing I need for a slide. A
PageRank color ramp with no key is a picture of orange dots. At least it says so instead of letting me
find out on Friday morning. 'Saved to this computer only; nothing is uploaded' -- good, I read that."

### 3. Preset list
    ... --click "Les Miserables" --click "Export..." --click "To share -- PNG, 2x"
"For print 4x, To share 2x, Thumbnail, For documentation transparent. Nothing called slides. 2x at
1,800 pixels is plenty for a projector. I leave it on To share."

### 4. Format list
    ... --click "Les Miserables" --click "Export..." --click "PNG"
"PNG, JPEG, WebP. SVG -- 'Not available yet'. For slides I can live with a PNG. For the paper figure
this would be the end of the conversation: a raster is not a figure. Noted."

### 5. Advanced
    ... --click "Les Miserables" --click "Export..." --click "Standard rendering"
"Sharper (supersampling), pixels, print width in mm at dpi. Sensible, the mm and dpi are what a
journal asks for. No legend switch here either."

### 6. View
    ... --click "Les Miserables" --click "Export..." --click "Current camera"
"Current camera, Fit, front/side/top/isometric, and saved views. Current camera is 'as it looks right
now', which is the task. Still nothing that turns the legend on. I looked in every control in the
dialog. I give up on the legend and will rebuild it in PowerPoint, as I always do with Cytoscape."

### 7. Export with the defaults
    ... --click "Les Miserables" --click "Export..." --click "Export"
"'Exported les-miserables.png to Downloads.' Done. File name is the project name, fine."

## Outcome

- Succeeded? Yes for the task as stated -- a 2x PNG of the current view is in Downloads. Partly for
  what I actually need: the legend that is on screen is not in the picture, and the dialog offers no
  way to put it there. "As it looks right now" includes the legend, to me.
- Single Ease Question: 6 of 7. Export was exactly where I looked first and took one dialog. The
  point off is the legend.
- Would I use this instead of my current tool? For a quick slide image, yes, over a Cytoscape export:
  fewer dialogs, a preview, stated pixel size, and it tells me plainly the file stays local. For a
  paper figure, no, not until SVG with real text exists and the legend can be exported with the
  drawing; until then it goes Cytoscape or R, then Illustrator.

## Problems noticed

1. No way to include the on-screen legend in the exported image; the dialog only states "legend not
   drawn". For a PageRank-colored network the key is essential on a slide. (severity: high for her)
2. SVG listed but "Not available yet" -- fine for slides, a blocker for publication figures.
3. Opening the project menu switched the right-hand panel from the selected layer to the graph
   summary, with no action of mine on that panel. Mildly disorienting.
4. Presets have no "slides" option; "To share" was a guess that 2x is enough for a projector.

## What worked

- Export in the project menu with Ctrl+E, found on the first try.
- A preview, exact pixel dimensions, mm-at-dpi print width.
- "Saved to this computer only; nothing is uploaded" in the footer.
- Honest "legend not drawn" label instead of a silent omission.
