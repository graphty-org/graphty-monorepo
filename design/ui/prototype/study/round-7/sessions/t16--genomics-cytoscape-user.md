# Session: export a slide image -- Maren (genomics Cytoscape user)

Task as given: "You need a picture of the drawing as it looks right now, sharp enough to paste into Friday's slides. The data on screen is a sample: characters of the novel Les Miserables, linked when they appear in the same chapter. If that is not your line of work, treat them as your own people or things."

Start screen: shots/tasks/t16/01.png. All commands were run from design/ui/prototype; renders are in tmp/round-7-sessions/t16--genomics-cytoscape-user/.

## Steps

**Start.** "OK, a network, flat, colored orange to brown by PageRank, sized by degree. There's a legend box in the top left, good. Pretend these are my genes. I need a picture. In Cytoscape it's File > Export > Network to Image. Where's File here? The project name at the top has a little arrow, that's the nearest thing to a File menu."

**01** -- `timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t16--genomics-cytoscape-user/01.png task:t16 --click "Les Miserables"`
"Yep. Save, Save as, Export... Ctrl+E. That's where I'd expect it."

**02** -- `... 02.png task:t16 --click "Les Miserables" --click "Export..."`
"Image, PNG, 2x, 1,802 by 1,638. Fine for a slide. But right under the title: 'Full graph - legend not drawn.' Of course. That's the exact thing I fight in Cytoscape. The legend is RIGHT THERE on my screen and it won't come out with the picture. And the background is 'Canvas color', which is gray. I want white for slides. Let me see what else is in here."

**03** -- `... 03.png ... --click "Export..." --click "Canvas color"`
"Canvas color, White, Transparent. Good, White is there."

**04** -- `... 04.png ... --click "Export..." --click "Standard rendering"`
"Advanced: Sharper, pixel size, print width in mm at dpi. The dpi box is nice, a journal will ask for 300. Nothing about a legend though."

**05** -- `... 05.png ... --click "Export..." --click "To share -- PNG, 2x"`
"Presets: For print 4x sharper, To share 2x, Thumbnail, For documentation transparent. None of them say 'with legend'. So the legend just isn't an option."

**06** -- `... 06.png ... --click "Export..." --click "PNG"`
"PNG, JPEG, WebP. SVG grayed out, 'Not available yet'. So no vector. For slides a PNG is fine, but for the actual figure I'd need vector or a PDF. Not today's problem."

**07** -- `... 07.png ... --click "Export..." --click "To share -- PNG, 2x" --click "For print -- PNG, 4x, sharper" --click "Canvas color" --click "White"`
"I'll take the print preset so it's sharp when the projector blows it up, and White. Preset flips to 'Custom', fine. Warning about 11.8 megapixels and 45 MB memory -- that's nothing, ignore it. The preview, though -- that still looks gray to me. Did White take or not? The dropdown says White. I'll trust the dropdown, but I'd open the file to check."

**08** -- `... 08.png ... --click "Canvas color" --click "White" --click "Export"`
"'Exported les-miserables.png to Downloads.' Done. It also said down at the bottom 'Saved to this computer only; nothing is uploaded.' Good, that matters for unpublished data."

## Outcome

- Succeeded? Yes -- I have a sharp PNG on a white background in Downloads. But it has no legend, so I'd have to screenshot the legend box separately and paste it next to the network in PowerPoint. Which is exactly what I do now.
- Single Ease Question: 5 out of 7. Finding Export took two clicks and the options were clear. Losing a point for the legend, another for the preview not visibly changing to white.
- Would I use this instead of Cytoscape? "For a lab-meeting slide, sure, this was quicker than Cytoscape's export dialog. But it told me straight out the legend isn't drawn, and there's no SVG or PDF. Reviewers want to know what the brown means; I'd still be stitching the legend on by hand. The paper figure stays in Cytoscape."

## Problems noticed

1. The legend shown on screen does not come out with the image ("Full graph - legend not drawn") and there is no option anywhere in the dialog to include it. Severity: high for her -- it is one of her standing complaints about Cytoscape.
2. After choosing White background, the preview still looks light gray; she cannot tell whether the setting took. Severity: medium.
3. No vector format (SVG "Not available yet", no PDF). Fine for slides, blocks the journal figure. Severity: medium.
4. "Preset" silently becomes "Custom" after changing background -- understood it, mild.

## Delights

- Export sits in the project-name menu with Ctrl+E, where a File > Export would be.
- Print width in mm at a chosen dpi.
- "Saved to this computer only; nothing is uploaded."
- Honest label that the legend is not drawn, rather than finding out after opening the file.
