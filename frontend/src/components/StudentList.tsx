import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { PlanStatus, StudentSummary } from "../types";
import { STATUS_LABELS } from "../types";
import { Flags, IssueCounts, StatusPill } from "./common";

export default function StudentList() {
  const [students, setStudents] = useState<StudentSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [attentionOnly, setAttentionOnly] = useState(false);

  useEffect(() => {
    api.listStudents().then(setStudents);
  }, []);

  const visible = useMemo(
    () =>
      (students ?? []).filter(
        (s) =>
          (grade === "all" || s.student.grade === Number(grade)) &&
          (status === "all" || s.status === status) &&
          (!attentionOnly || s.error_count + s.warning_count > 0 || s.student.flags.length > 0) &&
          `${s.student.name} ${s.student.id}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [students, query, grade, status, attentionOnly],
  );

  if (!students) return <p className="muted">Loading students…</p>;

  const done = students.filter((s) => s.status === "complete").length;

  return (
    <section>
      <div className="page-head">
        <h1>Students</h1>
        <p className="muted">
          {done} of {students.length} request lists complete
        </p>
      </div>

      <div className="filters">
        <input placeholder="Search name or ID" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="all">All grades</option>
          {[9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Any status</option>
          {(Object.keys(STATUS_LABELS) as PlanStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={attentionOnly} onChange={(e) => setAttentionOnly(e.target.checked)} />
          Needs attention
        </label>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Grade</th>
            <th>Context</th>
            <th>Requests</th>
            <th>Checks</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((s) => (
            <tr key={s.student.id} className="clickable" onClick={() => (window.location.hash = `#/students/${s.student.id}`)}>
              <td>
                <a href={`#/students/${s.student.id}`}>{s.student.name}</a>
                <div className="muted small">{s.student.id}</div>
              </td>
              <td>{s.student.grade}</td>
              <td><Flags flags={s.student.flags} /></td>
              <td>
                {s.priority_count} priority · {s.elective_count} elective
              </td>
              <td><IssueCounts errors={s.error_count} warnings={s.warning_count} /></td>
              <td><StatusPill status={s.status} /></td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">No students match these filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
