# Session: "How is this account connected to that one?" -- supply chain risk analyst

Participant: Dana Okafor, supply chain risk analyst (composite persona, see
study/personas/supply-chain-analyst.md). Screens: the inspector and Find mocks.

Moderator's task, exactly as given: "How is this account connected to that one?"

Renders the participant saw (in shots/):

- r3-dana-howconn-inspector-one-node.png -- one node selected, at rest (screens/inspector.html#one-node)
- r3-dana-howconn-inspector-path-to.png -- after pressing Path to... (#path-to)
- r3-dana-howconn-inspector-two.png -- two nodes selected, Paths between form open (#two)
- r3-dana-howconn-inspector-path.png -- the found path (#path)
- r3-dana-howconn-find-s1.png, r3-dana-howconn-find-s2.png, r3-dana-howconn-find-s10.png --
  Find just opened, Find with two hits, and an id that is not in the project (screens/find.html)

## Think-aloud transcript

**Before starting.**

> "Account" -- OK, in my world that is a supplier account, a vendor number in SAP. I will read it
> as two suppliers. And this is not my data. It is... human protein interactions? TP53? I will
> pretend TP53 is a supplier. If I had to explain this to my VP I would already have lost him.

**Screen 1: one node selected (inspector, TP53 at rest).**

> Big hairball in the middle. Nice hairball. Something is already picked -- TP53, orange, with a
> ring. On the right there is a panel with its name, and two buttons: "Neighbors" and "Path to...".
> "Path to" -- that is literally my question. Good, I did not have to hunt for it.
>
> Before I click: the right panel has "degree", "betweenness", "pagerank", "#2 of 300". I know
> betweenness from a webinar, it means chokepoint, roughly. The other two I don't know. The
> "#2 of 300" lines are tiny and grey. On my laptop I would not read those without my glasses.
>
> The tooltip on Neighbors says "Filter to neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it." I like
> that it tells me how many before I press it and that I can undo. "Hop" I can guess -- one step.
> But that is not what I was asked. Clicking Path to...

**Screen 2: Path to... pressed.**

> Black bar at the top: "Pick the end node: click, or find it by name (Ctrl+K). Esc cancels."
> And a little bar at the bottom: From TP53, To "Pick the end node". So it wants the other
> supplier. I am not clicking a dot in that ball, I would get the wrong one. I would type the
> name. Can I type in that To box? It looks like a box. It says "Pick", not "type". I would try
> typing into it first; if that did not work I would try the Ctrl+K thing. The word "node" again.
> Supplier. Fine.
>
> Moderator note: the mock does not show typing into To; the instruction points to Ctrl+K for
> finding by name. The participant expected the To box itself to accept a typed name.

**Detour: Find (the search box), because that is what she would do first in real life.**

> Honestly, in the real tool my first move would have been the search box, not clicking the
> dot. Let me look at the search screen. Magnifier on the left top: "Name, id or value". Good,
> that is Excel-ish. Typed "thenard" and I get two results, with a line under each: "group 4 -
> degree 11". Degree, again. I don't know what degree 11 means for a supplier. Number of
> connections? Put "11 links" and I get it.
>
> Now it selected Thenardier and the right panel changed... and the buttons are gone. On the
> other screen I had "Neighbors" and "Path to..." with words. Here I have a little fork icon, a
> funnel, a pin and three dots. No words. Which one is "Path to"? The fork icon maybe? I would
> hover it. If the hover did not say "path" I would give up on this route and go back to
> clicking in the picture. That is exactly the kind of unlabelled icon I don't click.
>
> The other search screen: I typed an account number, ACC-705989, and it says 0 matches in this
> project and offers "Search recent projects". OK, that is fair, it tells me it is not here
> instead of just blank. Useful when the SAP number and the legacy ERP number don't match --
> though really I would want it to find "ACME GmbH" and "Acme Gmbh." as the same thing, and it
> won't.

**Screen 3: two selected, "Paths between" form.**

> Here two are picked, TP53 and SMAD3, and the button now says "Paths between...". A form: From,
> To, "Weight by: None: count hops", Run. Line on top: "On: full graph, 300 nodes. Undirected."
> I don't know what "undirected" means for me. My links have a direction: they ship to us, we
> buy from them. Does that matter here? It does not say.
>
> "Weight by" -- this I actually care about. If one route is through a supplier where we spend
> five million and another through one where we spend two thousand, those are not the same
> connection. So I would open that dropdown and look for spend. Count hops means every link is
> equal, which is how the Power BI visual did it too.
>
> How did two get selected? The text doesn't show me. Probably shift-click. I would not have
> found that on my own; I would have come here only through Path to...
>
> Clicks Run.

**Screen 4: the found path.**

> OK. Right panel: "Found path. 3 hops. 1 of 12." A list: TP53, MSH2, UBB, SMAD3, in order, with
> numbers. That list is the best thing I have seen so far -- it reads like a table, top to bottom:
> this one, through this one, through this one, to that one. That is the answer to the question.
> I could say that out loud in a meeting: "they are connected through MSH2 and UBB."
>
> But "1 of 12". Twelve routes of the same length? Which one is the real one? If I show the VP
> one of twelve he will ask about the other eleven. I would want all twelve as a list, and
> honestly the question I get asked is "how many ways are there and do they all go through the
> same place". If all twelve go through UBB, UBB is my chokepoint. It doesn't tell me that.
>
> In the picture the path is some thin black arrows on top of the ball. I can see them because I
> know where to look. On the laptop in a meeting, no.
>
> The small text says "The path counts hops; edge confidence is shown, not used." So the numbers
> on the links are ignored. Why show them then? And "log2FoldChange" -- no idea, that is the
> protein people.
>
> "Create path to style" -- I don't know what that does. The bookmark icon might keep it. Down
> at the bottom, Export, with a copy icon and a plus. Can I get this list out as a table? The
> icon hover says "Copy as PNG", so that is a picture. I want the four rows in Excel. Not
> obvious.

**Her Tier 2 question, unprompted.**

> And the real question: this only works if I have the links between the middle ones. TP53 to
> MSH2 to UBB -- in my data, the middle is Tier 2, and I have Tier 2 for maybe fifteen percent of
> spend. So for most pairs of my suppliers the tool will either say "not connected" or find a
> connection through the one sub-supplier someone happened to survey. Where do I get the Tier 2
> data from? If it says "not connected" I need it to say "not connected in the data you gave me",
> not "not connected", because those are very different things to a VP.

## Answers

**Did she complete the task?** Yes, through the inspector's Path to... and the Paths between
form, with guesses. Through Find she would have stalled at the unlabelled icons.

**Single Ease Question (1-7):** 4.

> Middle. The button saying "Path to" in words saved it. Everything after that was guessing:
> typing the other name, what undirected means, which of the twelve, how to get the list out.

**Would she use this instead of her current tool?**

> Instead of? No. Next to, maybe. Excel can't do "how are these two connected" at all past one
> step -- I would be doing VLOOKUPs across two sheets -- so this beats Excel on exactly this
> question, and the ordered list is the thing I would copy onto a slide. The risk platform shows
> me a sub-tier map but not "route from A to B", as far as I know. But: it is only as good as my
> Tier 2 data, which is thin; I need the list as a table, not a picture; it has to weigh by
> spend; and before any of that, IT has to approve it and I need to know where my supplier list
> goes when I load it. And if it is not in Power BI my VP will never see it.

## Problems observed

1. **Find loses the words.** After a Find hit, the inspector's action row is icons only (fork,
   funnel, pin, more); the one-node inspector reached by clicking shows "Neighbors" and
   "Path to..." as labeled buttons. The search route is the one she takes first, and on it she
   cannot tell which icon finds a path. Severity 3.
2. **The To box does not say it takes typing.** "Pick the end node" and "(Ctrl+K)" point to
   clicking or a keyboard shortcut; she expected to type the second supplier's name into the To
   box. Severity 2.
3. **One of twelve, no summary.** The found path says "1 of 12" equal routes and steps through
   them one at a time; nothing says what the twelve have in common (for example that every one
   passes through the same intermediary), which is the answer she would take to a meeting.
   Severity 3.
4. **"Not connected" vs "not connected in your data".** Paths through intermediaries need
   sub-tier links she mostly does not have; nothing on the screens says how complete the links
   are, so a missing path would read as a fact. Severity 3.
5. **Weighting defaults to hops.** "Weight by: None: count hops" treats a five-million link and
   a two-thousand link alike; she wants spend. The option exists but the default and the note
   ("edge confidence is shown, not used") read as the tool ignoring the numbers. Severity 2.
6. **Graph words without business meaning.** "degree", "node", "hop", "undirected", "pagerank"
   appear without a one-line plain meaning; "group 4 - degree 11" on a search result means nothing
   to her. Severity 2.
7. **The path is hard to see and hard to take away.** Thin arrows over the dense drawing; the
   Export row's icons offer "Copy as PNG", not the ordered list as a table. Severity 2.
8. **Small grey text.** Rank lines ("#2 of 300") and path sub-rows ("edge confidence") are small
   and low contrast for her. Severity 2.
9. **Sample data is from another field.** Proteins and a novel's characters; she had to translate
   every label to suppliers. Severity 1 (a prototype limit, but it cost her attention).

## What worked for her

- "Path to..." as a labeled button on the selected thing -- her question, in words, where she
  looked.
- The Neighbors tooltip stating the count before pressing and that Ctrl+Z undoes it.
- The found path as an ordered list, start to end, with each step on its own row.
- Find saying "0 matches in this project" and offering to search recent projects, instead of a
  blank.
