# Session r2-s23 -- Elena (first-time graph user), task T12 Prompt B (Florentine families)

Task as given: practice on the ready-made Florentine families network; go to the Medici family, read
what the program knows about them, and see which families they married into. Tell who they are and
how many.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s23 empty`
Saw (01.png): a dark start page. Left: "Open project or file...", "New from data...". Middle: Recent
projects (empty). Right: "Samples" -- Les Miserables, Zachary's karate club, College football,
Florentine families (15 families). A box at the bottom asks me to share usage data.
Elena: "Oh good, the Florentine one is right there. I'll just say no thanks to the data thing and
click Florentine families."

## Step 2

Command: `--step --click "No thanks"`
Saw (02.png): the banner went away (screenshot only, nothing printed). Now clicking the sample.

## Step 3

Command: `--step --click "Florentine families"`
Saw (03.png): blue dots and grey lines on a light canvas, no names on any of the dots. Right side:
"Graph -- From Florentine families", Nodes 15, Edges 20, Density 0.1905, Components 1 -- numbers I
don't really follow. Left: a search box "Find nodes, edges, values", "Selection", "Everything".
Elena: "Hm, no names. Which one is the Medici? The one in the middle with lots of lines must be the
important one -- the Medici were the big family, right? I'll click that one."
Hesitation: no labels on the dots, so I am guessing.

## Step 4

Command: `--step --click-at 700,378`
Tool: `at 700,378: node with id "Medici"`
Saw (04.png): the middle dot turned yellow-ringed, and the right panel now says "Medici -- Node",
Summary: id Medici, name Medici, Degree 6 with a little ">" arrow. Left "Selection 1".
Elena: "Ha, I was right, the one in the middle IS the Medici. So it's the most important family."
(Confident read of position as importance -- nothing on screen said that.)
"That's all it knows? id, name, and 'Degree 6'. I don't know what Degree is. There are... six lines
coming out of this dot, so maybe six is the lines? The arrow next to it looks clickable, I'll try it."
Hesitation: "Degree" is a word I don't know; I only press it because it is the only thing with an arrow.

## Step 5

Command: `--step --click-at 1410,236`
Tool: `at 1410,236: group "Summary values"`
Saw (05.png): the Degree row got a lighter background (hover look) but nothing opened.
Elena: "Nothing happened. Maybe I missed the little arrow. Let me click on the word Degree itself."

## Step 6

Command: `--step --click "Degree"`
Saw (06.png): now it worked. The right panel changed to "Medici -- Neighborhood", heading "Medici's 6
connections", and a list: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni (Ridolfi
looked highlighted, I think just where my mouse was). On the picture, the Medici dot and six others
got yellow rings. The left side says "Selection 7".
Elena: "Oh! There they are. Six families. So 'Degree' just means how many lines. They could have
just said that." Small pause at "Selection 7" -- "seven? Oh, it's the six plus the Medici itself,
I guess." I take the lines to be the marriages since that is what this sample is about; nothing on
screen actually says "married", just "connections".
Part done: I found the Medici, read what it knows (id, name, Degree 6), and got the list of families.

## End

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s23`

## In character, at the end

- Did I finish? Yes. The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi,
  Salviati and Tornabuoni.
- What the program knows about the Medici: an id and a name (both "Medici") and "Degree 6", which
  turned out to mean 6 connections.
- How easy: 5 out of 7 (1 = very difficult, 7 = very easy).
- What confused me:
    - The dots have no names on them. I found the Medici only because I guessed the dot in the middle
      was the important one -- lucky. If I had guessed wrong I would have clicked around dot by dot;
      I did not think to use the search box on the left.
    - "Degree" means nothing to me. It was the only thing that looked clickable, so I tried it. The
      first time I clicked the little arrow next to it, nothing happened; clicking the word worked.
    - The list says "connections", not marriages, so I assumed. And "Selection 7" next to "6
      connections" made me stop for a second until I figured it counts the Medici too.
    - The numbers on the first screen (Density 0.1905, Components 1) -- no idea what those are, I
      ignored them.
