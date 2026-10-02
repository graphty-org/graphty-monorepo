# Session: export a slide image -- Marcus, criminal intelligence analyst

Task as given: "You need a picture of the drawing as it looks right now, sharp enough to paste
into Friday's slides. The data on screen is a sample: characters of the novel Les Miserables,
linked when they appear in the same chapter. If that is not your line of work, treat them as your
own people or things."

Start screen: shots/tasks/t16/01.png. Renders: tmp/round-7-sessions/t16--intelligence-analyst/.
All commands run from design/ui/prototype; the prefix
`timeout 120 node app-b/study.mjs --try <dir>/NN.png task:t16` is written as `try NN`.

## Step 1 -- look for Export

Command: `try 01 --click "Export"`
Result: nothing on screen is called "Export".

Think-aloud: "Chart's up, legend box in the corner, fine. I want Export. In i2 it's File, Export,
or I just copy the chart. No Export button anywhere on the screen. Top left has a hamburger and
the case name. Hamburger's where File lives in everything else."

## Step 2 -- what is the hamburger

Command: `try 02 --hover "Menu"` (render 02.png)
Result: tooltip "Main menu".

## Step 3 -- open Main menu

Command: `try 03 --click "Main menu"` (render 03.png)
Result: New project, Open..., Open recent, Select where..., Select edges between, Show hidden
elements, Settings..., Keyboard shortcuts, Help.

Think-aloud: "Main menu, and there's no Save and no Export in it. New and Open are here but Save
isn't? That's the first thing that makes me squint. Where's the rest of File? Fine -- the case
name has a little arrow on it. Try that."

## Step 4 -- the project name menu

Command: `try 04 --click "Les Miserables"` (render 04.png)
Result: Rename, Save (Ctrl+S), Save as..., Export... (Ctrl+E), Apply recipe or style file...,
Version history, Close project.

Think-aloud: "There it is. Export, Ctrl+E. So File is split across two menus: open on the
hamburger, save and export on the case name. I'll remember Ctrl+E next time and skip both."

## Step 5 -- Export dialog

Command: `try 05 --click "Les Miserables" --click "Export..."` (render 05.png)
Result: Export dialog, Image (.png) tab selected. "Full graph - legend not drawn". Preset "To
share -- PNG, 2x", Size "2x -- 1,802 x 1,638", Format PNG, View "Current camera", Background
"Canvas color", Advanced "Standard rendering", a preview. Footer: "Saved to this computer only;
nothing is uploaded." Buttons Cancel, Copy, Export.

Think-aloud: "Good: 'Saved to this computer only; nothing is uploaded.' That's the first thing I
check and it's right there in plain words. Current camera -- that's 'as it looks right now',
good. What I don't like: 'legend not drawn'. The colors are PageRank and the sizes are degree.
Paste that on a slide with no key and the first question from the sergeant is 'what do the dark
ones mean?' I'd have to rebuild the key by hand in PowerPoint. Also there's a Copy button --
that's probably the fastest route into a slide, paste straight in. Noted."

## Step 6 -- presets

Command: `try 06 --click "Les Miserables" --click "Export..." --click "To share -- PNG, 2x"`
(render 06.png)
Result: For print -- PNG, 4x, sharper; To share -- PNG, 2x (checked); Thumbnail -- JPEG, 400 x
300; For documentation -- PNG, 2x, transparent.

Think-aloud: "No 'for slides'. 'To share' at 1,800 wide is plenty for a projector. Print 4x is
overkill for a slide. Leave it."

## Step 7 -- Advanced, looking for the legend

Command: `try 07 --click "Les Miserables" --click "Export..." --click "Standard rendering"`
(render 07.png)
Result: Advanced popover: Rendering [ ] Sharper ("Renders larger, then scales down; slower."),
Pixels 1802 x 1638 with a lock, Print width 174 mm at 300 dpi, "2,055 pixels wide; changing it
fills in Pixels."

Think-aloud: "No legend switch in here either. And now I've got two numbers that disagree.
Pixels says 1802 wide. The line right under says 2,055 pixels wide. Which one am I getting? If
I put a size in an exhibit I need to know which one's lying. I'm not going to do the mm-to-dpi
math to find out. The moderator said 'sharp', and there's a box that says Sharper, so I'll tick
it and go."

## Step 8 -- export

Command: `try 08 --click "Les Miserables" --click "Export..." --click "Standard rendering"
--click "Sharper" --click "Export"` (render 08.png)
Result: dialog closes; toast "Exported les-miserables.png to Downloads".

Think-aloud: "Exported, Downloads, named after the case. Fine. I can't tell from the toast
whether Sharper stuck or what size it came out at -- I'd open the file to check. And I'd still
have to type the legend onto the slide myself."

## Wrap-up

Succeeded? Yes, mostly. I have a PNG of the chart as it sits on screen, big enough for a slide,
and it never left the machine. What I did not get is the color and size key, which the dialog
says flat out it won't draw, and I found no way to turn it on. For a briefing that's half the
picture.

Single Ease Question: 5 of 7. Export itself was easy once found. Lost a point for Export not
being in the main menu (I went there first and it has Open but not Save or Export), and a point
for no legend and the two pixel numbers that disagree.

Would I use this instead of my current tool? For this job, about even with i2. i2 lets me copy
the chart straight into PowerPoint with whatever's on it. This is cleaner and the "nothing is
uploaded" line is exactly what IT wants to see. But a chart for a sergeant without its key is
not finished; if the legend came along with the export I'd prefer this over a screen grab.

## Problems seen

1. Main menu has New and Open but not Save or Export; Export lives under the project name.
   Cost one wrong menu. (severity: medium)
2. Image export says "legend not drawn" and offers no way to include the legend on screen; the
   PageRank colors and degree sizes mean nothing on a slide without it. (severity: high)
3. Advanced shows Pixels 1802 wide and, directly below, "2,055 pixels wide" for the print width;
   unclear which the file will be. (severity: medium)
4. No preset named for slides or presentations; had to infer "To share" fits. (severity: low)
5. Toast confirms the file name and folder but not the size or whether Sharper applied.
   (severity: low)

## What worked

- "Saved to this computer only; nothing is uploaded." in the export footer -- read and trusted.
- View defaults to "Current camera", which is what "as it looks right now" means.
- Export has a keyboard shortcut (Ctrl+E) printed in the menu.
- Toast names the file and the folder it went to.
