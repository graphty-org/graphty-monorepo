# Session: leave two reminders (Elena, first-time graph user)

Task as given: "Leave two reminders for next week: one about the tie between Javert and Valjean
itself (the two share many chapters), and one about the whole circle of characters around the
bishop Myriel. You have never typed your name into this program."

Start screen: shots/tasks/t06/01.png. All commands run from design/ui/prototype; renders are in
tmp/round-7-sessions/t06--explorer-elena/. `$D` below is that folder. `$K` types "Recheck
chapters" one key at a time; `$K2` types "Bishop circle".

## Think-aloud

**Start (01.png).** A dot picture with a list on the left. "Reminders" -- I don't see that word
anywhere. The closest thing on the left rail is "Notes", with a speech bubble. That's where I go.

    node app-b/study.mjs --try $D/01.png task:t06 --click "Notes"

**01.png.** Someone has already left notes. Each one has little tags under it -- "Community 3",
"Valjean", "Javert -- Valjean". Oh, there is already one saying "They share 17 chapters. This is
the edge to keep in the pursuit figure", tagged Javert -- Valjean. So notes hang off things. Good.
There's a plus up by the "Notes" title. I rest my pointer on it.

    --try $D/02.png task:t06 --click "Notes" --hover "+"          -> nothing called "+"
    --try $D/03.png task:t06 --click "Notes" --hover "New note"   -> nothing called "New note"
    --try $D/04.png task:t06 --click "Notes" --hover "Add note"

**04.png.** Tooltip: "Add note N". OK.

    --try $D/05.png task:t06 --click "Notes" --click "Add note"

**05.png.** A box opens and it's pre-tagged "Co-appearances" -- that's the whole graph, not the
Javert/Valjean line. I could take that tag off with the x, but I don't see how to put a different
one on. I think I need to pick the line first and then add the note. Where are the lines? The
bottom bar says "Nodes" and "Edges". Edges = lines, I'm guessing.

    --try $D/06.png task:t06 --click "Edges"

**06.png.** A table of pairs. Fifth row: Javert, Valjean, 17, and a little speech bubble with 1
(that's the existing note). I click that row.

    --try $D/07.png task:t06 --click "Edges" --click "17"

**07.png.** The right side now says "Javert -- Valjean, Edge". Good, that's the tie itself. A
little floating toolbar popped up over the picture with four icons; the last one looks like a
speech bubble with a plus.

    --try $D/08.png task:t06 --click "Edges" --click "17" --hover "Add note"
    --try $D/09.png task:t06 --click "Edges" --click "17" --click "Add note"

**09.png.** Yes -- the note box opens on the left, already tagged "Javert -- Valjean". That's
exactly what I wanted. (The table at the bottom jumped back to Nodes, which was a little odd, but
fine.) I type.

    --try $D/11.png task:t06 --click "Edges" --click "17" --click "Add note" $K
    --try $D/12.png task:t06 --click "Edges" --click "17" --click "Add note" $K --click "Save"

**12.png.** Saved: "Recheck chapters", tagged Javert -- Valjean, "Just now". One down. It never
asked who I am, and it doesn't put a name on it. Fine for me, but if a colleague opens this next
week, whose note is it? Also nothing here is a "reminder" -- there's no date, no "remind me". I'm
calling a note a reminder and hoping I look at this panel next week.

**Second one: the bishop's circle.** I click Myriel's dot (label) on the picture.

    --try $D/13.png task:t06 ... --click "Save" --click "Myriel"

**13.png.** Right side: "Myriel, Node". Caption under the picture: "Myriel, 10 connections". That
floating toolbar again, now with five icons. The first one looks like a target. I want "Myriel and
everyone connected to him" -- I'd bet the target is something like that. I rest on it, but I
can't get its name to come up under any word I try.

    --try $D/14.png task:t06 --click "Myriel" --hover "Neighbors"          -> nothing
    --try $D/15.png task:t06 --click "Myriel" --hover "Select neighbors"   -> nothing
    --try $D/16-20.png ... "Focus", "Grow selection", "Neighborhood", "Expand",
        "Connections", "Select connected", "Add neighbors", "Show neighbors", "Isolate" -> nothing
    --try $D/21.png task:t06 --click "Myriel" --click "Myriel, 10 connections"  -> nothing
    --try $D/22.png, 23.png ... --click "Select its neighbors" / "Neighbors of Myriel" -> nothing

(Session note: the study tool can only hover a control by a name I guess, so I could not simply
rest the pointer on the target icon. In the real app I would have seen its tooltip. Whether that
icon does "Myriel plus his connections" is untested in this session.)

I try the three-dots "More actions".

    --try $D/24.png task:t06 --click "Myriel" --click "More actions"

**24.png.** I got a big dark menu titled "Community 3" -- not Myriel. The left list now has
Louvain opened up with Community 1 to 6. The menu has "Select members", "Frame members", "Add
note"... and at the top a greyed-out "Rename -- A run's groups renumber when it reruns; Keep as
set to name one". I have no idea what that sentence means. But I remember the old note: "Myriel's
household and the people he meets in Digne", tagged Community 3. And Myriel has 10 connections,
and Community 3 has 10. So Community 3 must be the bishop's crowd. That's what I'll tag.

First, though, I tried going the simple way from Myriel himself:

    --try $D/26.png ... --click "Save" --click "Myriel" --click "More actions" --click "Add note" $K2

**26.png.** This time the note box is tagged just "Myriel" (one person), while the right side says
"Valjean, Node" -- that mismatch made me nervous about what I'd actually clicked. And "Myriel" alone
is not "the whole circle". Cancel in my head; go via the groups.

    --try $D/27.png ... --click "Save" --click "Graph" --click "Louvain"

**27.png.** Bottom table: six communities. Community 3: size 10, a speech bubble with 2. Green
dot. But the picture is all orange (the legend says color is PageRank), so I can't see which dots
are the green Community 3. And in the Nodes table Javert's "group" swatch is green too -- is
Javert in the bishop's circle? Myriel's own "group" swatch was dark blue, number 1. Different
"group" from "community", I suppose. I'm trusting the old note more than the colors.

    --try $D/28.png ... --click "Graph" --click "Louvain" --click "Community 3"
    --try $D/29.png ... --click "Community 3" --key n $K2
    --try $D/30.png ... --click "Community 3" --key n $K2 --click "Save"

**28-30.png.** Right side: "Community 3, Group, from Louvain, Paints 10 nodes". I pressed N (the
tooltip had taught me N = Add note). Box tagged "Community 3"; typed "Bishop circle"; Save.
Notes list now starts with "Bishop circle -- Community 3 -- Just now" and "Recheck chapters --
Javert -- Valjean -- Just now". That's both. I stop here.

## Verdict

- **Did I succeed?** Mostly. The Javert/Valjean one I'm confident about: it's on the tie itself.
  The bishop one I *think* is right, but I tagged "Community 3" on the strength of somebody else's
  note and a matching count of 10. I never actually saw those 10 dots light up, and I'm not sure a
  "community" is the same as "everyone around Myriel". If someone reruns that Louvain thing, the
  menu warned groups get renumbered -- would my note then point at a different crowd?
- **Single Ease Question:** 4 of 7. The first note was easy once I realized I select the line
  first. The second took a lot of poking, a menu I didn't ask for, and a leap of faith.
- **Would I use this instead of what I use now?** For jotting things on a picture, maybe -- it's
  nicer than a Miro sticky that floats away from the thing it's about, and notes stay pinned to
  the line or the group. But I'd want: a plain "Myriel and his connections" choice I can see and
  tag; the picture to show me which dots a tag covers; and an actual reminder (a date, or "next
  week") with my name on it. Without those, I'd still put "check Myriel's people next week" in my
  Notion to-do list.

## Observations for the team (in my words)

1. No "reminder" concept: notes have no date, no due, no author. The task said I had never typed
   my name, and the app never asked for it.
2. "Add note" from the Notes panel's plus tags the whole graph; to tag something specific you have
   to select it first. Not obvious until the second try.
3. No visible way (that I found) to tag "this person and everyone connected to him". I ended up on
   an algorithm's group whose membership I could not see on the picture, because color was
   showing PageRank.
4. The Community 3 menu's "Rename -- A run's groups renumber when it reruns; Keep as set to name
   one" is jargon I could not parse, and it made me worry my note could end up on the wrong group.
5. Two different color codes called "group" (the Nodes table) and "community" (Louvain) with
   clashing swatches (Javert green, Myriel blue) made me doubt who was in which.
6. After clicking an edge row and Add note, the bottom table silently switched from Edges back to
   Nodes.
7. In one attempt the note box was tagged "Myriel" while the right panel said "Valjean" -- I could
   not tell what was really selected.
