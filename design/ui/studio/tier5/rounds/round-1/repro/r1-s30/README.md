# Keyboard repro: the filter workspace's Done bar is not an F6 stop

Build 1e123d7d33 (frozen tier 5 build), keyboard-only session, setup volunteers.txt.

1. `--start <folder> setup:volunteers.txt --keys` (01.png).
2. F6 x5, Tab, ArrowRight x5, Enter: the Filters button opens a new filter workspace (02.png).
3. type `role`, Enter, Tab, Tab, Space: role board ticked (03.png).
4. Shift+Tab x6, Enter (Or...), type `hours`, Enter, Control+a, type `30`, Enter: "10 of 24", focus in the hours Min box (04.png).
5. F6 six times, one screenshot each (05.png to 10.png). Focus goes: the drawing (05), "Local only" in the status bar (06), Main menu (07), the Graph rail button (08), the left panel's Data sources (09), and back to the hours Min box (10).

The bar holding Group colors, Styled, Table, Clear, Cancel and Done is never an F6 stop, and Shift+Tab from the right panel walks into the matches table, not up to Done. The only way to Done is Tab from the header through the whole left panel (about 22 Tabs in session r1-s30, screenshots 25 to 29).
