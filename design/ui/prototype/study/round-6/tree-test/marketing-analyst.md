# Tree test, round 6: Jordan, marketing network analyst

Tree shown: the outline exactly as given in `../tree-test.md`, with the rail place named
"Results". Simulated participant; one session, 16 tasks. Confidence is 1 (a guess) to 7 (sure).
"Back" means she went back up the tree before her final pick.

Opening remark: "Okay, no pictures, just a menu list. Fine. I read labels, I don't read help text.
And I'm looking for anything that says table, because that's where my work actually happens."

| Task | Places opened, in order | Final pick | Back? | Conf. | In her words | Correct | Direct |
|---|---|---|---|---:|---|---|---|
| tt-1 | Results (rail) > Run a measure... | Results (rail) > Run a measure... | No | 5 | "The first ranking is sitting in Results, so the second one goes next to it. I'd have liked a button that says 'rank another way', but 'Run a measure' is close enough." | Yes | Yes |
| tt-2 | Bottom table > Search | Bottom table > Search | No | 6 | "Same as looking for our brand handle: type the name, get his row with every score on it. I trust the row more than a card." | Yes | Yes |
| tt-3 | Results (rail) > An opened run > Settings | Results (rail) > An opened run > Settings | No | 6 | "Settings, with the seed and when it ran. That's the thing my data-science colleague always asks me for and I never have." | Yes | Yes |
| tt-4 | Bottom table > Column header menu (sort) | Bottom table > Column header menu (sort) | No | 6 | "Table, click the column, sort descending. This is the one thing I'd check in the first two minutes." | Yes | Yes |
| tt-5 | Main menu > Algorithms > Path (Shortest path listed, nothing about what bigger means); back; Data > Sources > Its columns ("amount, dollars, 0.5 to 9,800" -- says what it holds, not what bigger means); back; Canvas > Floating toolbar > Path (options: weight by, and what a bigger value means) | Canvas > Floating toolbar > Path (options) | Yes | 4 | "I figured the money column was where you'd say 'bigger is worse', like weighting in Gephi. It just describes the column. The route tool's own options say it, so fine, there -- but I went round the houses." | Yes | No |
| tt-6 | Main menu > File > Export... | Main menu > File > Export... | No | 5 | "Export. Although every time I hit export I get the table when I wanted the picture, or the other way round, so I'll believe it when I see the dialog." | Yes | Yes |
| tt-7 | Main menu > File (Open... "opens a file as a new project" -- no, I don't want a new project); back; Main menu > Recipes (skipped it -- "recipes" sounds like a template gallery, not our colors); back; Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe or file... ("Only a recipe's styles; your data stays here") | Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe or file... | Yes | 4 | "I was looking for 'import'. Nothing says import. 'Recipe' is not a word I'd ever use for a brand palette file. The note that my data stays here is what made me pick it." | Yes | No |
| tt-8 | Main menu > File > Update with new data... | Main menu > File > Update with new data... | No | 6 | "Update, not Open. Open would make me redo everything, and I've been burned by that." | Yes | Yes |
| tt-9 | Canvas > Legend > Each entry's swatch | Canvas > Legend > Each entry's swatch | No | 6 | "The legend's the first thing I read anyway. Click the color, pick another. If this survives the projector I'm happy." | Yes | Yes |
| tt-10 | Bottom table > Nodes tab; Bottom table > Column header menu (new column: Money in minus out) | Bottom table > Column header menu (new column: Money in minus out) | No | 5 | "Money in minus money out, sort it, top of the list. That's a spreadsheet question, so it goes in the table, not in an algorithm." | Yes | Yes |
| tt-11 | Right panel, with a set, a group or a path selected > Members (a count, not a sum); back; Bottom table > Footer (sum over the selected rows) | Bottom table > Footer | Yes | 5 | "Members just counts them. I wanted the total like the bottom of an Excel column -- and there it is, in the footer. Should've gone there first." | Yes | No |
| tt-12 | Right panel, with a set, a group or a path selected > Compare with the rest | Right panel, with a set, a group or a path selected > Compare with the rest | No | 5 | "Select the big cluster, compare with the rest. That's the segment slide. I'd want to see what it actually compares before I believe it." | Yes | Yes |
| tt-13 | Main menu > Edit > Undo (Ctrl+Z) | Main menu > Edit > Undo | No | 5 | "Ctrl+Z. If that doesn't bring my 18 back I'm closing the tab." | Yes | Yes |
| tt-14 | Filter chip > Filter steps (each step: turn off, edit, move, delete) | Filter chip > Filter steps | No | 5 | "Narrowed means filtered. Each step has its own delete, so I don't lose step three. Good." | Yes | Yes |
| tt-15 | Right panel, with nothing selected > Style stack > Look (Screen, Print, High contrast -- not about names); back; Right panel, with a node selected > Show label anyway | Right panel, with a node selected > Show label anyway | Yes | 4 | "I thought labels were a styling thing, so I went to the style bit. Then: select the character, 'show label anyway'. Obvious once you've clicked the node." | Yes | No |
| tt-16 | Bottom table > Edges tab (sort transfers by date -- gives me one hop, not where it went next); back; Main menu > Selection > Neighbors... (hops, direction, from a date) | Main menu > Selection > Neighbors... | Yes | 4 | "My instinct is filter the transfers by date in the table. But 'where it went next' is a chain, and 'from a date' plus direction on Neighbors is the only thing that says that. Not a word I'd use -- neighbours of an account?" | Yes | No |

## Tally

16 of 16 correct; 11 of 16 direct. The five indirect tasks are 5, 7, 11, 15 and 16.

- Task 5: she checked the data column first (counted separately; now wrong), and the route
  algorithm in the main menu before it, then found the choice on the route tool's options.
- Task 7: "Recipes" did not read as "our team's colors file"; she looked for "import" and found
  none. The Style stack's "From a recipe or file..." won on its "your data stays here" note.
- Task 11: she opened the path's Members first (counted separately), expecting a total.
- Task 15: she tried the Look first, reading labels as a style.
- Task 16: she started in the Edges tab, the spreadsheet route, before the date-aware Neighbors.

Task 13 under both keys: correct with Edit > Undo counted right; wrong under the notice-only key.

First top-level place opened, per task: 1 Results; 2 Bottom table; 3 Results; 4 Bottom table;
5 Main menu; 6 Main menu; 7 Main menu; 8 Main menu; 9 Canvas; 10 Bottom table; 11 Right panel
(path); 12 Right panel (group); 13 Main menu; 14 Filter chip; 15 Right panel (nothing selected);
16 Bottom table.

Closing remark, off topic: "Honestly the money-transfer tasks aren't my world. Give me a mention
export. Which I can't get anymore since the API went paid, so -- whatever Brandwatch feels like
giving me this week."
