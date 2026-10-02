# Tree test -- Marcus, criminal intelligence analyst

Participant: a state fusion center analyst, ten years of i2 Analyst's Notebook and Excel. He saw
only the text outline of the app. Confidence is 1 (pure guess) to 7 (certain).

## tree01 -- the go-betweens between groups

"Go-betweens. That's betweenness. The middleman."

1. Header -- nothing there about analysis. Skipped it.
2. Toolbar -> Analyze. Options: Search, Recent, Rank nodes and edges, Find groups, Find paths and
   edge sets, Measure the graph.
3. Stopped on "Find paths and edge sets" for a second, because the question is about getting from
   one group to another. But that sounds like A-to-B, one route at a time. Not what I want.
4. Went with Rank nodes and edges. Ranking people by how much they sit in the middle -- that's a
   ranking. If betweenness isn't in there by that name, I'd type it into "Search, or say what to find".

End: Toolbar -> Analyze -> Rank nodes and edges. Confidence 5.
"If it calls betweenness something cute, I'm going to be annoyed."

## tree02 -- reading a colleague's note on a cluster

1. Rail -> Notes. "Every note, newest first" plus "Find in notes". That's where I'd go.
2. Saw "Show (all notes, about the selection, about this graph)". Would probably click the cluster
   first and then pick "about the selection", if I could find the cluster. I don't know which one it
   is, so: Find in notes, type the crew's name, or just scroll.
3. Noticed the Graph rail also has Notes in its list, and the Inspector has a Notes section under
   Data. Two or three places for notes. Fine, as long as they're the same notes.

End: Rail -> Notes -> Find in notes / scroll the list. Confidence 5.

## tree03 -- picture for Friday's slides

1. Main menu (three lines) first -- that's where File lives in most programs. New, Open, Open
   recent, Select where... no Export. Odd.
2. Backtracked. Project name -> Export... -> Image.

End: Header -> Project name -> Export... -> Image. Confidence 6.
"Took me a second. Export lives under the project's name, not the main menu. Okay."

## tree04 -- a colleague's colors and settings file, no data in it

1. Main menu -> Open... -- thought about it, but "Open" sounds like it'd open a whole project and
   close mine. Didn't click.
2. Main menu -> Settings -- that's my own settings, theme, name. Not a file from someone else.
3. Project name menu -> "Apply recipe or style file...". "Style file" -- that's colors. Not sure
   what a "recipe" is, but style file fits.

End: Header -> Project name -> Apply recipe or style file... Confidence 5.
"What's a recipe? I'd hover it. If it touches my data I want to know before I click."

## tree05 -- what the project looked like before Tuesday, and what changed since

1. Undo in the header -- no, that's just one step back, not "Tuesday".
2. Project name -> Version history.

End: Header -> Project name -> Version history. Confidence 6.
"Whether it tells me WHO did it and WHAT, that's the real question. Chain of custody."

## tree06 -- leave out small transfers everywhere from now on

1. Header has "Full graph (filter)". That's the obvious button -- clicked it in my head. It
   probably opens the filters.
2. Rail -> Data -> Filters (+ adds a step). Add a step: amount greater than whatever. Checkbox to
   apply it.
3. Not sure "every number" respects the filter. The outline doesn't say whether the rankings use
   the filtered graph or the full one. I'd have to check a count before and after.

End: Rail -> Data -> Filters -> + add a step (reached from the header "Full graph" too, I assume).
Confidence 5.

## tree07 -- 40 swipes together counts more than 1 swipe, in every analysis

"That's weight. Link strength."

1. Data -> Attributes -> an attribute's menu. Color by, Size by... nothing that says weight.
2. Data -> Sources -> my file -> Edit source... -> the data page.
3. On the data page, column roles: there's "Weight". But my spreadsheet doesn't HAVE a count
   column. Every swipe is its own row. There's nothing to point Weight at.
4. Saw "One edge per: Row | Pair". Pair -- I think that means collapse all the swipes between the
   same person and building into one link. Does it count them and use that as the weight? Doesn't
   say. Guessing it does.

End: Data -> Sources -> Edit source... -> data page -> One edge per: Pair. Confidence 3.
"In Excel I'd pivot it, count, and bring the count back in as Weight. If Pair does that for me,
great, but nothing here tells me so. I'd probably end up doing the pivot."

## tree08 -- try a different arrangement

"The auto-arrange made a hairball. Try another one."

1. Toolbar -> View. Fit, Standard views, 2D/3D, VR... that's the camera, not the arrangement.
   2D, I'd flip that anyway.
2. Toolbar -> Pause layout / Resume layout. Pause doesn't give me a different one.
3. Right-click empty canvas -> Re-run layout, Reshuffle layout seed. Reshuffle -- is that a new
   arrangement or the same auto-arrange rolled again? Sounds like the same one, shaken.
4. Kept reading. Inspector -> Style tab -> Layout (when nothing is selected) -> Method. That's it.
   Why is the layout under "Style"? I'd never have looked there first. Style is colors to me.
5. Also noticed Data -> Attributes -> "Place by" and the grouping row's "Lay out by these groups".
   Different thing, but I'd remember those.

End: Inspector (nothing selected) -> Style tab -> Layout -> Method. Confidence 4.
"In the real thing I'd have hit Reshuffle three times and given up before finding Method."

## tree09 -- come back to this exact angle on Monday

1. Toolbar -> View -> Save view.
2. Saw the Views rail also has Save view (+) and Present. Same thing, I assume.

End: Toolbar -> View -> Save view (or Rail -> Views -> +). Confidence 6.
"And I'd hit Save on the project too. Does a saved view survive closing the project? It had better."

## tree10 -- how far the groups moved between last month and this month

1. Rail -> Graph -> Graph switcher -> Compare graphs... That's two months, two graphs.
2. Also saw a row's right-click "Compare with another row...". If I'd run Find groups on both
   months, maybe I compare the two groupings there. Not sure which one actually shows the groups
   moving rather than just which links appeared.

End: Rail -> Graph -> Graph switcher -> Compare graphs... Confidence 4.

## tree11 -- pick out everyone matching a rule (country and a high score)

1. Toolbar -> Analyze -> "Search, or say what to find". "Say what to find" smells like an AI box.
   Skipped it.
2. Rail -> Graph -> Find rows and notes. That finds rows in the list, not people. No.
3. Data -> Attributes -> country -> "Create set where this is..." -- one attribute at a time. Could
   do country, but then the score?
4. Main menu -> "Select where...". That's the one. Weird place for it, in the main menu next to Open
   and Settings, but it reads right.

End: Main menu -> Select where... Confidence 4.
"Would never have looked in the main menu for that. Ctrl+K, maybe, if someone told me."

## tree12 -- what does it send back to its makers

"This one I read carefully. IT will ask me and I have to answer right."

1. Header -> "Local only (privacy)". Clicked that first. It probably says what stays on the machine.
2. Main menu -> Settings -> Privacy. That's where I'd expect the switch.
3. Also noticed Settings -> Diagnostics and Help -> Report a problem. Diagnostics -- is that the
   thing that phones home? I'd check it too, and switch off anything in there.

End: Main menu -> Settings -> Privacy (and Diagnostics). Confidence 5.
"Two places. Three if you count the header. I want one page that says: nothing leaves this
computer, here's the list, here's the switch."

## tree13 -- re-run everything from March on April's numbers

1. Main menu -> Open... -- no, that gives me a new project with none of my work.
2. Rail -> Data -> Sources -> the March file -> "Replace with file...". Swap March for April.
3. Then I'd expect the groups and rankings to rerun. There's a "Rerun" on each row's right-click
   in the Graph list if they don't. Nothing here says whether the colors and groups follow along
   automatically.

End: Rail -> Data -> Sources -> March file's menu -> Replace with file... Confidence 5.
"I'd Save as a copy first. If it overwrites March, I've lost my March chart."

## tree14 -- name next to each person, department under it

1. Data -> Attributes -> name -> Label by. That puts the name on.
2. Then department -> Label by again? Would that replace the name? Probably.
3. Inspector -> Style -> Label (+ adds a label line). Two lines -- name, then add department.

End: Inspector -> Style tab -> Label -> + for a second line. Confidence 4.
"Label by in one place, label lines in another. I'd try Label by twice first and swear when the
name disappeared."

## tree15 -- three people out of sight, still in the counts

1. Select the three, right-click -> Hide on canvas. Also on the selection bar.
2. "Hide on canvas" sounds like just the picture -- that's what I want. Filters would take them out
   of the numbers, so not Filters.
3. Main menu has "Show hidden elements" to bring them back. Good.

End: Canvas -> right-click a node (or the selection bar) -> Hide on canvas. Confidence 5.
"I'd check a ranking afterwards to make sure they're still in it. Side panel says 212, screen says
209 -- I want to see that difference explained, not guess."

## tree16 -- scores came in as words, tell it they're numbers

1. Data -> Attributes -> the score -> its menu -> "Read as...". That's the one.
2. Thought about Edit source and the data page column roles, but those are Key, Name, From, To...
   no "number" there.

End: Rail -> Data -> Attributes -> score's menu -> Read as... Confidence 5.

## His overall take

"Most of it I'd find. The project-name menu is where the file stuff lives, fine. Three things
bugged me: layout hiding under Style, 'Select where' sitting in the main menu with Open and
Settings, and the swipe-count question -- nothing told me whether 'Pair' counts the rows. And
privacy in three places. Give me one."
