// The one module that talks to the API. Screens call `api`, so tests can mock it.

export class ApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface SisImport {
  id: number;
  received_at: string;
  source: string;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return `The server couldn't complete the request (error ${response.status}). Try again.`;
}

export async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError(
      "Can't reach the CourseManager server. Check that it is running, then try again.",
    );
  }
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  return (await response.json()) as T;
}

export const api = {
  currentImport: () => getJson<SisImport>("/sis/current-import"),
};
