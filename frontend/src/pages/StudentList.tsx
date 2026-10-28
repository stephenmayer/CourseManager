import { useEffect, useState } from "react";
import { Link } from "react-router";

import { api, type ReviewStatus, type StudentSummary } from "../api/client";

const STATUS_LABELS: Record<ReviewStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  on_hold: "On hold",
  done: "Done",
};

type Checks = "errors" | "warnings" | "clear";
type Tone = "error" | "warn" | "ok";

// The pill shows the worst check; errors lead because they block Done.
function checksOf(s: StudentSummary): Checks {
  if (s.error_count > 0) return "errors";
  return s.warning_count > 0 ? "warnings" : "clear";
}

interface FilterOption<V> {
  value: V;
  label: string;
  match: (s: StudentSummary) => boolean;
  tone?: Tone;
}

const STATUS_FILTERS: FilterOption<ReviewStatus>[] = (
  Object.keys(STATUS_LABELS) as ReviewStatus[]
).map((value) => ({ value, label: STATUS_LABELS[value], match: (s) => s.status === value }));

// "Has warnings" includes students who also have errors, so it isn't checksOf() === "warnings".
const CHECKS_FILTERS: FilterOption<Checks>[] = [
  { value: "errors", label: "Has errors", tone: "error", match: (s) => s.error_count > 0 },
  { value: "warnings", label: "Has warnings", tone: "warn", match: (s) => s.warning_count > 0 },
  { value: "clear", label: "All clear", tone: "ok", match: (s) => checksOf(s) === "clear" },
];

// S11: the list shows a short preview of the SIS profile; "more" expands it in place.
const PROFILE_PREVIEW = 40;
const PROFILE_EXPANDED = 255;

type Load =
  | { state: "loading" }
  | { state: "ready"; students: StudentSummary[] }
  | { state: "failed"; message: string };

function useStudents(): Load {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let live = true;
    api.students().then(
      (list) => {
        if (live) setLoad({ state: "ready", students: list.students });
      },
      (error: unknown) => {
        if (live) {
          const message = error instanceof Error ? error.message : "The students couldn't be loaded.";
          setLoad({ state: "failed", message });
        }
      },
    );
    return () => {
      live = false;
    };
  }, []);

  return load;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function needsAttention(s: StudentSummary): boolean {
  return s.status !== "done" && checksOf(s) !== "clear";
}

function summaryLine(students: StudentSummary[]): string {
  const count = (match: (s: StudentSummary) => boolean) => students.filter(match).length;
  return [
    plural(students.length, "student"),
    `${count((s) => s.status === "done")} done`,
    `${count((s) => s.status === "on_hold")} on hold`,
    `${count(needsAttention)} need attention`,
  ].join(" · ");
}

// `query` is already trimmed and lowercased.
function matchesSearch(s: StudentSummary, query: string): boolean {
  return query === "" || s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query);
}

function ChipGroup<V extends string>({
  name,
  label,
  options,
  students,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: FilterOption<V>[];
  students: StudentSummary[];
  value: V | null;
  onChange: (value: V | null) => void;
}) {
  const chips: FilterOption<V | null>[] = [{ value: null, label: "All", match: () => true }, ...options];
  return (
    <div role="group" aria-label={`Filter by ${name}`} className="chip-row">
      <span className="chip-row-label">{label}</span>
      {chips.map((chip) => (
        <button
          key={chip.value ?? "all"}
          type="button"
          className="chip"
          aria-pressed={value === chip.value}
          onClick={() => onChange(chip.value)}
        >
          {chip.tone && <span aria-hidden="true" className={`chip-dot tone-${chip.tone}`} />}
          {`${chip.label} · ${students.filter(chip.match).length}`}
        </button>
      ))}
    </div>
  );
}

const CHECKS_PILL: Record<Checks, (s: StudentSummary) => [Tone, string]> = {
  errors: (s) => ["error", plural(s.error_count, "error")],
  warnings: (s) => ["warn", plural(s.warning_count, "warning")],
  clear: () => ["ok", "All clear"],
};

function ChecksPill({ student }: { student: StudentSummary }) {
  const [tone, copy] = CHECKS_PILL[checksOf(student)](student);
  return <span className={`pill tone-${tone}`}>{copy}</span>;
}

function clip(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function ProfilePreview({ profile }: { profile: string }) {
  const [expanded, setExpanded] = useState(false);

  if (profile.length <= PROFILE_PREVIEW) return <span>{profile}</span>;
  return (
    <>
      <span>{clip(profile, expanded ? PROFILE_EXPANDED : PROFILE_PREVIEW)}</span>{" "}
      <button
        type="button"
        className="link-button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "less" : "more"}
      </button>
    </>
  );
}

function StudentTable({ students }: { students: StudentSummary[] }) {
  return (
    <div className="table-frame">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Student</th>
            <th scope="col">Grade</th>
            <th scope="col">From profile</th>
            <th scope="col">Requests</th>
            <th scope="col">Checks</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-row">
                No students match
              </td>
            </tr>
          )}
          {students.map((s) => (
            <tr key={s.id}>
              <td>
                <Link to={`/students/${s.id}`} className="student-link">
                  {s.name}
                </Link>
                <div className="cell-sub">{s.id}</div>
              </td>
              <td>{s.grade}</td>
              <td className="muted profile-cell">
                <ProfilePreview profile={s.profile} />
              </td>
              <td>{`${s.priority_count} P · ${s.elective_count} E`}</td>
              <td>
                <ChecksPill student={s} />
              </td>
              <td>
                <span className={`pill status-${s.status}`}>{STATUS_LABELS[s.status]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StudentListPage() {
  const load = useStudents();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [checks, setChecks] = useState<Checks | null>(null);

  const all = load.state === "ready" ? load.students : [];
  const q = query.trim().toLowerCase();
  const statusMatch = STATUS_FILTERS.find((f) => f.value === status)?.match;
  const checksMatch = CHECKS_FILTERS.find((f) => f.value === checks)?.match;
  // E12: search, status and checks combine.
  const shown = all.filter(
    (s) =>
      matchesSearch(s, q) && (statusMatch?.(s) ?? true) && (checksMatch?.(s) ?? true),
  );

  return (
    <div className="student-list">
      <div className="page-title-row">
        <div className="page-title">
          <h1>Students</h1>
          {load.state === "ready" && <p className="muted">{summaryLine(all)}</p>}
        </div>
        <div className="field">
          <label htmlFor="student-search">Find a student</label>
          <input
            id="student-search"
            type="search"
            placeholder="Name or ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="filters">
        <ChipGroup
          name="status"
          label="Status"
          options={STATUS_FILTERS}
          students={all}
          value={status}
          onChange={setStatus}
        />
        <ChipGroup
          name="checks"
          label="Checks"
          options={CHECKS_FILTERS}
          students={all}
          value={checks}
          onChange={setChecks}
        />
      </div>

      {load.state === "loading" && <p className="muted">Loading students…</p>}
      {load.state === "failed" && (
        <p role="alert" className="error-text">
          {load.message}
        </p>
      )}
      {load.state === "ready" && <StudentTable students={shown} />}

      <p className="footnote muted">Errors block Done until fixed. Warnings can be kept with a reason.</p>
    </div>
  );
}
