import { useMemo, useState } from "react";
import type { Course, CourseRequest, RequestType } from "../types";
import { gradeRange } from "./common";

export default function CatalogPicker(props: {
  courses: Course[];
  grade: number;
  requested: CourseRequest[];
  onAdd: (code: string, type: RequestType) => void;
}) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [eligibleOnly, setEligibleOnly] = useState(true);

  const departments = useMemo(() => [...new Set(props.courses.map((c) => c.department))], [props.courses]);
  const requestedCodes = new Set(props.requested.map((r) => r.course_code));

  const visible = props.courses.filter(
    (c) =>
      (dept === "all" || c.department === dept) &&
      (!eligibleOnly || c.grades.includes(props.grade)) &&
      `${c.code} ${c.name}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="card catalog">
      <h2>Course catalog</h2>
      <input placeholder="Search code or name" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="filters compact">
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} />
          Grade {props.grade} only
        </label>
      </div>
      <ul className="catalog-list">
        {visible.map((c) => {
          const taken = requestedCodes.has(c.code);
          return (
            <li key={c.code} className={taken ? "taken" : ""}>
              <div>
                <span className="code">{c.code}</span> {c.name}
                <div className="muted small">
                  {c.department} · Gr {gradeRange(c.grades)}
                </div>
              </div>
              {taken ? (
                <span className="muted small">Requested</span>
              ) : (
                <div className="actions">
                  <button onClick={() => props.onAdd(c.code, "priority")} title="Add as priority">+ Priority</button>
                  <button onClick={() => props.onAdd(c.code, "elective")} title="Add as elective">+ Elective</button>
                </div>
              )}
            </li>
          );
        })}
        {visible.length === 0 && <li className="muted">No matching courses.</li>}
      </ul>
    </div>
  );
}
