import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import App from "./App";
import { ApiError, api } from "./api/client";

vi.mock("./api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/client")>();
  return {
    ...actual,
    // Screens' own reads never settle here unless a test says so; their tests cover them.
    api: {
      currentImport: vi.fn(),
      courses: vi.fn(() => new Promise(() => {})),
      courseRequests: vi.fn(() => new Promise(() => {})),
      student: vi.fn(),
      catalog: vi.fn(),
    },
  };
});

const currentImport = vi.mocked(api.currentImport);
const student = vi.mocked(api.student);
const catalog = vi.mocked(api.catalog);

function systemPrefersDark(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? dark : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

async function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  // Let the SIS date request settle so state updates land inside act().
  await act(async () => {});
}

function theme() {
  return document.documentElement.dataset.theme;
}

beforeEach(() => {
  currentImport.mockResolvedValue({
    id: 1,
    received_at: "2026-10-28T13:05:00Z",
    source: "seed",
  });
  student.mockResolvedValue({
    id: "S001",
    name: "Alex Rivera",
    grade: 9,
    profile: "On track.",
    status: "done",
    hold_reason: null,
    requests: [],
    issues: [],
  });
  catalog.mockResolvedValue([]);
  systemPrefersDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

test("the header shows the app name, the signed-in name and both nav links", async () => {
  await renderAt("/");

  const header = screen.getByRole("banner");
  expect(header).toHaveTextContent("CourseManager");
  expect(header).toHaveTextContent("Ms. Lee · Counselor");
  const nav = screen.getByRole("navigation", { name: "Main" });
  expect(nav).toContainElement(screen.getByRole("link", { name: "Students" }));
  expect(nav).toContainElement(screen.getByRole("link", { name: "Courses" }));
});

test.each([
  ["/", "Students", "Courses"],
  ["/students/S001", "Students", "Courses"],
  ["/courses", "Courses", "Students"],
])("at %s the nav marks %s as the current page", async (path, current, other) => {
  await renderAt(path);

  expect(screen.getByRole("link", { name: current })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: other })).not.toHaveAttribute("aria-current");
});

test("a path outside both sections marks neither nav link as current", async () => {
  await renderAt("/not-a-page");

  expect(screen.getByRole("link", { name: "Students" })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("link", { name: "Courses" })).not.toHaveAttribute("aria-current");
});

test("an unknown path shows a not-found page", async () => {
  await renderAt("/not-a-page");

  expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to the student list" })).toHaveAttribute("href", "/");
});

test.each([
  ["/", "Students"],
  ["/students/S001", "Alex Rivera"],
  ["/courses", "Courses"],
])("%s routes to the %s page", async (path, heading) => {
  await renderAt(path);

  expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
});

test("the header shows when the current SIS import was received", async () => {
  await renderAt("/");

  expect(screen.getByRole("banner")).toHaveTextContent(
    "2027–28 course requests · SIS data as of Oct 28, 1:05 PM",
  );
});

test("when the SIS date can't be loaded the header says so plainly", async () => {
  currentImport.mockRejectedValue(new ApiError("Can't reach the CourseManager server."));

  await renderAt("/");

  expect(screen.getByRole("banner")).toHaveTextContent(
    "2027–28 course requests · SIS data date unavailable",
  );
});

test("the theme defaults to the system setting", async () => {
  systemPrefersDark(true);

  await renderAt("/");

  expect(theme()).toBe("dark");
  expect(screen.getByRole("button", { name: "Switch to light mode" })).toHaveTextContent("Light");
});

test("the toggle switches the theme and remembers it", async () => {
  await renderAt("/");
  expect(theme()).toBe("light");

  fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

  expect(theme()).toBe("dark");
  expect(localStorage.getItem("coursemanager.theme")).toBe("dark");
  expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
});

test("a remembered choice wins over the system setting", async () => {
  systemPrefersDark(true);
  localStorage.setItem("coursemanager.theme", "light");

  await renderAt("/");

  expect(theme()).toBe("light");
});

test("with storage throwing the app still renders in the system theme and toggles", async () => {
  systemPrefersDark(true);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("denied", "SecurityError");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("denied", "SecurityError");
  });

  await renderAt("/");

  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(theme()).toBe("dark");
  fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
  expect(theme()).toBe("light");
});

test("on a student page a course code opens the course dialog", async () => {
  student.mockResolvedValue({
    id: "S003",
    name: "Jordan Williams",
    grade: 10,
    profile: "Retaking Algebra I.",
    status: "in_progress",
    hold_reason: null,
    requests: [
      {
        id: "r-mth101",
        course_code: "MTH101",
        course_name: "Algebra I",
        department: "Math",
        grades: [9],
        is_ap: false,
        type: "priority",
        source: "sis",
        edited_in_app: false,
        reason: null,
      },
    ],
    issues: [],
  });
  await renderAt("/students/S003");

  fireEvent.click(screen.getByRole("button", { name: "MTH101" }));
  await act(async () => {});

  expect(screen.getByRole("dialog")).toHaveTextContent("Requests for this course");
  expect(api.courseRequests).toHaveBeenCalledWith("MTH101");
});
