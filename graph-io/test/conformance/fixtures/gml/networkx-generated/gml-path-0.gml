graph [
  node [
    id 0
    label "0"
    score 0.5
    tag "it's"
    flag 0
  ]
  node [
    id 1
    label "1"
    rank 42
    tag "it's"
  ]
  node [
    id 2
    label "2"
    tag "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  ]
  node [
    id 3
    label "3"
    score 123456789.125
    tag "two words"
    flag 1
  ]
  node [
    id 4
    label "4"
    score -4.535584
    rank 1
    tag "plain"
  ]
  node [
    id 5
    label "5"
    score -24.600112
    rank 2147483647
    tag "caf&#233;"
  ]
  edge [
    source 0
    target 1
    weight -0.0
  ]
  edge [
    source 1
    target 2
    weight 1.E-300
    cap 609
  ]
  edge [
    source 2
    target 3
    weight 3.3215
    cap 201
  ]
  edge [
    source 3
    target 4
    weight 9.4987
    rel "two words"
    cap 927
  ]
  edge [
    source 4
    target 5
    cap 451
  ]
]
