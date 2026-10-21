Creator "yFiles"
Version "2.23"
graph [
  directed 1
  node [
    id 0
    label "Group A"
    isGroup 1
    graphics [
      x 300.0
      y 900.0
      w 520.0
      h 260.0
      type "roundrectangle"
      fill "#F5F5F5"
      outline "#000000"
      outlineStyle "dashed"
    ]
    LabelGraphics [
      text "Group A"
      fill "#EBEBEB"
      fontSize 15
      fontName "Dialog"
      anchor "t"
      model "null"
    ]
  ]
  node [
    id 1
    label "Group B (nested)"
    isGroup 1
    graphics [
      x 420.0
      y 920.0
      w 240.0
      h 180.0
      type "roundrectangle"
      fill "#F5F5F5"
      outline "#000000"
      outlineStyle "dashed"
    ]
    LabelGraphics [
      text "Group B (nested)"
      fill "#EBEBEB"
      fontSize 15
      fontName "Dialog"
      anchor "t"
      model "null"
    ]
    gid 0
  ]
  node [
    id 2
    label "v0"
    graphics [
      x 0.0
      y 0.0
      w 60.0
      h 30.0
      type "rectangle"
      fill "#FFCC00"
      outline "#CCFFCC"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v0"
      fontSize 8
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "c"
    ]
  ]
  node [
    id 3
    label "v1"
    graphics [
      x 110.0
      y 0.0
      w 40.0
      h 40.0
      type "roundrectangle"
      fill "#99CCFF"
      fill2 "#FF6600"
      outline "#C0C0C0"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v1"
      fontSize 10
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "n"
    ]
  ]
  node [
    id 4
    label "v2"
    graphics [
      x 220.0
      y 0.0
      w 80.0
      h 40.0
      type "ellipse"
      fill "#FF99CC"
      outline "#FF6600"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v2"
      fontSize 12
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "s"
    ]
  ]
  node [
    id 5
    label "v3"
    graphics [
      x 330.0
      y 0.0
      w 30.0
      h 30.0
      fill "#CCFFCC"
      outline "#3366FF"
      outlineStyle "dashed_dotted"
      outlineWidth 5
      customconfiguration "com.yworks.flowchart.decision"
    ]
    LabelGraphics [
      text "v3"
      fontSize 14
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "e"
    ]
  ]
  node [
    id 6
    label "v4"
    graphics [
      x 440.0
      y 0.0
      w 60.0
      h 30.0
      type "hexagon"
      hasFill 0
      outline "#993366"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v4"
      fontSize 18
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "w"
    ]
  ]
  node [
    id 7
    label "v5"
    graphics [
      x 550.0
      y 0.0
      w 40.0
      h 40.0
      type "octagon"
      fill "#FF660080"
      outline "#00CC99"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v5"
      fontSize 24
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "t"
    ]
  ]
  node [
    id 8
    label "v6"
    graphics [
      x 660.0
      y 0.0
      w 80.0
      h 40.0
      type "diamond"
      fill "#3366FF"
      outline "#FFFFFF"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v6"
      fontSize 8
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "b"
    ]
  ]
  node [
    id 9
    label "v7"
    graphics [
      x 770.0
      y 0.0
      w 30.0
      h 30.0
      type "triangle"
      fill "#993366"
      fill2 "#E8EEF7"
      hasOutline 0
    ]
    LabelGraphics [
      text "v7"
      fontSize 10
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "l"
    ]
  ]
  node [
    id 10
    label "v8"
    graphics [
      x 880.0
      y 0.0
      w 60.0
      h 30.0
      type "trapezoid"
      fill "#00CC99"
      outline "#E8EEF7"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v8"
      fontSize 12
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "r"
    ]
  ]
  node [
    id 11
    label "v9"
    graphics [
      x 990.0
      y 0.0
      w 40.0
      h 40.0
      type "trapezoid2"
      fill "#FFFFFF"
      outline "#B7C9E3"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v9"
      fontSize 14
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "nw"
      model "sides"
    ]
  ]
  node [
    id 12
    label "v10"
    graphics [
      x 0.0
      y 90.0
      w 80.0
      h 40.0
      type "rectangle3d"
      fill "#333333"
      outline "#FFCC99"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v10"
      fontSize 18
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "ne"
    ]
  ]
  node [
    id 13
    label "v11"
    graphics [
      x 110.0
      y 90.0
      w 30.0
      h 30.0
      type "star5"
      fill "#E8EEF7"
      outline "#66FF66"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v11"
      fontSize 24
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "sw"
    ]
  ]
  node [
    id 14
    label "v12"
    graphics [
      x 220.0
      y 90.0
      w 60.0
      h 30.0
      type "star6"
      fill "#B7C9E3"
      outline "#FFCC00"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v12"
      fontSize 8
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "se"
    ]
  ]
  node [
    id 15
    label "v13"
    graphics [
      x 330.0
      y 90.0
      w 40.0
      h 40.0
      type "star8"
      hasFill 0
      fill2 "#FF99CC"
      outline "#99CCFF"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v13"
      fontSize 10
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "tl"
    ]
  ]
  node [
    id 16
    label "v14"
    graphics [
      x 440.0
      y 90.0
      w 80.0
      h 40.0
      type "fatarrow"
      fill "#66FF66"
      outline "#FF99CC"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v14"
      fontSize 12
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "tr"
    ]
  ]
  node [
    id 17
    label "v15"
    graphics [
      x 550.0
      y 90.0
      w 30.0
      h 30.0
      type "parallelogram2"
      fill "#FFCC00"
      outline "#CCFFCC"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v15"
      fontSize 14
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "bl"
    ]
  ]
  node [
    id 18
    label "v16"
    graphics [
      x 660.0
      y 90.0
      w 60.0
      h 30.0
      type "rectangle"
      fill "#99CCFF80"
      outline "#C0C0C0"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v16"
      fontSize 18
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "br"
    ]
  ]
  node [
    id 19
    label "v17"
    graphics [
      x 770.0
      y 90.0
      w 40.0
      h 40.0
      type "roundrectangle"
      fill "#FF99CC"
      outline "#FF6600"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v17"
      fontSize 24
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "c"
    ]
  ]
  node [
    id 20
    label "v18"
    graphics [
      x 880.0
      y 90.0
      w 80.0
      h 40.0
      type "ellipse"
      fill "#CCFFCC"
      outline "#3366FF"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v18"
      fontSize 8
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "n"
    ]
  ]
  node [
    id 21
    label "v19"
    graphics [
      x 990.0
      y 90.0
      w 30.0
      h 30.0
      type "parallelogram"
      fill "#C0C0C0"
      fill2 "#00CC99"
      outline "#993366"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v19"
      fontSize 10
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "s"
      model "sides"
    ]
  ]
  node [
    id 22
    label "v20"
    graphics [
      x 0.0
      y 180.0
      w 60.0
      h 30.0
      fill "#FF6600"
      hasOutline 0
      customconfiguration "com.yworks.flowchart.decision"
    ]
    LabelGraphics [
      text "v20"
      fontSize 12
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "e"
    ]
  ]
  node [
    id 23
    label "v21"
    graphics [
      x 110.0
      y 180.0
      w 40.0
      h 40.0
      type "octagon"
      fill "#3366FF"
      outline "#FFFFFF"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v21"
      fontSize 14
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "w"
    ]
  ]
  node [
    id 24
    label "v22"
    graphics [
      x 220.0
      y 180.0
      w 80.0
      h 40.0
      type "diamond"
      hasFill 0
      outline "#333333"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v22"
      fontSize 18
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "t"
    ]
  ]
  node [
    id 25
    label "v23"
    graphics [
      x 330.0
      y 180.0
      w 30.0
      h 30.0
      type "triangle"
      fill "#00CC99"
      outline "#E8EEF7"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v23"
      fontSize 24
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "b"
    ]
  ]
  node [
    id 26
    label "v24"
    graphics [
      x 440.0
      y 180.0
      w 60.0
      h 30.0
      type "trapezoid"
      fill "#FFFFFF"
      outline "#B7C9E3"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v24"
      fontSize 8
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "l"
    ]
  ]
  node [
    id 27
    label "v25"
    graphics [
      x 550.0
      y 180.0
      w 40.0
      h 40.0
      type "trapezoid2"
      fill "#333333"
      fill2 "#66FF66"
      outline "#FFCC99"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v25"
      fontSize 10
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "r"
    ]
  ]
  node [
    id 28
    label "v26"
    graphics [
      x 660.0
      y 180.0
      w 80.0
      h 40.0
      type "rectangle3d"
      fill "#E8EEF7"
      outline "#66FF66"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v26"
      fontSize 12
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "nw"
    ]
  ]
  node [
    id 29
    label "v27"
    graphics [
      x 770.0
      y 180.0
      w 30.0
      h 30.0
      type "star5"
      fill "#B7C9E380"
      outline "#FFCC00"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v27"
      fontSize 14
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "ne"
    ]
  ]
  node [
    id 30
    label "v28"
    graphics [
      x 880.0
      y 180.0
      w 60.0
      h 30.0
      type "star6"
      fill "#FFCC99"
      outline "#99CCFF"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v28"
      fontSize 18
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "sw"
    ]
  ]
  node [
    id 31
    label "v29"
    graphics [
      x 990.0
      y 180.0
      w 40.0
      h 40.0
      type "star8"
      fill "#66FF66"
      outline "#FF99CC"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v29"
      fontSize 24
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "se"
      model "sides"
    ]
  ]
  node [
    id 32
    label "v30"
    graphics [
      x 0.0
      y 270.0
      w 80.0
      h 40.0
      type "fatarrow"
      fill "#FFCC00"
      outline "#CCFFCC"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v30"
      fontSize 8
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "tl"
    ]
  ]
  node [
    id 33
    label "v31"
    graphics [
      x 110.0
      y 270.0
      w 30.0
      h 30.0
      type "parallelogram2"
      hasFill 0
      fill2 "#FF6600"
      outline "#C0C0C0"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v31"
      fontSize 10
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "tr"
    ]
  ]
  node [
    id 34
    label "v32"
    graphics [
      x 220.0
      y 270.0
      w 60.0
      h 30.0
      type "rectangle"
      fill "#FF99CC"
      outline "#FF6600"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v32"
      fontSize 12
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "bl"
    ]
  ]
  node [
    id 35
    label "v33"
    graphics [
      x 330.0
      y 270.0
      w 40.0
      h 40.0
      type "roundrectangle"
      fill "#CCFFCC"
      hasOutline 0
    ]
    LabelGraphics [
      text "v33"
      fontSize 14
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "br"
    ]
  ]
  node [
    id 36
    label "v34"
    graphics [
      x 440.0
      y 270.0
      w 80.0
      h 40.0
      type "ellipse"
      fill "#C0C0C0"
      outline "#993366"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v34"
      fontSize 18
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "c"
    ]
  ]
  node [
    id 37
    label "v35"
    graphics [
      x 550.0
      y 270.0
      w 30.0
      h 30.0
      type "parallelogram"
      fill "#FF6600"
      outline "#00CC99"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v35"
      fontSize 24
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "n"
    ]
  ]
  node [
    id 38
    label "v36"
    graphics [
      x 660.0
      y 270.0
      w 60.0
      h 30.0
      type "hexagon"
      fill "#3366FF"
      outline "#FFFFFF"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v36"
      fontSize 8
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "s"
    ]
  ]
  node [
    id 39
    label "v37"
    graphics [
      x 770.0
      y 270.0
      w 40.0
      h 40.0
      fill "#993366"
      fill2 "#E8EEF7"
      outline "#333333"
      outlineStyle "dashed"
      outlineWidth 2
      customconfiguration "com.yworks.flowchart.decision"
    ]
    LabelGraphics [
      text "v37"
      fontSize 10
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "e"
    ]
  ]
  node [
    id 40
    label "v38"
    graphics [
      x 880.0
      y 270.0
      w 80.0
      h 40.0
      type "diamond"
      fill "#00CC9980"
      outline "#E8EEF7"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v38"
      fontSize 12
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "w"
    ]
  ]
  node [
    id 41
    label "v39"
    graphics [
      x 990.0
      y 270.0
      w 30.0
      h 30.0
      type "triangle"
      fill "#FFFFFF"
      outline "#B7C9E3"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v39"
      fontSize 14
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "t"
      model "sides"
    ]
  ]
  node [
    id 42
    label "v40"
    graphics [
      x 0.0
      y 360.0
      w 60.0
      h 30.0
      type "trapezoid"
      hasFill 0
      outline "#FFCC99"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v40"
      fontSize 18
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "b"
    ]
  ]
  node [
    id 43
    label "v41"
    graphics [
      x 110.0
      y 360.0
      w 40.0
      h 40.0
      type "trapezoid2"
      fill "#E8EEF7"
      outline "#66FF66"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v41"
      fontSize 24
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "l"
    ]
  ]
  node [
    id 44
    label "v42"
    graphics [
      x 220.0
      y 360.0
      w 80.0
      h 40.0
      type "rectangle3d"
      fill "#B7C9E3"
      outline "#FFCC00"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v42"
      fontSize 8
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "r"
    ]
  ]
  node [
    id 45
    label "v43"
    graphics [
      x 330.0
      y 360.0
      w 30.0
      h 30.0
      type "star5"
      fill "#FFCC99"
      fill2 "#FF99CC"
      outline "#99CCFF"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v43"
      fontSize 10
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "nw"
    ]
  ]
  node [
    id 46
    label "v44"
    graphics [
      x 440.0
      y 360.0
      w 60.0
      h 30.0
      type "star6"
      fill "#66FF66"
      outline "#FF99CC"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v44"
      fontSize 12
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "ne"
    ]
  ]
  node [
    id 47
    label "v45"
    graphics [
      x 550.0
      y 360.0
      w 40.0
      h 40.0
      type "star8"
      fill "#FFCC00"
      outline "#CCFFCC"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v45"
      fontSize 14
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "sw"
    ]
  ]
  node [
    id 48
    label "v46"
    graphics [
      x 660.0
      y 360.0
      w 80.0
      h 40.0
      type "fatarrow"
      fill "#99CCFF"
      hasOutline 0
    ]
    LabelGraphics [
      text "v46"
      fontSize 18
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "se"
    ]
  ]
  node [
    id 49
    label "v47"
    graphics [
      x 770.0
      y 360.0
      w 30.0
      h 30.0
      type "parallelogram2"
      fill "#FF99CC"
      outline "#FF6600"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v47"
      fontSize 24
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "tl"
    ]
  ]
  node [
    id 50
    label "v48"
    graphics [
      x 880.0
      y 360.0
      w 60.0
      h 30.0
      type "rectangle"
      fill "#CCFFCC"
      outline "#3366FF"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v48"
      fontSize 8
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "tr"
    ]
  ]
  node [
    id 51
    label "v49"
    graphics [
      x 990.0
      y 360.0
      w 40.0
      h 40.0
      type "roundrectangle"
      hasFill 0
      fill2 "#00CC99"
      outline "#993366"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v49"
      fontSize 10
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "bl"
      model "sides"
    ]
  ]
  node [
    id 52
    label "v50"
    graphics [
      x 0.0
      y 450.0
      w 80.0
      h 40.0
      type "ellipse"
      fill "#FF6600"
      outline "#00CC99"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v50"
      fontSize 12
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "br"
    ]
  ]
  node [
    id 53
    label "v51"
    graphics [
      x 110.0
      y 450.0
      w 30.0
      h 30.0
      type "parallelogram"
      fill "#3366FF"
      outline "#FFFFFF"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v51"
      fontSize 14
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "c"
    ]
  ]
  node [
    id 54
    label "v52"
    graphics [
      x 220.0
      y 450.0
      w 60.0
      h 30.0
      type "hexagon"
      fill "#993366"
      outline "#333333"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v52"
      fontSize 18
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "n"
    ]
  ]
  node [
    id 55
    label "v53"
    graphics [
      x 330.0
      y 450.0
      w 40.0
      h 40.0
      type "octagon"
      fill "#00CC99"
      outline "#E8EEF7"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v53"
      fontSize 24
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "s"
    ]
  ]
  node [
    id 56
    label "v54"
    graphics [
      x 440.0
      y 450.0
      w 80.0
      h 40.0
      fill "#FFFFFF"
      outline "#B7C9E3"
      outlineStyle "dotted"
      outlineWidth 3
      customconfiguration "com.yworks.flowchart.decision"
    ]
    LabelGraphics [
      text "v54"
      fontSize 8
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "e"
    ]
  ]
  node [
    id 57
    label "v55"
    graphics [
      x 550.0
      y 450.0
      w 30.0
      h 30.0
      type "triangle"
      fill "#333333"
      fill2 "#66FF66"
      outline "#FFCC99"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v55"
      fontSize 10
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "w"
    ]
  ]
  node [
    id 58
    label "v56"
    graphics [
      x 660.0
      y 450.0
      w 60.0
      h 30.0
      type "trapezoid"
      fill "#E8EEF7"
      outline "#66FF66"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v56"
      fontSize 12
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "t"
    ]
  ]
  node [
    id 59
    label "v57"
    graphics [
      x 770.0
      y 450.0
      w 40.0
      h 40.0
      type "trapezoid2"
      fill "#B7C9E3"
      outline "#FFCC00"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v57"
      fontSize 14
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "b"
    ]
  ]
  node [
    id 60
    label "v58"
    graphics [
      x 880.0
      y 450.0
      w 80.0
      h 40.0
      type "rectangle3d"
      hasFill 0
      outline "#99CCFF"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v58"
      fontSize 18
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "l"
    ]
  ]
  node [
    id 61
    label "v59"
    graphics [
      x 990.0
      y 450.0
      w 30.0
      h 30.0
      type "star5"
      fill "#66FF66"
      hasOutline 0
    ]
    LabelGraphics [
      text "v59"
      fontSize 24
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "r"
      model "sides"
    ]
  ]
  node [
    id 62
    label "v60"
    graphics [
      x 90.0
      y 830.0
      w 60.0
      h 30.0
      type "star6"
      fill "#FFCC0080"
      outline "#CCFFCC"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v60"
      fontSize 8
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "nw"
    ]
    gid 0
  ]
  node [
    id 63
    label "v61"
    graphics [
      x 180.0
      y 830.0
      w 40.0
      h 40.0
      type "star8"
      fill "#99CCFF"
      fill2 "#FF6600"
      outline "#C0C0C0"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v61"
      fontSize 10
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "ne"
    ]
    gid 0
  ]
  node [
    id 64
    label "v62"
    graphics [
      x 90.0
      y 900.0
      w 80.0
      h 40.0
      type "fatarrow"
      fill "#FF99CC"
      outline "#FF6600"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v62"
      fontSize 12
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "sw"
    ]
    gid 0
  ]
  node [
    id 65
    label "v63"
    graphics [
      x 180.0
      y 900.0
      w 30.0
      h 30.0
      type "parallelogram2"
      fill "#CCFFCC"
      outline "#3366FF"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v63"
      fontSize 14
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "se"
    ]
    gid 0
  ]
  node [
    id 66
    label "v64"
    graphics [
      x 90.0
      y 970.0
      w 60.0
      h 30.0
      type "rectangle"
      fill "#C0C0C0"
      outline "#993366"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v64"
      fontSize 18
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "tl"
    ]
    gid 0
  ]
  node [
    id 67
    label "v65"
    graphics [
      x 180.0
      y 970.0
      w 40.0
      h 40.0
      type "roundrectangle"
      fill "#FF6600"
      outline "#00CC99"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v65"
      fontSize 24
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "tr"
    ]
    gid 0
  ]
  node [
    id 68
    label "v66"
    graphics [
      x 370.0
      y 890.0
      w 80.0
      h 40.0
      type "ellipse"
      fill "#3366FF"
      outline "#FFFFFF"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v66"
      fontSize 8
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "bl"
    ]
    gid 1
  ]
  node [
    id 69
    label "v67"
    graphics [
      x 470.0
      y 890.0
      w 30.0
      h 30.0
      type "parallelogram"
      hasFill 0
      fill2 "#E8EEF7"
      outline "#333333"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v67"
      fontSize 10
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "br"
    ]
    gid 1
  ]
  node [
    id 70
    label "v68"
    graphics [
      x 370.0
      y 960.0
      w 60.0
      h 30.0
      type "hexagon"
      fill "#00CC99"
      outline "#E8EEF7"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v68"
      fontSize 12
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "c"
    ]
    gid 1
  ]
  node [
    id 71
    label "v69"
    graphics [
      x 470.0
      y 960.0
      w 40.0
      h 40.0
      type "octagon"
      fill "#FFFFFF"
      outline "#B7C9E3"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v69"
      fontSize 14
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "n"
      model "sides"
    ]
    gid 1
  ]
  node [
    id 72
    label "v70"
    graphics [
      x 0.0
      y 630.0
      w 80.0
      h 40.0
      type "diamond"
      fill "#333333"
      outline "#FFCC99"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v70"
      fontSize 18
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "s"
    ]
  ]
  node [
    id 73
    label "v71"
    graphics [
      x 110.0
      y 630.0
      w 30.0
      h 30.0
      fill "#E8EEF780"
      outline "#66FF66"
      outlineStyle "dashed_dotted"
      outlineWidth 5
      customconfiguration "com.yworks.flowchart.decision"
    ]
    LabelGraphics [
      text "v71"
      fontSize 24
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "e"
    ]
  ]
  node [
    id 74
    label "v72"
    graphics [
      x 220.0
      y 630.0
      w 60.0
      h 30.0
      type "trapezoid"
      fill "#B7C9E3"
      hasOutline 0
    ]
    LabelGraphics [
      text "v72"
      fontSize 8
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "w"
    ]
  ]
  node [
    id 75
    label "v73"
    graphics [
      x 330.0
      y 630.0
      w 40.0
      h 40.0
      type "trapezoid2"
      fill "#FFCC99"
      fill2 "#FF99CC"
      outline "#99CCFF"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v73"
      fontSize 10
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "t"
    ]
  ]
  node [
    id 76
    label "v74"
    graphics [
      x 440.0
      y 630.0
      w 80.0
      h 40.0
      type "rectangle3d"
      fill "#66FF66"
      outline "#FF99CC"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v74"
      fontSize 12
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "b"
    ]
  ]
  node [
    id 77
    label "v75"
    graphics [
      x 550.0
      y 630.0
      w 30.0
      h 30.0
      type "star5"
      fill "#FFCC00"
      outline "#CCFFCC"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v75"
      fontSize 14
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "l"
    ]
  ]
  node [
    id 78
    label "v76"
    graphics [
      x 660.0
      y 630.0
      w 60.0
      h 30.0
      type "star6"
      hasFill 0
      outline "#C0C0C0"
      outlineStyle "line"
      outlineWidth 1
    ]
    LabelGraphics [
      text "v76"
      fontSize 18
      fontName "Dialog"
      fontStyle "plain"
      color "#000000"
      anchor "r"
    ]
  ]
  node [
    id 79
    label "v77"
    graphics [
      x 770.0
      y 630.0
      w 40.0
      h 40.0
      type "star8"
      fill "#FF99CC"
      outline "#FF6600"
      outlineStyle "dashed"
      outlineWidth 2
    ]
    LabelGraphics [
      text "v77"
      fontSize 24
      fontName "Arial"
      fontStyle "bold"
      color "#FF0000"
      anchor "nw"
    ]
  ]
  node [
    id 80
    label "v78"
    graphics [
      x 880.0
      y 630.0
      w 80.0
      h 40.0
      type "fatarrow"
      fill "#CCFFCC"
      outline "#3366FF"
      outlineStyle "dotted"
      outlineWidth 3
    ]
    LabelGraphics [
      text "v78"
      fontSize 8
      fontName "Times New Roman"
      fontStyle "italic"
      color "#0000FF"
      anchor "ne"
    ]
  ]
  node [
    id 81
    label "v79"
    graphics [
      x 990.0
      y 630.0
      w 30.0
      h 30.0
      type "parallelogram2"
      fill "#C0C0C0"
      fill2 "#00CC99"
      outline "#993366"
      outlineStyle "dashed_dotted"
      outlineWidth 5
    ]
    LabelGraphics [
      text "v79"
      fontSize 10
      fontName "Courier New"
      fontStyle "bolditalic"
      color "#006600"
      anchor "sw"
      model "sides"
    ]
  ]
  edge [
    source 2
    target 3
    graphics [
      fill "#FF99CC"
      width 1
      style "line"
      sourceArrow "none"
      arrow "last"
    ]
  ]
  edge [
    source 3
    target 13
    graphics [
      fill "#CCFFCC"
      width 2
      style "dashed"
      targetArrow "standard"
      Line [
        point [
          x 110.0
          y 0.0
        ]
        point [
          x 110.0
          y 65.0
        ]
        point [
          x 110.0
          y 65.0
        ]
        point [
          x 110.0
          y 90.0
        ]
      ]
      smoothBends 1
    ]
  ]
  edge [
    source 4
    target 15
    graphics [
      fill "#C0C0C0"
      width 3
      style "dotted"
      targetArrow "delta"
    ]
    label "e2"
    LabelGraphics [
      text "e2"
      fontSize 14
      fontName "Dialog"
      color "#000099"
      model "side_slider"
      position "center"
    ]
  ]
  edge [
    source 5
    target 14
    graphics [
      fill "#FF6600"
      width 0.5
      style "dashed_dotted"
      targetArrow "white_delta"
      sourceArrow "crows_foot_many"
    ]
  ]
  edge [
    source 6
    target 28
    graphics [
      fill "#3366FF"
      width 5
      style "line"
      targetArrow "diamond"
    ]
  ]
  edge [
    source 7
    target 8
    graphics [
      fill "#993366"
      width 1
      style "dashed"
      targetArrow "white_diamond"
      Line [
        point [
          x 550.0
          y 0.0
        ]
        point [
          x 550.0
          y 20.0
        ]
        point [
          x 660.0
          y 20.0
        ]
        point [
          x 660.0
          y 0.0
        ]
      ]
    ]
    edgeAnchor [
      xSource -1.0
      yTarget 1.0
    ]
  ]
  edge [
    source 8
    target 18
    graphics [
      fill "#00CC99"
      width 2
      style "dotted"
      targetArrow "short"
      sourceArrow "t_shape"
    ]
  ]
  edge [
    source 9
    target 20
    graphics [
      fill "#FFFFFF80"
      width 3
      style "dashed_dotted"
      arrow "first"
    ]
  ]
  edge [
    source 10
    target 19
    graphics [
      fill "#333333"
      width 0.5
      style "line"
      targetArrow "concave"
    ]
  ]
  edge [
    source 11
    target 33
    graphics [
      fill "#E8EEF7"
      width 5
      style "dashed"
      targetArrow "convex"
      sourceArrow "skewed_dash"
      Line [
        point [
          x 990.0
          y 0.0
        ]
        point [
          x 990.0
          y 155.0
        ]
        point [
          x 110.0
          y 155.0
        ]
        point [
          x 110.0
          y 270.0
        ]
      ]
      smoothBends 1
    ]
  ]
  edge [
    source 12
    target 13
    graphics [
      fill "#B7C9E3"
      width 1
      style "dotted"
      targetArrow "circle"
    ]
  ]
  edge [
    source 13
    target 23
    graphics [
      fill "#FFCC99"
      width 2
      style "dashed_dotted"
      targetArrow "transparent_circle"
    ]
    label "e11"
    LabelGraphics [
      text "e11"
      fontSize 14
      fontName "Dialog"
      color "#000099"
      model "side_slider"
      position "center"
    ]
  ]
  edge [
    source 14
    target 25
    graphics [
      fill "#66FF66"
      width 3
      style "line"
      targetArrow "dash"
      sourceArrow "dash"
    ]
  ]
  edge [
    source 15
    target 24
    graphics [
      fill "#FFCC00"
      width 0.5
      style "dashed"
      targetArrow "skewed_dash"
      Line [
        point [
          x 330.0
          y 90.0
        ]
        point [
          x 330.0
          y 155.0
        ]
        point [
          x 220.0
          y 155.0
        ]
        point [
          x 220.0
          y 180.0
        ]
      ]
    ]
  ]
  edge [
    source 16
    target 38
    graphics [
      fill "#99CCFF"
      width 5
      style "dotted"
      arrow "both"
    ]
  ]
  edge [
    source 17
    target 18
    graphics [
      fill "#FF99CC"
      width 1
      style "dashed_dotted"
      targetArrow "crows_foot_many"
      sourceArrow "transparent_circle"
    ]
  ]
  edge [
    source 18
    target 28
    graphics [
      fill "#CCFFCC"
      width 2
      style "line"
      targetArrow "none"
    ]
    edgeAnchor [
      xSource -1.0
      yTarget 1.0
    ]
  ]
  edge [
    source 19
    target 30
    graphics [
      fill "#C0C0C0"
      width 3
      style "dashed"
      targetArrow "standard"
      Line [
        point [
          x 770.0
          y 90.0
        ]
        point [
          x 770.0
          y 155.0
        ]
        point [
          x 880.0
          y 155.0
        ]
        point [
          x 880.0
          y 180.0
        ]
      ]
      smoothBends 1
    ]
  ]
  edge [
    source 20
    target 29
    graphics [
      fill "#FF6600"
      width 0.5
      style "dotted"
      targetArrow "delta"
      sourceArrow "circle"
    ]
  ]
  edge [
    source 21
    target 43
    graphics [
      fill "#3366FF"
      width 5
      style "dashed_dotted"
      targetArrow "white_delta"
    ]
  ]
  edge [
    source 22
    target 23
    graphics [
      fill "#993366"
      width 1
      style "line"
      targetArrow "diamond"
    ]
    label "e20"
    LabelGraphics [
      text "e20"
      fontSize 14
      fontName "Dialog"
      color "#000099"
      model "side_slider"
      position "center"
    ]
  ]
  edge [
    source 23
    target 33
    graphics [
      fill "#00CC99"
      width 2
      style "dashed"
      sourceArrow "convex"
      arrow "last"
      Line [
        point [
          x 110.0
          y 180.0
        ]
        point [
          x 110.0
          y 245.0
        ]
        point [
          x 110.0
          y 245.0
        ]
        point [
          x 110.0
          y 270.0
        ]
      ]
    ]
  ]
  edge [
    source 24
    target 35
    graphics [
      fill "#FFFFFF80"
      width 3
      style "dotted"
      targetArrow "short"
    ]
  ]
  edge [
    source 25
    target 34
    graphics [
      fill "#333333"
      width 0.5
      style "dashed_dotted"
      targetArrow "plain"
    ]
  ]
  edge [
    source 26
    target 48
    graphics [
      fill "#E8EEF7"
      width 5
      style "line"
      targetArrow "concave"
      sourceArrow "concave"
    ]
  ]
  edge [
    source 27
    target 28
    graphics [
      fill "#B7C9E3"
      width 1
      style "dashed"
      targetArrow "convex"
      Line [
        point [
          x 550.0
          y 180.0
        ]
        point [
          x 550.0
          y 200.0
        ]
        point [
          x 660.0
          y 200.0
        ]
        point [
          x 660.0
          y 180.0
        ]
      ]
      smoothBends 1
    ]
  ]
  edge [
    source 28
    target 38
    graphics [
      fill "#FFCC99"
      width 2
      style "dotted"
      targetArrow "circle"
    ]
  ]
  edge [
    source 29
    target 40
    graphics [
      fill "#66FF66"
      width 3
      style "dashed_dotted"
      targetArrow "transparent_circle"
      sourceArrow "plain"
    ]
    edgeAnchor [
      xSource -1.0
      yTarget 1.0
    ]
  ]
  edge [
    source 30
    target 39
    graphics [
      fill "#FFCC00"
      width 0.5
      style "line"
      arrow "first"
    ]
  ]
  edge [
    source 31
    target 53
    graphics [
      fill "#99CCFF"
      width 5
      style "dashed"
      targetArrow "skewed_dash"
      Line [
        point [
          x 990.0
          y 180.0
        ]
        point [
          x 990.0
          y 335.0
        ]
        point [
          x 110.0
          y 335.0
        ]
        point [
          x 110.0
          y 450.0
        ]
      ]
    ]
    label "e29"
    LabelGraphics [
      text "e29"
      fontSize 14
      fontName "Dialog"
      color "#000099"
      model "side_slider"
      position "center"
    ]
  ]
  edge [
    source 32
    target 33
    graphics [
      fill "#FF99CC"
      width 1
      style "dotted"
      targetArrow "t_shape"
      sourceArrow "short"
    ]
  ]
  edge [
    source 33
    target 43
    graphics [
      fill "#CCFFCC"
      width 2
      style "dashed_dotted"
      targetArrow "crows_foot_many"
    ]
  ]
  edge [
    source 34
    target 45
    graphics [
      fill "#C0C0C0"
      width 3
      style "line"
      targetArrow "none"
    ]
  ]
  edge [
    source 35
    target 44
    graphics [
      fill "#FF6600"
      width 0.5
      style "dashed"
      targetArrow "standard"
      sourceArrow "white_diamond"
      Line [
        point [
          x 330.0
          y 270.0
        ]
        point [
          x 330.0
          y 335.0
        ]
        point [
          x 220.0
          y 335.0
        ]
        point [
          x 220.0
          y 360.0
        ]
      ]
      smoothBends 1
    ]
  ]
  edge [
    source 36
    target 58
    graphics [
      fill "#3366FF"
      width 5
      style "dotted"
      targetArrow "delta"
    ]
  ]
  edge [
    source 37
    target 38
    graphics [
      fill "#993366"
      width 1
      style "dashed_dotted"
      arrow "both"
    ]
  ]
  edge [
    source 38
    target 48
    graphics [
      fill "#00CC99"
      width 2
      style "line"
      targetArrow "diamond"
      sourceArrow "diamond"
    ]
  ]
  edge [
    source 39
    target 50
    graphics [
      fill "#FFFFFF80"
      width 3
      style "dashed"
      targetArrow "white_diamond"
      Line [
        point [
          x 770.0
          y 270.0
        ]
        point [
          x 770.0
          y 335.0
        ]
        point [
          x 880.0
          y 335.0
        ]
        point [
          x 880.0
          y 360.0
        ]
      ]
    ]
  ]
  edge [
    source 40
    target 49
    graphics [
      fill "#333333"
      width 0.5
      style "dotted"
      targetArrow "short"
    ]
    label "e38"
    LabelGraphics [
      text "e38"
      fontSize 14
      fontName "Dialog"
      color "#000099"
      model "side_slider"
      position "center"
    ]
    edgeAnchor [
      xSource -1.0
      yTarget 1.0
    ]
  ]
  edge [
    source 41
    target 63
    graphics [
      fill "#E8EEF7"
      width 5
      style "dashed_dotted"
      targetArrow "plain"
      sourceArrow "white_delta"
    ]
  ]
  edge [
    source 42
    target 43
    graphics [
      fill "#B7C9E3"
      width 1
      style "line"
      targetArrow "concave"
    ]
  ]
  edge [
    source 43
    target 53
    graphics [
      fill "#FFCC99"
      width 2
      style "dashed"
      targetArrow "convex"
      Line [
        point [
          x 110.0
          y 360.0
        ]
        point [
          x 110.0
          y 425.0
        ]
        point [
          x 110.0
          y 425.0
        ]
        point [
          x 110.0
          y 450.0
        ]
      ]
      smoothBends 1
    ]
  ]
  edge [
    source 44
    target 55
    graphics [
      fill "#66FF66"
      width 3
      style "dotted"
      sourceArrow "delta"
      arrow "last"
    ]
  ]
  edge [
    source 45
    target 54
    graphics [
      fill "#FFCC00"
      width 0.5
      style "dashed_dotted"
      targetArrow "transparent_circle"
    ]
  ]
  edge [
    source 46
    target 68
    graphics [
      fill "#99CCFF"
      width 5
      style "line"
      targetArrow "dash"
    ]
  ]
  edge [
    source 47
    target 48
    graphics [
      fill "#FF99CC"
      width 1
      style "dashed"
      targetArrow "skewed_dash"
      sourceArrow "standard"
      Line [
        point [
          x 550.0
          y 360.0
        ]
        point [
          x 550.0
          y 380.0
        ]
        point [
          x 660.0
          y 380.0
        ]
        point [
          x 660.0
          y 360.0
        ]
      ]
    ]
  ]
  edge [
    source 48
    target 58
    graphics [
      fill "#CCFFCC"
      width 2
      style "dotted"
      targetArrow "t_shape"
    ]
  ]
  edge [
    source 49
    target 60
    graphics [
      fill "#C0C0C0"
      width 3
      style "dashed_dotted"
      targetArrow "crows_foot_many"
    ]
    label "e47"
    LabelGraphics [
      text "e47"
      fontSize 14
      fontName "Dialog"
      color "#000099"
      model "side_slider"
      position "center"
    ]
  ]
  edge [
    source 50
    target 59
    graphics [
      fill "#FF6600"
      width 0.5
      style "line"
      targetArrow "none"
      sourceArrow "none"
    ]
  ]
  edge [
    source 51
    target 73
    graphics [
      fill "#3366FF"
      width 5
      style "dashed"
      arrow "first"
      Line [
        point [
          x 990.0
          y 360.0
        ]
        point [
          x 990.0
          y 515.0
        ]
        point [
          x 110.0
          y 515.0
        ]
        point [
          x 110.0
          y 630.0
        ]
      ]
      smoothBends 1
    ]
    edgeAnchor [
      xSource -1.0
      yTarget 1.0
    ]
  ]
  edge [
    source 52
    target 53
    graphics [
      fill "#993366"
      width 1
      style "dotted"
      targetArrow "delta"
    ]
  ]
  edge [
    source 53
    target 63
    graphics [
      fill "#00CC99"
      width 2
      style "dashed_dotted"
      targetArrow "white_delta"
      sourceArrow "crows_foot_many"
    ]
  ]
  edge [
    source 54
    target 65
    graphics [
      fill "#FFFFFF80"
      width 3
      style "line"
      targetArrow "diamond"
    ]
  ]
  edge [
    source 55
    target 64
    graphics [
      fill "#333333"
      width 0.5
      style "dashed"
      targetArrow "white_diamond"
      Line [
        point [
          x 330.0
          y 450.0
        ]
        point [
          x 330.0
          y 695.0
        ]
        point [
          x 90.0
          y 695.0
        ]
        point [
          x 90.0
          y 900.0
        ]
      ]
    ]
  ]
  edge [
    source 56
    target 78
    graphics [
      fill "#E8EEF7"
      width 5
      style "dotted"
      targetArrow "short"
      sourceArrow "t_shape"
    ]
  ]
  edge [
    source 57
    target 58
    graphics [
      fill "#B7C9E3"
      width 1
      style "dashed_dotted"
      targetArrow "plain"
    ]
  ]
  edge [
    source 58
    target 68
    graphics [
      fill "#FFCC99"
      width 2
      style "line"
      arrow "both"
    ]
    label "e56"
    LabelGraphics [
      text "e56"
      fontSize 14
      fontName "Dialog"
      color "#000099"
      model "side_slider"
      position "center"
    ]
  ]
  edge [
    source 59
    target 70
    graphics [
      fill "#66FF66"
      width 3
      style "dashed"
      targetArrow "convex"
      sourceArrow "skewed_dash"
      Line [
        point [
          x 770.0
          y 450.0
        ]
        point [
          x 770.0
          y 725.0
        ]
        point [
          x 370.0
          y 725.0
        ]
        point [
          x 370.0
          y 960.0
        ]
      ]
      smoothBends 1
    ]
  ]
  edge [
    source 60
    target 69
    graphics [
      fill "#FFCC00"
      width 0.5
      style "dotted"
      targetArrow "circle"
    ]
  ]
  edge [
    source 61
    target 3
    graphics [
      fill "#99CCFF"
      width 5
      style "dashed_dotted"
      targetArrow "transparent_circle"
    ]
  ]
  edge [
    source 62
    target 63
    graphics [
      fill "#FF99CC"
      width 1
      style "line"
      targetArrow "dash"
      sourceArrow "dash"
    ]
    edgeAnchor [
      xSource -1.0
      yTarget 1.0
    ]
  ]
  edge [
    source 63
    target 73
    graphics [
      fill "#CCFFCC"
      width 2
      style "dashed"
      targetArrow "skewed_dash"
      Line [
        point [
          x 180.0
          y 830.0
        ]
        point [
          x 180.0
          y 750.0
        ]
        point [
          x 110.0
          y 750.0
        ]
        point [
          x 110.0
          y 630.0
        ]
      ]
    ]
  ]
  edge [
    source 64
    target 75
    graphics [
      fill "#C0C0C0"
      width 3
      style "dotted"
      targetArrow "t_shape"
    ]
  ]
  edge [
    source 65
    target 74
    graphics [
      fill "#FF6600"
      width 0.5
      style "dashed_dotted"
      sourceArrow "transparent_circle"
      arrow "last"
    ]
  ]
  edge [
    source 66
    target 8
    graphics [
      fill "#3366FF"
      width 5
      style "line"
      targetArrow "none"
    ]
  ]
  edge [
    source 67
    target 68
    graphics [
      fill "#993366"
      width 1
      style "dashed"
      targetArrow "standard"
      Line [
        point [
          x 180.0
          y 970.0
        ]
        point [
          x 180.0
          y 950.0
        ]
        point [
          x 370.0
          y 950.0
        ]
        point [
          x 370.0
          y 890.0
        ]
      ]
      smoothBends 1
    ]
    label "e65"
    LabelGraphics [
      text "e65"
      fontSize 14
      fontName "Dialog"
      color "#000099"
      model "side_slider"
      position "center"
    ]
  ]
  edge [
    source 68
    target 78
    graphics [
      fill "#00CC99"
      width 2
      style "dotted"
      targetArrow "delta"
      sourceArrow "circle"
    ]
  ]
  edge [
    source 69
    target 80
    graphics [
      fill "#FFFFFF80"
      width 3
      style "dashed_dotted"
      targetArrow "white_delta"
    ]
  ]
  edge [
    source 70
    target 79
    graphics [
      fill "#333333"
      width 0.5
      style "line"
      targetArrow "diamond"
    ]
  ]
  edge [
    source 71
    target 13
    graphics [
      fill "#E8EEF7"
      width 5
      style "dashed"
      targetArrow "white_diamond"
      sourceArrow "convex"
      Line [
        point [
          x 470.0
          y 960.0
        ]
        point [
          x 470.0
          y 545.0
        ]
        point [
          x 110.0
          y 545.0
        ]
        point [
          x 110.0
          y 90.0
        ]
      ]
    ]
  ]
  edge [
    source 72
    target 73
    graphics [
      fill "#B7C9E3"
      width 1
      style "dotted"
      arrow "first"
    ]
  ]
  edge [
    source 73
    target 3
    graphics [
      fill "#FFCC99"
      width 2
      style "dashed_dotted"
      targetArrow "plain"
    ]
    edgeAnchor [
      xSource -1.0
      yTarget 1.0
    ]
  ]
  edge [
    source 74
    target 5
    graphics [
      fill "#66FF66"
      width 3
      style "line"
      targetArrow "concave"
      sourceArrow "concave"
    ]
  ]
  edge [
    source 75
    target 4
    graphics [
      fill "#FFCC00"
      width 0.5
      style "dashed"
      targetArrow "convex"
      Line [
        point [
          x 330.0
          y 630.0
        ]
        point [
          x 330.0
          y 335.0
        ]
        point [
          x 220.0
          y 335.0
        ]
        point [
          x 220.0
          y 0.0
        ]
      ]
      smoothBends 1
    ]
  ]
  edge [
    source 76
    target 18
    graphics [
      fill "#99CCFF"
      width 5
      style "dotted"
      targetArrow "circle"
    ]
    label "e74"
    LabelGraphics [
      text "e74"
      fontSize 14
      fontName "Dialog"
      color "#000099"
      model "side_slider"
      position "center"
    ]
  ]
  edge [
    source 77
    target 78
    graphics [
      fill "#FF99CC"
      width 1
      style "dashed_dotted"
      targetArrow "transparent_circle"
      sourceArrow "plain"
    ]
  ]
  edge [
    source 78
    target 8
    graphics [
      fill "#CCFFCC"
      width 2
      style "line"
      targetArrow "dash"
    ]
  ]
  edge [
    source 79
    target 10
    graphics [
      fill "#C0C0C0"
      width 3
      style "dashed"
      arrow "both"
      Line [
        point [
          x 770.0
          y 630.0
        ]
        point [
          x 770.0
          y 335.0
        ]
        point [
          x 880.0
          y 335.0
        ]
        point [
          x 880.0
          y 0.0
        ]
      ]
    ]
  ]
  edge [
    source 80
    target 9
    graphics [
      fill "#FF6600"
      width 0.5
      style "dotted"
      targetArrow "t_shape"
      sourceArrow "short"
    ]
  ]
  edge [
    source 81
    target 23
    graphics [
      fill "#3366FF"
      width 5
      style "dashed_dotted"
      targetArrow "crows_foot_many"
    ]
  ]
]
