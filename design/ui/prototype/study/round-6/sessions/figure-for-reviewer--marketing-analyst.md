# Session: a figure a reviewer can read in gray -- Jordan, marketing network analyst

Participant: Jordan, growth-marketing analyst who "does the network stuff" one or two days a
week (composite persona, study/personas/marketing-analyst.md). Knows Gephi, NodeXL and a
networkx notebook someone else set up. Her figures end up in slide decks that get printed in
greyscale.

Task as given by the moderator: "A reviewer wants a figure of this network they can read even
when printed in gray. Get it to them."

Screens, in the order she met them: screens/styles-list (the project with its style stack),
screens/colour-by-value (adding a colour from a column), screens/export-dialog (the figure, then
the figure in the Print look). She also looked at the project-name menu that opens Export
(screens/export-dialog, three ways in) and at screens/inspector, looking for a grayscale switch.

Renders she looked at: shots/tasks/figure-for-reviewer/01-styles-list.png,
02-colour-by-value.png, 03-export-dialog-figure.png, 04-export-dialog-figure-grey.png,
shots/screens__styles-list-looks.png, shots/record/r6-jordan-fig-export-ways-in-menu.png,
shots/record/r6-jordan-fig-inspector.png.

Outcome: completed, with difficulty. She got a gray-safe SVG out, but she is not sure the figure
she exported is the one she was looking at on the canvas, and she would still redo the final
slide in PowerPoint. Single Ease Question: 5 of 7.

---

## 1. The project as it opens (screens/styles-list)

> "OK, 'Stress response study', 'ppi-core-300', 300 nodes. This is not my data. Proteins, I
> guess? PPI is... protein-protein something. Fine, the moderator said 'this network', I'll treat
> it like a mention graph and not pretend I know the biology."

> "Everything is orange to brown. Color: betweenness, log scale. I know betweenness -- the
> bridges. The legend at the bottom left is actually decent: 0 to 0.138, 'log scale; 10 at 0,
> lightest'. I would not have thought to say how many are sitting at zero. That's the kind of
> thing my VP asks and I never have the answer."

> "But printed in gray this is going to be one mud-colored blob. Orange to brown is basically
> light gray to dark gray, which... actually might be fine? It's one direction, light to dark. I
> honestly can't tell. That's the problem with gray, I never know until the printer spits it
> out."

> "There's a little panel open, 'Betweenness as color', with a histogram. 'On a straight scale
> 289 of 300 proteins would share the lightest of the 5 colors.' Huh. OK, so that's why it's
> log. Nice, but I didn't ask for it and it's covering the picture."

> "Right side, 'Style stack', 'Look' -- Screen, dropdown. What's a Look? Let me open it."

She opened the Look menu (shots/screens__styles-list-looks.png).

> "'Look for the whole project.' Screen, Print, High contrast. Print: 'Reads in gray on white
> paper and for color-blind readers. Where a color shows a direction, a shape shows it too.'
> OK, that is literally my task. That's the button."

> "But 'for the whole project' makes me nervous. I don't want my screen version to turn gray
> and triangly when I present this live tomorrow. 'Colors you set by hand are kept' -- so what
> does it change, only the ones I didn't set by hand? I didn't set any of these. I'm going to
> not touch the whole-project thing and look for it in export instead, because that's where
> Gephi puts this kind of stuff anyway."

She did not pick Print here.

## 2. Adding a colour (screens/colour-by-value)

The render showed the same project, a new "Style layer 1" and the colour picker open.

> "Wait, it went gray. Where did my betweenness go? The style stack now says 'Style layer 1' and
> 'Base style'. So this is a different moment -- somebody started a new layer. OK. I'm just going
> with it; I'd assume I clicked the plus."

> "'Color: apply a color or a value.' Palette colors, then 'From the data': log2FoldChange,
> numbers -2.52 to 3.15, and module, categories, 9. Computed: degree, betweenness. Not computed:
> closeness, 'a few seconds'."

> "Nine categories in gray -- no way. I know that from the Gephi days, nobody can tell nine
> grays apart. log2FoldChange, minus to plus... that's up and down, like sentiment. Positive
> and negative. For gray that's actually the hardest one, but it's the one a reviewer would care
> about, it's the first thing in the file. I'll take log2FoldChange."

> "I like that it tells me the range right there in the list. In Gephi I pick a column and find
> out afterwards it's all nulls."

She picked log2FoldChange. She did not look at what the layer did on the canvas; the next render
was the export.

## 3. Finding Export (project-name menu)

> "Now, export. I'd look at the top left, the project name. Yes -- click it, there's 'Export...
> Ctrl+Shift+E'. Fine, that's where File would be. Not hunting."

> "Oh, and here the style stack says 'Fold change color' and 'Size: degree'. And the canvas is
> red and blue. So my betweenness layer is gone? Or it was a different project state? I'm going
> to stop trying to keep track, but in real life this is where I'd start re-checking everything,
> because I've been burned by 'what's on screen is not what's in the download'."

## 4. The Export dialog, Figure (screens/export-dialog, figure)

> "Big dialog. Left side is a list: Figures, Rows, Report, Graph data, 'Share the setup, without
> data'. Figure (.svg) is already ticked. 'Vector, with real text. For a paper or slides.' Good,
> SVG I can drop into PowerPoint and ungroup if I need to."

> "'Scope: Full graph: 300 nodes. The filter chip's scope, until you change it here.' What's the
> filter chip? The button that says 'Full graph' back on the canvas, I suppose. That sentence is
> written for somebody who already knows the app."

> "Width, '174 mm, two columns'. Two columns of what? Oh -- 'Also: 85 mm, one column; 254 mm, a
> slide'. OK so this is set up for a journal. For me it's a slide, 254. If the reviewer is a
> journal person, 174 is probably right. I'll leave it, the moderator said reviewer."

> "Labels, 'Top N by this layer's value', N 10, 'by |log2 fold change|'. The bars around it, is
> that absolute value? I think so, from Excel ABS. So the ten biggest moves either way. Good
> default honestly, that's what I'd label. '2 labels hidden to avoid overlap: show list' --
> thank you for telling me, Gephi just drops them and you find out in the meeting."

> "Now the preview. Red to blue, 'Red: down. Blue: up. White: 0.' '148 below 0, 152 above.' And
> this yellow thing under it: 'Values just above and below 0 print as the same gray. Use Print
> look.'"

> "OK, THAT is useful. It's telling me before I print it that my red and my blue turn into the
> same gray. Which, yes, they would, I've done that exact thing to a VP deck. And the fix is a
> button right next to the warning."

> "Up top: 'Look, for this file only' -- Screen, Print, High contrast. 'For this file only.'
> Perfect, that's the answer to what scared me in the style stack. My screen stays as it is."

> "And the text file on the right, 'stress-response-study_figure-methods.txt'. Data, scope,
> color, size, labels... 'Drawn with graphty-element 2.6.2.' That's a lot. For my VP, useless.
> For a reviewer who's going to ask 'how did you compute this'... actually that's the thing I
> end up typing into speaker notes by hand. I'd keep it."

> "'Weight: confidence, not used yet; no measure here reads a weight.' I don't know what that
> means and I don't think I need to."

## 5. Use Print look (screens/export-dialog, figure-grey)

She clicked Use Print look.

> "Oh. Two pictures now. 'The file, as written' and 'Printed in gray, the same file'. That is
> the thing I actually wanted. I don't have to print a test page on the office printer and walk
> over to get it."

> "The nodes turned into triangles. Pointing up for up, down for down, I get it -- 'shape is the
> sign; darker is a larger change'. And a table in the legend: 2.4 to 3.2, 1.6 to 2.4 and so on,
> with how many down and how many up. 148 and 152 again. At least the numbers match the other
> screen."

> "And the check mark under it: 'Increases and decreases stay apart in gray (148 below 0, 152
> above): the triangle carries the sign.' Good. It said there was a problem, now it says the
> problem is gone, in the same place. I trust that more than a green toast."

> "Honest reaction to the picture, though: it's 300 little triangles in a hairball. In the gray
> version I can see which clusters are darker, and I can see the labels -- MAPK10, CHEK1,
> SNRNP70. I cannot tell an up triangle from a down one in the middle of the clump at this size.
> In the corners, yes. In the middle, no. Is that the tool's fault? Probably it's the network's
> fault. But the reviewer is going to squint."

> "The legend is also kind of... dense. '|change|', 'down', 'up', 'total'. My VP would glaze.
> But a reviewer is not my VP, I'll allow it."

> "The left side got longer: MRE11 +2.35, RPL17 -2.25, 'Select'. So these are the two labels it
> hid. 'Select closes the dialog, keeping its settings, and selects the node. Its inspector has
> Show label anyway.' OK, so if one of them matters I can force it. I wouldn't bother for this."

> "'174 x 86 mm' now, it was 174 x 76 before. The legend got taller I guess. Fine."

> "Bottom: '2 files go to your Downloads folder. Nothing is uploaded.' Nothing uploaded is nice
> -- our legal team would ask. But two files? I only want the picture. There's no untick for the
> methods file that I can see. I'll just delete it from Downloads, or send both."

> "Export 2 files. Done."

## 6. Looking for a grayscale switch elsewhere (screens/inspector)

Before the moderator closed the task she went back to check whether the canvas had its own
grayscale preview.

> "Different name at the top now -- 'Human protein interactions', 'Interactions', and the
> colors are nine categories again. And the Look dropdown here says 'Default', not 'Screen'. Is
> this the same project? It looks like a different app, honestly. And the right panel runs off
> the edge: 'Change..', 'undirecte', 'confidence, not used y'. I can't read the end of those
> lines."

> "No, I'd go back to Export. The gray preview lives there and that's fine for me -- that's the
> moment I care about gray."

---

## After the task

**Single Ease Question** (1 = very difficult, 7 = very easy): **5**.

> "The export part was a 6, maybe a 7. It told me the red and blue would collapse, gave me one
> button, and showed me the gray version before I printed anything. I've never had a tool do
> that. What drags it down is before that: I started on an orange betweenness picture, then I
> was adding a colour layer on a gray graph, then the export was red and blue fold change. I
> never saw the moment where my picture became the one that got exported, so I don't fully
> believe it's the same. And the whole-project Look versus the for-this-file Look -- two
> switches with the same three options in two places. I picked the right one by being scared of
> the wrong one."

**Would you use this instead of your current tool?**

> "For this job -- a figure that survives a gray printer -- yes, over Gephi, no contest. Gephi
> would have given me a PNG with red and blue dots and I'd have found out at the printer. The
> side-by-side gray preview and the 'these two print the same gray' warning are the reason. I'd
> still export the 254 mm slide version and rebuild the legend in PowerPoint for my VP, because
> the legend reads like a stats appendix, and 300 triangles in a clump is still a hairball. For
> my actual week -- the ranked shortlist, the ten-second slide -- this didn't show me anything
> yet, so I'm not switching my whole workflow on the strength of one export dialog."

---

## What went wrong or was unclear, in her words

1. The canvas, the style stack and the exported figure told three different stories (orange
   betweenness, a new gray layer, red-blue fold change). She could not see the moment her
   picture became the exported one, and that mismatch is exactly the "screen versus download"
   distrust she brings from listening tools. "I never saw the moment where my picture became the
   one that got exported."
2. Two places set the Look: "Look for the whole project" in the style stack and "Look, for this
   file only" in Export, same three names. She avoided the first out of fear, not understanding.
   "I picked the right one by being scared of the wrong one."
3. The Print figure at 174 mm: up and down triangles cannot be told apart in the dense middle of
   the network. "In the corners, yes. In the middle, no."
4. The Print legend ("|change|", down, up, total, four bins) reads like an appendix, not a key a
   non-analyst takes in at a glance.
5. "The filter chip's scope, until you change it here" assumes she knows what the filter chip
   is.
6. The width defaults to a journal size; the slide size is only in small print underneath.
7. The methods file always comes along ("Export 2 files") with no visible way to leave it out.
   "Weight: confidence, not used yet" means nothing to her.
8. The inspector screen showed another project name ("Human protein interactions"), another
   Look name ("Default") and a right panel cut off at the edge ("undirecte", "confidence, not
   used y").

## What she liked

- The warning "Values just above and below 0 print as the same gray" with "Use Print look" next
  to it, before anything was printed.
- The side-by-side "The file, as written" / "Printed in gray, the same file" preview.
- The pass line replacing the warning in the same spot, with the counts (148 below 0, 152 above)
  matching the earlier screen.
- "Look, for this file only": the figure changes, the canvas she presents from does not.
- Being told which labels were hidden (MRE11, RPL17) instead of finding out in the meeting.
- The column ranges shown in the colour picker before choosing.
- "Nothing is uploaded."
