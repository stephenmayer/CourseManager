import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ApiError, api } from "../api/client";
import CourseDialog from "./CourseDialog";
import { catalog, mth101RequestsKept, requestsFor } from "./fixtures";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    api: { catalog: vi.fn(), courseRequests: vi.fn(), updateRequest: vi.fn(), removeRequest: vi.fn() },
  };
});

const mocked = vi.mocked(api);

beforeEach(() => {
  mocked.catalog.mockResolvedValue(catalog);
  mocked.courseRequests.mockImplementation(async (code) => requestsFor(code));
  // Writes return the student; the dialog doesn't read it.
  mocked.updateRequest.mockResolvedValue({} as never);
  mocked.removeRequest.mockResolvedValue({} as never);
});

afterEach(() => {
  vi.resetAllMocks();
});

async function openDialog(code: string, props: { onClose?: () => void; onChange?: () => void } = {}) {
  render(
    <MemoryRouter>
      <CourseDialog code={code} onClose={props.onClose ?? vi.fn()} onChange={props.onChange ?? vi.fn()} />
    </MemoryRouter>,
  );
  await act(async () => {});
  return screen.getByRole("dialog");
}

function cards(dialog: HTMLElement) {
  return within(dialog).getAllByRole("listitem");
}

test("SS402 lists Aisha (priority), Aisha's duplicate elective as an error, and Liam", async () => {
  const dialog = await openDialog("SS402");

  expect(dialog).toHaveAccessibleName("SS402 AP Government");
  expect(dialog).toHaveTextContent("Requests for this course");
  expect(dialog).toHaveTextContent("Social Studies · grade 12 · 3 requests (2 priority, 1 elective)");

  const [aishaP, aishaE, liam] = cards(dialog);
  expect(aishaP).toHaveTextContent("Aisha Johnson");
  expect(aishaP).toHaveTextContent("Priority");
  expect(within(aishaP).getByRole("link", { name: "Aisha Johnson" })).toHaveAttribute("href", "/students/S008");
  expect(within(aishaP).getByRole("button", { name: "Make elective" })).toBeInTheDocument();
  expect(within(aishaP).getByRole("button", { name: "Remove" })).toBeInTheDocument();

  expect(aishaE).toHaveTextContent("Elective");
  expect(aishaE).toHaveTextContent("Requested twice. Aisha already has this as a priority. Remove this copy.");
  expect(aishaE).toHaveClass("request-card-error");
  expect(within(aishaE).getAllByRole("button").map((b) => b.textContent)).toEqual(["Remove"]);

  expect(liam).toHaveTextContent("Liam O'Brien");
  expect(liam).toHaveTextContent("Priority");
});

test("MTH101 lists Alex, Jordan and Mei with grades, and Jordan's out-of-grade warning", async () => {
  const dialog = await openDialog("MTH101");

  expect(dialog).toHaveAccessibleName("MTH101 Algebra I");
  expect(dialog).toHaveTextContent("Math · grade 9 · 3 requests (3 priority)");
  const [alex, jordan, mei] = cards(dialog);
  expect(alex).toHaveTextContent("Alex Rivera · grade 9");
  expect(mei).toHaveTextContent("Mei Chen · grade 9");
  expect(jordan).toHaveTextContent("Jordan Williams · grade 10");
  expect(jordan).toHaveTextContent("Out of grade. Algebra I is a grade 9 course, and Jordan is going into grade 10.");
  expect(jordan).toHaveClass("request-card-warning");
});

test("a kept out-of-grade request shows its reason", async () => {
  mocked.courseRequests.mockResolvedValue(mth101RequestsKept);

  const dialog = await openDialog("MTH101");

  expect(cards(dialog)[1]).toHaveTextContent('Out of grade, kept with reason: "Retake: failed Algebra I last year"');
});

test("an elective can be made a priority", async () => {
  mocked.courseRequests.mockResolvedValue(requestsFor("SS402").filter((r) => r.request.type === "elective").map((r) => ({ ...r, issues: [] })));

  const dialog = await openDialog("SS402");

  expect(dialog).toHaveTextContent("1 request (1 elective)");
  fireEvent.click(within(dialog).getByRole("button", { name: "Make priority" }));
  await act(async () => {});
  expect(mocked.updateRequest).toHaveBeenCalledWith("r-aisha-e", { type: "priority" });
});

test("a course nobody requested shows its catalog details and says so", async () => {
  const dialog = await openDialog("MTH102");

  expect(dialog).toHaveAccessibleName("MTH102 Geometry");
  expect(dialog).toHaveTextContent("Math · grades 9/10 · 0 requests");
  expect(dialog).toHaveTextContent("No one has requested this course.");
});

test("Remove uses the same DELETE as the student page, reloads and tells the opener", async () => {
  const onChange = vi.fn();
  const dialog = await openDialog("SS402", { onChange });
  mocked.courseRequests.mockResolvedValue(requestsFor("SS402").filter((r) => r.request.id !== "r-aisha-e"));

  fireEvent.click(within(cards(dialog)[1]).getByRole("button", { name: "Remove" }));
  await act(async () => {});

  expect(mocked.removeRequest).toHaveBeenCalledWith("r-aisha-e");
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(cards(dialog)).toHaveLength(2);
  expect(dialog).toHaveTextContent("2 requests (2 priority)");
});

test("Make elective patches the request type and tells the opener", async () => {
  const onChange = vi.fn();
  const dialog = await openDialog("SS402", { onChange });

  fireEvent.click(within(cards(dialog)[2]).getByRole("button", { name: "Make elective" }));
  await act(async () => {});

  expect(mocked.updateRequest).toHaveBeenCalledWith("r-liam", { type: "elective" });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(mocked.courseRequests).toHaveBeenCalledTimes(2);
});

test("a failed change shows the server's message and changes nothing", async () => {
  const onChange = vi.fn();
  mocked.removeRequest.mockRejectedValue(new ApiError("That request was already removed."));
  const dialog = await openDialog("SS402", { onChange });

  fireEvent.click(within(cards(dialog)[2]).getByRole("button", { name: "Remove" }));
  await act(async () => {});

  expect(within(dialog).getByRole("alert")).toHaveTextContent("That request was already removed.");
  expect(onChange).not.toHaveBeenCalled();
});

test("a failed load says so plainly", async () => {
  mocked.courseRequests.mockRejectedValue(new ApiError("Can't reach the CourseManager server."));

  const dialog = await openDialog("SS402");

  expect(within(dialog).getByRole("alert")).toHaveTextContent("Can't reach the CourseManager server.");
});

test("Escape and the Close button close the dialog", async () => {
  const onClose = vi.fn();
  const dialog = await openDialog("SS402", { onClose });

  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);

  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

test("the dialog is modal and explains that edits are the same as on the student page", async () => {
  const dialog = await openDialog("SS402");

  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog).toHaveTextContent(
    "Changes here are the same as editing on the student's page, and reopen a student marked Done.",
  );
});

function Opener() {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <button type="button" onClick={() => setOpen(true)}>
        Open SS402
      </button>
      {open && <CourseDialog code="SS402" onClose={() => setOpen(false)} onChange={() => {}} />}
    </MemoryRouter>
  );
}

test("focus moves into the dialog, is trapped there, and returns to the trigger on close", async () => {
  render(<Opener />);
  const trigger = screen.getByRole("button", { name: "Open SS402" });
  trigger.focus();
  fireEvent.click(trigger);
  await act(async () => {});

  const dialog = screen.getByRole("dialog");
  const close = within(dialog).getByRole("button", { name: "Close" });
  expect(close).toHaveFocus();

  // Shift+Tab from the first control wraps to the last, Tab from the last wraps to the first.
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  const focusable = within(dialog).getAllByRole("button");
  const last = focusable[focusable.length - 1];
  expect(last).toHaveFocus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(close).toHaveFocus();

  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test("after an edit removes the focused card, Escape still closes and Tab goes back into the dialog", async () => {
  const onClose = vi.fn();
  const dialog = await openDialog("SS402", { onClose });
  mocked.courseRequests.mockResolvedValue(requestsFor("SS402").filter((r) => r.request.id !== "r-aisha-e"));
  const remove = within(cards(dialog)[1]).getByRole("button", { name: "Remove" });
  remove.focus();

  fireEvent.click(remove);
  await act(async () => {});
  expect(dialog).not.toContainElement(document.activeElement as HTMLElement);

  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab" });
  expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();

  (document.activeElement as HTMLElement).blur();
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
});
