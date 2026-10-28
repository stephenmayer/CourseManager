// The course dialog (Q12): who requested a course, with the same edits as the student page.
// Opened from the Courses screen and from any course code on a student page, so it
// fetches its own data and takes only the code.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { api, type CourseRequest, type IssueOut } from "../api/client";
import { errorText, useLoad } from "../api/useLoad";
import ErrorText from "../shell/ErrorText";
import { gradesLabel, plural } from "./format";

export interface CourseDialogProps {
  code: string;
  onClose: () => void;
  /** Called after an edit inside the dialog succeeds, so the opener can reload. */
  onChange: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function firstName(name: string): string {
  return name.split(" ")[0];
}

function countLabel(rows: CourseRequest[]): string {
  const priority = rows.filter((r) => r.request.type === "priority").length;
  const elective = rows.length - priority;
  const parts = [
    priority > 0 ? `${priority} priority` : "",
    elective > 0 ? `${elective} elective` : "",
  ].filter(Boolean);
  const total = plural(rows.length, "request");
  return parts.length > 0 ? `${total} (${parts.join(", ")})` : total;
}

// The boards' wording for this dialog; other issues use the API's message as is.
function noteText(issue: IssueOut, row: CourseRequest, rows: CourseRequest[]): ReactNode {
  if (issue.rule === "duplicate_course") {
    const original = rows.find((r) => r.request.id === issue.related_request_id);
    return (
      <>
        <b>Requested twice.</b>{" "}
        {original
          ? `${firstName(row.student_name)} already has this as a ${original.request.type}. Remove this copy.`
          : `${issue.message} ${issue.detail}`}
      </>
    );
  }
  if (issue.rule === "out_of_grade") {
    return issue.kept
      ? `Out of grade, kept with reason: "${row.request.reason ?? ""}"`
      : `Out of grade. ${issue.message}`;
  }
  return issue.message;
}

function cardClass(row: CourseRequest): string {
  if (row.issues.some((i) => i.severity === "error")) return "request-card request-card-error";
  if (row.issues.some((i) => i.severity === "warning")) return "request-card request-card-warning";
  return "request-card";
}

export default function CourseDialog({ code, onClose, onChange }: CourseDialogProps) {
  const fetcher = useCallback(
    () =>
      Promise.all([api.courseRequests(code), api.catalog()]).then(([rows, catalog]) => ({
        rows,
        course: catalog.find((c) => c.code === code),
      })),
    [code],
  );
  const [load, reload] = useLoad(fetcher);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Focus moves in on open and goes back to whatever opened the dialog on close.
  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  // Keys are handled on the document: after an edit the focused button can be disabled
  // or gone, leaving focus on the body, and Escape and Tab must still work.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  async function edit(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChange();
      reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const course = load.state === "ready" ? load.data.course : undefined;
  const title = course ? `${code} ${course.name}` : code;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-dialog-title"
        className="dialog"
      >
        <button ref={closeRef} type="button" className="button dialog-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <div className="dialog-eyebrow">Requests for this course</div>
        <h2 id="course-dialog-title">{title}</h2>

        {load.state === "loading" && <p className="muted">Loading requests…</p>}
        {load.state === "failed" && <ErrorText message={load.message} />}
        {load.state === "ready" && (
          <>
            <p className="muted">
              {course
                ? `${course.department} · ${gradesLabel(course.grades)} · ${countLabel(load.data.rows)}`
                : `Not in the catalog · ${countLabel(load.data.rows)}`}
            </p>
            <ErrorText message={error} />
            {load.data.rows.length === 0 ? (
              <p>No one has requested this course.</p>
            ) : (
              <ul className="request-cards">
                {load.data.rows.map((row) => {
                  const { request } = row;
                  const duplicate = row.issues.some((i) => i.rule === "duplicate_course");
                  const other = request.type === "priority" ? "elective" : "priority";
                  return (
                    <li key={request.id} className={cardClass(row)}>
                      <div className="request-card-head">
                        <span className="request-card-name">
                          <Link to={`/students/${row.student_id}`} className="student-link">
                            {row.student_name}
                          </Link>
                          <span className="muted"> · grade {row.student_grade}</span>
                        </span>
                        <span className={`pill pill-${request.type}`}>
                          {request.type === "priority" ? "Priority" : "Elective"}
                        </span>
                      </div>
                      {row.issues.map((issue) => (
                        <p key={issue.rule} className="request-note">
                          {noteText(issue, row, load.data.rows)}
                        </p>
                      ))}
                      <div className="request-card-actions">
                        {!duplicate && (
                          <button
                            type="button"
                            className="button"
                            disabled={busy}
                            onClick={() => void edit(() => api.updateRequest(request.id, { type: other }))}
                          >
                            Make {other}
                          </button>
                        )}
                        <button
                          type="button"
                          className="button"
                          disabled={busy}
                          onClick={() => void edit(() => api.removeRequest(request.id))}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
        <p className="dialog-footnote">
          Changes here are the same as editing on the student's page, and reopen a student marked Done.
        </p>
      </div>
    </div>
  );
}
