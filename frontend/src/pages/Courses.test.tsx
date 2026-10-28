import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ApiError, api } from "../api/client";
import { catalog, coursesResponse, requestsFor } from "../courses/fixtures";
import CoursesPage from "./Courses";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    api: {
      courses: vi.fn(),
      catalog: vi.fn(),
      courseRequests: vi.fn(),
      updateRequest: vi.fn(),
      removeRequest: vi.fn(),
    },
  };
});

const mocked = vi.mocked(api);

let location = "";
function LocationProbe() {
  const here = useLocation();
  location = here.pathname + here.search;
  return null;
}

beforeEach(() => {
  mocked.courses.mockResolvedValue(coursesResponse);
  mocked.catalog.mockResolvedValue(catalog);
  mocked.courseRequests.mockImplementation(async (code) => requestsFor(code));
  mocked.updateRequest.mockResolvedValue({} as never);
  mocked.removeRequest.mockResolvedValue({} as never);
});

afterEach(() => {
  vi.resetAllMocks();
});

async function renderCourses(path = "/courses") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/students/:id" element={<h1>Student page</h1>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
  await act(async () => {});
}

function department(name: string) {
  return screen.getByRole("region", { name: new RegExp(`^${name} ·`) });
}

function row(code: string) {
  const cell = screen.getByRole("button", { name: code });
  return cell.closest("tr") as HTMLElement;
}

function cellTexts(tr: HTMLElement) {
  return within(tr).getAllByRole("cell").map((c) => c.textContent);
}

test("the page explains itself and offers a search", async () => {
  await renderCourses();

  expect(screen.getByRole("heading", { level: 1, name: "Courses" })).toBeInTheDocument();
  expect(
    screen.getByText(
      "How many students requested each course. The catalog comes from the SIS and can't be edited here; requests can.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Find a course" })).toHaveAttribute("placeholder", "Name or code");
});

test("one table per department, in catalog order, with a summary", async () => {
  await renderCourses();

  const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  expect(headings).toEqual([
    "Not in catalog · 1 request",
    "Math · 4 requests across 2 of 3 courses",
    "English · 2 requests across 1 of 1 courses",
    "Social Studies · 5 requests across 2 of 2 courses",
    "Science · 2 requests across 1 of 1 courses",
  ]);
  const columns = within(department("Math")).getAllByRole("columnheader").map((c) => c.textContent);
  expect(columns).toEqual(["Code", "Course", "Grades", "Priority", "Elective", "Total"]);
});

test("seed counts: MTH101 3 priority, SS402 2 + 1 flagged requested twice", async () => {
  await renderCourses();

  expect(cellTexts(row("MTH101"))).toEqual(["MTH101", "Algebra I", "9", "3", "0", "3"]);
  expect(cellTexts(row("SS402"))).toEqual(["SS402", "AP Government Requested twice", "12", "2", "1", "3"]);
  expect(cellTexts(row("MTH102"))).toEqual(["MTH102", "Geometry", "9/10", "0", "0", "0"]);
  expect(row("MTH101")).not.toHaveTextContent("Requested twice");
});

test("zeros are muted", async () => {
  await renderCourses();

  const [, , , priority, elective, total] = within(row("MTH101")).getAllByRole("cell");
  expect(priority).not.toHaveClass("zero");
  expect(elective).toHaveClass("zero");
  expect(total).not.toHaveClass("zero");
});

test("codes not in the catalog are listed with who requested them", async () => {
  await renderCourses();

  const panel = screen.getByRole("region", { name: "Not in catalog · 1 request" });
  expect(panel).toHaveTextContent("SS303");
  expect(panel).toHaveTextContent(
    "Requested by Aisha Johnson (elective). This code isn't in the catalog, so it can't be scheduled.",
  );
  expect(within(panel).getByRole("link", { name: "Aisha Johnson" })).toHaveAttribute("href", "/students/S008");
});

test("removing SS303 here uses the same DELETE and refreshes the counts", async () => {
  await renderCourses();
  mocked.courses.mockResolvedValue({ ...coursesResponse, not_in_catalog: [] });

  fireEvent.click(within(screen.getByRole("region", { name: /^Not in catalog/ })).getByRole("button", { name: "Remove" }));
  await act(async () => {});

  expect(mocked.removeRequest).toHaveBeenCalledWith("r-aisha-ss303");
  expect(mocked.courses).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("region", { name: /^Not in catalog/ })).not.toBeInTheDocument();
});

test("search matches names and codes and hides departments with no match", async () => {
  await renderCourses();
  const search = screen.getByRole("searchbox", { name: "Find a course" });

  fireEvent.change(search, { target: { value: "algebra" } });
  expect(screen.getByRole("button", { name: "MTH101" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "MTH201" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "MTH102" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: /^Social Studies/ })).not.toBeInTheDocument();

  fireEvent.change(search, { target: { value: "ss402" } });
  expect(screen.getByRole("button", { name: "SS402" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: /^Math/ })).not.toBeInTheDocument();

  fireEvent.change(search, { target: { value: "zzz" } });
  expect(screen.getByText('No courses match "zzz".')).toBeInTheDocument();
});

test("clicking a code opens the course dialog and highlights the row", async () => {
  await renderCourses();

  fireEvent.click(screen.getByRole("button", { name: "SS402" }));
  await act(async () => {});

  expect(screen.getByRole("dialog", { name: "SS402 AP Government" })).toBeInTheDocument();
  expect(location).toBe("/courses?course=SS402");
  expect(row("SS402")).toHaveClass("selected");
});

test("the dialog can be opened by URL", async () => {
  await renderCourses("/courses?course=MTH101");

  expect(screen.getByRole("dialog", { name: "MTH101 Algebra I" })).toBeInTheDocument();
});

test("Escape closes the dialog, clears the URL and returns focus to the code", async () => {
  await renderCourses();
  const trigger = screen.getByRole("button", { name: "SS402" });
  trigger.focus();
  fireEvent.click(trigger);
  await act(async () => {});

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await act(async () => {});

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(location).toBe("/courses");
  expect(screen.getByRole("button", { name: "SS402" })).toHaveFocus();
});

test("a change in the dialog refreshes the counts", async () => {
  await renderCourses("/courses?course=SS402");

  fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: "Remove" })[1]);
  await act(async () => {});

  expect(mocked.removeRequest).toHaveBeenCalledWith("r-aisha-e");
  expect(mocked.courses).toHaveBeenCalledTimes(2);
});

test("the catalog is read-only: no way to add, edit or delete a course", async () => {
  await renderCourses();

  const buttons = screen.getAllByRole("button").map((b) => b.textContent);
  expect(buttons.filter((t) => !/^[A-Z]+\d+$/.test(t ?? ""))).toEqual(["Remove"]);
});

test("a failed load says so plainly", async () => {
  mocked.courses.mockRejectedValue(new ApiError("Can't reach the CourseManager server."));

  await renderCourses();

  expect(screen.getByRole("alert")).toHaveTextContent("Can't reach the CourseManager server.");
});
