import { afterEach, expect, test, vi } from "vitest";

import { ApiError, api, getJson } from "./client";

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
