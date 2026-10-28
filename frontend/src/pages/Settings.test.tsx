import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { ApiError, api, type Check } from "../api/client";
import SettingsPage from "./Settings";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, api: { checks: vi.fn(), setCheck: vi.fn() } };
});

const mocked = vi.mocked(api);

function check(
  rule: string,
  name: string,
  severity: Check["severity"],
  student_count: number,
  enabled = true,
  note: string | null = null,
): Check {
  return {
    rule,
    name,
    description: `${name} description.`,
    note,
    severity,
    enabled,
    locked: severity === "error",
    student_count,
  };
}

// Seed-shaped, as on the approved board (Checks.board.html).
const SEED: Check[] = [
  check("unknown_course", "Unknown course", "error", 1),
  check("duplicate_course", "Course requested twice", "error", 1),
  check("out_of_grade", "Course outside its grade", "warning", 3),
  check(
    "core_subject",
    "No priority course in a core subject",
    "warning",
    0,
    true,
    "Our assumption until the school's graduation rules are added.",
  ),
  check("ap_load", "Heavy AP load", "warning", 2),
];

function withEnabled(rule: string, enabled: boolean): Check[] {
  return SEED.map((c) => (c.rule === rule ? { ...c, enabled } : c));
}

async function renderPage() {
  render(<SettingsPage />);
  await act(async () => {});
}

function rowFor(name: string): HTMLElement {
  const row = screen.getByText(name).closest(".check-row");
  if (!(row instanceof HTMLElement)) throw new Error(`no row for ${name}`);
  return row;
}

beforeEach(() => {
  mocked.checks.mockResolvedValue(SEED);
  mocked.setCheck.mockReset();
});

test("shows the Settings title and a loading line before the checks arrive", () => {
  mocked.checks.mockReturnValue(new Promise(() => {}));
  render(<SettingsPage />);

  expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
  expect(screen.getByText("Loading checks…")).toBeInTheDocument();
});

test("errors are always on and warnings have switches", async () => {
  await renderPage();

  expect(screen.getByRole("heading", { level: 2, name: "Checks" })).toBeInTheDocument();
  const errors = screen.getByRole("group", { name: "Errors" });
  expect(within(errors).getAllByText("Always on")).toHaveLength(2);
  expect(within(errors).queryByRole("switch")).not.toBeInTheDocument();

  const warnings = screen.getByRole("group", { name: "Warnings" });
  const switches = within(warnings).getAllByRole("switch");
  expect(switches.map((s) => s.getAttribute("aria-label"))).toEqual([
    "Course outside its grade",
    "No priority course in a core subject",
    "Heavy AP load",
  ]);
  expect(switches.every((s) => s.getAttribute("aria-checked") === "true")).toBe(true);
});

test("each row says how many students it flags now, and shows the note", async () => {
  await renderPage();

  expect(rowFor("Unknown course")).toHaveTextContent("Flags 1 student now");
  expect(rowFor("Course outside its grade")).toHaveTextContent("Flags 3 students now");
  expect(rowFor("No priority course in a core subject")).toHaveTextContent(
    "Flags no students now",
  );
  expect(rowFor("No priority course in a core subject")).toHaveTextContent(
    "Our assumption until the school's graduation rules are added.",
  );
});

test("a check that is off says it is hidden", async () => {
  mocked.checks.mockResolvedValue(withEnabled("core_subject", false));
  await renderPage();

  const row = rowFor("No priority course in a core subject");
  expect(row).toHaveTextContent("Off. Hidden on every screen.");
  expect(row).not.toHaveTextContent("Flags");
  expect(within(row).getByRole("switch")).toHaveAttribute("aria-checked", "false");
});

test("switching a warning off saves it and shows the new state", async () => {
  mocked.setCheck.mockResolvedValue(withEnabled("ap_load", false));
  await renderPage();

  fireEvent.click(within(rowFor("Heavy AP load")).getByRole("switch"));
  await act(async () => {});

  expect(mocked.setCheck).toHaveBeenCalledWith("ap_load", false);
  const row = rowFor("Heavy AP load");
  expect(within(row).getByRole("switch")).toHaveAttribute("aria-checked", "false");
  expect(row).toHaveTextContent("Off. Hidden on every screen.");
});

test("a failed save leaves the switch as it was and says so", async () => {
  mocked.setCheck.mockRejectedValue(new ApiError("Server down", 500));
  await renderPage();

  fireEvent.click(within(rowFor("Heavy AP load")).getByRole("switch"));
  await act(async () => {});

  const row = rowFor("Heavy AP load");
  expect(within(row).getByRole("switch")).toHaveAttribute("aria-checked", "true");
  expect(within(row).getByRole("alert")).toHaveTextContent(
    "Couldn't save. Heavy AP load is still on. Try again.",
  );
});

test("the switch is disabled while its save is in flight", async () => {
  mocked.setCheck.mockReturnValue(new Promise(() => {}));
  await renderPage();

  const toggle = within(rowFor("Heavy AP load")).getByRole("switch");
  fireEvent.click(toggle);

  expect(toggle).toBeDisabled();
});

test("every switch waits while one save is in flight, so saves land in order", async () => {
  mocked.setCheck.mockReturnValue(new Promise(() => {}));
  await renderPage();

  fireEvent.click(within(rowFor("Heavy AP load")).getByRole("switch"));

  for (const toggle of screen.getAllByRole("switch")) expect(toggle).toBeDisabled();
});

test("when the checks can't be loaded the page says so", async () => {
  mocked.checks.mockRejectedValue(new ApiError("Can't reach the CourseManager server."));
  await renderPage();

  expect(screen.getByRole("alert")).toHaveTextContent("Can't reach the CourseManager server.");
});
