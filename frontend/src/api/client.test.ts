import { afterEach, expect, test, vi } from "vitest";

import { ApiError, api, getJson, sendJson } from "./client";

function stubFetch(impl: (input: string) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Like stubFetch, but the mock's calls keep the RequestInit for assertions.
function stubFetchCalls(body: unknown) {
  const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async () =>
    jsonResponse(body),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("requests go to /api and return the parsed body", async () => {
  const fetchMock = stubFetch(async () => jsonResponse({ status: "ok" }));

  await expect(getJson("/health")).resolves.toEqual({ status: "ok" });
  expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.anything());
});

test("currentImport reads the current SIS import", async () => {
  const sisImport = { id: 3, received_at: "2026-10-28T13:05:00Z", source: "seed" };
  const fetchMock = stubFetch(async () => jsonResponse(sisImport));

  await expect(api.currentImport()).resolves.toEqual(sisImport);
  expect(fetchMock).toHaveBeenCalledWith("/api/sis/current-import", expect.anything());
});

test("students reads the student list", async () => {
  const list = { sis_as_of: "2026-10-28T13:05:00Z", students: [] };
  const fetchMock = stubFetch(async () => jsonResponse(list));

  await expect(api.students()).resolves.toEqual(list);
  expect(fetchMock).toHaveBeenCalledWith("/api/students", expect.anything());
});

test("an error response surfaces the server's plain message", async () => {
  stubFetch(async () => jsonResponse({ detail: "Student S999 was not found." }, 404));

  const error = await getJson("/students/S999").catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).message).toBe("Student S999 was not found.");
  expect((error as ApiError).status).toBe(404);
});

test("an error response without a message gets a plain one with the status", async () => {
  stubFetch(async () => new Response("Internal Server Error", { status: 500 }));

  await expect(getJson("/students")).rejects.toThrow(
    "The server couldn't complete the request (error 500). Try again.",
  );
});

test("a network failure surfaces a plain message, not the browser's", async () => {
  stubFetch(async () => {
    throw new TypeError("Failed to fetch");
  });

  await expect(getJson("/students")).rejects.toThrow(
    "Can't reach the CourseManager server. Check that it is running, then try again.",
  );
});

test("a success response that isn't JSON surfaces a plain message", async () => {
  stubFetch(async () => new Response("<!doctype html><html></html>", { status: 200 }));

  await expect(getJson("/students")).rejects.toThrow(
    "The server sent a response CourseManager couldn't read. Try again.",
  );
});

test("sendJson sends a JSON body with the method and returns the parsed body", async () => {
  const fetchMock = stubFetchCalls({ id: "S001" });

  await expect(sendJson("PATCH", "/requests/r1", { type: "elective" })).resolves.toEqual({
    id: "S001",
  });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/requests/r1");
  expect(init?.method).toBe("PATCH");
  expect(init?.body).toBe(JSON.stringify({ type: "elective" }));
  expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
});

test("sendJson without a body sends none", async () => {
  const fetchMock = stubFetchCalls({ id: "S001" });

  await api.removeRequest("r1");

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/requests/r1");
  expect(init?.method).toBe("DELETE");
  expect(init?.body).toBeUndefined();
});

test("sendJson surfaces the server's plain message on an error", async () => {
  stubFetch(async () => jsonResponse({ detail: "Algebra I is already on Alex's list." }, 409));

  await expect(sendJson("POST", "/students/S001/requests", {})).rejects.toThrow(
    "Algebra I is already on Alex's list.",
  );
});

test.each([
  ["courses", () => api.courses(), "/api/courses"],
  ["courseRequests", () => api.courseRequests("SS402"), "/api/courses/SS402/requests"],
  ["catalog", () => api.catalog(), "/api/catalog"],
])("%s reads %s", async (_name, call, url) => {
  const fetchMock = stubFetch(async () => jsonResponse([]));

  await call();

  expect(fetchMock).toHaveBeenCalledWith(url, expect.anything());
});

test("updateRequest patches only the fields given", async () => {
  const fetchMock = stubFetchCalls({});

  await api.updateRequest("r7", { type: "priority" });

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/requests/r7");
  expect(init?.method).toBe("PATCH");
  expect(JSON.parse(String(init?.body))).toEqual({ type: "priority" });
});

test("student reads one student's detail", async () => {
  const fetchMock = stubFetch(async () => jsonResponse({ id: "S003" }));

  await api.student("S003");

  expect(fetchMock).toHaveBeenCalledWith("/api/students/S003", expect.anything());
});

test("addRequest posts the course code and leaves the type to the server (elective)", async () => {
  const fetchMock = stubFetchCalls({});

  await api.addRequest("S003", "AT202");

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/students/S003/requests");
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toEqual({ course_code: "AT202" });
});

test("setReview puts the status", async () => {
  const fetchMock = stubFetchCalls({});

  await api.setReview("S003", "done");

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/students/S003/review");
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(String(init?.body))).toEqual({ status: "done" });
});

test("setReview sends the hold reason with On hold", async () => {
  const fetchMock = stubFetchCalls({});

  await api.setReview("S003", "on_hold", "Waiting on transcript");

  const [, init] = fetchMock.mock.calls[0];
  expect(JSON.parse(String(init?.body))).toEqual({
    status: "on_hold",
    hold_reason: "Waiting on transcript",
  });
});
