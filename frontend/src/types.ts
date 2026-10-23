// Mirrors backend/app/models.py. In a real project these would be generated from the OpenAPI schema.

export type RequestType = "priority" | "elective";
export type RequestSource = "sis" | "counselor";
export type PlanStatus = "not_started" | "in_progress" | "needs_review" | "complete";
export type Severity = "error" | "warning";

export interface Course {
  code: string;
  name: string;
  department: string;
  grades: number[];
}

export interface Student {
  id: string;
  name: string;
  grade: number;
  profile: string;
  flags: string[];
}

export interface CourseRequest {
  id: string;
  student_id: string;
  course_code: string;
  type: RequestType;
  source: RequestSource;
  sis_id: string | null;
  note: string;
  override_reason: string | null;
  updated_at: string;
  updated_by: string;
  course: Course | null;
}

export interface Issue {
  rule: string;
  severity: Severity;
  message: string;
  request_id: string | null;
  acknowledged: boolean;
}

export interface HistoryEvent {
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export interface StudentSummary {
  student: Student;
  status: PlanStatus;
  priority_count: number;
  elective_count: number;
  error_count: number;
  warning_count: number;
}

export interface StudentDetail {
  student: Student;
  status: PlanStatus;
  requests: CourseRequest[];
  issues: Issue[];
  history: HistoryEvent[];
}

export interface TallyRow {
  course: Course;
  priority: number;
  elective: number;
}

export const STATUS_LABELS: Record<PlanStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  needs_review: "Needs review",
  complete: "Complete",
};

export const FLAG_LABELS: Record<string, string> = {
  ell: "ELL",
  retake: "Retake",
  accelerated: "Accelerated",
  ap_load: "Heavy AP",
  transcript_pending: "Transcript pending",
};
