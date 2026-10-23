#!/usr/bin/env python3
"""gen_pajek.py <out dir>: the two synthetic Pajek coverage files, written to the Pajek 6.02 manual
(http://mrvar.fdv.uni-lj.si/pajek/pajekman.pdf, section "Definition of Network (and its picture) on
Input ASCII File", pages 89-93, and the color forms on page 85), seeded.

A: synth-pajek-vertices.net -- 81 vertices on a 9x9 grid (y grows down), every shape keyword, s_size,
   x_fact / y_fact, phi, r, q, every color form (dvips names, GrayNN, RGBrrggbb, RGB(r,g,b),
   CMYKccmmyykk, CMYK(c,m,y,k)) for ic / bc / lc, bw, la, lr, lphi, fos, font, labels with spaces and
   no label, joined by plain edges.
B: synth-pajek-lines.net -- 40 vertices on a circle, *Arcs and *Edges with w, c, p Solid / Dots, s, a A / B,
   ap, l, lp, lr, lphi, lc, la, fos, font, h1 / h2, a1 / k1 / a2 / k2 (Bezier, oval, circular arc,
   double edge), negative values (drawn dotted), loops, bidirected arcs (drawn curved), a second relation
   (*Arcs :2 "name"), and *Arcslist / *Edgeslist sections.
"""
import math
import os
import random
import sys

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
rnd = random.Random(20261016)
SHAPES = ["ellipse", "box", "diamond", "triangle", "cross", "empty", "house", "man", "woman"]
COLORS = ["Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Cyan", "Magenta", "Brown",
          "Gray25", "Gray70", "RGBFF8800", "RGB0088FF", "RGB(1,0,0.5)", "RGB(0.2,0.6,0.2)",
          "CMYK00FF0000", "CMYK(0,0,1,0)", "CMYK(0.5,0,0,0.2)", "LightYellow", "OliveGreen", "SkyBlue",
          "Maroon", "Turquoise", "Lavender"]

# ---------------------------------------------------------------- A
L = ["% synthetic Pajek coverage: every vertex drawing parameter (Pajek 6.02 manual, pages 89-90)",
     "*Vertices 81"]
for i in range(81):
    r, c = divmod(i, 9)
    x, y = 0.06 + 0.11 * c, 0.06 + 0.11 * r
    shape = SHAPES[(i + r) % 9]
    label = "\"\"" if i % 13 == 6 else (f'"{shape} {i + 1}"' if i % 2 else f"v{i + 1}")
    p = [shape]
    if i % 5 == 0:
        p += ["s_size", str(1 + i % 3)]
    if i % 3 != 2:
        p += ["x_fact", f"{1 + (i % 4) * 0.5:g}", "y_fact", f"{1 + ((i // 4) % 3) * 0.5:g}"]
    if i % 9 == 4:
        p += ["phi", str(15 * (i % 6))]
    if shape == "box" and i % 2:
        p += ["r", "0.3"]
    if shape == "diamond":
        p += ["q", ["0.5", "2", "0.01"][i % 3]]
    if i % 11 != 3:
        p += ["ic", COLORS[i % len(COLORS)]]
    if i % 4 == 1:
        p += ["bc", COLORS[(i * 5) % len(COLORS)]]
    if i % 4 in (1, 2):
        p += ["bw", ["0", "2", "4", "0.5"][i % 4]]
    if i % 3 == 0:
        p += ["lc", COLORS[(i * 7) % len(COLORS)]]
    if i % 6 == 2:
        p += ["la", str(30 * (i % 4))]
    if i % 5 == 3:
        p += ["lr", "12", "lphi", str(45 * (i % 8))]
    if i % 2 == 0:
        p += ["fos", str(8 + i % 12)]
    if i % 7 == 0:
        p += ["font", ["Helvetica", "Courier", "Times-Roman"][i % 3]]
    L.append(f"{i + 1} {label} {x:.4f} {y:.4f} 0.5000 {' '.join(p)}".replace("  ", " "))
L.append("*Edges")
for i in range(81):
    r, c = divmod(i, 9)
    if c < 8:
        L.append(f"{i + 1} {i + 2} 1")
    if r < 8 and c % 2 == 0:
        L.append(f"{i + 1} {i + 10} 1")
open(os.path.join(out, "synth-pajek-vertices.net"), "w").write("\r\n".join(L) + "\r\n")

# ---------------------------------------------------------------- B
N = 40
L = ["% synthetic Pajek coverage: every line drawing parameter (Pajek 6.02 manual, pages 90-92)",
     "*Network synthetic lines", f"*Vertices {N}"]
for i in range(N):
    a = 2 * math.pi * i / N
    L.append(f'{i + 1} "v{i + 1}" {0.5 + 0.42 * math.cos(a):.4f} {0.5 + 0.42 * math.sin(a):.4f} 0.5000 ellipse ic White bc Black fos 9')
L.append("*Arcs")
for i in range(N):
    j = (i + 1) % N
    p = []
    if i % 2 == 0:
        p += ["w", str(1 + i % 6)]
    if i % 3 != 2:
        p += ["c", COLORS[i % len(COLORS)]]
    if i % 5 == 1:
        p += ["p", "Dots"]
    elif i % 5 == 2:
        p += ["p", "Solid"]
    if i % 4 == 0:
        p += ["s", str(1 + i % 5)]
    if i % 6 == 3:
        p += ["a", ["A", "B"][i % 2]]
    if i % 7 == 2:
        p += ["ap", ["0.5", "0.25", "20"][i % 3]]
    if i % 3 == 0:
        p += ["l", f'"arc {i + 1}"', "lp", "0.5", "lc", COLORS[(i + 3) % len(COLORS)], "fos", "10"]
        if i % 2:
            p += ["lr", "8", "lphi", "90", "la", "360", "font", "Courier"]
    if i % 8 == 5:
        p += ["h1", "-1", "h2", "-1"]
    value = "-1" if i % 9 == 4 else str(1 + i % 4)
    L.append(f"{i + 1} {j + 1} {value} {' '.join(p)}".rstrip())
# Bezier, oval, circular arc, double edge
L.append('1 11 1 a1 40 k1 1.5 a2 -40 k2 1.5 c Blue l "bezier opposite"')
L.append('2 12 1 a1 30 k1 1 a2 30 k2 1 c Red l "bezier same side"')
L.append('3 13 1 a1 0 k1 -1 a2 0 k2 30 c Green l "oval"')
L.append('4 14 1 a1 0 k1 -2 a2 0 k2 200 c Purple l "circular arc"')
L.append('5 15 1 a1 0 k1 -4 a2 0 k2 1 c Brown l "double"')
# loops and bidirected arcs
L.append('6 6 1 c Red w 2 l "loop"')
L.append('7 7 2 a1 -130 k1 0.6 a2 -130 k2 0.6 c Blue l "bezier loop"')
for i in (20, 22, 24):
    L.append(f"{i} {i + 10} 1 c Orange")
    L.append(f"{i + 10} {i} 1 c Cyan")
L.append('*Arcs :2 "second relation"')
for i in range(0, N, 5):
    L.append(f"{i + 1} {(i + 20) % N + 1} 1 c Magenta w 2")
L.append("*Edges")
for i in range(0, N, 2):
    j = (i + 7) % N
    p = ["c", COLORS[(i * 3) % len(COLORS)]]
    if i % 4 == 0:
        p += ["w", "3", "p", "Dots"]
    if i % 6 == 0:
        p += ["l", f'"edge {i + 1}-{j + 1}"', "lc", "Red", "fos", "12", "la", "45"]
    value = "-2" if i % 10 == 8 else "1"
    L.append(f"{i + 1} {j + 1} {value} {' '.join(p)}")
L.append("*Arcslist")
L.append("8 18 19 21")
L.append("9 27")
L.append("*Edgeslist")
L.append("10 31 33 35")
open(os.path.join(out, "synth-pajek-lines.net"), "w").write("\r\n".join(L) + "\r\n")
print("wrote", out)
