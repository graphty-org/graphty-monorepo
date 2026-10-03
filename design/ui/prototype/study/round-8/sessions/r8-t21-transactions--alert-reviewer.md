# Session: transfers path task -- Nadia, level-1 alert reviewer

Task as given by the moderator: "A month of card transfers between accounts is open, and the
program has already sorted the accounts into groups. If you do not work in banking, this is example
data, not your own. Work out how money could have gone from account ACC-271813 to account
ACC-233575 through the smallest number of other accounts: say which accounts are in between,
whether there is more than one such way, and whether the dates allow it."

Start screen: shots/tasks/r8-t21-transactions/01.png. Renders are in
tmp/round-8-sessions/r8-t21-transactions--alert-reviewer/. All commands were run from
design/ui/prototype/, and every --try call was wrapped in `timeout 120 node app-b/study.mjs`.

## Think-aloud

**01 (start).** "A big hairball, colored by group, with a lot of 'Community' numbers on the right.
I don't care about the groups. I've got two account numbers, so I'll paste the first one into the
search box like I always do."

**02** `--try .../02.png task:r8-t21-transactions --click "Find rows and notes" --type "ACC-271813"`
"'No match for ACC-271813.' What? It's in the file, the task says so. So the search box doesn't
search accounts? That's the first thing I'd try in any system. Already lost a minute."

**03** `--hover "flask"` -- the tool said nothing on screen is called "flask". "Fine, I don't know
what the little bottle icon is."

**04** `--click "Table"` -- "OK, a table: 3,000 accounts with links in and out and amounts.
Sorted by amount in, so my account isn't on the first page. I'm not scrolling 3,000 rows."

(Hovered a few guesses at the bottom icons: "Analyze" gave the tooltip "Analyze Shift+A". "Run"
gave no tooltip, "Tools" showed "View", and "Algorithms", "Path" and "Find path" matched nothing.)

**05** `--click "Analyze"` -- "A menu. 'Recent: Louvain, PageRank, Shortest path -- the fewest
steps, or the lightest route, between two nodes.' That's literally my question. I wouldn't have
looked under 'Analyze' for 'find a route between two accounts', but fine."

**06** `--click "Analyze" --click "Shortest path"` -- "'Path between', with From and To. There's
Direction, 'Follow time order', Weight 'amount (set at load)', 'Stronger / Farther / Capacity',
'Shortest path reads a weight as distance: it uses 1/amount.' I have no idea what 1/amount means.
I'll leave it alone."

**07** `... --click "Type a name" --type "ACC-271813"` -- "It took the text, but no dropdown
popped up saying 'yes, found that account'. Find path is still gray. Did it find it?"

**08** `... --key Enter --click "Click to pick" --type "ACC-233575" --key Enter` -- the click on
"Click to pick" matched nothing (the field had changed once focus moved), but Enter had already
moved me into To, so the typing landed there. "Both filled in and Find path is blue. Good."

**09** `... --click "Find path"` (defaults, weight = amount) -- "Result. 4 accounts, 3 transfers:
271813 to 946224 on 4 Mar (3,530.28), to 242954 on 7 Mar (9,782.05), to 233575 on 8 Mar
(9,616.72). 'Dates in order: Yes' on every step. And the To account is flagged, riskScore 98.
Interesting. But the amounts don't line up: 3.5k in and 9.7k out of 946224 means money came in
from somewhere else too. QA will ask about that. Also, I left Weight on 'amount'. Is this the
fewest accounts, or something about amounts? It doesn't say whether there's another way either."

**10** `... --click "amount (set at load)"` -- "Two options: 'amount (set at load)' and
'None (fewest steps)'. The second one is my question word for word. Why isn't it the default
when the menu said 'the fewest steps'?"

**11** `... --click "None (fewest steps)" --click "Follow time order" --click "Find path"` --
the click on the "Follow time order" checkbox failed (it timed out), but the run still went
through. "Now it says '3 steps. 2 routes tie. Dates in order. Route 1 of 2'. Route 1 is
271813, then 946224 (4 Mar), then 670564 (7 Mar), then 233575 (9 Mar). So the first answer I got
was only one of two. If I'd stopped at 09 I would have written down an incomplete answer, and QA
would have caught it."

**12** `... --click "Find path" --click "Next route"` -- "Route 2 of 2 is 946224 then 242954, the
same as my first run. Both have the dates in order. That answers everything."

"The graph didn't change that I can see. The route is supposed to be orange, but at this size
it's a hairball with orange dots everywhere because the groups use orange too. If I screenshot
this for the alert file, it shows nothing. The side panel is the useful part, and I'd copy that
as text."

## Answer given

- Fewest accounts in between: two. Three transfers, 4 to 9 March 2026.
- There are two such ways, and they tie:
  - ACC-271813 -> ACC-946224 (4 Mar, 3,530.28) -> ACC-670564 (7 Mar, 9,468.23) -> ACC-233575
    (9 Mar, 9,399.31)
  - ACC-271813 -> ACC-946224 (4 Mar, 3,530.28) -> ACC-242954 (7 Mar, 9,782.05) -> ACC-233575
    (8 Mar, 9,616.72)
- ACC-946224 is on both, so it is the account to look at.
- Dates: yes, each transfer comes after the one before it, on both routes. Caveat: the first hop
  is much smaller than the later ones, so not all of the money that reaches ACC-233575 can have
  come from ACC-271813.

## Debrief

- **Succeeded?** Yes, I think so. I'm sure about the two routes and the dates. I'm less sure that
  "Dates in order: Yes" means the app actually checked time order, because I never got the
  "Follow time order" box ticked.
- **Single Ease Question:** 4 of 7. The path tool itself is good once you find it. Getting there
  was not easy: the search box didn't find my account, the path tool is hidden under "Analyze",
  and the default weight gave me one route out of two without saying a second one existed.
- **Would I use this instead of my current tool?** Not for my normal queue. Most of my alerts are
  one transfer and one profile, and the case system is faster for those. For the odd alert where
  "how is this account connected to that flagged one" matters, the route list with dates is
  better than anything I have, which is nothing: I'd escalate it to level 2. But I'd only trust it
  if (1) the search box finds account numbers, (2) the default is fewest steps, or at least it
  tells me other routes exist, and (3) I can export the route as one picture plus a few lines of
  text for the alert file. Right now the picture is useless.

## Problems seen

1. The search box under "Graph Transfers" returns "No match" for an account id that exists.
   This is the first thing I try, every time. (02)
2. Finding a route between two accounts lives only under the unlabeled "Analyze" icon. Nothing
   near the account or in the search does it. (03 to 05)
3. After typing an id in From, nothing confirms the account was found. (07)
4. The path dialog defaults to weighting by amount, even though the menu entry promised "the
   fewest steps". The weighted run shows one route and does not say that another route with the
   same number of steps exists. (09 compared with 11)
5. "1/amount", "Stronger / Farther / Capacity" and "set at load" are jargon to me.
6. The "Follow time order" checkbox couldn't be clicked (its click timed out). (11)
7. The route isn't visible on the canvas: its orange is the same as the community orange, and
   the view doesn't zoom to it. So the screenshot export test fails. (09, 11, 12)
8. Good: the side panel lists every hop with its amount, its date and whether the dates are in
   order. The bar at the bottom also says "2 routes tie" and has arrows to switch between them.
