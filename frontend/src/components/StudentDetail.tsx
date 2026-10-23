import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { Course, CourseRequest, Issue, PlanStatus, RequestType, StudentDetail } from "../types";
import { STATUS_LABELS } from "../types";
import CatalogPicker from "./CatalogPicker";
import RequestSummary from "./RequestSummary";
import { Flags, gradeRange } from "./common";

export default function StudentDetailView({ studentId }: { studentId: string }) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStudent(studentId).then(setDetail).catch((e) => setError(e.message));
    api.listCourses().then(setCourses);
  }, [studentId]);

  // Every mutation returns the updated detail, so the view re-renders from server truth
  // (requests, issues, status, and history stay consistent without extra fetches).
  const mutate = useCallback(async (fn: () => Promise<StudentDetail>) => {
    setError(null);
    try {
      setDetail(await fn());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    }
  }, []);

  if (!detail) return <p className="muted">{error ?? "Loading…"}</p>;

  const { student, requests, issues } = detail;
  const studentIssues = issues.filter((i) => !i.request_id);
  const issuesFor = (r: CourseRequest) => issues.filter((i) => i.request_id === r.id);
  const hasErrors = issues.some((i) => i.severity === "error");

  const add = (course_code: string, type: RequestType) =>
    mutate(() => api.addRequest(student.id, { course_code, type }));

  return (
    <section>
      <a href="#/students" className="back">← All students</a>

      <div className="detail-head">
        <div>
          <h1>
            {student.name} <span className="muted">· Grade {student.grade} · {student.id}</span>
          </h1>
          <div className="flags"><Flags flags={student.flags} /></div>
          <p className="profile">{student.profile}</p>
        </div>
        <div className="status-box">
          <span className="muted small">Request list status</span>
          <select
            value={detail.status}
            onChange={(e) => mutate(() => api.setStatus(student.id, e.target.value as PlanStatus))}
          >
            {(Object.keys(STATUS_LABELS) as PlanStatus[]).map((s) => (
              <option key={s} value={s} disabled={s === "complete" && hasErrors}>
                {STATUS_LABELS[s]}
                {s === "complete" && hasErrors ? " (fix errors first)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {studentIssues.length > 0 && (
        <div className="alert warning">
          {studentIssues.map((i) => (
            <div key={i.rule + i.message}>⚠ {i.message}</div>
          ))}
        </div>
      )}

      <div className="columns">
        <div className="main-col">
          {(["priority", "elective"] as RequestType[]).map((type) => {
            const group = requests.filter((r) => r.type === type);
            return (
              <div key={type} className="card">
                <h2>
                  {type === "priority" ? "Priority requests" : "Elective requests"}{" "}
                  <span className="muted">({group.length})</span>
                </h2>
                <p className="muted small">
                  {type === "priority"
                    ? "Courses the student must take: graduation requirements and retakes."
                    : "Optional courses from student interest or counselor recommendation."}
                </p>
                {group.length === 0 && <p className="muted">None yet. Add from the catalog.</p>}
                {group.map((r) => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    issues={issuesFor(r)}
                    onSwitch={() =>
                      mutate(() =>
                        api.updateRequest(student.id, r.id, { type: r.type === "priority" ? "elective" : "priority" }),
                      )
                    }
                    onRemove={() => mutate(() => api.removeRequest(student.id, r.id))}
                    onNote={(note) => mutate(() => api.updateRequest(student.id, r.id, { note }))}
                    onOverride={(reason) =>
                      mutate(() => api.updateRequest(student.id, r.id, { override_reason: reason }))
                    }
                  />
                ))}
              </div>
            );
          })}

          <RequestSummary requests={requests} />

          <div className="card">
            <h2>Change history</h2>
            {detail.history.length === 0 && <p className="muted">No changes in this app yet. Requests above came from the SIS.</p>}
            <ul className="history">
              {detail.history.map((h, i) => (
                <li key={i}>
                  <span className="muted small">{new Date(h.at).toLocaleString()} · {h.actor}</span>
                  <div><strong>{h.action}</strong> {h.detail}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="side-col">
          <CatalogPicker courses={courses} grade={student.grade} requested={requests} onAdd={add} />
        </div>
      </div>
    </section>
  );
}

function RequestRow(props: {
  request: CourseRequest;
  issues: Issue[];
  onSwitch: () => void;
  onRemove: () => void;
  onNote: (note: string) => void;
  onOverride: (reason: string | null) => void;
}) {
  const { request: r, issues } = props;
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(r.note);
  const [overriding, setOverriding] = useState(false);
  const [reason, setReason] = useState("");
  const worst = issues.some((i) => i.severity === "error")
    ? "error"
    : issues.some((i) => !i.acknowledged)
      ? "warning"
      : "";

  return (
    <div className={`request ${worst}`}>
      <div className="request-main">
        <div>
          <span className="code">{r.course_code}</span>{" "}
          {r.course ? (
            <>
              {r.course.name}{" "}
              <span className="muted small">
                {r.course.department} · Gr {gradeRange(r.course.grades)}
              </span>
            </>
          ) : (
            <span className="muted">Unknown course</span>
          )}
          <span className={`chip source-${r.source}`} title={r.sis_id ?? `Added by ${r.updated_by}`}>
            {r.source === "sis" ? "From SIS" : "Added in app"}
          </span>
        </div>
        <div className="actions">
          <button onClick={props.onSwitch}>Make {r.type === "priority" ? "elective" : "priority"}</button>
          <button onClick={() => setEditingNote(true)}>Note</button>
          <button className="danger" onClick={props.onRemove}>Remove</button>
        </div>
      </div>

      {editingNote ? (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            props.onNote(note);
            setEditingNote(false);
          }}
        >
          <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Retake, ELL support" />
          <button type="submit">Save</button>
          <button type="button" className="link" onClick={() => setEditingNote(false)}>Cancel</button>
        </form>
      ) : (
        r.note && <div className="note">“{r.note}”</div>
      )}

      {issues.map((i) => (
        <div key={i.rule} className={`issue ${i.severity} ${i.acknowledged ? "ack" : ""}`}>
          {i.severity === "error" ? "✖" : i.acknowledged ? "✓" : "⚠"} {i.message}
          {i.acknowledged && (
            <>
              {" "}<span className="muted">Override: {r.override_reason}</span>{" "}
              <button className="link" onClick={() => props.onOverride(null)}>Undo</button>
            </>
          )}
          {i.severity === "warning" && !i.acknowledged && !overriding && (
            <button className="link" onClick={() => setOverriding(true)}>Approve with reason</button>
          )}
        </div>
      ))}
      {overriding && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) return;
            props.onOverride(reason.trim());
            setOverriding(false);
          }}
        >
          <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this is right for the student" />
          <button type="submit">Approve</button>
          <button type="button" className="link" onClick={() => setOverriding(false)}>Cancel</button>
        </form>
      )}
    </div>
  );
}
