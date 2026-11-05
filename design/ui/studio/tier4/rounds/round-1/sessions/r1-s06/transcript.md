# Session r1-s06 -- Maren (returning user), task: make "installed" read as calendar days, find the newest gauge

## Start
Command: REAL_DIST=... REAL_TIER=4 node design/ui/studio/tool/real.mjs --start <r1-s06> setup:gauges.txt
Screenshot 01.png: gauges project open. Table at the bottom with id, lat, lon, depth_cm, station, code, installed. The "installed" header has the "Aa" mark, so it is read as text. Right panel says "Time: installed" with a "Set in Data" button -- interesting, but in Cytoscape I set column kinds in the import dialog, so I look for that first. Left panel has gauges.csv with Id / Latitude / Longitude mappings.

## Step 1
Command: --step <r1-s06> --click-at 1095,509 (the "installed" header)
02.png: it sorted the table by installed "A to Z" -- as text. Funny, the ISO dates sort fine as text anyway, but I don't trust that. A "..." menu appeared on that header. I'll open it to look for a column type.

## Step 2
Command: --step <r1-s06> --click-at 1161,509 ("Options for installed")
03.png: menu with Type >, Role >, Rename..., Hide, Details, Sort, Move. "Type" is exactly the word I want -- that's Cytoscape's column type. Opening it.

## Step 3
Command: --step <r1-s06> --click "Type"
04.png: submenu: text (checked), number "11 will not convert", yes/no "11 will not convert", date, category. Good -- it tells me how many won't convert, and date has no warning, so presumably all 11 convert. That's the count I always want. Picking date.

## Step 4
Command: --step <r1-s06> --click "date"
05.png: header icon changed to a calendar, values now read "Jun 30, 1995" etc., and the line above the table says "Sorted by installed, oldest first". So it is a real date now. No message about how many converted, but none show blank. I need the newest, so I'll sort descending from the same menu.

## Step 5
Command: --step <r1-s06> --click "Options for installed" --click "Sort descending"
06.png: "Sorted by installed, newest first". Top row: G10, Birch Hollow, installed Jun 27, 2018. Next is G08 Heron Marsh, May 5, 2015. All 11 rows show a date (G05 Jun 30, 1995 was the oldest in the previous view), nothing blanked. I'm done.

## End of session (in character)
- Finished: yes. "installed" is now a date column (calendar icon, dates shown as "Jun 27, 2018"), and the most recently installed gauge is G10, Birch Hollow, put in on June 27, 2018.
- Ease: 6 out of 7.
- What went well: the column's "..." menu had "Type", which is the word I use in Cytoscape's import dialog, and it told me up front that number and yes/no would leave "11 will not convert". That count is exactly what I want and never get in Cytoscape.
- What confused me / complaints: the menu only appears after clicking (or hovering) the header, and my first click on the header just sorted it as text, which I didn't ask for. After switching to date there was no explicit "11 of 11 converted" confirmation -- I had to infer it from date having no warning and from every row showing a date. The right panel's "Time: installed / Set in Data" line was there the whole time and I never knew what it meant; it did not help me. Also, the change happened in the table, not where the file was brought in -- I'd have expected it next to Id/Latitude/Longitude under gauges.csv on the left, like Cytoscape's import dialog.
