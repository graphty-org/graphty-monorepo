# Session: account alert, supply chain risk analyst

Participant: Dana Okafor, supply chain risk analyst (persona file study/personas/supply-chain-analyst.md).
Task as given: "An alert names account ACC-633005. Bring it up, see what is known about it, and pick out the accounts that sent money to it -- not the ones it paid. The data on screen is a sample: one month of card and bank transfers between accounts. If that is not your line of work, treat the accounts as your own things (suppliers, customers, hosts, genes) and the transfers as what passes between them."

Start screen: shots/tasks/t04-transactions/01.png. All commands were run from design/ui/prototype; renders are in tmp/round-7-sessions/t04-transactions--supply-chain-analyst/. Below, `TRY` stands for
`timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--supply-chain-analyst/NN.png task:t04-transactions`.

## Think-aloud

**01 (start).** "A gray blob of hexagons and a column of statistics: density, reciprocity, degree. None of that is my vocabulary. It's a list of transfers between accounts. To me that's suppliers and who pays whom. First thing I do is search for the name. There's a box that says 'Find rows and notes'."

**02** `TRY --click "Find rows and notes"` -- The box gets a blue outline. "OK, it's ready for me to type."

**03** `TRY --click "Find rows and notes" --type "ACC-633005"` -- The box is still empty and nothing changed. "I typed the account and nothing happened. No results, no 'not found'. Either search doesn't work or it's not searching what I think."

**04** `TRY --click "Table"` -- A table opens under the picture: id, Links in, Links out, Links total, kind, country. "Now this I can read. And there it is, first row, ACC-633005, business, GB. Pure luck. It's sorted by 'Links total' and the footer says rows 381 to 420, so I just happened to land on it. Links in: 0. Links out: 15. If 'in' means money coming in, nobody sent it anything, and my answer is 'no one'. That's too easy. I don't trust it yet. Also, 'Links'? Say 'transfers'."

**05** `TRY --click "Table" --click "ACC-633005"` -- The row turns blue and a dark bubble says "Selects ACC-633005". The right panel still describes the whole file (3,000 nodes). "It says it selects it, but the side panel doesn't show me the account and the picture didn't light anything up. Did it select it or not?"

**06** `TRY --click "Table" --click "ACC-633005" --click "Selection"` -- The right panel becomes "Selection, Built-in row, Paints 0 nodes", with color, size and opacity. "Zero. So either the click didn't take, or clicking 'Selection' threw it away. And this panel is about colors, not about the account. Not what I need."

**07** `TRY --click "Table" --click "Edges"` -- Columns: from_account, to_account, timestamp, amount; 9,113 rows; sum of amount 14,156,522. "This is the ledger. I understand this completely. I want to filter to_account down to 633005, like an Excel autofilter."

**08** `TRY --click "Table" --click "Edges" --click "to_account"` -- The column sorted A to Z. There's a little down arrow at the right of the header. "Sorted, fine. That arrow is probably the filter."

**09** `TRY ... --click "to_account" --click "Filter"` -- Tool said: nothing on screen is called "Filter". "Then I don't know what that little arrow is called, and I'm not guessing."

**10** `TRY --click "Full graph"` -- The top button changes to "812 of 3,000 nodes", the left side switches to Data with sources, a filter "amount is at least 1,000" (ticked), and an attribute list for accounts: alertRule, alertTime, country, flagged, riskScore. The picture did not change. "Whoa. I clicked a funnel and it turned on a filter I never set. Who decided 1,000? That's exactly the kind of thing that makes me stop trusting numbers. And it says 812 of 3,000 but the picture looks identical. On the plus side, the account file has alertRule, alertTime, flagged and riskScore. That's the 'what is known about it' part -- if I could ever see it for one account."

**11** `TRY --click "Table" --click "ACC-633005" --hover "Views"` -- Same as 05; the bubble "Selects ACC-633005" stays; the right panel still describes the whole file. "I moved the mouse away. Nothing caught up."

**12** `TRY --click "Table" --click "ACC-633005" --key Enter` -- The row gets an outline; nothing else. "Enter does nothing either."

**13** `TRY --click "Notes"` -- "No notes. Add note." "The task says 'an alert'. I thought alerts might live here. No."

**14** `TRY --click "Table" --click "ACC-633005" --click "Edges"` -- The transfer list is still all 9,113 rows. "Even with my account 'selected', the transfers aren't narrowed to it. In any tool I've used, picking a row filters the related table."

**15** `TRY --hover "Actions"` -- The bolt button's tooltip reads "Quick actions Ctrl+K". (My hover name was a guess; the tooltip showed anyway.)

**16** `TRY --click "Assistant"` -- "Off. Nothing is sent. Turn on in Settings." "That's actually good news for my IT review. Nothing leaves the laptop. I'd note that."

**17** `TRY --click "Quick actions"` -- A command box: "Type a command or a place", recent items (Re-run layout, PageRank), go-to items (Graph, Data, Attributes, Filters, Views, 'Go to view: Whole cast'). "Like the search in Office. Let me type the account."

**18** `TRY --click "Quick actions" --type "ACC-633005"` -- Box still empty, list unchanged. "Every box in this thing ignores what I type. At this point it's the tool, not me."

**19** `TRY --click "Views"` -- "No saved views." "Nobody saved an 'alert' view either."

**20** `TRY --click "Table" --click "ACC-633005" --click "Analyze"` -- An "Analyze" window: Louvain, PageRank, Shortest path, Links (count), Links in (count), Links out (count), Total amount, Total amount in. "Louvain, PageRank -- I don't know those words. Everything here ranks the whole file. 'Total amount in' is close to what I want, but for every account, not 'who paid this one'. Nothing says 'show me who sent money to this account'. I'm done."

## Outcome

- Did I succeed? **No.** I found the account in the table by luck (it happened to be the first row on the page I landed on), and I saw that its "Links in" is 0, which would mean nobody sent it money. But I could not open the account to see its alert details (alertRule, alertTime, flagged, riskScore exist as columns, but I never saw their values for this account), I could not narrow the transfer list to it, and I could not confirm whether "Links in 0" was real or the result of a filter I didn't set. If my boss asked, I'd say "the tool says nobody paid it, but I wouldn't sign my name to that."
- Single Ease Question (1 = very difficult, 7 = very easy): **2**.
- Would I use this instead of my current tool? **No.** For this job I would export the transfers to Excel and autofilter to_account = ACC-633005; that takes two minutes and I trust the answer. Searching for one named thing is the first thing I do in any tool, and here no search box took my typing, clicking the row said "Selects" but nothing showed the account, and a funnel button turned on a filter I never asked for. Two good things: the Edges table is a plain ledger I understand, and "Assistant off, nothing is sent" plus "Local only" is the answer my IT security review wants. But I'd still need it to export something Power BI can read before it's more than a side tool.

## What got in my way (in my words)

1. I could not type into any search box: "Find rows and notes", the Quick actions box, the Analyze box. No message either.
2. Clicking a row said "Selects ACC-633005" but nothing showed me that account: the side panel stayed on the whole file, the picture didn't highlight, the transfer table didn't narrow, and "Selection" said "Paints 0 nodes".
3. The funnel button "Full graph" switched on a filter ("amount is at least 1,000", 812 of 3,000) that I never set, and the picture looked the same before and after.
4. No column filter I could find on the table; the arrow in the header has no name I could guess.
5. Words: "Links in", "nodes", "edges", "degree", "Louvain", "PageRank". "Transfers in" and "accounts" would have told me what I was looking at.
6. Nothing anywhere offers "who sent money to this account" as a question.
