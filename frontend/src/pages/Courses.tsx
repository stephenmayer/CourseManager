// Screen 3 (Q12): request counts per catalog course, codes not in the catalog, and the
// course dialog. The catalog is SIS-owned and read-only here; requests can be edited.
import { useEffect, useId, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { api, type CatalogCourseCount, type CourseRequest, type CoursesResponse } from "../api/client";
import CourseDialog from "../courses/CourseDialog";
import { errorText, gradeList, plural } from "../courses/format";

interface CoursesData {
  courses: CatalogCourseCount[];
  // Requests for each code the catalog doesn't have, to name the students (E10).
  notInCatalog: CourseRequest[];
}

type Load = { state: "loading" } | { state: "ready"; data: CoursesData } | { state: "failed"; message: string };

async function fetchCourses(): Promise<CoursesData> {
  const { courses, not_in_catalog }: CoursesResponse = await api.courses();
  const unknown = await Promise.all(not_in_catalog.map((c) => api.courseRequests(c.code)));
  return { courses, notInCatalog: unknown.flat() };
}

function matches(query: string, ...fields: string[]): boolean {
  const q = query.trim().toLowerCase();
  return q === "" || fields.some((f) => f.toLowerCase().includes(q));
}

function departments(courses: CatalogCourseCount[]): [string, CatalogCourseCount[]][] {
  const byName = new Map<string, CatalogCourseCount[]>();
  for (const course of courses) {
    byName.set(course.department, [...(byName.get(course.department) ?? []), course]);
  }
  return [...byName];
}

function Count({ value, strong = false }: { value: number; strong?: boolean }) {
  const classes = ["num", strong ? "strong" : "", value === 0 ? "zero" : ""].filter(Boolean);
  return <td className={classes.join(" ")}>{value}</td>;
}

function DepartmentTable({
  name,
  all,
  shown,
  selected,
  onOpen,
}: {
  name: string;
  all: CatalogCourseCount[];
  shown: CatalogCourseCount[];
  selected: string | null;
  onOpen: (code: string) => void;
}) {
  const headingId = useId();
  const requests = all.reduce((sum, c) => sum + c.total, 0);
  const used = all.filter((c) => c.total > 0).length;

  return (
    <section aria-labelledby={headingId} className="card dept">
      <h2 id={headingId}>
        {name} <span className="muted">· {plural(requests, "request")} across {used} of {all.length} courses</span>
      </h2>
      <table className="course-table">
        <thead>
          <tr>
            <th scope="col" className="col-code">Code</th>
            <th scope="col">Course</th>
            <th scope="col" className="col-num-left">Grades</th>
            <th scope="col" className="col-num">Priority</th>
            <th scope="col" className="col-num">Elective</th>
            <th scope="col" className="col-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((course) => (
            <tr key={course.code} className={course.code === selected ? "selected" : undefined}>
              <td className="strong">
                <button type="button" className="code-link" onClick={() => onOpen(course.code)}>
                  {course.code}
                </button>
              </td>
              <td>
                {course.name}
                {course.duplicates > 0 && (
                  <>
                    {" "}
                    <span className="pill pill-error">Requested twice</span>
                  </>
                )}
              </td>
              <td className="muted">{gradeList(course.grades)}</td>
              <Count value={course.priority} />
              <Count value={course.elective} />
              <Count value={course.total} strong />
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function NotInCatalog({ rows, onRemove }: { rows: CourseRequest[]; onRemove: (id: string) => void }) {
  return (
    <section aria-labelledby="not-in-catalog" className="not-in-catalog">
      <h2 id="not-in-catalog">Not in catalog · {plural(rows.length, "request")}</h2>
      {rows.map((row) => (
        <div key={row.request.id} className="not-in-catalog-row">
          <span className="strong not-in-catalog-code">{row.request.course_code}</span>
          <span className="grow">
            Requested by{" "}
            <Link to={`/students/${row.student_id}`} className="student-link">
              {row.student_name}
            </Link>{" "}
            ({row.request.type}). This code isn't in the catalog, so it can't be scheduled.
          </span>
          <button type="button" className="button" onClick={() => onRemove(row.request.id)}>
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}

export default function CoursesPage() {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [writeError, setWriteError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get("course");

  // Bumped after each edit, here or in the dialog, to fetch the counts again.
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let live = true;
    fetchCourses().then(
      (data) => {
        if (live) setLoad({ state: "ready", data });
      },
      (e: unknown) => {
        if (live) setLoad({ state: "failed", message: errorText(e) });
      },
    );
    return () => {
      live = false;
    };
  }, [version]);

  async function remove(requestId: string) {
    setWriteError(null);
    try {
      await api.removeRequest(requestId);
      reload();
    } catch (e) {
      setWriteError(errorText(e));
    }
  }

  const data = load.state === "ready" ? load.data : null;
  const unknown = data?.notInCatalog.filter((r) => matches(query, r.request.course_code)) ?? [];
  const tables = data
    ? departments(data.courses)
        .map(([name, all]) => ({ name, all, shown: all.filter((c) => matches(query, c.code, c.name)) }))
        .filter((d) => d.shown.length > 0)
    : [];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">
          <h1>Courses</h1>
          <p className="muted">
            How many students requested each course. The catalog comes from the SIS and can't be edited here;
            requests can.
          </p>
        </div>
        <div className="search">
          <label htmlFor="course-search">Find a course</label>
          <input
            id="course-search"
            type="search"
            placeholder="Name or code"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {load.state === "loading" && <p className="muted">Loading courses…</p>}
      {load.state === "failed" && (
        <p role="alert" className="error-text">
          {load.message}
        </p>
      )}
      {writeError && (
        <p role="alert" className="error-text">
          {writeError}
        </p>
      )}
      {unknown.length > 0 && <NotInCatalog rows={unknown} onRemove={(id) => void remove(id)} />}
      {tables.map((d) => (
        <DepartmentTable
          key={d.name}
          name={d.name}
          all={d.all}
          shown={d.shown}
          selected={selected}
          onOpen={(code) => setSearchParams({ course: code })}
        />
      ))}
      {data && tables.length === 0 && unknown.length === 0 && <p>No courses match "{query.trim()}".</p>}

      {selected && (
        <CourseDialog
          key={selected}
          code={selected}
          onClose={() => setSearchParams({})}
          onChange={reload}
        />
      )}
    </div>
  );
}
