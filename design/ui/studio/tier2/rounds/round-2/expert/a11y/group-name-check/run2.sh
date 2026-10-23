node tool/real.mjs --start <folder>/h setup:two-tables.txt
node tool/real.mjs --step <folder>/h --click-at 728,211
node tool/real.mjs --step <folder>/h --click "Weight"
node tool/real.mjs --step <folder>/h --expect "Higher means"
node tool/real.mjs --step <folder>/h --expect "role=radiogroup:Higher means"
node tool/real.mjs --step <folder>/h --expect "role=radiogroup:Each row is"
node tool/real.mjs --end <folder>/h
