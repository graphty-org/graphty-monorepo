# Session: two-line labels on the circle around the bishop -- Explorer Elena

Task as given by the moderator: "Have each character in the circle around the bishop carry two
pieces of text in the drawing: what they are called on top, and underneath it how many remarks
have been written about them. The data on screen is a sample: characters of the novel Les
Miserables, linked when they appear in the same chapter. If that is not your line of work, treat
them as your own people or things."

Start screen: shots/tasks/t21/01.png. All commands were run from
design/ui/prototype; renders are in tmp/round-7-sessions/t21--explorer-elena/.

## Think-aloud

**Start.** OK, a bunch of orange dots with names on the big ones. "The bishop" -- I haven't read
the book. There's a dot up on the right called Myriel with a little fan of dots around it, kind of
a star. That looks like "a circle around" something. I'll guess Myriel is the bishop. I'll just
click him.

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/01.png task:t21 --click "Myriel"
```

**01.** Hm, it didn't pick the dot, it picked a row on the left, "Myriel to Javert", and the right
side now says "Path, from Shortest paths, paints 3 nodes, 2 edges". That's not what I wanted --
that's some route between two people. Nothing changed in the picture. OK, back up. On the left
there's "Selection" at the top. Maybe that's what's selected?

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/02.png task:t21 --click "Selection"
```

**02.** "Selection, Built-in row, Paints 0 nodes." So nothing is selected. Yellow, size 1.45,
opacity 40. I don't know what to do with that. The list has "Louvain, 6 groups" -- groups! The
circle around the bishop is probably one of the groups.

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/03.png task:t21 --click "Louvain"
```

**03.** A table came up at the bottom: Community 1 to 6, size, density, edges inside, edges
leaving, Notes. I don't know which community is the bishop's. The bishop's star has about ten
dots. Community 3 has 10 and also has 2 notes. Community 4 also has 10. I'll go with Community 3,
it has notes, and the task is about notes, so that feels right.

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/04.png task:t21 --click "Louvain" --click "Community 3"
```

**04.** Right side says "Community 3, Paints 10 nodes, Covered for Color by PageRank". The
dots are all still orange, so I can't see which ten it is. Whatever -- there's a "Label" with a
plus on the right. That's the text on the dots, I think.

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/05.png task:t21 --click "Louvain" --click "Community 3" --click "Label"
```

**05.** Clicking the word Label did nothing. I have to hit the little plus.

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/06.png task:t21 --click "Louvain" --click "Community 3" --click "Add label"
-> nothing on screen is called "Add label"
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/07.png task:t21 --click "Louvain" --click "Community 3" --click "+"
-> nothing on screen is called "+"
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/08.png task:t21 --click "Louvain" --click "Community 3" --hover "Label"
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/09.png task:t21 --click "Louvain" --click "Community 3" --click "Add"
```

**09.** Oops, that opened a menu under Shape (Shape, Size). Wrong plus. Let me rest on it and see
what these pluses are called.

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/10.png task:t21 --click "Louvain" --click "Community 3" --hover "Add"
```

**10.** "Add to Shape." So the one by Label must be "Add to Label".

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/11.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label"
```

**11.** Menu: "Label line" and "Show labels". Label line -- one line of text. I need two lines, so
I'll do it twice.

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/12.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label" --click "Label line"
```

**12.** Ooh, it made an "Above" line and a list to pick from. "label -- Name, Label" is the name.
And down at the bottom there's a "Notes" heading with "Note count". That's the remarks! Nice that
it's right there.

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/13.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label" --click "Label line" --click "Name, Label"
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/14.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label" --click "Label line" --click "Name, Label" --click "Add to Label" --click "Label line"
-> nothing on screen is called "Label line"
```

**14.** The second time the plus didn't ask, it just made a "Below" line and opened the list.
Good, that's exactly "underneath".

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/15.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label" --click "Label line" --click "Name, Label" --click "Add to Label" --click "Note count"
```

**15.** Panel says Above: label, Below: Note count. But... the picture looks the same. Myriel up
there still just says "Myriel", nothing underneath, and the little dots around him still have no
names. Did it go on the right dots? Maybe Community 3 is somewhere else. Let me point at
Community 3 and see if it lights up.

```
timeout 120 node app-b/study.mjs --try .../t21--explorer-elena/16.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label" --click "Label line" --click "Name, Label" --click "Add to Label" --click "Note count" --hover "Community 3"
```

**16.** It just says "This name cannot be changed." Nothing lit up in the picture. Also, in the
table at the bottom, Javert and Thenardier have a green dot and Community 3 is green... so maybe
Community 3 is Javert's bunch, not the bishop's? I don't know. OK. I guess I set it up. I'm
stopping here.

## Wrap-up

- **Did I succeed?** Not sure -- probably not. I set up the two lines (name on top, note count
  underneath) on *something*, but I picked "Community 3" by guessing, I never saw which dots it
  is, and the picture never showed the new text. I can't say it is the bishop's circle.
- **Single Ease Question:** 2 out of 7.
- **Would I use this instead of what I use now?** Not for this. The label part was actually OK
  once I found it -- "Above", "Below" and a "Note count" choice is how I'd want it. But I couldn't
  point at the bishop and his circle in the picture, the groups have numbers instead of anything
  I recognize, and after all that the drawing looked exactly the same. In our dashboard I click
  the thing and it changes in front of me. Here I don't know if I did it.

## What happened, for the record (observer notes)

- Clicking the name "Myriel" landed on a shortest-path row in the left list, not on the dot in the
  drawing. There was no way found to select a dot and its neighbors from the drawing.
- Community rows are numbered, and with PageRank covering color the picture never showed which
  ten dots Community 3 is; hovering the row gave only a rename tooltip, no highlight.
- The plus buttons beside Shape/Effects/Label/Tooltip are icon-only ("Add to Shape", "Add to
  Label"); she hit the wrong one first.
- Once found, the label flow was clear: first plus offered "Label line", second plus added a
  "Below" line directly, and "Note count" was listed under a "Notes" heading.
- After setting Above = label and Below = Note count, the drawing in the render showed no visible
  change, so she could not confirm the result.
- Engagement dropped at render 16.
