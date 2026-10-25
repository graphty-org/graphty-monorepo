# Session r2-s49 -- Elena (returning), task T23 prompt B (Florentine families)

Commands run from `design/ui/studio/tier2` with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`.

## Start

`node ../tool/real.mjs --start rounds/round-2/sessions/r2-s49 setup:florentine-ranked.txt` -> 01.png

01: The Florentine network is open, dots sized and colored by "PageRank" (the ranking I did last
time, I think). No names on the dots. I need to find the Medici first -- the find box worked for me
before, so I'll type the name there.

## Step 2

`--step ... --click "Find nodes, edges, values" --type "Medici"` -> 02.png

The find box lists Medici and 6 lines: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi,
Salviati. Those are the families they married into. Now I want the Medici on the right side like
last time, to see if there's anything about "two away". I'll click Medici in the list.

(Tool: "Medici" was ambiguous, nothing happened -> 03.png. Retrying with "Medici#1".)

## Step 3

`--step ... --click "Medici#1"` -> 04.png

Medici is highlighted with a yellow ring, and the right side says Degree 6 with a little arrow --
that's the list of who they're tied to, I remember that. But I need two marriages out, not one.
Maybe the three-dot menu next to Medici's name has something like "show their family" or similar.
I'll open it.

## Step 4

`--step ... --click-at 1419,73` (the "Node actions" button) -> 05.png

A small menu: Neighborhood, Path between..., Frame selection, Add note. "Neighborhood" sounds like
the people around the Medici. That's closest to what I want. Trying it.

## Step 5

`--step ... --click "Neighborhood"` -> 06.png

Now it says "Medici and 6 connections" with the six families listed and glowing on the picture.
There's a row "Hops 1 2 3". I don't know the word "hops", but 1 looks like "married directly" and
I want "two marriages away", so I'll press 2.

## Step 6

`--step ... --click "2"` -> 07.png

"Medici and 11 connections within 2 hops", with 11 names listed (Acciaiuoli, Albizzi, Barbadori,
Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni). Selection on the
left says 12, which is the 11 plus the Medici -- that agrees. So my answer is 11 families.
Now to make the picture show only them: there's a button "Filter to neighbors". "Filter" sounds
like narrowing a spreadsheet, so I'll press it.

## Step 7

`--step ... --click "Filter to neighbors"` -> 08.png

The button turned blue, three dots vanished from the picture, and the top bar now says "12 of 15
nodes". 12 = the Medici plus the 11 families, so the drawing has only them. That's what was asked.
Small things I noticed: the key in the corner now says "PageRank on 15 nodes" and the PageRank
row on the left got a little clock-like icon -- I'm not sure if that means the ranking is out of
date now that some families are hidden. It didn't stop me, but I'd wonder about it before putting
this picture on a slide. Everything is still glowing yellow as "selected", which looks a bit
busy, but fine. I'm done.

`--end rounds/round-2/sessions/r2-s49`

## Debrief (in character)

- **Finished?** Yes. 11 families are within two marriages of the Medici (Acciaiuoli, Albizzi,
  Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni), and the
  drawing now shows only the Medici and those 11 ("12 of 15 nodes").
- **Ease:** 6 of 7.
- **What confused me:**
  - I had to guess that the three-dot "Node actions" button by the name was where to look; nothing
    on the Medici panel itself (Degree 6 >) hinted at "go further out". I only found it because
    I tried the menu.
  - "Neighborhood" and "Hops" are not my words. "Hops 1 2 3" made sense only because 1 matched the
    six families I had already seen in the find box; then 2 was a guess that turned out right.
  - The header "Medici and 11 connections within 2 hops" gave me the number directly, which was
    great -- but it says "connections", and I had to check against "Selection 12" to be sure the
    Medici were not counted in the 11.
  - "Filter to neighbors" worked, but afterwards the key reads "PageRank on 15 nodes" and the
    ranking row shows a new clock-like icon. I could not tell whether the ranking is now stale or
    should be redone for the 12 that remain.
  - Not confusing, but a tool hiccup: clicking a name that also appears in the line list (Medici)
    needed me to pick the first match.
