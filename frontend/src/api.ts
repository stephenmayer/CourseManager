// The only module that knows about HTTP. Components depend on this interface, not on fetch,
// so the backend (or a mock for tests and demos) can be swapped without touching the UI.

import type { Course, PlanStatus, RequestType, StudentDetail, StudentSummary, TallyRow } from "./types";

export interface CourseRequestApi {
  meta(): Promise<{ school_year: string }>;
  listCourses(): Promise<Course[]>;
  listStudents(): Promise<StudentSummary[]>;
  getStudent(id: string): Promise<StudentDetail>;
  addRequest(studentId: string, body: { course_code: string; type: RequestType; note?: string }): Promise<StudentDetail>;
  updateRequest(
    studentId: string,
    requestId: string,
    patch: { type?: RequestType; note?: string; override_reason?: string | null },
  ): Promise<StudentDetail>;
  removeRequest(studentId: string, requestId: string): Promise<StudentDetail>;
  setStatus(studentId: string, status: PlanStatus): Promise<StudentDetail>;
  tally(): Promise<TallyRow[]>;
  reset(): Promise<void>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-User": "Demo Counselor", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, typeof body.detail === "string" ? body.detail : res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const httpApi: CourseRequestApi = {
  meta: () => call("/meta"),
  listCourses: () => call("/courses"),
  listStudents: () => call("/students"),
  getStudent: (id) => call(`/students/${id}`),
  addRequest: (sid, body) => call(`/students/${sid}/requests`, json("POST", body)),
  updateRequest: (sid, rid, patch) => call(`/students/${sid}/requests/${rid}`, json("PATCH", patch)),
  removeRequest: (sid, rid) => call(`/students/${sid}/requests/${rid}`, { method: "DELETE" }),
  setStatus: (sid, status) => call(`/students/${sid}/status`, json("PUT", { status })),
  tally: () => call("/tally"),
  reset: () => call("/reset", { method: "POST" }),
};

export const api: CourseRequestApi = httpApi;
