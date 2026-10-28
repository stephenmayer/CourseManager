// Screen 2: one student's requests, checks, review status and the catalog to add from.
// Boards: docs/design/boards/StudentDetail.dc.html (Jordan), StudentErrors.dc.html (Aisha).
// Every write returns the full student, and the page re-renders from that response.
import { type ComponentType, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";

import {
  api,
  type CatalogCourse,
  type IssueOut,
  type RequestOut,
  type ReviewStatus,
  type StudentDetail,
} from "../api/client";
import type { CourseDialogProps } from "../courses/CourseDialog";
import { errorText, useLoad } from "../api/useLoad";
import { gradeList, plural } from "../courses/format";

// The course dialog belongs to the Courses screen (#8); App passes it in, tests pass a stand-in.
export type { CourseDialogProps };

const GRADES = [9, 10, 11, 12];

const STATUS_LABEL: Record<ReviewStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  on_hold: "On hold",
  done: "Done",
};

const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

type DialogProp = { courseDialog?: ComponentType<CourseDialogProps> };

// Keyed by the student ID: moving to another student (say, from a link in the course
// dialog) starts a fresh page, so no filter, form, dialog or pending write carries over.
export default function StudentDetailPage({ courseDialog }: DialogProp) {
  const { id = "" } = useParams();
  return <StudentDetailScreen key={id} id={id} courseDialog={courseDialog} />;
}

function StudentDetailScreen({ id, courseDialog: CourseDialog }: { id: string } & DialogProp) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [catalogLoad] = useLoad(api.catalog);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const latest = useRef(0);

  useEffect(() => {
    let current = true;
    api.student(id).then(
      (loaded) => {
        if (current) setStudent(loaded);
      },
      (error: unknown) => {
        if (current) setLoadError(errorText(error));
      },
    );
    return () => {
      current = false;
    };
  }, [id]);


  // Only the newest read or write may replace the student, so a slow reload can't undo
  // a later edit. Resolves to whether the request succeeded.
  const show = useCallback(async (request: Promise<StudentDetail>): Promise<boolean> => {
    const seq = ++latest.current;
    try {
      const detail = await request;
      if (seq === latest.current) {
        setStudent(detail);
        setActionError(null);
      }
      return true;
    } catch (error) {
      if (seq === latest.current) setActionError(errorText(error));
      return false;
    }
  }, []);

  const reload = useCallback(() => void show(api.student(id)), [show, id]);

  // One write at a time: the ref stops a double click in the same tick, `busy` disables
  // the buttons until the response is back.
  async function write(change: () => Promise<StudentDetail>): Promise<boolean> {
    if (writing.current) return false;
    writing.current = true;
    setBusy(true);
    try {
      return await show(change());
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="sd-detail">
        <Link to="/" className="sd-back-link">
          ← All students
        </Link>
        <p role="alert" className="sd-page-error">
          {loadError}
        </p>
      </div>
    );
  }
  if (!student) {
    return <p className="muted">Loading…</p>;
  }

  const errorCount = student.issues.filter((i) => i.severity === "error").length;

  return (
    <div className="sd-detail">
      <Link to="/" className="sd-back-link">
        ← All students
      </Link>

      <HeaderCard
        student={student}
        errorCount={errorCount}
        busy={busy}
        onMarkDone={() => write(() => api.setReview(student.id, "done"))}
        onHold={(reason) => write(() => api.setReview(student.id, "on_hold", reason))}
      />

      {actionError && (
        <p role="alert" className="sd-page-error">
          {actionError}
        </p>
      )}

      <div className="sd-detail-columns">
        <Requests
          student={student}
          busy={busy}
          onOpenCourse={CourseDialog ? setOpenCourse : undefined}
          onSwitch={(r) =>
            write(() =>
              api.updateRequest(r.id, { type: r.type === "priority" ? "elective" : "priority" }),
            )
          }
          onRemove={(r) => write(() => api.removeRequest(r.id))}
          onKeep={(r, reason) => write(() => api.updateRequest(r.id, { reason }))}
        />
        <AddFromCatalog
          student={student}
          catalog={catalogLoad.state === "ready" ? catalogLoad.data : []}
          catalogError={catalogLoad.state === "failed" ? catalogLoad.message : null}
          busy={busy}
          onAdd={(code) => write(() => api.addRequest(student.id, code))}
        />
      </div>

      {CourseDialog && openCourse && (
        <CourseDialog code={openCourse} onClose={() => setOpenCourse(null)} onChange={reload} />
      )}
    </div>
  );
}

function HeaderCard({
  student,
  errorCount,
  busy,
  onMarkDone,
  onHold,
}: {
  student: StudentDetail;
  errorCount: number;
  busy: boolean;
  onMarkDone: () => void;
  onHold: (reason: string) => Promise<boolean>;
}) {
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [holdError, setHoldError] = useState<string | null>(null);

  async function submitHold(event: FormEvent) {
    event.preventDefault();
    const reason = holdReason.trim();
    if (!reason) {
      setHoldError("Say why the student is on hold.");
      return;
    }
    if (await onHold(reason)) closeHold();
  }

  function closeHold() {
    setHoldOpen(false);
    setHoldReason("");
    setHoldError(null);
  }

  return (
    <section aria-label="Student" className="card sd-card sd-student-card">
      <div className="sd-student-card-main">
        <div className="sd-student-title">
          <h1>{student.name}</h1>
          <span className={`sd-pill sd-status-${student.status}`}>{STATUS_LABEL[student.status]}</span>
        </div>
        <div className="muted">
          {student.id} · Going into grade {student.grade}
        </div>
        {student.status === "on_hold" && student.hold_reason && (
          <div className="sd-hold-reason">On hold because: {student.hold_reason}</div>
        )}
        <p className="sd-profile">
          <span className="sd-profile-label">From SIS profile </span>
          {student.profile}
        </p>
      </div>
      <div className="sd-student-actions">
        <button
          type="button"
          className="sd-btn sd-btn-primary"
          disabled={errorCount > 0 || busy}
          aria-describedby="done-why"
          onClick={onMarkDone}
        >
          Mark Done
        </button>
        {holdOpen ? (
          <form className="sd-hold-form" onSubmit={submitHold} noValidate>
            <label htmlFor="hold-reason" className="sd-field-label">
              Why is this student on hold?
            </label>
            <input
              id="hold-reason"
              type="text"
              className="sd-input"
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              autoFocus
            />
            {holdError && (
              <span role="alert" className="sd-field-error">
                {holdError}
              </span>
            )}
            <div className="sd-hold-buttons">
              <button type="submit" className="sd-btn sd-btn-dark" disabled={busy}>
                Put on hold
              </button>
              <button type="button" className="sd-btn" onClick={closeHold}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="sd-btn" onClick={() => setHoldOpen(true)}>
            Put on hold…
          </button>
        )}
        <span id="done-why" className="sd-hint">
          {errorCount > 0
            ? `Fix ${plural(errorCount, "error")} to mark Done.`
            : "Warnings don't block Done. Errors do."}
        </span>
      </div>
    </section>
  );
}

interface RowActions {
  busy: boolean;
  onOpenCourse?: (code: string) => void;
  onSwitch: (request: RequestOut) => void;
  onRemove: (request: RequestOut) => void;
  onKeep: (request: RequestOut, reason: string) => void;
}

function Requests({ student, ...actions }: { student: StudentDetail } & RowActions) {
  const priority = student.requests.filter((r) => r.type === "priority");
  const elective = student.requests.filter((r) => r.type === "elective");
  const errors = student.issues.filter((i) => i.severity === "error");
  const warnings = student.issues.filter((i) => i.severity === "warning");
  const studentIssues = student.issues.filter((i) => i.request_id === null);
  const sisProblems = student.requests.filter(
    (r) => r.source === "sis" && errors.some((i) => i.request_id === r.id),
  ).length;

  return (
    <section aria-labelledby="req-h" className="card sd-card sd-requests">
      <div className="sd-requests-head">
        <h2 id="req-h">Requests for 2027–28</h2>
        <span className="muted">
          {priority.length} priority · {elective.length} elective
          {errors.length > 0 && (
            <>
              {" · "}
              <b className="sd-error-text">{plural(errors.length, "error")}</b>
            </>
          )}
          {warnings.length > 0 && ` · ${plural(warnings.length, "warning")}`}
        </span>
      </div>

      {sisProblems > 0 && (
        <p className="sd-sis-banner">
          {sisProblems === 1
            ? "One request came from the SIS with a problem. It's shown as it arrived; nothing was changed. Remove or replace it, then mark Done."
            : `${COUNT_WORDS[sisProblems] ?? sisProblems} requests came from the SIS with problems. They're shown as they arrived; nothing was changed. Remove or replace them, then mark Done.`}
        </p>
      )}

      {studentIssues.length > 0 && (
        <div data-testid="student-issues" className="sd-student-issues">
          {studentIssues.map((issue) => (
            <IssueLine key={`${issue.rule}:${issue.message}`} issue={issue} />
          ))}
        </div>
      )}

      {student.requests.length === 0 ? (
        <p className="muted">No requests yet. Add courses from the catalog.</p>
      ) : (
        <>
          {actions.onOpenCourse && (
            <p className="sd-hint">Select a course code to see everyone who requested it.</p>
          )}
          <RequestGroup
            id="group-priority"
            title="Priority: must take"
            requests={priority}
            issues={student.issues}
            {...actions}
          />
          <RequestGroup
            id="group-elective"
            title="Elective"
            requests={elective}
            issues={student.issues}
            {...actions}
          />
        </>
      )}
    </section>
  );
}

function RequestGroup({
  id,
  title,
  requests,
  issues,
  ...actions
}: { id: string; title: string; requests: RequestOut[]; issues: IssueOut[] } & RowActions) {
  return (
    <>
      <h3 id={id} className="sd-group-heading">
        {title}
      </h3>
      {requests.length === 0 ? (
        <p className="muted">None.</p>
      ) : (
        <ul aria-labelledby={id} className="sd-request-list">
          {requests.map((r) => (
            <RequestRow
              // Re-mount when the saved reason changes so the field shows the server's value.
              key={`${r.id}:${r.reason ?? ""}`}
              request={r}
              issues={issues.filter((i) => i.request_id === r.id)}
              {...actions}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function removeLabel(request: RequestOut, issues: IssueOut[]): string {
  const course = request.course_name
    ? `${request.course_code} ${request.course_name}`
    : request.course_code;
  if (issues.some((i) => i.rule === "duplicate_course")) {
    return `Remove the ${request.type} copy of ${course}`;
  }
  return `Remove ${course}`;
}

function RequestRow({
  request,
  issues,
  busy,
  onOpenCourse,
  onSwitch,
  onRemove,
  onKeep,
}: { request: RequestOut; issues: IssueOut[] } & RowActions) {
  const [reason, setReason] = useState(request.reason ?? "");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const tone = errors.length > 0 ? "error" : warnings.length > 0 ? "warn" : "plain";
  const known = request.course_name !== null;
  const reasonId = `reason-${request.id}`;

  function keep() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError("Say why you're keeping it.");
      return;
    }
    setReasonError(null);
    onKeep(request, trimmed);
  }

  return (
    <li data-testid={`request-${request.course_code}`} className={`sd-request sd-request-${tone}`}>
      <div className="sd-request-line">
        {known && onOpenCourse ? (
          <button
            type="button"
            className="sd-course-code sd-link-button"
            title="See who requested this course"
            onClick={() => onOpenCourse(request.course_code)}
          >
            {request.course_code}
          </button>
        ) : (
          <span className="sd-course-code">{request.course_code}</span>
        )}
        <span className="sd-request-name">
          {known ? (
            <>
              {request.course_name}
              <span className="muted">
                {" "}
                · {request.department} · grade {gradeList(request.grades ?? [])}
              </span>
            </>
          ) : (
            <span className="muted">Unknown course</span>
          )}
        </span>
        <span className={`sd-pill ${request.source === "sis" ? "sd-tag-sis" : "sd-tag-app"}`}>
          {request.source === "sis" ? "From SIS" : "Added in app"}
        </span>
        <button
          type="button"
          className="sd-btn sd-btn-small"
          disabled={busy}
          onClick={() => onSwitch(request)}
        >
          {request.type === "priority" ? "Make elective" : "Make priority"}
        </button>
        <button
          type="button"
          className="sd-btn sd-btn-icon"
          aria-label={removeLabel(request, issues)}
          disabled={busy}
          onClick={() => onRemove(request)}
        >
          ✕
        </button>
      </div>

      {[...errors, ...warnings].map((issue) => (
        <IssueLine key={`${issue.rule}:${issue.message}`} issue={issue} />
      ))}

      {errors.length === 0 && warnings.length > 0 && (
        <div className="sd-keep-reason">
          <div className="sd-keep-field">
            <label htmlFor={reasonId} className="sd-field-label">
              Reason for keeping it
            </label>
            <input
              id={reasonId}
              type="text"
              className="sd-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <button type="button" className="sd-btn sd-btn-dark" disabled={busy} onClick={keep}>
            Keep with reason
          </button>
          {reasonError && (
            <span role="alert" className="sd-field-error">
              {reasonError}
            </span>
          )}
          {warnings.every((w) => w.kept) && <span className="sd-kept-note">Kept with reason</span>}
        </div>
      )}
    </li>
  );
}

function IssueLine({ issue }: { issue: IssueOut }) {
  const error = issue.severity === "error";
  return (
    <div className={`sd-issue ${error ? "sd-error-text" : "sd-warn-text"}`}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {error ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v6M12 16.5h.01" />
          </>
        ) : (
          <>
            <path d="M12 3 2 21h20L12 3z" />
            <path d="M12 10v5M12 18h.01" />
          </>
        )}
      </svg>
      <span>
        <b>{issue.message}</b> {issue.detail}
      </span>
    </div>
  );
}

function AddFromCatalog({
  student,
  catalog,
  catalogError,
  busy,
  onAdd,
}: {
  student: StudentDetail;
  catalog: CatalogCourse[];
  catalogError: string | null;
  busy: boolean;
  onAdd: (code: string) => void;
}) {
  // Starts with the student's grade (S10); null until the user changes it.
  const [checked, setChecked] = useState<number[] | null>(null);
  const [search, setSearch] = useState("");
  const grades = checked ?? [student.grade];
  const onList = new Set(student.requests.map((r) => r.course_code));
  const query = search.trim().toLowerCase();

  const visible = catalog.filter(
    (c) =>
      c.grades.some((g) => grades.includes(g)) &&
      (!query || c.code.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)),
  );
  const departments = [...new Set(visible.map((c) => c.department))];

  function toggle(grade: number) {
    setChecked(grades.includes(grade) ? grades.filter((g) => g !== grade) : [...grades, grade]);
  }

  return (
    <aside aria-labelledby="cat-h" className="card sd-card sd-catalog">
      <h2 id="cat-h">Add from catalog</h2>
      <div className="sd-field">
        <label htmlFor="cat-search" className="sd-field-label">
          Search courses
        </label>
        <input
          id="cat-search"
          type="search"
          className="sd-input"
          placeholder="Name or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <fieldset className="sd-grade-filter">
        <legend className="sd-field-label">Show courses for grades</legend>
        <div className="sd-grade-options">
          {GRADES.map((grade) => (
            <label key={grade} className={`sd-chip${grades.includes(grade) ? " sd-chip-on" : ""}`}>
              <input
                type="checkbox"
                checked={grades.includes(grade)}
                onChange={() => toggle(grade)}
              />
              <span>Grade {grade}</span>
            </label>
          ))}
        </div>
        <span className="sd-hint">
          Starts with the student's grade ({student.grade}). Check more to see other courses.
        </span>
      </fieldset>
      {catalogError ? (
        <p role="alert" className="sd-page-error">
          {catalogError}
        </p>
      ) : departments.length === 0 ? (
        <p className="muted">No courses match.</p>
      ) : (
        <div className="sd-table-scroll">
          <table aria-label="Catalog courses" className="sd-catalog-table">
            <thead>
              <tr>
                <th scope="col" className="sd-col-code">
                  Code
                </th>
                <th scope="col">Course</th>
                <th scope="col" className="sd-col-grades">
                  Grades
                </th>
                <th scope="col" className="sd-col-action">
                  <span className="sd-visually-hidden">Action</span>
                </th>
              </tr>
            </thead>
            {departments.map((department) => (
              <tbody key={department}>
                <tr>
                  <th scope="rowgroup" colSpan={4} className="sd-dept-heading">
                    {department}
                  </th>
                </tr>
                {visible
                  .filter((c) => c.department === department)
                  .map((c) => (
                    <tr key={c.code}>
                      <td className="sd-col-code">{c.code}</td>
                      <td>{c.name}</td>
                      <td className="muted">{gradeList(c.grades)}</td>
                      <td className="sd-col-action">
                        {onList.has(c.code) ? (
                          <span className="sd-on-list">On list</span>
                        ) : (
                          <button
                            type="button"
                            className="sd-btn sd-btn-add"
                            aria-label={`Add ${c.code} ${c.name}`}
                            disabled={busy}
                            onClick={() => onAdd(c.code)}
                          >
                            + Add
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      <p className="sd-hint">New courses are added as electives. Switch to priority on the list.</p>
    </aside>
  );
}
