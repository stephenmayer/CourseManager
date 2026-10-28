// Test data shaped like the seed's API responses (backend/seed/sis_export.json).
import type { CatalogCourse, CatalogCourseCount, CourseRequest, CoursesResponse, IssueOut, RequestOut } from "../api/client";

function course(
  code: string,
  name: string,
  department: string,
  grades: number[],
  priority: number,
  elective: number,
  duplicates = 0,
): CatalogCourseCount {
  return {
    code,
    name,
    department,
    grades,
    is_ap: name.startsWith("AP "),
    priority,
    elective,
    total: priority + elective,
    duplicates,
  };
}

export const coursesResponse: CoursesResponse = {
  courses: [
    course("MTH101", "Algebra I", "Math", [9], 3, 0),
    course("MTH102", "Geometry", "Math", [9, 10], 0, 0),
    course("MTH201", "Algebra II", "Math", [10], 1, 0),
    course("ENG101", "English 9", "English", [9], 2, 0),
    course("SS302", "Economics", "Social Studies", [11, 12], 0, 2),
    course("SS402", "AP Government", "Social Studies", [12], 2, 1, 1),
    course("SCI101", "Biology", "Science", [9], 2, 0),
  ],
  not_in_catalog: [{ code: "SS303", priority: 0, elective: 1, total: 1, duplicates: 0 }],
};

export const catalog: CatalogCourse[] = coursesResponse.courses.map(
  ({ code, name, department, grades, is_ap }) => ({ code, name, department, grades, is_ap }),
);

function request(id: string, code: string, type: RequestOut["type"], reason: string | null = null): RequestOut {
  const known = catalog.find((c) => c.code === code);
  return {
    id,
    course_code: code,
    course_name: known?.name ?? null,
    department: known?.department ?? null,
    grades: known?.grades ?? null,
    is_ap: known?.is_ap ?? null,
    type,
    source: "sis",
    edited_in_app: false,
    reason,
  };
}

function issue(rule: string, severity: IssueOut["severity"], requestId: string, extra: Partial<IssueOut> = {}): IssueOut {
  return {
    severity,
    rule,
    message: "",
    detail: "",
    request_id: requestId,
    related_request_id: null,
    kept: false,
    ...extra,
  };
}

export const ss402Requests: CourseRequest[] = [
  { student_id: "S008", student_name: "Aisha Johnson", student_grade: 12, request: request("r-aisha-p", "SS402", "priority"), issues: [] },
  {
    student_id: "S008",
    student_name: "Aisha Johnson",
    student_grade: 12,
    request: request("r-aisha-e", "SS402", "elective"),
    issues: [
      issue("duplicate_course", "error", "r-aisha-e", {
        message: "AP Government is already on Aisha's list as a priority.",
        detail: "A course can only be requested once. Remove this copy.",
        related_request_id: "r-aisha-p",
      }),
    ],
  },
  { student_id: "S009", student_name: "Liam O'Brien", student_grade: 12, request: request("r-liam", "SS402", "priority"), issues: [] },
];

const outOfGrade = {
  message: "Algebra I is a grade 9 course, and Jordan is going into grade 10.",
  detail: "Keep it if that's intended, and say why so the assistant principal can see it.",
};

export const mth101Requests: CourseRequest[] = [
  { student_id: "S001", student_name: "Alex Rivera", student_grade: 9, request: request("r-alex", "MTH101", "priority"), issues: [] },
  {
    student_id: "S003",
    student_name: "Jordan Williams",
    student_grade: 10,
    request: request("r-jordan", "MTH101", "priority"),
    issues: [issue("out_of_grade", "warning", "r-jordan", outOfGrade)],
  },
  { student_id: "S002", student_name: "Mei Chen", student_grade: 9, request: request("r-mei", "MTH101", "priority"), issues: [] },
];

// Jordan's out-of-grade Algebra I kept with a reason, as on the StudentCourse board.
export const mth101RequestsKept: CourseRequest[] = mth101Requests.map((row) =>
  row.student_id === "S003"
    ? {
        ...row,
        request: { ...row.request, reason: "Retake: failed Algebra I last year", edited_in_app: true },
        issues: [issue("out_of_grade", "warning", "r-jordan", { ...outOfGrade, kept: true })],
      }
    : row,
);

export const ss303Requests: CourseRequest[] = [
  {
    student_id: "S008",
    student_name: "Aisha Johnson",
    student_grade: 12,
    request: request("r-aisha-ss303", "SS303", "elective"),
    issues: [
      issue("unknown_course", "error", "r-aisha-ss303", {
        message: "SS303 isn't in the course catalog.",
        detail: "It can't be scheduled. Remove it and add the course Aisha meant from the catalog.",
      }),
    ],
  },
];

export function requestsFor(code: string): CourseRequest[] {
  return { SS402: ss402Requests, MTH101: mth101Requests, SS303: ss303Requests }[code] ?? [];
}
