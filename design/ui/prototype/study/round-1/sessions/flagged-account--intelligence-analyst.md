# Session: a flagged account, with the criminal intelligence analyst

Participant: Marcus, a criminal intelligence analyst at a state fusion center (persona:
study/personas/intelligence-analyst.md). Ten years Army all-source, then i2 Analyst's Notebook
and Excel on phone and bank returns.

Task as read by the moderator: "An alert flagged account ACC-365386. Decide whether to clear it
or refer it, and keep what you would need to justify that."

Screens, in the order he met them: Find, the inspector, the filter chip, the notes panel, the
export dialog. He saw the rendered screenshots and was told what a control would do when he
asked to click it.

Outcome: gave up. He found the account number exactly once, as a row in a preview inside the
export dialog, and could not see anything about it that would let him clear or refer it.

## Transcript

### Find

> Okay. Alert on an account. First thing I do is punch the number in. There's a search box top
> left, "Name, id or value". Good, that's what I want.
>
> Hang on. The title says "Les Miserables". Is that the case? That's the book. Nodes called
> Valjean, Javert, Thenardier. I was told this is an alert on an account. Where's the account
> data?

Moderator: "Work with what's on the screen."

> Fine. I type ACC-365386.

He was shown the no-match state: "0 results in all 77 nodes", "0 matches; Closest: Thenardier".

> Zero matches, closest is Thenardier. No. Closest to an account number is not a French
> innkeeper. And it says "all 77 nodes" -- so that's the whole thing, right, not just what's
> filtered? At least it tells me it looked at everything. I'll give it that. That filtered thing
> at the top, "Filtered: 28 of 77 nodes, 3 steps" -- I didn't filter anything. Somebody else did,
> or it came that way. I'd want to know who.
>
> Is there a way to just open a different case? There's a little arrow next to "Les
> Miserables". I'd click that.

Moderator: that opens the project menu; no other case is loaded in this prototype.

> Then I'm stuck at step one. In i2 I'd do a List Items search, or in Excel I'd Ctrl+F the bank
> return. Either way I'd have the row in ten seconds.

He also noticed the lightning-bolt search ("Quick actions") shown with "marius" typed in.

> Two search boxes. One for the graph, one for... commands? It hands the name off to the other
> one anyway. Pick one.

### The inspector

He was moved to the inspector screen: a protein network, one node (TP53) selected, and a second
state showing a found path between two proteins.

> Now it's proteins. Okay, pretend TP53 is my account. What do I get on the right: module,
> degree 32, "#2 of 300", betweenness 0.1139, pagerank 0.01137. Neighbors 32, edges 32.
>
> Betweenness I know, that's the middleman. Point one one three nine of what? If I tell a
> sergeant "he's number two of three hundred on betweenness", fine, that's a sentence. The
> number by itself I'm not repeating to anybody.
>
> What I don't see: where this came from. Which record, which date. If this were an account I'd
> want the transactions -- who sent money in, who took it out, when, how much. "Edges 32" with a
> little arrow. I'd click that and hope it's a list of the actual transfers with dates. If it is,
> that's the most useful thing on the page. If it's just 32 dots lighting up, it's useless.
>
> The path one is interesting. "Found path, 3 hops, 1 of 12". From TP53 to SMAD3. That's the
> question the case agent always asks -- how's A connected to B. Twelve equal paths, and it
> shows me one. I'd want to know which one it picked and why. But I'd use that.
>
> Nothing here says "alert". Why was it flagged? What rule, what score, when? The alert is the
> reason I'm in here and the screen doesn't know about it.

### The filter chip

> Les Miserables again. Filter steps: largest component, degree at least 5, filter out group 8.
> Twenty-eight left. Okay, I can read that, and I like that it tells me how many each step leaves.
> That's honest -- I can say "I cut it to people with five or more contacts" in a report.
>
> But this is for shrinking a hairball. My job is the opposite. I start from one account and
> grow out. Thirty people around this guy, not seventy-seven minus fifty. And the degree filter
> worries me: if my flagged account is a quiet one with three transfers, this rule just threw
> him out and nobody would notice. Does it tell me my guy got filtered out?

Moderator pointed to the Find state where filtered-out results say "Filtered out by 'Filter to
degree >= 5'".

> Okay, that's good. That's actually good. If it tells me that when I search my guy, I won't
> tell a DA he's not in the network when he's just hidden. Keep that.

### The notes panel

> Notes on the left. "About TP53 neighborhood, 33 proteins", "About Betweenness", "About CDK1".
> Each note is about a thing. When I open one it says "Cites Betweenness, full graph" and
> "Quotes TP53 betweenness 0.114". So the note remembers the number it was written against.
> That's the right idea -- that's how I'd justify the call later.
>
> But for my job the note needs three things: what I decided (clear or refer), why, and the
> source -- which statement, which transaction, the date I pulled it. And a grade on how
> reliable. There's no field for any of that; it's a free text box with a date. I'd end up
> typing "Refer. See Wells Fargo return 2026-09-12 rows 40-58" by hand, which is what I do in a
> Word doc today.
>
> And "2 hours ago" -- by who? If I hand this to a colleague it needs my name on it.

### The export dialog

> Export. Three examples. A figure, a recipe, and "The evidence file". That last one is my
> thing. Scope "Filtered: 14 nodes", one step, "Mule ring suspects". There's a table.
>
> Wait -- there it is. ACC-365386. Personal, GB, riskScore 92, degree 8, PageRank 0.000427.
> That's the first time I've seen my account anywhere, and it's in a print preview inside an
> export dialog. I couldn't search for it, I couldn't click it, and now I find it in the
> paperwork.
>
> So what does the page tell me? Somebody put him in a list called "mule ring suspects". Risk
> score 92 -- of 100? Whose score? The bank's model? Ours? That's exactly the "key player
> detected" thing. I'm not referring a man on a 92 I can't explain. Degree 8 -- eight
> counterparties. GB, and the others are BR, NG, US, PH. That's worth a look, cross-border
> mule stuff usually is. But I have no amounts, no dates, no transfers. I can't clear it and I
> can't refer it.
>
> The report itself -- Boundary, overview, cash-out route, notes, methods, "frozen at export,
> re-running later never changes this file". That I like a lot. That's discovery. If the
> sergeant asks in six months why we referred, I hand him this and it says what I saw on the
> day. And "Methods" with the file name and date it was loaded. Good.
>
> Two things I'd ask before I touched it with real case data. Where does "Export 1 file" put
> the file -- my machine, or somebody's server? And the greyed-out "Use in a script -- Not yet
> available" -- I'm not a programmer, I'd ignore that, but don't show me buttons that don't work.

### Decision

> I can't make the call. If you made me, I'd refer it -- risk 92, in a list someone already
> called a mule ring, eight counterparties across countries -- and I'd write in the note "referred
> on the alert, not independently verified", which is a referral I'd be embarrassed to send.
> What I'd keep to justify it is that evidence file. That part's right. Everything before it
> never showed me the account.

## After the task

Single Ease Question (1 very hard -- 7 very easy): **2**.

> Two. Not a one because the evidence file at the end is the best thing I've seen from one of
> these tools -- frozen, with the filter and the methods written out. But I couldn't find the
> account, and nothing told me why it was flagged or what the money did.

Would he use it instead of his current tools?

> Not for this. For an alert I'd open the bank return in Excel, filter to the account, sort by
> date, and pivot on counterparty. Fifteen minutes and I've got a yes or no. This would have to
> let me type the account number, show me the alert reason and the transfers behind every line,
> and let me grow out one hop at a time. If it did that and then gave me that evidence file at
> the end, I'd use it -- the evidence file is the thing i2 never gave me. And I'd still need to
> know the data stays in the building.

## Problems, by screen

1. Find -- the account the task names is not in the loaded graph; search returns "0 matches;
   Closest: Thenardier". A fuzzy "closest" suggestion for an identifier is wrong: an account
   number either matches or it does not. Severity 4 (blocked the task).
2. All screens -- no alert context anywhere: no reason for the flag, no rule, no score source,
   no alert date. The task starts from an alert and the product has no place for one. Severity 4.
3. Inspector -- no source records behind a node or a link: no transactions, amounts or dates;
   "Edges 32" is a count, not the records. He cannot justify a decision without them. Severity 3.
4. Export dialog, evidence file -- "riskScore 92" appears with no definition or origin; he
   refuses to act on an unexplained score. Severity 3.
5. Notes panel -- a note has no author, no decision field (clear / refer) and no source
   reference or reliability grade; he would retype his case notes as free text. Severity 3.
6. Filter chip -- the tool is built to prune a whole graph down; his task grows outward from one
   account, and nothing on these screens starts from a seed. Severity 2. (He liked that Find
   says when a hit was filtered out and by which step.)
7. Find and Quick actions -- two search boxes with overlapping jobs; one hands off to the other.
   Severity 1.
8. Export dialog -- no statement of where the exported file goes; "Use in a script -- Not yet
   available" is a dead button in view. Severity 2.
