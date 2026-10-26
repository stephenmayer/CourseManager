---
id: arch-app-flow
title: Application flow
status: draft
owns: "the screens, how a user moves between them, and what the backend does on each action"
updated: 2026-10-26
---

# Application flow

How the prototype's screens connect, what a counselor can do on each, and what happens behind every action. The user-side story is in [planning-meeting.md](../scenarios/planning-meeting.md); the components are in [overview.md](overview.md).

Rendered image: [img/app-flow.png](img/app-flow.png) (regenerate when the diagram below changes).

```mermaid
flowchart TD
    START([Counselor opens the app]) --> LIST

    LIST["<b>Screen 1: Student list</b><br/>name, grade, status, request count,<br/>error and warning badges<br/>search by name or ID, filter by status"]
    LIST -->|select a student| DETAIL

    DETAIL["<b>Screen 2: Student detail</b><br/>header: grade, SIS profile, status<br/>requests: Priority then Elective, tagged From SIS or Added in app<br/>checks panel: errors and warnings<br/>add from catalog inline, filtered to grade"]

    DETAIL --> ACT{Counselor action}
    ACT -->|add, remove,<br/>switch P/E,<br/>give a reason| API
    ACT -->|set status| GATE{Status rules}
    GATE -->|Done with errors left| BLOCK[Refused: fix errors first]
    GATE -->|On hold without a reason| REASON[Reason required]
    GATE -->|allowed| API
    BLOCK --> DETAIL
    REASON --> DETAIL

    subgraph BACKEND [Backend: same path for every action]
        API[API call] --> SVC[Service]
        SVC <--> STORE[(Request store, SQLite<br/>requests, reasons, status)]
        SVC <--> SIS[(SIS source, read only<br/>students and catalog)]
        SVC --> RULES[Run all checks<br/>edit after Done reopens to In progress]
        RULES --> RESP[Return the updated student]
    end

    RESP -->|screen refreshes in place| DETAIL
    DETAIL -->|back| LIST

    LIST -.->|if time| SYNC[Run SIS sync<br/>flag SIS changes to edited requests]
    LIST -.->|if time, after sync| TALLY[Course tally<br/>requests per course]
```

## Notes

- Two screens carry the whole MVP. The catalog picker sits inside the detail screen so a counselor never leaves the student mid-meeting (planning-meeting.md, raised item 6).
- Every action makes one API call and gets the whole updated student back, so checks and status are always computed in one place: the backend ([overview.md](overview.md) section 7).
- Status rules: Done is refused while errors remain ([Q5](../decisions/q005-bad-sis-request-data.md)); On hold needs a reason; editing a Done student reopens it ([Q3](../decisions/q003-student-review-status.md)).
- Dashed paths are the "if time" items, in build order: sync demo, then tally ([Q9](../decisions/q009-sis-sync-demo.md)).
