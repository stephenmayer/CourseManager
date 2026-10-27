---
id: site-map
title: Site map
status: current
owns: "the screens, dialogs and navigation between them, including designed-but-not-built add-ons"
updated: 2026-10-27
---

# Site map

Solid boxes are in the core build. Dashed boxes are add-ons that are designed but not built (Q5 option D, Q14, Q15, Q16). Every screen shares one header: Students, Courses, the SIS data date, the signed-in name and the light/dark toggle.

![Site map](img/site-map.png)

```mermaid
flowchart TD
    H["Header on every screen<br/>Students · Courses · SIS data date · Light/Dark"]

    H --> SL["Screen 1: Student list<br/>search · filter by status · filter by checks"]
    H --> CO["Screen 3: Courses<br/>counts by department · Not in catalog row"]

    SL -- "select a student" --> SD["Screen 2: Student detail<br/>profile · requests (priority, elective)<br/>checks with reasons · status: Done / On hold"]
    SD -- "All students" --> SL

    SD --> CAT["Add from catalog panel<br/>table · grade checkboxes"]
    SD -- "select a course code" --> CD{{"Course dialog<br/>who requested it · make P/E · remove"}}
    CO -- "select a course" --> CD
    CD -- "open a student" --> SD
    CO -- "Not in catalog: open the student" --> SD

    subgraph addons["Add-ons: designed, not built"]
        JOBS["Sync jobs<br/>runs and states · cancel · roll back · error report"]
        RULES["Graduation rules setup<br/>credits per subject · named courses"]
        GP["Graduation progress panel<br/>on Student detail · 'fills a gap' filter"]
        ALT["Alternates<br/>ranked backups under each elective"]
        DYM["'Did you mean?' hint<br/>on unknown course errors"]
    end

    H -.-> JOBS
    H -.-> RULES
    SD -.-> GP
    SD -.-> ALT
    SD -.-> DYM
    RULES -.-> GP

    classDef addon stroke-dasharray: 6 4,fill:#F6F7F9,color:#3F4652;
    class JOBS,RULES,GP,ALT,DYM addon;
```

| Screen or dialog | Reached from | Decisions |
| --- | --- | --- |
| Student list | Header, "All students" | Q3, Q5 |
| Student detail | Student list; course dialog; Not in catalog row | Q1-Q5, Q11 |
| Courses | Header | Q12 |
| Course dialog | Courses; any course code on a student page | Q12 |
| Sync jobs (add-on) | Header, for an admin | Q13, Q14 |
| Graduation rules setup (add-on) | Header, for a district admin | Q15 |
| Graduation progress, Alternates, Did you mean (add-ons) | Inside Student detail | Q15, Q16, Q5 D |
