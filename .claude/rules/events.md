---
paths:
    - "graphty-element/src/events/**"
    - "graphty-element/src/events.ts"
    - "graphty-element/src/managers/EventManager.ts"
---

Every event graphty-element emits is declared in its event type map (the event unions in `graphty-element/src/events.ts`, and `SessionEventMap` for session events), so its name and payload are checked where it is emitted and where it is subscribed; an event emitted under a name the map does not hold is a bug (#1592). An event a consumer can listen to must also reach the forwarded DOM event map (`GraphtyForwardedEventMap`), or `<graphty-element>`'s `addEventListener` neither types nor delivers it (#1441).
