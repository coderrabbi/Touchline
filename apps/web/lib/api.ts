import type { ApiFailure, ApiResponse } from "@touchline/shared";

const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";

export const apiBase = base;

let csrfToken: string | undefined;
let refreshing: Promise<void> | undefined;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: ApiFailure["errors"] = [],
  ) {
    super(message);
  }
}

async function decode<T>(res: Response): Promise<ApiResponse<T>> {
  const data: ApiResponse<T> | ApiFailure = await res.json().catch(() => ({
    success: false,
    message: "The server returned an invalid response.",
    errors: [],
  }));

  if (!res.ok || !data.success) {
    throw new ApiError(
      res.status,
      data.message,
      "errors" in data ? data.errors : [],
    );
  }

  return data;
}

export function clearSession() {
  csrfToken = undefined;
}

async function csrf() {
  if (!csrfToken) {
    const data = await decode<{ csrfToken: string }>(
      await fetch(base + "/auth/csrf", {
        credentials: "include",
        cache: "no-store",
      }),
    );

    csrfToken = data.data.csrfToken;
  }

  return csrfToken;
}

async function rotate() {
  const token = await csrf();

  const data = await decode<{ csrfToken: string }>(
    await fetch(base + "/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRF-Token": token,
      },
    }),
  );

  csrfToken = data.data.csrfToken;
}

export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    anonymous?: boolean;
  } = {},
  retry = true,
): Promise<T> {
  const method = options.method || "GET";

  let res: Response;

  try {
    res = await fetch(base + path, {
      method,
      credentials: "include",
      cache: "no-store",

      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),

        ...(!options.anonymous && !["GET", "HEAD"].includes(method)
          ? {
              "X-CSRF-Token": await csrf(),
            }
          : {}),
      },

      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      0,
      "Cannot reach Touchline. Check your connection and try again.",
    );
  }

  if (
    res.status === 401 &&
    retry &&
    !options.anonymous &&
    !path.startsWith("/auth/refresh")
  ) {
    try {
      refreshing ??= rotate().finally(() => {
        refreshing = undefined;
      });

      await refreshing;

      return api<T>(path, options, false);
    } catch {
      clearSession();

      throw new ApiError(401, "Your session has expired. Please log in again.");
    }
  }

  const value = await decode<T>(res);

  if (
    value.data &&
    typeof value.data === "object" &&
    "csrfToken" in value.data &&
    typeof value.data.csrfToken === "string"
  ) {
    csrfToken = value.data.csrfToken;
  }

  return value.data;
}

export async function uploadImage(
  file: File,
  purpose: string,
): Promise<{
  id: string;
  url: string;
}> {
  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError(422, "Choose an image smaller than 5 MB.");
  }

  const form = new FormData();

  form.append("image", file);
  form.append("purpose", purpose);

  const response = await fetch(base + "/uploads", {
    method: "POST",
    credentials: "include",
    headers: {
      "X-CSRF-Token": await csrf(),
    },
    body: form,
  });

  return (
    await decode<{
      id: string;
      url: string;
    }>(response)
  ).data;
}

/**
 * Opens protected uploads such as MATCH_EVIDENCE.
 */
export async function openProtectedUpload(uploadId: string) {
  async function request() {
    return fetch(`${base}/uploads/${uploadId}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  }

  let response = await request();

  // Try refreshing the session once.
  if (response.status === 401) {
    try {
      refreshing ??= rotate().finally(() => {
        refreshing = undefined;
      });

      await refreshing;

      response = await request();
    } catch {
      clearSession();

      throw new ApiError(401, "Your session has expired. Please log in again.");
    }
  }

  if (!response.ok) {
    let message = "Unable to open evidence.";

    try {
      const data = await response.json();

      if (data?.message) {
        message = data.message;
      }
    } catch {
      // Response may be non-JSON.
    }

    throw new ApiError(response.status, message);
  }

  const blob = await response.blob();

  const objectUrl = URL.createObjectURL(blob);

  const windowRef = window.open(objectUrl, "_blank", "noopener,noreferrer");

  if (!windowRef) {
    URL.revokeObjectURL(objectUrl);

    throw new ApiError(0, "Your browser blocked the evidence popup.");
  }

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
}
