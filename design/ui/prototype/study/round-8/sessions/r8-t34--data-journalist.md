# Session: keep a named angle and present kept angles -- data journalist (Ruth)

Task given: "The Les Miserables network is open (example data, not your own). You have turned
the drawing to an angle that tells the story well. Keep that exact angle under a name so you can
show it again, then show your kept angles one after another as you would in a meeting."

Start screen: shots/tasks/r8-t34/01.png. Renders: tmp/round-8-sessions/r8-t34--data-journalist/.
All commands were run from design/ui/prototype with D set to that render folder.

## Think-aloud

**Start.** "The graph is open with the Graph list on the left. I want to keep this angle. The
left rail has 'Views' under a bookmark icon. A bookmark means keep. Trying that."

```
timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t34 --click "Views"
```

**01.** "A list of views with small pictures: Whole cast, Valjean's circle, From above. Each has a
checkbox under 'In tour'. There's a plus at the top and a play arrow. The plus is probably 'save
this one'."

I put my pointer on the plus. In the tool I had to name it, so I guessed:

```
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t34 --click "Views" --hover "+"          # nothing on screen is called "+"
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t34 --click "Views" --hover "Save view"  # tooltip: "Save view"
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t34 --click "Views" --hover "Add view"   # nothing
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t34 --click "Views" --hover "New view"   # nothing
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t34 --click "Views" --hover "Save view"  # rerun to keep the hit
```

**02.** "The tooltip says 'Save view'. That's what I want."

```
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t34 --click "Views" --click "Save view"
```

**03.** "It added 'View 4' with the name already highlighted, so I can type straight over it.
That's nice. It's ticked for the tour by default."

```
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t34 --click "Views" --click "Save view" --type "Javert closes in" --key Enter
```

**04.** "Saved as 'Javert closes in'. But nothing tells me WHAT it kept. The panel on the right
still shows the graph's summary numbers. Did it keep only the angle, or also the orange
PageRank coloring and the labels? If I change the colors tomorrow, does my view change too? I
can't tell. The little picture is too small to tell my view from the others."

Now to show them in order. The play arrow. I needed its name:

```
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t34 ... --key Enter --hover "Play"        # nothing
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t34 ... --key Enter --hover "Play tour"   # nothing
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t34 ... --key Enter --hover "Present"     # tooltip: "Present"
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t34 ... --key Enter --hover "Start tour"  # nothing
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t34 ... --key Enter --hover "Present"     # rerun to keep the hit
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t34 --click "Views" --click "Save view" --type "Javert closes in" --key Enter --click "Present"
```

(The "..." stands for `--click "Views" --click "Save view" --type "Javert closes in"`.)

**05-06.** "'Present', fine. Full screen now, the panels gone, a caption card at the bottom:
'Whole cast -- The characters fall into communities of people who share chapters', and '1 of 3'.
Three, not four: 'From above' wasn't ticked, so it's left out. That's what the checkboxes were
for. I get it now, though I'd only have guessed that from the count. The caption talks about
communities but the picture is colored by PageRank, all orange. If I showed my editor that
they'd ask 'which are the communities?' Also there's 'Lock the canvas' in the corner; I don't
know what it does and I'm not touching it in a meeting."

```
timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t34 ... --key Enter --click "Present" --click "Next"
timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t34 ... --key Enter --click "Present" --click "Next view"
```

**07.** "'2 of 3, Valjean's circle', zoomed in on Valjean. So the views really do hold a
different camera. Good."

```
timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t34 ... --key Enter --click "Present" --click "Next" --click "Next"
```

**08.** "'3 of 3, Javert closes in' -- mine. It looks exactly like the screen I started with, so
I suppose it kept my angle. But it also looks exactly like 'Whole cast', so I can't actually
prove it kept anything special. The other two have a line of explanation; mine has none and I
never saw where I would type one. In a meeting I'd want my sentence under my picture."

```
timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t34 ... --key Enter --click "Present" --click "Next" --click "Next" --key Escape
```

**09.** "Esc takes me back. My view is still in the list. I'm done."

## Verdict

- **Did I succeed?** Yes, I think so. I saved a named view and played the ticked views in order,
  mine last. I'm not fully sure my exact angle was kept, because my starting picture and
  'Whole cast' look the same, and nothing said "angle saved" or showed me what a view holds.
- **Single Ease Question:** 6 of 7. Bookmark icon, plus, type a name, play: four steps, nothing
  to learn. One point off because I couldn't check what got kept or add a caption.
- **Would I use this instead of what I use now?** For a meeting, yes over screenshots pasted
  into slides. The views stay live and I can step through them without leaving the app. What
  stops me relying on it: I need to know what a view saved (angle only, or colors and filters
  too) and whether it changes if I restyle later. I also need a caption line on my own views,
  like the example ones have.

## Problems seen

1. After saving, nothing says what the view holds (camera only, or styling, filters and labels
   too) or whether it will follow later changes. The right panel keeps showing graph totals.
   (04.png)
2. My saved view has no caption, and I never found where to add one. The example views have
   one. (08.png)
3. The thumbnails are too small to tell views apart. My starting angle and 'Whole cast' look
   identical, so I can't confirm the angle was kept. (04.png, 06.png, 08.png)
4. The 'Whole cast' caption mentions communities, but the picture is colored by PageRank. A
   reader would ask where the communities are. (06.png)
5. 'Lock the canvas' in present mode has no explanation. (06.png)
6. What 'In tour' means only became clear from the '1 of 3' count. Minor. (01.png, 06.png)
