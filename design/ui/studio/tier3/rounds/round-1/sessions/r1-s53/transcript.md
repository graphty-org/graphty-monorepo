# Session r1-s53 -- Explorer Elena (first contact)

Task: bring volunteers.graphml in, color board / staff / volunteers differently, say which color is the board.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session> empty`
Screenshot 01.png. Notice: drawing still moving.
Elena: "Ooh, a spinning ball of dots. OK. There's a big green 'Open a file' button that says GraphML -- that's my file type. Clicking that."

## Step 2 -- open the file
Command: `--step <session> --click "Open a file" --upload volunteers.graphml`
Screenshot 02.png: a table preview, "24 nodes, 63 edges", columns id, name, role, hours, trained, phone. Role column has board / staff / volunteer.
Elena: "Oh nice, it's like a spreadsheet. There's my 'role' column -- board, staff, volunteer. Lots of grey words up top I'm skipping. Green 'Load' button bottom right. Clicking it."

## Step 3 -- load
Command: `--step <session> --click "Load"`
Screenshot 03.png: 24 blue dots in three bunches. Left panel "Style layers" (Hovered, Selected, Everything). Right panel Graph with Style / Values tabs; numbers. Banner about browser clearing storage.
Elena: "OK, all blue. Three bunches -- I bet those three bunches are board, staff and volunteers! Let me click a dot in the top-left bunch and see who it is."

## Step 4 -- click a dot
Command: `--step <session> --click-at 506,160`
Screenshot 04.png: picked v22, Mei Tanaka, volunteer. The whole picture slid over to the right when I clicked. Right panel now shows her row.
Elena: "Whoa, why did everything move? ... OK, Mei Tanaka, volunteer. So that bunch is volunteers, maybe. Anyway I want colors. There's a 'Style' tab on the right. Trying that."

## Step 5 -- Style tab
Command: `--step <session> --click "role=tab:Style"`
Screenshot 05.png: list Shape, Visibility, Text, Fill, Effects, Rendering, each with a plus. Small grey text at top I skimmed. "Why this look" says Everything: Color.
Elena: "Fill -- that's color, like in Slides. Plus button next to Fill."

## Step 6 -- plus next to Fill
Command: `--step <session> --click-at 1404,301`
Screenshot 06.png: a Color box with "6366F1" and a little chain-link icon next to it.
Elena: "A color code. But that's just going to paint Mei, right? I want all the board people. What's this little chain thing? Hovering it."

## Step 7 -- hover chain icon
Command: `--step <session> --hover-at 1381,335`
Tooltip: "Node color by attribute". (07.png)
Elena: "'Color by' -- yes, that sounds like color by a column. 'Attribute' I guess means column. Clicking it."

## Step 8 -- click chain icon
Command: `--step <session> --click-at 1381,335`
Screenshot 08.png: a list "Node color by attribute": name, role (3 values), hours, trained, phone, Node id.
Elena: "There it is -- role, 3 values. Board, staff, volunteer. Picking role."

## Step 9 -- pick role
Command: `--step <session> --click-at 1016,475`
Screenshot 09.png: only Mei turned orange. Message "Made layer v22 for 1 node". A little key top-left: "Color: role -- volunteer, v22: 1 of 24 nodes". Picture shifted right again.
Elena: "Hmm. Only her went orange. I probably did it wrong because I had her clicked first. On the left there's 'Everything 24' -- 24 is all my people. Let me click that one and try again."

## Step 10 -- click Everything
Command: `--step <session> --click-at 120,248`
Screenshot 10.png: right side now says "Everything styles all 24 nodes". Fill Color 6366F1 with the chain icon again.
Elena: "OK, 'all 24 nodes' -- that's what I want. Same chain button next to Color. Click it, pick role."

## Step 11 -- chain button on Everything
Command: `--step <session> --click-at 1381,483`
Screenshot 11.png: same list, role now at the top under "Used elsewhere".
Elena: "role again. Click."

## Step 12 -- pick role on Everything
Command: `--step <session> --click-at 1016,591`
Screenshot 12.png: all the dots now orange, light blue and green. Key top-left: volunteer = orange, staff = light blue, board = green.
Elena: "There we go! Orange volunteers, blue staff, green board. Huh -- the colors are mixed in every bunch, so the bunches weren't board/staff/volunteers like I thought. Whatever. The board is green. Done."

(Picture is still half off to the right of the window since my first click; I did not bother to fix it.)

## End (in character)
- Finished? Yes. Board members are GREEN (dark teal-green); staff light blue; volunteers orange.
- Ease: 5 of 7.
- What confused me:
  - My first try colored only Mei Tanaka, because I had clicked her dot before going to Style. Nothing told me up front that the color would only go on the one I had clicked (there was small grey text, I did not read it). The "Made layer v22 for 1 node" message only told me after. I thought I had done it wrong. Now there is an extra "v22" thing in the left list I don't know what to do with, so I left it.
  - The "color by" button is a tiny chain icon with no word on it; I only found it by hovering.
  - The whole picture jumped sideways when I clicked a dot and stayed half off the screen.
  - I guessed the three bunches were the three roles. They are not.
