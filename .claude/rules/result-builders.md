---
paths:
    - "graphty-element/src/session/**"
    - "graphty-element/src/**/*Result*.ts"
    - "graphty-element/src/**/estimate.ts"
---

graphty-element results, estimates and session facts are presentation-neutral: return codes and `CodedFact`s (`{ code, params }`), never English sentences, headings or display order. The application turns a code into words, so another consumer can word, translate or hide it. See "graphty-element is neutral about presentation" in the root CLAUDE.md; no automated check enforces this yet, so a review must.
