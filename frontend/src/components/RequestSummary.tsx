import type { CourseRequest } from "../types";

const CORE = ["Math", "English", "Social Studies", "Science"];

// The at-a-glance view a counselor or AP scans before signing off: one row per department.
export default function RequestSummary({ requests }: { requests: CourseRequest[] }) {
  const depts = [...new Set([...CORE, ...requests.map((r) => r.course?.department ?? "Unknown")])];
  const aps = requests.filter((r) => r.course?.name.startsWith("AP ")).length;

  return (
    <div className="card">
      <h2>Summary</h2>
      <p className="muted small">
        {requests.length} requests · {requests.filter((r) => r.type === "priority").length} priority ·{" "}
        {requests.filter((r) => r.type === "elective").length} elective · {aps} AP
      </p>
      <table className="table summary">
        <thead>
          <tr>
            <th>Department</th>
            <th>Priority</th>
            <th>Elective</th>
          </tr>
        </thead>
        <tbody>
          {depts.map((d) => {
            const inDept = requests.filter((r) => (r.course?.department ?? "Unknown") === d);
            const list = (t: string) =>
              inDept.filter((r) => r.type === t).map((r) => r.course?.name ?? r.course_code).join(", ") || "—";
            const missingCore = CORE.includes(d) && !inDept.some((r) => r.type === "priority");
            return (
              <tr key={d} className={missingCore ? "dim" : ""}>
                <td>{d}</td>
                <td>{list("priority")}</td>
                <td>{list("elective")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
