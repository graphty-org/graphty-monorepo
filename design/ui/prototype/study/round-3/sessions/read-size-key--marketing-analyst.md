# Reading the size key -- Jordan, marketing network analyst

**Task as given by the moderator:** "You added sizing to the drawing. Say what a bigger dot means."

**Screens seen:** the main window with size added (Les Miserables, 77 characters), then the style
list with a size layer open in its editor (a 300-protein network).

**Renders the participant saw:**

- `shots/record/r3-jordan-read-size-key-s9.png` -- main window, size added, nothing selected
- `shots/record/r3-jordan-read-size-key-editor.png` -- style list, the "Degree size" layer open
- `shots/record/r3-jordan-read-size-key-styles-list.png` -- style list, first view

**Outcome:** success, with one open doubt about what "connections" counts. **Ease (1-7):** 6.

---

## Transcript (thinking aloud)

**Main window, size added.**

> OK, so first thing, I look at the drawing, not the panels. Some dots are clearly bigger now --
> the big orange one in the middle, Valjean, and a couple of the blue ones down at the bottom,
> Marius, Gavroche. The little black ones on the edges are tiny.

> Where's the key... bottom left. There's the group color box I had before, and under it a new
> bit: "Size: number of connections", three grey dots, 1, 10, 36. Oh, that's nice, it's
> actually in words. In Gephi I'd have to remember I sized by degree, and then in the deck I'd
> type "size = degree" in a text box and my VP would ask what degree is.

> So my answer is: a bigger dot is a character who's connected to more other characters. The
> biggest one would be 36. I'd bet that's Valjean -- he's the biggest dot and he's the main
> character, so that checks out. Can I confirm that, though? Hover? The screen doesn't show me a
> number on the dot. I'd want to click Valjean and see "36" somewhere before I believed it. That's
> my thing, I always check one I know.

> Left panel, Styles: there's a row on top, "Size: number of connections", with a little
> two-dot icon. Same words as the key. Good -- if it said "degree" in one place and something
> else in the other I'd be wondering if they're two different things.

*She clicks the "Size: number of connections" row.*

> I'd expect this to open and tell me how it's sized... Nothing on this one. Fine, maybe it's the
> other screen.

> Hmm, one thing. Over on the right it says Edges 254, "undirected, weight: value". So the
> edges have a weight. Is "number of connections" counting each person once, or is it counting
> how many times they were in a scene together? Because for me that's the difference between
> "reach" and "how often they talk to the same people", and those are two different slides.
> I'm going to assume it's once per person, because it says "number", but I'm guessing.

> And between 10 and 36 -- the 36 dot isn't three and a half times as wide as the 10 dot. So I
> can't really eyeball "this one's about 20". I can tell big from small, which is honestly all
> I'd use it for on a slide. But if someone asks "how many", I can't read it off the picture.

**Style list, the size layer open.**

> Different graph, proteins, whatever -- same idea. The row here is called "Degree size". The key
> at the bottom right says "Size: number of connections (degree)". OK so here they give me both
> words, which I actually like, because "degree" is what the tutorial called it and "number of
> connections" is what I'd put on the slide. But then the row name is only "Degree size" and on
> the first screen it was only "number of connections". Pick one, or do both everywhere.

> The editor: Size is bound to "degree", and the legend here is in buckets: 0 to 1, 2 to 3, 4 to
> 7, 8 to 16, 17 to 34. Now THAT I can read. Five dots, five ranges. Why doesn't the first screen
> do that? Three dots with single numbers feels like less information.

> "paints 300 of 300 proteins, no value 0 proteins." Good, so nothing's missing a size. I've been
> burned by a tool where the unmatched ones just silently became the default size and looked
> "small" like they were unimportant.

> I don't see anything saying this is area or radius, or linear or whatever. There's a little
> sliders button next to "degree" -- I'd probably click that if I had to explain the scale to
> someone. For today I wouldn't bother.

**Answer to the moderator:** "A bigger dot is a character who is connected to more other
characters -- more connections. The smallest is 1, the biggest is 36, and I think the 36 is
Valjean. What I'm not sure of is whether 'connections' counts the people or the number of scenes
they share, because the edges have a weight on them."

## After the task

**Single Ease Question:** 6 out of 7.

> It was easy. The key says it in words, right there on the drawing, and the style row uses the
> same words. I lose a point because I couldn't check one dot against its number, and because I'm
> not sure whether the weight counts.

**Would she use this instead of her current tool?**

> For this part, yes. The fact that the legend is on the canvas and titled in plain English is
> the thing I fake in Illustrator every time I do a Gephi deck. If that key comes along when I
> export the picture, that's an afternoon saved per deck. But I'd still need to click a dot and
> see its number, and I need to know if the weights are in it, before I'd put "number of
> connections" in front of my VP.

## Problems observed

1. **"Connections" does not say whether the edge weight counts.** The graph is described as
   "weight: value", and the size key says "number of connections" with no hint whether a pair
   that shares ten scenes counts once or ten times. She guessed "once". Severity 2.
2. **The three-mark key cannot be read in between.** 1, 10 and 36 as single dots do not let her
   estimate a mid-size dot; the style list's five ranged marks (0 to 1 ... 17 to 34) she could
   read. Severity 2.
3. **The layer has three names across screens.** "Size: number of connections" (main window row
   and key), "Degree size" (style list row), "Size: number of connections (degree)" (style list
   key). She liked the last one and wanted it everywhere. Severity 2.
4. **No way to check one dot's number from the picture.** She wanted to hover or click Valjean
   and see 36 before trusting the key; this state shows nothing selected and no hover value.
   Severity 2.
5. **Clicking the size row in the main window did nothing.** She expected it to open the layer's
   details as in the style list. Likely prototype fidelity rather than design. Severity 1.
