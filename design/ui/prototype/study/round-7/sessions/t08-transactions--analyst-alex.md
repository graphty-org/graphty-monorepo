# Session: transfers layout -- Analyst Alex

Task as given: "With 3,000 accounts the drawing is a smear. Try another way of arranging it that
will not freeze your laptop. The data on screen is a sample: one month of card and bank transfers
between accounts."

All commands run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t08-transactions--analyst-alex/`.

## Start screen (shots/tasks/t08-transactions/01.png)

Okay, gray hexagon blob. That's the hairball, just in honeycomb form. Right side has counts:
3,000 nodes, 9,113 edges, directed, one weak component, highest degree 907. Fine, that's the
stuff I'd check against SQL. "Local only" up top -- good, I assume that means my data stays here.

I want a different layout. In Gephi that's the Layout panel on the left. Here I don't see a word
"Layout" anywhere. There's a little toolbar at the bottom of the canvas with icons. Let me rest on
one.

## 01 -- hover "Layout"

    timeout 120 node app-b/study.mjs --try $D/01.png task:t08-transactions --hover "Layout"

The play button says "Resume layout". So something is laying it out, but resume isn't what I
want -- I want a different one, not more of the same smear.

## 02 -- click "Style"

    timeout 120 node app-b/study.mjs --try $D/02.png task:t08-transactions --click "Style"

Right panel has Style and Data tabs. Style has a "Layout" section: Method "Spread Out", Seed 7.
Layout under Style is a bit odd, but okay, found it. A seed shown -- I like that, means it's the
same picture next time.

## 03 -- click "Spread Out"

    ... --click "Style" --click "Spread Out"

A Layout dialog with a list: Spread Out (Recommended), Spread Out Flat, Ring, Rings from a Node,
Grid, Concentric Rings, Spiral, Natural Grouping, No Crossings, Scattered, Tree, Two Columns,
Columns by Group, Keep Positions. Columns for Size and Weights. Some say "2,000" with a little
clock. I have 3,000. So those are the ones that'll hang. That's actually useful -- Cytoscape never
told me that before it froze.

The names are not what I know. "Natural Grouping"? "No Crossings"? I don't know which of these is
Fruchterman-Reingold or ForceAtlas. The right side has a pile of physics settings (spring length,
gravity, theta, drag coefficient) that I would never touch.

## 04 -- hover "Natural Grouping"

    ... --click "Style" --click "Spread Out" --hover "Natural Grouping"

"Rated for up to 2,000 nodes; this graph has 3,000. The canvas stops responding while it
computes." Clear. Not clicking that. Good warning, says my number, not a generic one.

## 05 -- hover "Concentric Rings"

    ... --hover "Concentric Rings"

"Any size, ignores edge weights, flat, needs a grouping." I don't have a grouping. Skip.

## 06 -- click the Engine dropdown "NGraph Force"

    ... --click "Style" --click "Spread Out" --click "NGraph Force"

Engines: NGraph Force, D3 Force, ForceAtlas2, Spring, Kamada-Kawai, Spring Electrical.
ForceAtlas2! That's the Gephi one. So "Spread Out" is just the family name and the real algorithm
is hidden in this dropdown. Took me a while to realize that.

## 07 -- pick "ForceAtlas2"

    ... --click "NGraph Force" --click "ForceAtlas2"

Toast: "Laid out again: ForceAtlas2" with Undo. Note now says "Honors edge weights" -- good, the
transfer amounts matter. But the options underneath are still spring length, gravity -1.2, theta,
drag coefficient. Those aren't ForceAtlas2 settings. Where's scaling, LinLog, prevent overlap? I'd
want those for a hairball. Weird.

## 08 -- Escape, 09 -- click "Close"

    ... --click "ForceAtlas2" --key Escape
    ... --click "ForceAtlas2" --click "Close"

Closed the dialog. The drawing is... the same blob. Pixel for pixel as far as I can tell. And the
panel jumped back to the Data tab. Did it do anything?

## 10 -- reopen "Style"

    ... --click "Close" --click "Style"

Method still says "Spread Out". Nothing says ForceAtlas2. So I can't tell from here whether it
kept my choice. If I'm presenting this, I need to know which layout I used.

## 11 -- try "Rings from a Node" instead

    ... --click "Style" --click "Spread Out" --click "Rings from a Node"

Any size, so it shouldn't hang. Toast "Laid out again: Rings from a Node". This time the panel
Method did change. Root node: None. I'd want the 907-degree account in the middle, but I'm not
going to go find it right now.

## 12 -- close it

    ... --click "Rings from a Node" --click "Close"

Same blob again. Exactly the same honeycomb. So either the picture doesn't change, or this
honeycomb thing is what it always draws at 3,000 and the layout underneath doesn't matter. Either
way the smear is still a smear.

## 13-15 -- hover the other toolbar icons

    --hover "Lightning"   -> nothing on screen is called "Lightning"
    --hover "3D"          -> no tooltip appeared
    --hover "List"        -> showed "List options" on the left panel, not the toolbar

Can't figure out what the lightning or the cube do without guessing names. I'm stopping here.

## Wrap-up

**Did I succeed?** Sort of. I found the layout list, it told me which ones would freeze for 3,000
nodes, and I picked ones that won't, and the app said "Laid out again". But the drawing on screen
didn't change at all, so I can't say the smear is fixed, and I'm not sure the ForceAtlas2 choice
stuck since the panel still said "Spread Out".

**Single Ease Question:** 4 of 7. The size warnings were the best part. Finding ForceAtlas2 under
an "Engine" dropdown behind a "Spread Out" button, and then seeing no change, was the worst.

**Would I use this instead of Gephi?** Not for this yet. The "this will freeze at 3,000"
warning is something Gephi never gives me, and I'd come back for that. But I need to see that the
layout actually did something, and I need the settings for the algorithm I picked, not someone
else's. Right now I'd still do it in Gephi and filter out the small accounts first.
