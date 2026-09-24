graph [
  node [
    id 0
    label "node 0"
    score -2.25
  ]
  node [
    id 1
    label "node 1"
    rank -2147483648
  ]
  node [
    id 2
    label "node 2"
    score 123456789.125
    tag "&#20013;&#25991;"
    flag 1
  ]
  node [
    id 3
    label "node 3"
    score 123456789.125
    rank 2147483647
    flag 1
  ]
  node [
    id 4
    label "node 4"
    score 1.E-07
    rank 1
    tag "two words"
  ]
  edge [
    source 0
    target 1
    weight 0.2176
    rel "[bracket]"
    cap 726
  ]
  edge [
    source 0
    target 4
    weight 4.0534
    rel "two words"
    cap 754
  ]
  edge [
    source 1
    target 2
    rel "&#20013;&#25991;"
  ]
  edge [
    source 2
    target 3
    weight 3
  ]
  edge [
    source 3
    target 4
    rel "<tag>"
  ]
]
