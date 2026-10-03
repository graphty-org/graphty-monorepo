# Session: Explorer Elena, task r8-t33

**Task as given:** "The Les Miserables network is open (example data, not your own), and several
results color it at once. Look at the coloring from the circles of characters by itself for a
moment, without deleting or changing anything else, then put things back as they were."

**Start screen:** shots/tasks/r8-t33/01.png
**Renders:** tmp/round-8-sessions/r8-t33--explorer-elena/02.png to 06.png
(all commands run from design/ui/prototype)

## Think-aloud

**01 (start).** OK. Lots of dots, and they're all orange. The box at the top says "Color:
PageRank". I don't know what PageRank is but it's the thing coloring it right now. "Circles of
characters"... on the left there's "Louvain, 6 groups". Groups, circles -- probably that. The other
things are paths and "Top 9" and "Watchlist", which don't sound like circles. I'll click Louvain.

**02.** `timeout 120 node app-b/study.mjs --try .../02.png task:r8-t33 --click "Louvain"`

Huh, that opened a table at the bottom instead -- I must have hit the "Louvain" tab down there, not
the one on the left. "6 communities", Community 1 to 6 with little colored dots. So yes, those are
the circles. But the picture is still all orange. The colors in the table aren't on the dots. Not
what I wanted, but at least now I know Louvain is the groups thing.

**03.** `timeout 120 node app-b/study.mjs --try .../03.png task:r8-t33 --click "Louvain, 1 note"`

Clicked Louvain in the list on the left this time. It's highlighted, the right side changed to
"Louvain". Picture is still orange. The right side says "Covered by PageRank for Color on 77 of
77". So PageRank is sitting on top of it. I don't want to delete PageRank -- the moderator said not
to change anything else. There's a little eye next to Louvain and three dots. I'm not touching the
eye on PageRank, I don't know if that changes it for good. Let me try the three dots on Louvain.

**04.** `timeout 120 node app-b/study.mjs --try .../04.png task:r8-t33 --click "Louvain, 1 note" --click "More"`

Big menu. A lot of it I skip -- "null model", "seed", no idea. Near the bottom: "Show only this
row". That's it, I think. "Row" is a weird word for it but it's the Louvain line, so fine. Delete is
at the very bottom, staying away from that.

**05.** `timeout 120 node app-b/study.mjs --try .../05.png task:r8-t33 --click "Louvain, 1 note" --click "More" --click "Show only this row"`

Ooh, there we go. Now it's colors: orange, light blue, green, dark blue, pink. The box at the top
changed to "Color: Louvain" with Community 1 to 6 and how many in each. The green ones up by Myriel
are their own little bunch, and the light blue cluster at the bottom with Enjolras, Bahorel,
Courfeyrac. I'd guess the orange one is the main characters since Valjean and Cosette and Marius
are orange -- it's the biggest group, 25, so it's probably the important one. The other rows on the
left went pale, and down at the bottom it says "Showing only Louvain. Show all". Good, that tells
me how to get back.

(I didn't really read the right side. It still says "Covered by PageRank" up there, I think, but
the picture clearly isn't PageRank anymore, so I believe the picture.)

**06.** `timeout 120 node app-b/study.mjs --try .../06.png task:r8-t33 --click "Louvain, 1 note" --click "More" --click "Show only this row" --click "Show all"`

Clicked "Show all". Back to all orange, box says "Color: PageRank" again, the list looks normal,
and the bottom says "1 row not listed still paints" like it did at the start. Looks the same as
when I started. Louvain is still highlighted on the left, but that's just what I clicked. Done.

## Outcome

- **Succeeded?** Yes, I think so. I saw the groups' colors alone and it went back to orange.
- **Single Ease Question:** 5 of 7. The first click went to the wrong Louvain (the table tab), and
  "show only" was buried in a long menu behind three dots with lots of words I don't know. But once
  I found it, getting back was one obvious link.
- **Would I use this instead of my current tool?** Maybe for poking around. In our dashboard I just
  click a thing and it filters. Here it's similar once you know the three dots, and I liked that
  it told me exactly how to undo it. I wouldn't have known PageRank was hiding the groups if the
  right side hadn't said "Covered by PageRank".

## Observations (for the moderator, in plain terms)

- Two things on screen are named "Louvain" (the list row and the table tab at the bottom); the
  first click opened the table, not the coloring.
- "Show only this row" was found only by opening the three-dot menu; it is one of about fifteen
  entries, several with technical wording. The word "row" for a coloring is odd but did not stop me.
- While showing only Louvain, the right-hand panel still read "Covered by PageRank for Color on 77
  of 77", which contradicts the picture. I noticed it in passing and trusted the picture.
- The "Showing only Louvain. Show all" line made the way back obvious, and the "Color:" box at the
  top switching to the six communities with counts confirmed what I was looking at.
- I read the biggest community (orange, 25) as "the important characters"; nothing on screen says
  that.
