# Session: keep a named angle and present the kept angles -- the Gephi holdout

Participant: Dr. Mara Lindqvist (study persona `study/personas/gephi-holdout.md`), 1440x900.
Task as given: "The Les Miserables network is open (example data, not your own). You have turned
the drawing to an angle that tells the story well. Keep that exact angle under a name so you can
show it again, then show your kept angles one after another as you would in a meeting."

Start screen: `shots/tasks/r8-t34/01.png`. Renders: `tmp/round-8-sessions/r8-t34--gephi-holdout/`.
All commands run from `design/ui/prototype`; `$D` is that render folder.

## Step 1 -- look for somewhere to keep an angle (01.png)

Think-aloud: "Gephi has nothing for this. I take a screenshot and put it in Keynote, that's my
'saved view'. So I'm looking for a word like bookmark or view. Left rail: Graph, Data, Views,
Notes, Assistant. Views has a bookmark icon. That's the obvious one. I'm not touching Assistant."

```
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t34 --click "Views"
```

02.png: a Views list -- Whole cast, Valjean's circle, From above -- each with a thumbnail and a
checkbox under a column headed "In tour". A plus and a play triangle at the top.

"Fine. Three angles someone already kept. The checkboxes say 'In tour', so the ticked ones are
what gets shown. The plus must be 'keep this one'. Let me make sure before I click it."

## Step 2 -- what is the plus? (03.png)

```
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t34 --click "Views" --hover "+"
  -> nothing on screen is called "+"
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t34 --click "Views" --hover "Add view"
  -> nothing on screen is called "Add view"
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t34 --click "Views" --hover "New view"
  -> nothing on screen is called "New view"
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t34 --click "Views" --hover "Save view"
  -> tooltip: "Save view"
```

(The first three are me resting the pointer and guessing what it would say; only the last one
matched.) "Save view. Good, that's plain."

## Step 3 -- save and name it (04.png, 05.png)

```
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t34 --click "Views" --click "Save view"
```

04.png: a fourth row appears, "View 4", with the name already selected for typing, and its "In
tour" box already ticked.

"Name selected, so I just type. That's how it should be. And it puts it straight into the tour --
OK, I'd have ticked it anyway."

```
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t34 --click "Views" --click "Save view" --type "Barricade" --key Enter
```

05.png: row reads "Barricade", ticked. The thumbnail looks the same as the others, which is fair,
I didn't move anything in this session. "What exactly did it keep? The camera? The colors too?
The PageRank legend? It doesn't say. In Gephi a screenshot is a screenshot -- I know what's in
it. Here I'd want one line saying 'camera, colors, labels' or whatever it holds. I'll find out
when I play it."

## Step 4 -- show them one after another (06.png - 09.png)

"There's a play triangle next to the plus and another one in the floating toolbar on the canvas.
The canvas one I'd bet runs the layout -- that's spatialize. The one beside Views should be the
slideshow."

```
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t34 --click "Views" --click "Save view" --type "Barricade" --key Enter --hover "Play"
  -> nothing on screen is called "Play"
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t34 --click "Views" --click "Save view" --type "Barricade" --key Enter --hover "Present"
  -> tooltip: "Present"
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t34 --click "Views" --click "Save view" --type "Barricade" --key Enter --hover "Play tour"
  -> nothing on screen is called "Play tour"
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t34 --click "Views" --click "Save view" --type "Barricade" --key Enter --hover "Present"
  -> tooltip: "Present"
timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t34 --click "Views" --click "Save view" --type "Barricade" --key Enter --click "Present"
```

07.png: the panels are gone. Full canvas, "Present -- Esc to leave" at the top, a "Lock the
canvas" checkbox, the PageRank legend kept top left, and a caption bar at the bottom: "Whole cast
-- The characters fall into communities of people who share chapters. 1 of 3" with back and next
arrows.

"Now that's what I'd want on a projector. The legend stays -- good, I'd have been annoyed if my
color key vanished. 1 of 3. I have four views. Right: From above wasn't ticked. That's the
checkbox doing its job, but I only worked it out because I'd read the column header. A student
would say 'where's my fourth one'."

```
timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t34 --click "Views" --click "Save view" --type "Barricade" --key Enter --click "Present" --click "Next"
timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t34 --click "Views" --click "Save view" --type "Barricade" --key Enter --click "Present" --click "Next" --click "Next"
```

08.png: 2 of 3, "Valjean's circle", zoomed in on Valjean with a one-line caption. 09.png: 3 of 3,
"Barricade", the whole map as I left it, no caption, next arrow grayed out.

"There's my one, last, with its name. It has no caption line under the name; the others do, and I
don't see where I would have written one. For a meeting I'd want the sentence -- that's half the
point of a slide. Also, Lock the canvas -- I assume that stops me knocking the camera with the
trackpad mid-talk. Sensible. Esc to leave; fine."

"Did it keep the exact angle? It came back where I was, so yes, as far as I can tell. I can't see
a number for it. Fine for a talk; I wouldn't cite it."

Stopped here: the angle is kept under a name and the kept angles play in order.

## Verdict

- Succeeded: yes. Saved "Barricade" and presented the ticked views in order, ending on mine.
- Single Ease Question: 6 of 7. Views was where I'd look, Save view selected the name for me,
  Present did what it says. Lost a point on not knowing what a view holds, the unticked view
  silently left out ("1 of 3" when I have four), and no visible place to add the caption line the
  other views have.
- Would I use this instead of my current tool? For this job, yes -- because my current tool for
  it is screenshots pasted into Keynote; Gephi has nothing. A live walk through kept angles with
  the legend on screen is better than static slides for teaching. It does not move my paper
  figures off Gephi; that's a different question (export, ForceAtlas2, my GEXF). For the
  lecture, I'd try it.
