import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  ApiError,
  api,
  type CatalogCourse,
  type IssueOut,
  type RequestOut,
  type StudentDetail,
} from "../api/client";
import StudentDetailPage, { type CourseDialogProps } from "./StudentDetail";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    api: {
      student: vi.fn(),
      catalog: vi.fn(),
      addRequest: vi.fn(),
      updateRequest: vi.fn(),
      removeRequest: vi.fn(),
      setReview: vi.fn(),
    },
  };
});

const mocked = vi.mocked(api);

// Fixtures follow the seed (backend/seed/sis_export.json) as the API returns it.

function request(
  id: string,
  code: string,
  name: string | null,
  department: string | null,
  grades: number[] | null,
  type: "priority" | "elective",
  extra: Partial<RequestOut> = {},
): RequestOut {
  return {
    id,
    course_code: code,
    course_name: name,
    department,
    grades,
    is_ap: name === null ? null : name.startsWith("AP "),
    type,
    source: "sis",
    edited_in_app: false,
    reason: null,
    ...extra,
  };
}

function issue(severity: "error" | "warning", rule: string, message: string, detail: string, requestId: string | null, extra: Partial<IssueOut> = {}): IssueOut {
  return {
    severity,
    rule,
    message,
    detail,
    request_id: requestId,
    related_request_id: null,
    kept: false,
    ...extra,
  };
}

const KEEP_IT = "Keep it if that's intended, and say why so the assistant principal can see it.";
const MTH101_WARNING = issue(
  "warning",
  "out_of_grade",
  "Algebra I is a grade 9 course, and Jordan is going into grade 10.",
  KEEP_IT,
  "r-mth101",
);

function jordan(overrides: Partial<StudentDetail> = {}): StudentDetail {
  return {
    id: "S003",
    name: "Jordan Williams",
    grade: 10,
    profile:
      "Failed MTH101 (Algebra I) last year. Must retake before advancing in math. Otherwise on track. Counselor should flag math priority carefully.",
    status: "in_progress",
    hold_reason: null,
    requests: [
      request("r-mth101", "MTH101", "Algebra I", "Math", [9], "priority"),
      request("r-eng201", "ENG201", "English 10", "English", [10], "priority"),
      request("r-ss201", "SS201", "U.S. History", "Social Studies", [10], "priority"),
      request("r-sci201", "SCI201", "Chemistry", "Science", [10], "priority"),
      request("r-at202", "AT202", "Music Theory", "Arts & Tech", [10, 11], "elective", {
        source: "app",
      }),
    ],
    issues: [MTH101_WARNING],
    ...overrides,
  };
}

// Jordan with MTH101 changed (e.g. a saved reason), its warning marked kept.
function jordanWithMth101(changes: Partial<RequestOut>): StudentDetail {
  return jordan({
    requests: jordan().requests.map((r) => (r.id === "r-mth101" ? { ...r, ...changes } : r)),
    issues: [{ ...MTH101_WARNING, kept: true }],
  });
}

const SS303_ERROR = issue(
  "error",
  "unknown_course",
  "SS303 isn't in the course catalog.",
  "It can't be scheduled. Remove it and add the course Aisha meant from the catalog.",
  "r-ss303",
);
const SS402_DUPLICATE = issue(
  "error",
  "duplicate_course",
  "AP Government is already on Aisha's list as a priority.",
  "A course can only be requested once. Remove this copy.",
  "r-ss402-e",
  { related_request_id: "r-ss402-p" },
);

function aisha(overrides: Partial<StudentDetail> = {}): StudentDetail {
  return {
    id: "S008",
    name: "Aisha Johnson",
    grade: 12,
    profile:
      "On track for graduation. Focused on completing requirements. Interested in Psychology and Economics as final electives.",
    status: "not_started",
    hold_reason: null,
    requests: [
      request("r-mth302", "MTH302", "Statistics", "Math", [11, 12], "priority"),
      request("r-eng401", "ENG401", "AP English Language", "English", [12], "priority"),
      request("r-ss402-p", "SS402", "AP Government", "Social Studies", [12], "priority"),
      request("r-sci403", "SCI403", "Anatomy & Physiology", "Science", [12], "elective"),
      request("r-ss303", "SS303", null, null, null, "elective"),
      request("r-ss402-e", "SS402", "AP Government", "Social Studies", [12], "elective"),
    ],
    issues: [SS303_ERROR, SS402_DUPLICATE],
    ...overrides,
  };
}

function course(code: string, name: string, department: string, grades: number[]): CatalogCourse {
  return { code, name, department, grades, is_ap: name.startsWith("AP ") };
}

const CATALOG: CatalogCourse[] = [
  course("MTH101", "Algebra I", "Math", [9]),
  course("MTH102", "Geometry", "Math", [9, 10]),
  course("MTH201", "Algebra II", "Math", [10]),
  course("ENG101", "English 9", "English", [9]),
  course("ENG201", "English 10", "English", [10]),
  course("ENG401", "AP English Language", "English", [12]),
  course("SS201", "U.S. History", "Social Studies", [10]),
  course("SS402", "AP Government", "Social Studies", [12]),
  course("SCI201", "Chemistry", "Science", [10]),
  course("AT101", "Introduction to Computing", "Arts & Tech", [9, 10]),
  course("AT201", "Web Design", "Arts & Tech", [10, 11]),
  course("AT202", "Music Theory", "Arts & Tech", [10, 11]),
];

async function renderStudent(id: string, props: { courseDialog?: React.ComponentType<CourseDialogProps> } = {}) {
  render(
    <MemoryRouter initialEntries={[`/students/${id}`]}>
      <Routes>
        <Route path="/students/:id" element={<StudentDetailPage {...props} />} />
        <Route path="/" element={<h1>All students</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => {});
}

// Writes return the full student; the page re-renders from that response.
async function click(element: HTMLElement) {
  fireEvent.click(element);
  await act(async () => {});
}

async function putOnHold(reason: string) {
  await click(screen.getByRole("button", { name: "Put on hold…" }));
  fireEvent.change(screen.getByLabelText("Why is this student on hold?"), {
    target: { value: reason },
  });
  await click(screen.getByRole("button", { name: "Put on hold" }));
}

function requestRow(code: string, nth = 0) {
  return screen.getAllByTestId(`request-${code}`)[nth];
}

function catalogTable() {
  return screen.getByRole("table", { name: "Catalog courses" });
}

beforeEach(() => {
  mocked.student.mockImplementation((id) => Promise.resolve(id === "S008" ? aisha() : jordan()));
  mocked.catalog.mockResolvedValue(CATALOG);
});

afterEach(() => {
  vi.clearAllMocks();
});

// Header card

test("the header card shows name, status, ID, upcoming grade and the full SIS profile", async () => {
  await renderStudent("S003");

  const card = screen.getByRole("region", { name: "Student" });
  expect(within(card).getByRole("heading", { level: 1, name: "Jordan Williams" })).toBeInTheDocument();
  expect(card).toHaveTextContent("In progress");
  expect(card).toHaveTextContent("S003 · Going into grade 10");
  expect(card).toHaveTextContent(
    "From SIS profile Failed MTH101 (Algebra I) last year. Must retake before advancing in math. Otherwise on track. Counselor should flag math priority carefully.",
  );
  expect(screen.getByRole("link", { name: "← All students" })).toHaveAttribute("href", "/");
});

test("an on-hold student shows the hold reason", async () => {
  mocked.student.mockResolvedValue(
    jordan({ status: "on_hold", hold_reason: "Waiting on summer school grade" }),
  );

  await renderStudent("S003");

  const card = screen.getByRole("region", { name: "Student" });
  expect(card).toHaveTextContent("On hold");
  expect(card).toHaveTextContent("On hold because: Waiting on summer school grade");
});

test("a student that can't be loaded shows the server's message", async () => {
  mocked.student.mockRejectedValue(new ApiError("No student with ID S999.", 404));

  await renderStudent("S999");

  expect(screen.getByRole("alert")).toHaveTextContent("No student with ID S999.");
});

// Requests

test("requests are grouped priority first, then elective, with their source", async () => {
  await renderStudent("S003");

  const section = screen.getByRole("region", { name: "Requests for 2027–28" });
  expect(section).toHaveTextContent("4 priority · 1 elective · 1 warning");
  const priority = within(section).getByRole("list", { name: "Priority: must take" });
  const elective = within(section).getByRole("list", { name: "Elective" });
  expect(within(priority).getAllByRole("listitem").map((li) => li.dataset.testid)).toEqual([
    "request-MTH101",
    "request-ENG201",
    "request-SS201",
    "request-SCI201",
  ]);
  expect(within(elective).getAllByRole("listitem").map((li) => li.dataset.testid)).toEqual([
    "request-AT202",
  ]);
  expect(requestRow("ENG201")).toHaveTextContent("English 10 · English · grade 10");
  expect(requestRow("ENG201")).toHaveTextContent("From SIS");
  expect(requestRow("AT202")).toHaveTextContent("Music Theory · Arts & Tech · grade 10/11");
  expect(requestRow("AT202")).toHaveTextContent("Added in app");
});

test("Jordan's MTH101 shows the warning in plain language with a reason field", async () => {
  await renderStudent("S003");

  const row = requestRow("MTH101");
  expect(row).toHaveTextContent(
    "Algebra I is a grade 9 course, and Jordan is going into grade 10. " + KEEP_IT,
  );
  expect(within(row).getByLabelText("Reason for keeping it")).toHaveValue("");
});

test("Keep with reason saves the reason on that request and re-renders from the response", async () => {
  const kept = jordanWithMth101({
    reason: "Retake: failed Algebra I last year",
    edited_in_app: true,
  });
  mocked.updateRequest.mockResolvedValue(kept);
  await renderStudent("S003");
  const row = requestRow("MTH101");

  fireEvent.change(within(row).getByLabelText("Reason for keeping it"), {
    target: { value: "  Retake: failed Algebra I last year " },
  });
  await click(within(row).getByRole("button", { name: "Keep with reason" }));

  expect(mocked.updateRequest).toHaveBeenCalledWith("r-mth101", {
    reason: "Retake: failed Algebra I last year",
  });
  expect(within(requestRow("MTH101")).getByLabelText("Reason for keeping it")).toHaveValue(
    "Retake: failed Algebra I last year",
  );
  expect(requestRow("MTH101")).toHaveTextContent("Kept with reason");
});

test("Keep with reason with an empty reason asks for one and doesn't save", async () => {
  await renderStudent("S003");

  await click(within(requestRow("MTH101")).getByRole("button", { name: "Keep with reason" }));

  expect(mocked.updateRequest).not.toHaveBeenCalled();
  expect(within(requestRow("MTH101")).getByRole("alert")).toHaveTextContent(
    "Say why you're keeping it.",
  );
});

test("a kept warning shows its saved reason", async () => {
  mocked.student.mockResolvedValue(
    jordanWithMth101({ reason: "Retake: failed Algebra I last year" }),
  );

  await renderStudent("S003");

  expect(within(requestRow("MTH101")).getByLabelText("Reason for keeping it")).toHaveValue(
    "Retake: failed Algebra I last year",
  );
});

test("Make elective switches that request by its ID and keeps its reason (S7)", async () => {
  const switched = jordanWithMth101({ type: "elective", reason: "Retake", edited_in_app: true });
  mocked.updateRequest.mockResolvedValue(switched);
  await renderStudent("S003");

  await click(within(requestRow("MTH101")).getByRole("button", { name: "Make elective" }));

  expect(mocked.updateRequest).toHaveBeenCalledWith("r-mth101", { type: "elective" });
  const elective = screen.getByRole("list", { name: "Elective" });
  expect(within(elective).getByTestId("request-MTH101")).toBeInTheDocument();
  expect(within(requestRow("MTH101")).getByRole("button", { name: "Make priority" })).toBeInTheDocument();
  expect(within(requestRow("MTH101")).getByLabelText("Reason for keeping it")).toHaveValue("Retake");
});

test("a student-level warning (no core priority) shows above the lists", async () => {
  mocked.student.mockResolvedValue(
    jordan({
      issues: [
        MTH101_WARNING,
        issue(
          "warning",
          "core_subject",
          "No English priority.",
          "Grade 10 needs a priority course in English. Add one from the catalog, or make a English course priority.",
          null,
        ),
      ],
    }),
  );

  await renderStudent("S003");

  const section = screen.getByRole("region", { name: "Requests for 2027–28" });
  expect(section).toHaveTextContent("4 priority · 1 elective · 2 warnings");
  expect(within(section).getByTestId("student-issues")).toHaveTextContent(
    "No English priority. Grade 10 needs a priority course in English.",
  );
});

test("a student with no requests shows an empty state and the core warnings (E8)", async () => {
  mocked.student.mockResolvedValue(
    jordan({
      requests: [],
      issues: ["Math", "English"].map((subject) =>
        issue("warning", "core_subject", `No ${subject} priority.`, "Add one.", null),
      ),
    }),
  );

  await renderStudent("S003");

  const section = screen.getByRole("region", { name: "Requests for 2027–28" });
  expect(section).toHaveTextContent("0 priority · 0 elective · 2 warnings");
  expect(section).toHaveTextContent("No requests yet. Add courses from the catalog.");
  expect(section).toHaveTextContent("No Math priority.");
  expect(section).toHaveTextContent("No English priority.");
  expect(within(section).queryByRole("list")).not.toBeInTheDocument();
});

// Aisha: errors (E1, S3)

test("Aisha: errors lock Done, with the banner and plain-language error blocks", async () => {
  await renderStudent("S008");

  const done = screen.getByRole("button", { name: "Mark Done" });
  expect(done).toBeDisabled();
  expect(done).toHaveAccessibleDescription("Fix 2 errors to mark Done.");
  const section = screen.getByRole("region", { name: "Requests for 2027–28" });
  expect(section).toHaveTextContent("3 priority · 3 elective · 2 errors");
  expect(section).toHaveTextContent(
    "Two requests came from the SIS with problems. They're shown as they arrived; nothing was changed. Remove or replace them, then mark Done.",
  );
  expect(requestRow("SS303")).toHaveTextContent("Unknown course");
  expect(requestRow("SS303")).toHaveTextContent(
    "SS303 isn't in the course catalog. It can't be scheduled.",
  );
  expect(requestRow("SS402", 1)).toHaveTextContent(
    "AP Government is already on Aisha's list as a priority. A course can only be requested once. Remove this copy.",
  );
  expect(requestRow("SS402", 0)).not.toHaveTextContent("already on");
});

test("Aisha: removing the SS402 elective copy removes that row by ID and leaves 1 error", async () => {
  mocked.removeRequest.mockResolvedValue(
    aisha({
      requests: aisha().requests.filter((r) => r.id !== "r-ss402-e"),
      issues: [SS303_ERROR],
    }),
  );
  await renderStudent("S008");

  await click(
    screen.getByRole("button", { name: "Remove the elective copy of SS402 AP Government" }),
  );

  expect(mocked.removeRequest).toHaveBeenCalledWith("r-ss402-e");
  expect(screen.getAllByTestId("request-SS402")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Mark Done" })).toHaveAccessibleDescription(
    "Fix 1 error to mark Done.",
  );
  expect(screen.getByRole("region", { name: "Requests for 2027–28" })).toHaveTextContent(
    "3 priority · 2 elective · 1 error",
  );
});

test("remove buttons name the course, or just the code when it's unknown", async () => {
  await renderStudent("S008");

  expect(screen.getByRole("button", { name: "Remove MTH302 Statistics" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Remove SS303" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Remove SS402 AP Government" })).toBeInTheDocument();
});

test("a failed edit shows the server's message and keeps the page", async () => {
  mocked.removeRequest.mockRejectedValue(new ApiError("That request was already removed.", 404));
  await renderStudent("S008");

  await click(screen.getByRole("button", { name: "Remove SS303" }));

  expect(screen.getByRole("alert")).toHaveTextContent("That request was already removed.");
  expect(requestRow("SS303")).toBeInTheDocument();
});

// Review status (E2, E4)

test("Jordan with only warnings can be marked Done", async () => {
  mocked.setReview.mockResolvedValue(jordan({ status: "done" }));
  await renderStudent("S003");

  const done = screen.getByRole("button", { name: "Mark Done" });
  expect(done).toBeEnabled();
  expect(screen.getByRole("region", { name: "Student" })).toHaveTextContent(
    "Warnings don't block Done. Errors do.",
  );
  await click(done);

  expect(mocked.setReview).toHaveBeenCalledWith("S003", "done");
  expect(screen.getByRole("region", { name: "Student" })).toHaveTextContent("Done");
});

test("Put on hold asks for a reason and won't save without one", async () => {
  await renderStudent("S003");

  await click(screen.getByRole("button", { name: "Put on hold…" }));
  const reason = screen.getByLabelText("Why is this student on hold?");
  expect(reason).toHaveFocus();
  await click(screen.getByRole("button", { name: "Put on hold" }));

  expect(mocked.setReview).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("Say why the student is on hold.");
});

test("Put on hold with a reason saves it", async () => {
  mocked.setReview.mockResolvedValue(
    jordan({ status: "on_hold", hold_reason: "Waiting on summer school grade" }),
  );
  await renderStudent("S003");

  await putOnHold("Waiting on summer school grade");

  expect(mocked.setReview).toHaveBeenCalledWith("S003", "on_hold", "Waiting on summer school grade");
  expect(screen.queryByLabelText("Why is this student on hold?")).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Student" })).toHaveTextContent(
    "On hold because: Waiting on summer school grade",
  );
});

test("Cancel closes the hold form without saving", async () => {
  await renderStudent("S003");

  await click(screen.getByRole("button", { name: "Put on hold…" }));
  await click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByLabelText("Why is this student on hold?")).not.toBeInTheDocument();
  expect(mocked.setReview).not.toHaveBeenCalled();
});

// Add from catalog (S10, E5, E6)

test("the catalog starts with the student's grade: Grade 10 shows AT101 and MTH201, not ENG401", async () => {
  await renderStudent("S003");

  expect(screen.getByRole("checkbox", { name: "Grade 10" })).toBeChecked();
  for (const grade of [9, 11, 12]) {
    expect(screen.getByRole("checkbox", { name: `Grade ${grade}` })).not.toBeChecked();
  }
  const table = catalogTable();
  expect(within(table).getByText("AT101")).toBeInTheDocument();
  expect(within(table).getByText("MTH201")).toBeInTheDocument();
  expect(within(table).queryByText("ENG401")).not.toBeInTheDocument();
});

test("checking Grade 12 adds its courses", async () => {
  await renderStudent("S003");

  fireEvent.click(screen.getByRole("checkbox", { name: "Grade 12" }));

  expect(within(catalogTable()).getByText("ENG401")).toBeInTheDocument();
  expect(within(catalogTable()).getByText("AT101")).toBeInTheDocument();
});

test("the catalog is grouped by department", async () => {
  await renderStudent("S003");

  const groups = within(catalogTable())
    .getAllByRole("rowheader")
    .map((th) => th.textContent);
  expect(groups).toEqual(["Math", "English", "Social Studies", "Science", "Arts & Tech"]);
});

test("courses already on the list show On list instead of Add (E5)", async () => {
  await renderStudent("S003");

  const row = within(catalogTable()).getByText("ENG201").closest("tr")!;
  expect(row).toHaveTextContent("On list");
  expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add AT201 Web Design" })).toHaveTextContent("+ Add");
});

test("search filters the catalog by name or code", async () => {
  await renderStudent("S003");

  fireEvent.change(screen.getByLabelText("Search courses"), { target: { value: "music" } });
  expect(within(catalogTable()).getByText("AT202")).toBeInTheDocument();
  expect(within(catalogTable()).queryByText("AT101")).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Search courses"), { target: { value: "mth2" } });
  expect(within(catalogTable()).getByText("MTH201")).toBeInTheDocument();
  expect(within(catalogTable()).queryByText("AT202")).not.toBeInTheDocument();
});

test("a search with no match says so", async () => {
  await renderStudent("S003");

  fireEvent.change(screen.getByLabelText("Search courses"), { target: { value: "zzz" } });

  expect(screen.getByRole("complementary", { name: "Add from catalog" })).toHaveTextContent(
    "No courses match.",
  );
});

test("+ Add adds the course as an elective and shows On list", async () => {
  mocked.addRequest.mockResolvedValue(
    jordan({
      requests: [
        ...jordan().requests,
        request("r-at201", "AT201", "Web Design", "Arts & Tech", [10, 11], "elective", {
          source: "app",
        }),
      ],
    }),
  );
  await renderStudent("S003");

  await click(screen.getByRole("button", { name: "Add AT201 Web Design" }));

  expect(mocked.addRequest).toHaveBeenCalledWith("S003", "AT201");
  const elective = screen.getByRole("list", { name: "Elective" });
  expect(within(elective).getByTestId("request-AT201")).toHaveTextContent("Added in app");
  const row = within(catalogTable()).getByText("AT201").closest("tr")!;
  expect(row).toHaveTextContent("On list");
});

test("adding an out-of-grade course is allowed and shows its warning with a reason field (E6)", async () => {
  mocked.addRequest.mockResolvedValue(
    jordan({
      requests: [
        ...jordan().requests,
        request("r-eng101", "ENG101", "English 9", "English", [9], "elective", { source: "app" }),
      ],
      issues: [
        MTH101_WARNING,
        issue(
          "warning",
          "out_of_grade",
          "English 9 is a grade 9 course, and Jordan is going into grade 10.",
          KEEP_IT,
          "r-eng101",
        ),
      ],
    }),
  );
  await renderStudent("S003");

  fireEvent.click(screen.getByRole("checkbox", { name: "Grade 9" }));
  await click(screen.getByRole("button", { name: "Add ENG101 English 9" }));

  expect(mocked.addRequest).toHaveBeenCalledWith("S003", "ENG101");
  const row = requestRow("ENG101");
  expect(row).toHaveTextContent("English 9 is a grade 9 course, and Jordan is going into grade 10.");
  expect(within(row).getByLabelText("Reason for keeping it")).toHaveValue("");
});

// Course dialog seam (#8 owns the dialog)

test("a course code opens the course dialog, and a change in it reloads the student", async () => {
  function FakeDialog({ code, onClose, onChange }: CourseDialogProps) {
    return (
      <div role="dialog" aria-label={`Course ${code}`}>
        <button type="button" onClick={onChange}>
          Changed
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }
  await renderStudent("S003", { courseDialog: FakeDialog });

  await click(screen.getByRole("button", { name: "MTH101" }));
  expect(screen.getByRole("dialog", { name: "Course MTH101" })).toBeInTheDocument();

  mocked.student.mockResolvedValue(jordan({ status: "done" }));
  await click(screen.getByRole("button", { name: "Changed" }));
  expect(mocked.student).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("region", { name: "Student" })).toHaveTextContent("Done");

  await click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("an unknown code is plain text, not a link to the dialog", async () => {
  await renderStudent("S008", { courseDialog: () => null });

  expect(screen.queryByRole("button", { name: "SS303" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "SS402" })).toHaveLength(2);
});

test("a hold the server refuses keeps the form open with the server's message", async () => {
  mocked.setReview.mockRejectedValue(new ApiError("Say why the student is on hold.", 422));
  await renderStudent("S003");

  await putOnHold("Waiting");

  expect(screen.getByLabelText("Why is this student on hold?")).toHaveValue("Waiting");
  expect(screen.getByRole("alert")).toHaveTextContent("Say why the student is on hold.");
});
