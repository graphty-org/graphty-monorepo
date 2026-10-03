# Session: show every character's name -- Explorer Elena

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

Participant: Explorer Elena (first-time graph user, product manager, says "dots" and "names").
All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t10--explorer-elena/`.

## Transcript

**01 -- start screen** (`shots/tasks/r8-t10/01.png`)

> OK, there's a box at the bottom asking about usage data. "No thanks." Then on the right there are
> samples -- Les Miserables, 77 characters. That's the one he said. I'll click it.

**02 -- the sample opens**

```
timeout 120 node app-b/study.mjs --try .../02.png task:r8-t10 --click "No thanks" --click "Les Miserables"
```

> Whoa, there's a lot going on. Orange dots, a long list on the left I don't understand --
> PageRank, Louvain, "Link prediction"... Some dots have names: Valjean, Javert, Cosette,
> Fantine, Marius, a dozen or so. The big dark one in the middle is Valjean -- he's the main
> character, so the dark one must be the most important. Makes sense.
>
> I need names on all of them. On the right there's a list: Fill, Shape, Effects, Label. "Label"
> -- that's what I want. Click it.

**03 -- clicking "Label" on the right**

```
timeout 120 node app-b/study.mjs --try .../03.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Label"
```

> Nothing happened. Hm. Maybe I clicked wrong. On the left there's "Labels show... 1 node".
> One node? There are way more than one name on there. Let me click that one instead.

**04 -- clicking "Labels show..." on the left**

```
timeout 120 node app-b/study.mjs --try .../04.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Labels"
```

> A black message at the bottom: "Labels shown anyway (this file): Valjean. Opens in the inspector
> (not available yet)." ... I don't know what that means. "Not available yet"? So that's not it.
> And it says just Valjean, but I can see like thirteen names. Confusing.

**05-08 -- looking for the small buttons**

```
timeout 120 node app-b/study.mjs --try .../05.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "Add label"
  -> nothing on screen is called "Add label"
timeout 120 node app-b/study.mjs --try .../06.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "+"
  -> nothing on screen is called "+"
timeout 120 node app-b/study.mjs --try .../07.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Labels" --hover "More"
  -> nothing on screen is called "More"
timeout 120 node app-b/study.mjs --try .../08.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Labels" --click "..."
  -> nothing on screen is called "..."
```

> There's a little plus next to Label on the right, and three dots next to the Labels row on the
> left. I'm poking at them and nothing is giving me anything. I'm not sure what I'm clicking.

**09 -- "Everything"**

```
timeout 120 node app-b/study.mjs --try .../09.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything"
```

> At the bottom of the list there's "Everything". I want names on everything, so... sure.
> The right side changed: "Paints 77 nodes, 254 edges". 77 -- that's all the characters. OK, this
> might be the right place. There's Label with a plus again.

**10 -- clicking the "Label" word again**

```
timeout 120 node app-b/study.mjs --try .../10.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Label"
```

> Clicking the word does nothing again. So it must be the plus.

**11-12 -- the plus next to Label**

```
timeout 120 node app-b/study.mjs --try .../11.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --hover "Add"
  -> tooltip "Add to Effects" (the pointer landed on the Effects plus first)
timeout 120 node app-b/study.mjs --try .../12.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label"
```

> "Add to Label." A little menu: "Label line" and "Show labels". Show labels! That's it.

**13 -- "Show labels"**

```
timeout 120 node app-b/study.mjs --try .../13.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels"
```

> Now there's a row "Show labels" with an empty checkbox. So I have to add it AND tick it. OK.

**14 -- ticking the box**

```
timeout 120 node app-b/study.mjs --try .../14.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels"
```

> Ticked. Blue check... but the drawing looks exactly the same. Same thirteen names. The other
> dots still have nothing. Did I do it on the wrong thing? There's that note up at the top that
> says the color is PageRank -- maybe PageRank is "on top" of Everything and hides it? I don't
> know.

**15 -- one more look**

```
timeout 120 node app-b/study.mjs --try .../15.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --hover "column"
  -> tooltip: null (the pointer landed on "Columns: 9 of 9" at the bottom, not the little
     database icon next to the checkbox)
```

> There's a little database-looking icon next to the checkbox. I was hoping it'd tell me
> something. Nothing. ... Yeah. I think it's on. I'm not sure. I'll leave it.

(Engagement dropped here: answers got short, no new attempts.)

## After the task

- **Did she think she succeeded?** "Kind of? The box says Show labels and it's ticked. But I
  didn't see any new names show up, so I can't tell you it worked. If I had to send a screenshot
  right now it'd look the same as when I started."
- **Single Ease Question (1 = very difficult, 7 = very easy):** 2.
- **Would she use this instead of her current tool?** "No, not for this. In Slides I click the
  chart and tick 'data labels' and I see them right away. Here I had to find a thing called
  'Everything', find a tiny plus, pick from a menu, then tick a box -- and then nothing changed on
  the picture. If something that simple takes that long and I can't even see the result, I'm not
  going to trust it with my own data."

## What the session showed (moderator notes)

- Path that came closest: Everything row, the plus next to Label ("Add to Label"), "Show labels"
  from the menu, then tick the "Show labels" checkbox. Four steps, two of them through an
  unlabeled plus button and a second confirmation.
- Clicking the word "Label" on the right panel did nothing, twice. She expected the section
  heading to open; only the plus works.
- The "Labels show... 1 node" row was the most label-sounding thing on screen and it led
  nowhere: its message ("Labels shown anyway (this file): Valjean ... not available yet") is
  jargon and contradicts the dozen names visible on the drawing.
- She first tried "Label" on the PageRank row's panel (the panel open on arrival), not knowing
  that the right side belongs to whichever row is selected.
- After ticking the box, the drawing did not change, so she could not confirm success. She
  guessed PageRank was "on top" hiding it -- a plausible reading of "Covered by PageRank" she
  had seen in the Everything panel.
- Misreading, stated with confidence: "the big dark one in the middle is the most important" --
  the dark color is the PageRank value, not a judgment she checked against the legend.
- Two dead ends in a row (03, then 04) before she found "Everything"; on a short clock she would
  likely have stopped at 04.
