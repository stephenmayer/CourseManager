// The one module that talks to the API. Screens call `api`, so tests can mock it.

export class ApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface SisImport {
  id: number;
  received_at: string;
  source: string;
}

export type RequestType = "priority" | "elective";
export type ReviewStatus = "not_started" | "in_progress" | "on_hold" | "done";

export interface StudentSummary {
  id: string;
  name: string;
  grade: number;
  profile: string;
  status: ReviewStatus;
  priority_count: number;
  elective_count: number;
  error_count: number;
  warning_count: number;
}

export interface StudentList {
  sis_as_of: string;
  students: StudentSummary[];
}

export interface CatalogCourse {
  code: string;
  name: string;
  department: string;
  grades: number[];
  is_ap: boolean;
}

export interface RequestOut {
  id: string;
  course_code: string;
  course_name: string | null;
  department: string | null;
  grades: number[] | null;
  is_ap: boolean | null;
  type: RequestType;
  source: "sis" | "app";
  edited_in_app: boolean;
  reason: string | null;
}

export interface IssueOut {
  severity: "error" | "warning";
  rule: string;
  message: string;
  detail: string;
  request_id: string | null;
  related_request_id: string | null;
  kept: boolean;
}

export interface StudentDetail {
  id: string;
  name: string;
  grade: number;
  profile: string;
  status: ReviewStatus;
  hold_reason: string | null;
  requests: RequestOut[];
  issues: IssueOut[];
}

export interface CourseCount {
  code: string;
  priority: number;
  elective: number;
  total: number;
  duplicates: number; // copies flagged "Requested twice"
}

export type CatalogCourseCount = CourseCount & Omit<CatalogCourse, "code">;

export interface CoursesResponse {
  courses: CatalogCourseCount[];
  not_in_catalog: CourseCount[];
}

export interface CourseRequest {
  student_id: string;
  student_name: string;
  student_grade: number;
  request: RequestOut;
  issues: IssueOut[];
}

// A check on the Settings screen (Q20). Errors are locked on.
export interface Check {
  rule: string;
  name: string;
  description: string;
  note: string | null;
  severity: "error" | "warning";
  enabled: boolean;
  locked: boolean;
  student_count: number; // students it flags now, even while off
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return `The server couldn't complete the request (error ${response.status}). Try again.`;
}

export function getJson<T>(path: string): Promise<T> {
  return request<T>(path, { headers: { Accept: "application/json" } });
}

export function sendJson<T>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return request<T>(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError(
      "Can't reach the CourseManager server. Check that it is running, then try again.",
    );
  }
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("The server sent a response CourseManager couldn't read. Try again.");
  }
}

export const api = {
  currentImport: () => getJson<SisImport>("/sis/current-import"),
  students: () => getJson<StudentList>("/students"),
  catalog: () => getJson<CatalogCourse[]>("/catalog"),
  courses: () => getJson<CoursesResponse>("/courses"),
  courseRequests: (code: string) =>
    getJson<CourseRequest[]>(`/courses/${encodeURIComponent(code)}/requests`),
  updateRequest: (id: string, changes: { type?: RequestType; reason?: string | null }) =>
    sendJson<StudentDetail>("PATCH", `/requests/${encodeURIComponent(id)}`, changes),
  removeRequest: (id: string) =>
    sendJson<StudentDetail>("DELETE", `/requests/${encodeURIComponent(id)}`),
  student: (id: string) => getJson<StudentDetail>(`/students/${encodeURIComponent(id)}`),
  addRequest: (studentId: string, courseCode: string) =>
    sendJson<StudentDetail>("POST", `/students/${encodeURIComponent(studentId)}/requests`, {
      course_code: courseCode,
    }),
  setReview: (studentId: string, status: ReviewStatus, holdReason?: string) =>
    sendJson<StudentDetail>(
      "PUT",
      `/students/${encodeURIComponent(studentId)}/review`,
      holdReason === undefined ? { status } : { status, hold_reason: holdReason },
    ),
  checks: () => getJson<Check[]>("/checks"),
  setCheck: (rule: string, enabled: boolean) =>
    sendJson<Check[]>("PUT", `/checks/${encodeURIComponent(rule)}`, { enabled }),
};
