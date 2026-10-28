import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import App from "./App";
import { ApiError, api } from "./api/client";

vi.mock("./api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/client")>();
  return { ...actual, api: { currentImport: vi.fn() } };
});

const currentImport = vi.mocked(api.currentImport);

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
  ["/students/S001", "Student S001"],
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
