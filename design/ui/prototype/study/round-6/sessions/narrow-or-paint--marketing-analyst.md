# Narrow, hide or paint -- Jordan (marketing network analyst)

Task as given by the moderator: "Look only at the characters with 5 or more
co-appearance partners. How many are there, and who matters most among them?"

Dataset: Les Miserables co-appearances, 77 characters, 254 pairs.
Pages seen: the app at rest (screens/frame-at-rest.html), the filter chip and
its steps (screens/filter-chip.html, driven by hand from "No steps"), Results
after a filter (screens/results-panel.html#filtered), and the narrow, hide or
paint flow diagram (flows/narrow-hide-paint.html). Renders at 1440 x 900 in the
study view, plus one pass clicked through in a browser tab at 1280 x 720.

## Think-aloud

**1. At rest.** "OK, Les Mis. 77 nodes, 254 edges, top right. Co-appearance
partners -- that's just degree, right? How many people each character shares a
scene with. So I want everyone with degree 5 or more. I'm looking for a filter.
There's a thing under the file name that says 'Full graph' with a funnel icon.
That's a filter. Good, it's where I'd put it -- next to the file name, not
buried in some icon tab." Clicked the "Full graph" chip.

**2. The chip opens.** "'No filter steps. Every number reads the full graph.'
Fine, clear. 'Add step.'" Menu: Filter to -- Largest component, k-core...,
Rule...; Filter out -- Rule... "k-core, no idea, skipping that. Largest
component, no. Rule. I want to *keep* the 5-plus people, so Filter to, Rule."

**3. The rule editor.** It came up as "degree >= 1" already. "Oh nice, it
guessed degree. I'd have gone looking for it in the drop-down otherwise. Change
the 1 to 5." Typed 5. The chip changed to "41 of 77 characters, 1 step" and the
editor says "Scope: Full graph: 77 characters. Result: took out 36, 41 left."
"41. That's my first answer. And it says it's counting against the full graph,
which is what I'd have asked next. I like that it tells me what it took out
*and* what's left -- I'd have done 77 minus something in my head and not
trusted it."

**4. The table underneath.** "Filtered graph: 41 of 77 characters. Sorted by
degree (filtered)." Two degree columns: Degree (filtered) and Degree (full
graph). Valjean 22 and 36, Gavroche 19 and 22, Marius 16 and 19, Enjolras 15,
Thenardier 13, Bossuet 13, Courfeyrac 13, Javert 12 and 17. "Hang on. Which
degree goes in the slide? Valjean is 36 in one and 22 in the other. I think I
get it -- 22 is how many of the *other 41* he's with. But if my VP sees 36 in
one deck and 22 in the next, I'm the one explaining it. At least both are
labelled and it doesn't pretend there's only one. And Javert drops from 17 to
12 -- so he was hanging out with a lot of minor characters. That's actually
interesting, that's a real insight for the 'who reaches outside the core'
question."

"Whoever it is, Valjean is top on both. Our brand handle -- sorry, the guy I'd
expect at the top -- is at the top. So I believe it."

**5. Is degree 'matters most'?** "Degree just tells me who's big. Who
*matters* -- I'd want the connector, the bridge. Betweenness." Went to the
Results rail. The only Results mock with a filter is a betweenness run on a
different filter (degree >= 2, 60 of 77), so I read that as 'what I'd see'.
It says right at the top "Betweenness, on 60 of 77 nodes" and the run record
says "Scope: Filtered graph, 60 of 77: after Filter to degree >= 2". "Good --
if I ran it on my 41, I assume it'd say 41 and name my step. That's the thing
I'd screenshot for the appendix when somebody asks 'what was this computed
on'." Top 5 there: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154,
Javert 0.073. "Valjean again, by a mile. Gavroche and Marius -- the
barricade kids. That lines up with the degree list, so I'd say: Valjean
matters most, then Gavroche and Marius."

"I can't actually see the run on *my* 41 though. I'm guessing the numbers
move. If it asked me 'run on the filtered 41 or the full 77?' before running I
would be happy. The Options block does say 'Scope: Filtered graph, 60 of 77',
so I think it just follows the chip. I didn't see a way to say 'no, the full
graph' from there, but I didn't look hard."

**6. The hide or paint question.** "The moderator said something about hide or
paint. On these screens I never saw a 'hide' anywhere, and honestly I wouldn't
have wanted it. Filter did the job." Opened the flow diagram. "This is a
flowchart for the developers. Merchants, 2,940 of 3,000 -- that's not my data.
There's a table: Filter out, Hide on canvas, Paint. Hide on canvas: the chip
does *not* move, and the statistics still read 3,000. Wow, OK. So if I'd
hidden the small characters instead of filtering, the canvas would look like
41 and every number on the right would still say 77? That's the dashboard-says-
4,000-download-says-3,100 thing all over again. I'd have fallen for that. I'd
just see fewer dots and assume the count is the count."

"Paint -- colouring them -- fine, that's what I'd do for the slide *after* I
have the list, not to count. I would not have tried to paint to answer 'how
many'."

**7. Off-topic.** "This is exactly the stuff our listening suite can't do. It
gives me a 'top authors' list and the filter is on *mentions*, not on who
talks to whom. And since the Twitter API went paid I can't even rebuild the
network to do this myself. Anyway."

**8. Squinting at the rest.** "The Statistics panel repeats '(41 of 77
characters)' on every single line. I got it the first time. Makes the panel
twice as long." "One line says 'Largest component 41 ... down from 77 when
step 1 was edited.' I didn't edit a step, I *added* one. Small, but it made
me go back and check I hadn't changed something." "The filter pop-over sits
right on top of the map's upper left. It's fine for Les Mis; with my 20,000-
account file the interesting cluster could be under it."

**9. Laptop width.** "At 1440 it all fits. When I had it narrower, about the
size of my laptop screen with the dock, the right panel was cut off -- the
statistics read 'Characters 4...' and 'Density 0.23...' with the rest off the
edge. No scroll bar I could see. On a train that's where I'd be."

**10. Hand-off.** "If I needed the 41 as a CSV, I'd hope the table's '...'
menu exports it as filtered and sorted. I didn't check -- not the task --
but it's the first place I'd click."

## Answer given

"41 characters have 5 or more co-appearance partners. Among them, Valjean
matters most -- most partners inside the group (22 of the 40 others) and the
top bridge by betweenness by a wide margin. Next are Gavroche and Marius."

Answer is correct on the count (41, full-graph degree >= 5). "Who matters
most" is Valjean on both degree and betweenness. The betweenness figures she
quoted come from the only filtered Results mock, which ran on a different
filter (60 of 77); she said so herself and assumed a run on 41 would look the
same shape.

## Single Ease Question

**5 of 7.** "The counting part was a 7 -- chip, add step, type 5, it tells me 41 and
what it read. It loses points for: two degree columns I have to explain,
betweenness I had to go to a different place to get and couldn't see on my
own 41, and the right panel being cut off at laptop size. And I got lucky --
if hide had been the first thing I'd found, I'd have given you a wrong number
and been sure of it."

## Would she use this instead of her current tool?

"For this -- narrow the network, then rank inside it -- yes, over Gephi.
In Gephi the filter lives in a separate tab, and half the time I forget the
statistics were computed before I filtered. Here the chip is always in front
of me and every number says what it was computed on. Would it replace the
listening suite? No, that's where the data comes from. It would replace the
'export to Gephi, fight with it, paste into Excel' part. I'd still need to see
the CSV export and the 'does my customer file leave my laptop' answer before
I put anything real in it -- 'Nothing has been sent from this project' up top
is a good start."
