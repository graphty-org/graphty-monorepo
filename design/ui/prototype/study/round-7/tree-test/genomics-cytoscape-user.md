# Tree test -- Maren (genomics postdoc, Cytoscape user)

Played from the persona in study/personas/genomics-cytoscape-user.md. She saw only the text outline in round-7/tree.md. Confidence is 1 (pure guess) to 7 (certain).

## tree01 -- the go-betweens between groups

"Go-betweens... that sounds like paths." Toolbar > Analyze > Find paths and edge sets. Reads it again: that finds a path, it does not tell me who the network depends on. Back. Analyze > Rank nodes and edges -- "in cytoHubba Bottleneck is one of the rankings, so it's probably a ranking in here somewhere."

- Ends: Toolbar > Analyze > Rank nodes and edges
- Confidence: 4
- Said: "I'd expect one of the rankings to be it. I don't know which word it'll be called."

## tree02 -- a colleague's written note about a cluster

Rail > Notes. "Notes is right there." Would use Find in notes, or just scroll, newest first.

- Ends: Rail > Notes > Every note, newest first (Find in notes if there are many)
- Confidence: 6

## tree03 -- a picture for Friday's slides

Main menu first, because in Cytoscape it's File > Export. No Export in there. Back. Project name > Export... > Image.

- Ends: Project name > Export... > Image
- Confidence: 5
- Said: "Odd that Export is under the project name and not the main menu. Does Image give me the legend with it?"

## tree04 -- a colleague's colors and settings file, no data

Project name > Apply recipe or style file... "Style file -- that's what it is. Like importing a styles.xml in Cytoscape."

- Ends: Project name > Apply recipe or style file...
- Confidence: 6

## tree05 -- what the project looked like before Tuesday

Looked at Undo for a second, no. Project name > Version history.

- Ends: Project name > Version history
- Confidence: 5
- Said: "I hope it says who did what, not just timestamps."

## tree06 -- leave out the small ones everywhere, from now on

Glanced at the header "Full graph (filter)" -- not sure what that button does. Went to Rail > Data > Filters (+ adds a step), add a step on the weight or amount.

- Ends: Rail > Data > Filters > + adds a step
- Confidence: 5
- Said: "Like the STRING confidence cutoff. I'd want it to say how many edges it dropped."

## tree07 -- 40 appearances together should count more than 1

"That's a weight." Rail > Data > Sources > the file's menu > Edit source... > data page > the chosen table > column roles > Weight. Then: there's no column with 40 in it, it's 40 rows. Back up within the same page. "One edge per: Row | Pair" -- Pair, I think, would squash the 40 rows into one edge. Guessing it counts them.

- Ends: Data page > The chosen table > One edge per: Pair (after trying Weight)
- Confidence: 3
- Said: "I'm not sure Pair counts them as a weight or just throws the duplicates away. If it throws them away I've lost data without being told."

## tree08 -- try a different arrangement

Cytoscape has a Layout menu at the top. Main menu: nothing. Toolbar: Pause layout -- no. Right-click on empty canvas: Re-run layout, Reshuffle layout seed -- that just redoes the same one. Back. Inspector, when nothing is selected > Style tab > Layout > Method.

- Ends: Inspector > Style tab > Layout > Method
- Confidence: 4
- Said: "Layout under Style is not where I'd look. I found it because I ran out of other places."

## tree09 -- come back to exactly this angle on Monday

Toolbar > View > Save view. On Monday, View > Your views (or Rail > Views).

- Ends: Toolbar > View > Save view (Rail > Views to reopen)
- Confidence: 6

## tree10 -- how far the groups moved between last month and this month

Rail > Graph > Graph switcher > Compare graphs... Noticed a row's "Compare with another row..." too and hesitated, but the question is about two networks, so Compare graphs.

- Ends: Rail > Graph > Graph switcher > Compare graphs...
- Confidence: 4
- Said: "Two compare buttons. I'd try the graphs one and see if it talks about groups."

## tree11 -- select everyone matching a typed rule

First looked at Toolbar > Analyze > Search, or say what to find. "Say what to find" sounds like an AI thing, skipped it. Rail > Graph > Find rows and notes -- that's for the list, not nodes. Back. Main menu > Select where...

- Ends: Main menu > Select where...
- Confidence: 5
- Said: "Funny place for it, but Select where is exactly the words."

## tree12 -- what the program sends back to its makers

Header "Local only (privacy)" first -- reassuring if true. To check and change it properly: Main menu > Settings... > Privacy.

- Ends: Main menu > Settings... > Privacy
- Confidence: 6
- Said: "IT will also want Diagnostics. I'd open that too."

## tree13 -- rerun everything on April's numbers instead of March's

Rail > Data > Sources > March's file > its menu > Replace with file...

- Ends: Rail > Data > Sources > (file) menu > Replace with file...
- Confidence: 5
- Said: "And then do the clusters rerun on their own or do I click Rerun on each? I'd want it to tell me."

## tree14 -- name next to each person, department under it

Rail > Data > Attributes > name > Label by. Then the department under it... Label by would replace it. Inspector > Style tab > Label (+ adds a label line), add a second line for department.

- Ends: Inspector > Style tab > Label (+ adds a label line)
- Confidence: 5

## tree15 -- three people out of sight but still counted

Select them, right-click a node > Hide on canvas (also on the selection bar).

- Ends: Right-click on a node > Hide on canvas
- Confidence: 6
- Said: "Hide on canvas, as opposed to Delete -- yes. I'd still check a count didn't change."

## tree16 -- scores came in as words, tell it they're numbers

My first thought was the import page: Data > Sources > Edit source... > the column's role. Roles are Key, Name, Weight... none says "number". Back. Rail > Data > Attributes > the score > its menu > Read as...

- Ends: Rail > Data > Attributes > (attribute) menu > Read as...
- Confidence: 4
- Said: "Read as is vague. I'd hope it offers 'number'. This is the fold-change-imports-as-text problem again."

## Overall

"Mostly I could guess where things go. The ones that slowed me down: layout hiding under Style, exporting from the project name rather than a menu, and the duplicate-rows-as-weight thing, where I'm honestly not sure what Pair does to my data."
