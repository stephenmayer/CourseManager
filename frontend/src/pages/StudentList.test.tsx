import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";

import { ApiError, api, type StudentSummary } from "../api/client";
import StudentListPage from "./StudentList";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, api: { students: vi.fn() } };
});

const students = vi.mocked(api.students);

function student(
  id: string,
  name: string,
  grade: number,
  status: StudentSummary["status"],
  counts: [priority: number, elective: number, errors: number, warnings: number],
  profile = "On track",
): StudentSummary {
  const [priority_count, elective_count, error_count, warning_count] = counts;
  return { id, name, grade, profile, status, priority_count, elective_count, error_count, warning_count };
}

const LONG_PROFILE = "A".repeat(40) + "B".repeat(215) + "C".repeat(45); // 300 characters
const SHORT_PROFILE = "Thirty characters of profile."; // 29 characters

// Seed-shaped: the ten students and statuses on the approved board (Main.dc.html).
const SEED: StudentSummary[] = [
  student("S001", "Alex Rivera", 9, "done", [4, 1, 0, 0]),
  student("S002", "Mei Chen", 9, "in_progress", [5, 0, 0, 0]),
  student("S003", "Jordan Williams", 10, "in_progress", [4, 1, 0, 1], LONG_PROFILE),
  student("S004", "Priya Patel", 10, "not_started", [4, 1, 0, 1], SHORT_PROFILE),
  student("S005", "Marcus Thompson", 11, "not_started", [4, 2, 0, 0]),
  student("S006", "Sofia Mendez", 11, "not_started", [4, 1, 0, 3]),
  student("S007", "Ethan Park", 11, "not_started", [4, 1, 0, 0]),
  student("S008", "Aisha Johnson", 12, "not_started", [3, 3, 2, 0]),
  student("S009", "Liam O'Brien", 12, "not_started", [4, 1, 0, 1]),
  student("S010", "Nina Torres", 12, "on_hold", [1, 2, 0, 0]),
];

async function renderList() {
  render(
    <MemoryRouter>
      <StudentListPage />
    </MemoryRouter>,
  );
  await act(async () => {});
}

function rowIds(): string[] {
  const body = screen.getAllByRole("rowgroup")[1];
  return within(body)
    .queryAllByRole("link")
    .map((link) => link.getAttribute("href")?.replace("/students/", "") ?? "");
}

function rowFor(name: string): HTMLElement {
  const row = screen.getByRole("link", { name }).closest("tr");
  if (!row) throw new Error(`no row for ${name}`);
  return row;
}

function chip(group: "status" | "checks", name: string): HTMLElement {
  return within(screen.getByRole("group", { name: `Filter by ${group}` })).getByRole("button", {
    name,
  });
}

beforeEach(() => {
  students.mockReset();
  students.mockResolvedValue({ sis_as_of: "2026-10-27T13:00:00Z", students: SEED });
});

test("renders a row per student, linked to the student page, with the summary line", async () => {
  await renderList();

  expect(screen.getByRole("heading", { level: 1, name: "Students" })).toBeInTheDocument();
  expect(screen.getByText("10 students · 1 done · 1 on hold · 5 need attention")).toBeInTheDocument();
  expect(rowIds()).toEqual(SEED.map((s) => s.id));
  expect(screen.getByRole("link", { name: "Jordan Williams" })).toHaveAttribute(
    "href",
    "/students/S003",
  );
  expect(
    screen.getByText("Errors block Done until fixed. Warnings can be kept with a reason."),
  ).toBeInTheDocument();
});

test("chip counts match the students", async () => {
  await renderList();

  for (const name of ["All · 10", "Not started · 6", "In progress · 2", "On hold · 1", "Done · 1"]) {
    expect(chip("status", name)).toBeInTheDocument();
  }
  for (const name of ["All · 10", "Has errors · 1", "Has warnings · 4", "All clear · 5"]) {
    expect(chip("checks", name)).toBeInTheDocument();
  }
  expect(chip("status", "All · 10")).toHaveAttribute("aria-pressed", "true");
  expect(chip("checks", "All · 10")).toHaveAttribute("aria-pressed", "true");
});

test("a row shows grade, request counts, checks and status", async () => {
  await renderList();

  const row = within(rowFor("Marcus Thompson"));
  expect(row.getByText("S005")).toBeInTheDocument();
  expect(row.getByText("11")).toBeInTheDocument();
  expect(row.getByText("4 P · 2 E")).toBeInTheDocument();
  expect(row.getByText("All clear")).toBeInTheDocument();
  expect(row.getByText("Not started")).toBeInTheDocument();
  expect(within(rowFor("Nina Torres")).getByText("On hold")).toBeInTheDocument();
  expect(within(rowFor("Alex Rivera")).getByText("Done")).toBeInTheDocument();
  expect(within(rowFor("Mei Chen")).getByText("In progress")).toBeInTheDocument();
});

test.each([
  ["Aisha Johnson", "2 errors"],
  ["Jordan Williams", "1 warning"],
  ["Sofia Mendez", "3 warnings"],
  ["Ethan Park", "All clear"],
])("the checks pill for %s reads %s", async (name, copy) => {
  await renderList();

  expect(within(rowFor(name)).getByText(copy)).toBeInTheDocument();
});

test("status and checks filters combine", async () => {
  await renderList();

  fireEvent.click(chip("status", "Not started · 6"));
  fireEvent.click(chip("checks", "Has warnings · 4"));

  expect(rowIds()).toEqual(["S004", "S006", "S009"]);
  expect(chip("status", "Not started · 6")).toHaveAttribute("aria-pressed", "true");
  expect(chip("status", "All · 10")).toHaveAttribute("aria-pressed", "false");
});

test("the errors and all-clear chips filter by checks", async () => {
  await renderList();

  fireEvent.click(chip("checks", "Has errors · 1"));
  expect(rowIds()).toEqual(["S008"]);

  fireEvent.click(chip("checks", "All clear · 5"));
  expect(rowIds()).toEqual(["S001", "S002", "S005", "S007", "S010"]);
});

test("search matches a name or an ID", async () => {
  await renderList();
  const search = screen.getByLabelText("Find a student");

  fireEvent.change(search, { target: { value: "jor" } });
  expect(rowIds()).toEqual(["S003"]);

  fireEvent.change(search, { target: { value: "s010" } });
  expect(rowIds()).toEqual(["S010"]);
});

test("a search with no match says so", async () => {
  await renderList();

  fireEvent.change(screen.getByLabelText("Find a student"), { target: { value: "zzz" } });

  expect(rowIds()).toEqual([]);
  expect(screen.getByText("No students match")).toBeInTheDocument();
});

test("a long profile shows 40 characters, 'more' expands to 255 and 'less' collapses", async () => {
  await renderList();
  const row = within(rowFor("Jordan Williams"));

  expect(row.getByText(LONG_PROFILE.slice(0, 40), { exact: false })).toBeInTheDocument();
  expect(row.queryByText(/B/)).not.toBeInTheDocument();

  fireEvent.click(row.getByRole("button", { name: "more: Jordan Williams profile" }));
  const expanded = row.getByText(LONG_PROFILE.slice(0, 255), { exact: false });
  expect(expanded.textContent).not.toContain("C");

  fireEvent.click(row.getByRole("button", { name: "less: Jordan Williams profile" }));
  expect(row.queryByText(/B/)).not.toBeInTheDocument();
  expect(row.getByRole("button", { name: "more: Jordan Williams profile" })).toBeInTheDocument();
});

test("a short profile shows in full with no 'more'", async () => {
  await renderList();
  const row = within(rowFor("Priya Patel"));

  expect(row.getByText(SHORT_PROFILE)).toBeInTheDocument();
  expect(row.queryByRole("button", { name: /^more/ })).not.toBeInTheDocument();
});

test("a failed load shows the error message", async () => {
  students.mockRejectedValue(new ApiError("Can't reach the CourseManager server."));

  await renderList();

  expect(screen.getByRole("alert")).toHaveTextContent("Can't reach the CourseManager server.");
});

test("an empty import says there are no students, not that none match", async () => {
  students.mockResolvedValue({ sis_as_of: "2026-10-27T13:00:00Z", students: [] });

  await renderList();

  expect(screen.getByText("No students in the current SIS import")).toBeInTheDocument();
  expect(screen.queryByText("No students match")).not.toBeInTheDocument();
});

test("the filters wait for the students to load", async () => {
  students.mockRejectedValue(new ApiError("Can't reach the CourseManager server."));

  await renderList();

  expect(screen.queryByRole("group", { name: "Filter by status" })).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Filter by checks" })).not.toBeInTheDocument();
});

test("the student link encodes the SIS ID", async () => {
  students.mockResolvedValue({
    sis_as_of: "2026-10-27T13:00:00Z",
    students: [student("A/12#3", "Odd Id", 9, "not_started", [1, 0, 0, 0])],
  });

  await renderList();

  expect(screen.getByRole("link", { name: "Odd Id" })).toHaveAttribute("href", "/students/A%2F12%233");
});
