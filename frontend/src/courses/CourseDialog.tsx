// The course dialog (Q12): who requested a course, with the same edits as the student page.
// Opened from the Courses screen and from any course code on a student page, so it
// fetches its own data and takes only the code.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { api, type CatalogCourse, type CourseRequest } from "../api/client";
import { errorText, gradesLabel, plural } from "./format";

export interface CourseDialogProps {
  code: string;
  onClose: () => void;
  /** Called after an edit inside the dialog succeeds, so the opener can reload. */
  onChange: () => void;
}

type Load =
  | { state: "loading" }
  | { state: "ready"; course: CatalogCourse | undefined; rows: CourseRequest[] }
  | { state: "failed"; message: string };

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

function RequestNote({ row, rows }: { row: CourseRequest; rows: CourseRequest[] }) {
  return row.issues.map((issue) => {
    if (issue.rule === "duplicate_course") {
      const original = rows.find((r) => r.request.id === issue.related_request_id);
      return (
        <p key={issue.rule} className="request-note">
          <b>Requested twice.</b>{" "}
          {original
            ? `${firstName(row.student_name)} already has this as a ${original.request.type}. Remove this copy.`
            : `${issue.message} ${issue.detail}`}
        </p>
      );
    }
    if (issue.rule === "out_of_grade") {
      return (
        <p key={issue.rule} className="request-note">
          {issue.kept
            ? `Out of grade, kept with reason: "${row.request.reason ?? ""}"`
            : `Out of grade. ${issue.message}`}
        </p>
      );
    }
    return (
      <p key={issue.rule} className="request-note">
        {issue.message}
      </p>
    );
  });
}

function cardClass(row: CourseRequest): string {
  if (row.issues.some((i) => i.severity === "error")) return "request-card request-card-error";
  if (row.issues.some((i) => i.severity === "warning")) return "request-card request-card-warning";
  return "request-card";
}

export default function CourseDialog({ code, onClose, onChange }: CourseDialogProps) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Bumped after each edit to fetch the requests again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([api.courseRequests(code), api.catalog()]).then(
      ([rows, catalog]) => {
        if (live) setLoad({ state: "ready", course: catalog.find((c) => c.code === code), rows });
      },
      (e: unknown) => {
        if (live) setLoad({ state: "failed", message: errorText(e) });
      },
    );
    return () => {
      live = false;
    };
  }, [code, version]);

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
        event.stopPropagation();
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
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const course = load.state === "ready" ? load.course : undefined;
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
        <button ref={closeRef} type="button" className="dialog-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <div className="dialog-eyebrow">Requests for this course</div>
        <h2 id="course-dialog-title">{title}</h2>

        {load.state === "loading" && <p className="muted">Loading requests…</p>}
        {load.state === "failed" && (
          <p role="alert" className="error-text">
            {load.message}
          </p>
        )}
        {load.state === "ready" && (
          <>
            <p className="muted">
              {course
                ? `${course.department} · ${gradesLabel(course.grades)} · ${countLabel(load.rows)}`
                : `Not in the catalog · ${countLabel(load.rows)}`}
            </p>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            {load.rows.length === 0 ? (
              <p>No one has requested this course.</p>
            ) : (
              <ul className="request-cards">
                {load.rows.map((row) => {
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
                      <RequestNote row={row} rows={load.rows} />
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
