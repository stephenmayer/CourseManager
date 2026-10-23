import { useEffect, useState } from "react";
import { api } from "../api";
import type { TallyRow } from "../types";
import { gradeRange } from "./common";

// Requests per course across all students. Downstream, these counts decide how many sections to offer.
export default function TallyView() {
  const [rows, setRows] = useState<TallyRow[] | null>(null);
  useEffect(() => {
    api.tally().then(setRows);
  }, []);
  if (!rows) return <p className="muted">Loading…</p>;

  const max = Math.max(1, ...rows.map((r) => r.priority + r.elective));
  const departments = [...new Set(rows.map((r) => r.course.department))];

  return (
    <section>
      <div className="page-head">
        <h1>Course tally</h1>
        <p className="muted">Requests per course for the upcoming year. This drives how many sections each course needs.</p>
      </div>
      {departments.map((d) => (
        <div key={d} className="card">
          <h2>{d}</h2>
          <table className="table tally">
            <thead>
              <tr>
                <th>Course</th>
                <th>Grades</th>
                <th>Priority</th>
                <th>Elective</th>
                <th className="bar-col">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => r.course.department === d)
                .map((r) => {
                  const total = r.priority + r.elective;
                  return (
                    <tr key={r.course.code} className={total === 0 ? "dim" : ""}>
                      <td>
                        <span className="code">{r.course.code}</span> {r.course.name}
                      </td>
                      <td>{gradeRange(r.course.grades)}</td>
                      <td>{r.priority}</td>
                      <td>{r.elective}</td>
                      <td className="bar-col">
                        <div className="bar">
                          <span className="p" style={{ width: `${(r.priority / max) * 100}%` }} />
                          <span className="e" style={{ width: `${(r.elective / max) * 100}%` }} />
                        </div>
                        <span className="small">{total}</span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
