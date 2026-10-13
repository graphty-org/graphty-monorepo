**DRAFT -- not frozen.** These tasks run only after the owner approves the unified style panel. The
wording check (`criteria.md`, preflight item 6) runs on the frozen build before the first round and
may change any prompt; what it changes is written under the task.

# Tier 3 tasks for participants

Tier 3 is the styling work of a **returning** user: someone who has opened files, run analyses and
colored and sized dots before, and now comes back to make a figure say something. Each task asks
for a look, never for a control. Every task that depends on a word runs on two datasets, so an
answer cannot come from one domain's vocabulary or from memory of one sample.

Success definitions, success paths and reference values: `answers.md` (graders only). Bars and the
round plan: `criteria.md`. Participants, their earlier sessions and their starts: `roster.md`.

## Rules for whoever runs a session

Every rule of tier 2 (`../tier2/tasks.md`, "Rules for whoever runs a session") holds, with these
changes:

- **A participant gets:** their persona file, their earlier sessions from `roster.md` word for word,
  the **Prompt** below word for word, the tool's participant instructions (`../tool/README.md`, "A
  session" and "Steps"), and nothing else.
- **Prompts start with "You have used this program a few times"**, and open work is described as
  the participant's own ("is already open").
- **Starts** are setups from `../rounds/tier-3/setups/` (`roster.md`), which the participant never
  sees. No task starts empty: every task is about changing the look of work already open.
- **Files** are in `../tool/files/`. Tier 3 uses `friends.csv` and `yeast-galactose.graphml`
  (331 yeast genes from Cytoscape's galactose demo, with three expression columns) beside the
  samples Les Miserables, Zachary's karate club, College football and Florentine families.
- **Words.** No prompt uses a word a target control shows, nor an interface word (button, menu,
  panel, tab, layer, folder, field). Each task lists the words it avoids and any word kept on
  purpose. These words are avoided in every task: layer, style, vary, scale, rule, condition,
  which elements, everything, selected, hovered, folder, clear, reset, remove, override, palette,
  gradient, ramp, effect, label (as a verb), select.

## The tasks

| Task | What it is about                                         | A                     | B                     |
| ---- | -------------------------------------------------------- | --------------------- | --------------------- |
| T25  | Color by group, then recolor one group                   | Les Miserables        | College football      |
| T26  | A gradient over a count, with a cap                      | Les Miserables        | Zachary's karate club |
| T27  | A route that stands out                                  | Florentine families   | running club          |
| T28  | Elements picked by a rule: odd-numbered ids              | Zachary's karate club | College football      |
| T29  | Elements picked by a rule: the letters in a name         | Les Miserables        | yeast genes           |
| T30  | Two looks kept together and switched off in one go       | Les Miserables        | Zachary's karate club |
| T31  | The base look and a clicked element on a dark background | Les Miserables        | Florentine families   |
| T32  | Names on the drawing, the top five bold                  | Les Miserables        | Zachary's karate club |
| T33  | A shape for each group, for print in black and white     | College football      | Les Miserables        |
| T34  | Groups found again, the hand-made color kept             | Les Miserables        | Zachary's karate club |
| T35  | One look stops covering another (unsetting)              | Les Miserables        | Zachary's karate club |
| T36  | An expression figure (genomics personas)                 | yeast genes           | --                    |

### T25. Each group its own color, one group in red (two datasets)

- **Prompt A (Les Miserables):** "You have used this program a few times. The ready-made network of
  characters from Les Miserables is already open. For a poster, you want the characters drawn in
  the circles they move in, each circle in its own color, so the circles can be told apart. Then
  make the circle Javert moves in bright red, while every other circle keeps its own color. Tell us
  how many characters are in Javert's circle."
- **Prompt B (College football):** "You have used this program a few times. A network of American
  college football teams is already open: two teams are tied when they played each other in the
  2000 season, and every team carries a number for its conference. For a sports page, draw each
  conference in its own color, so the conferences can be told apart. Then make the conference
  Florida State plays in bright red, while every other conference keeps its own color. Tell us how
  many teams are in that conference."
- **Start:** `lesmis.txt` (A), `football.txt` (B): the sample open, nothing run.
- **Suits:** everyone; the analysts and the genomics persona above all.
- **Why two datasets:** A needs a run to find the circles; B has the groups in the data. The same
  category rows and the same one-group recolor must serve both.
- **Words avoided:** community, communities, group (the run's values are named "Group 1" to "Group
  6"), Louvain, category, value, "one color per value", new layer. "color" is kept: it is the
  everyday word for the job, and a participant who goes straight to a Color row from it is recorded.

### T26. Pale to dark by how connected (two datasets)

- **Prompt A (Les Miserables):** "You have used this program a few times. The ready-made network of
  characters from Les Miserables is already open. For an essay you want each character's color to
  say how many other characters they share chapters with: pale for the fewest, dark for the most.
  Most characters share chapters with only a few others, so make everyone who shares with 10 or
  more count as fully dark, and let the differences among the rest show. Tell us how many
  characters end up fully dark."
- **Prompt B (karate club):** "You have used this program a few times. The ready-made network of
  Zachary's karate club is already open; each tie is two members who trained together. You want
  each member's color to say how many others they trained with: pale for the fewest, dark for the
  most. Make everyone with 6 or more training partners count as fully dark, and let the
  differences among the rest show. Tell us how many members end up fully dark."
- **Start:** `lesmis.txt` (A), `karate.txt` (B).
- **Words avoided:** degree, connections (the run's row is named "Connections"), gradient, ramp,
  clamp, range, domain, maximum, scale, steps.

### T27. The chain that stands out (two datasets)

- **Prompt A (Florentine families):** "You have used this program a few times. The ready-made
  network of marriages between the leading families of Renaissance Florence is already open. Work
  out how a message passes from the Strozzi to the Pazzi through as few marriages as possible, and
  make that chain stand out for a slide: its families and the marriages between them in orange,
  with those marriages drawn thicker than the rest. Every other family and marriage stays as it
  is."
- **Prompt B (running club):** "You have used this program a few times. Your running club's list,
  friends.csv, is already open. Work out the chain of introductions from Chloe to Milo with the
  fewest people in between, and make that chain stand out for a flyer: its people and the ties
  between them in orange, with those ties drawn thicker than the rest. Everyone else stays as they
  are."
- **Start:** `florentine.txt` (A), `friends.txt` (B).
- **Words avoided:** path, route, shortest, highlight, width, line, edge, "on the route". Finding
  the chain was measured in tier 2 (T18); here it is the step before the styling being measured.

### T28. Every odd number (two datasets)

- **Prompt A (karate club):** "You have used this program a few times. The ready-made network of
  Zachary's karate club is already open; each member is known only by a number. The club trains in
  two shifts, and members with odd numbers train on Mondays. Make every Monday member green on the
  drawing and leave everyone else as they are. Tell us how many Monday members there are."
- **Prompt B (College football):** "You have used this program a few times. The network of American
  college football teams is already open. In the file every team has a number as well as a name.
  The league draws lots by that number, and teams with odd numbers play at home first. Make every
  home-first team green on the drawing and leave the others as they are. Tell us how many there
  are."
- **Start:** `karate.txt` (A), `football.txt` (B).
- **Words avoided:** id, pattern, matches, ends with, where, find, rule, condition, filter.

### T29. Every name with some letters in it (two datasets)

- **Prompt A (Les Miserables):** "You have used this program a few times. The ready-made network of
  characters from Les Miserables is already open. Mark every married woman -- every character
  whose name has 'Mme' in it -- in purple on the drawing, and leave everyone else as they are. Tell
  us how many there are."
- **Prompt B (yeast genes):** "You have used this program a few times. Your network of yeast genes,
  yeast-galactose.graphml, is already open. Mark every gene of the galactose pathway -- every gene
  whose name begins with GAL -- in purple on the drawing, and leave every other gene as it is. Tell
  us how many there are."
- **Start:** `lesmis.txt` (A), `yeast.txt` (B).
- **Words avoided:** contains, starts with, matches, find, search, where, rule, condition, name
  (as a column name: "name" is kept in "whose name", the everyday phrase; a participant who picks
  the `name` column straight from it is recorded).

### T30. Two looks that go together (two datasets)

- **Prompt A (Les Miserables):** "You have used this program a few times. Les Miserables is open
  with work from last time: the married women (Mme) in purple and the unmarried ones (Mlle) in
  pink. For a talk you want those two looks kept together, under the name 'Women', so you can
  switch both off and on in one go. Set that up, switch them off once to check, and switch them
  back on."
- **Prompt B (karate club):** "You have used this program a few times. The karate club is open with
  work from last time: the Monday members in green and the Tuesday members in blue. You want those
  two looks kept together, under the name 'Shifts', so you can switch both off and on in one go.
  Set that up, switch them off once to check, and switch them back on."
- **Start:** `lesmis-women.txt` (A), `karate-shifts.txt` (B).
- **Words avoided:** folder, group, layer, hide, show, eye, visible, add, new.

### T31. A dark room (two datasets)

- **Prompt A (Les Miserables):** "You have used this program a few times. Les Miserables is open,
  colored by the circles characters move in. You will present it on a projector in a dark room.
  Make the background black and every tie between characters a light gray, so the ties show. Then
  click Javert: he must still clearly stand out from the characters around him. If he does not,
  change how a clicked character looks until he does."
- **Prompt B (Florentine families):** "You have used this program a few times. The Florentine
  marriages network is open, colored by how many marriages each family made. It will be shown on a
  dark screen. Make everything behind the families black, and every marriage a light gray so the
  marriages show. Then click the Medici: they must still clearly stand out from the families
  around them. If they do not, change how a clicked family looks until it does."
- **Start:** `lesmis-circles.txt` (A), `florentine-ranked.txt` (B).
- **Words kept on purpose:** A says "background", a word of Graph settings; B says "everything
  behind the families", which names no control. The two halves together show whether the word
  leads the way; a pass on A with a fail on B is reported as a wording echo.
- **Words avoided:** selected, selection, highlight, halo, ring, glow, everything (B uses it as a
  plain word in "everything behind"; recorded if a participant goes to the Everything row from it),
  edge, line, color of the edges.

### T32. Names that a room can read (two datasets)

- **Prompt A (Les Miserables):** "You have used this program a few times. Les Miserables is open.
  For a slide, put every character's name on the drawing, large enough to read from the back of a
  room, and make the names of the five characters who share chapters with the most others bold."
- **Prompt B (karate club):** "You have used this program a few times. The karate club is open. For
  a handout, put each member's number on the drawing, large enough to read when printed, and make
  the numbers of the five members with the most training partners bold."
- **Start:** `lesmis.txt` (A), `karate.txt` (B).
- **Words avoided:** label, text, font, weight, size, top, rank, degree, connections, look.

### T33. Readable without color (two datasets)

- **Prompt A (College football):** "You have used this program a few times. The football network is
  open, each conference in its own color. The journal prints in black and white. Keep the colors,
  and also give each conference its own shape, so readers can tell the conferences apart without
  color."
- **Prompt B (Les Miserables):** "You have used this program a few times. Les Miserables is open,
  colored by the circles characters move in. The book prints in black and white. Keep the colors,
  and also draw each circle with its own symbol, so readers can tell the circles apart without
  color."
- **Start:** `football-conferences.txt` (A), `lesmis-circles.txt` (B).
- **Words kept on purpose:** A says "shape", the name of the property; B says "symbol", which names
  no control. A pass on A with a fail on B is reported as a wording echo.
- **Words avoided:** vary, by, per value, scheme, category, sphere, cube, icon.

### T34. Find the circles again, keep the red (two datasets)

- **Prompt A (Les Miserables):** "You have used this program a few times. Les Miserables is open
  with work from last time: the circles characters move in, each in its own color, and Javert's
  circle made bright red. A colleague asks for smaller, finer circles. Find the circles again that
  way, and make sure Javert's circle is still the bright red one afterwards. Tell us how many
  characters are in Javert's circle now."
- **Prompt B (karate club):** "You have used this program a few times. The karate club is open
  with work from last time: the groups that train together, each in its own color, and the group
  of member 34 made bright red. The coach asks for smaller, finer groups. Find the groups again
  that way, and make sure member 34's group is still the bright red one afterwards. Tell us how
  many members are in it now."
- **Start:** `lesmis-javert-red.txt` (A), `karate-34-red.txt` (B).
- **Words avoided:** re-run, rerun, run again, resolution, community, Louvain, settings, update.

### T35. Back to the group's own color (two datasets)

- **Prompt A (Les Miserables):** "You have used this program a few times. Les Miserables is open
  with work from last time: the circles characters move in, each in its own color, and the most
  connected characters made bigger and orange. Now you want those characters to show the color of
  their own circle, like everyone else, while staying bigger. Change that, and keep the circles'
  colors as they are."
- **Prompt B (karate club):** "You have used this program a few times. The karate club is open with
  work from last time: the groups that train together, each in its own color, and the members with
  the most training partners made bigger and orange. Now you want those members to show the color
  of their own group, like everyone else, while staying bigger. Change that, and keep the groups'
  colors as they are."
- **Start:** `lesmis-key-people.txt` (A), `karate-key-people.txt` (B).
- **Why this task:** it is the owner's first question. The orange is a value set on a layer above
  the groups' colors; the only way back to the groups' colors without losing the size is to unset
  that one value.
- **Words avoided:** clear, unset, remove, delete, reset, undo, override, cover, inherit, default,
  layer, beneath.

### T36. The expression figure (one dataset, genomics personas)

- **Prompt:** "You have used this program a few times. Your network of 331 yeast genes,
  yeast-galactose.graphml, is already open. It has three columns of expression log ratios, one per
  knockout. For Figure 3, color every gene by its log ratio in the gal1 knockout: blue for genes
  that went down, white at zero, red for genes that went up, with zero exactly in the middle so
  that a small change reads pale. Check that the key on the figure says so."
- **Start:** `yeast.txt`.
- **Suits:** the two genomics personas only; it is the job their persona files name first.
- **One dataset, on purpose:** no other study file carries signed values. The task is reported per
  persona and is not used to judge wording.
- **Words avoided:** diverging, midpoint, center, palette, gradient, scale, legend (the persona's
  word "key" is kept).

## Detours the dry run walks (facilitator side, never shown to a participant)

Written after the owner's approval, from the pilots of the approved build: for each task, the
success path by pointer and by keyboard, and the two or three commonest wrong turns a person who
does not know the path would try first (for example, on T35: deleting the orange layer, setting the
orange layer's color to one of the groups' colors, hiding the orange layer; on T25: making a new
layer by hand for Javert's circle; on T28: typing "odd" into find).
