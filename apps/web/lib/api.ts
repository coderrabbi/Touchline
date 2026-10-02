import { actionToast } from "./action-toast";
import type { ApiFailure, ApiResponse } from "@touchline/shared";

const base = "/api/v1";

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
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const seconds = retryAfter ? (/^\d+$/.test(retryAfter) ? Number(retryAfter) : Math.ceil((Date.parse(retryAfter) - Date.now()) / 1000)) : NaN;
    const wait = Number.isFinite(seconds) && seconds > 0 ? ` Try again in ${Math.ceil(seconds / 60)} minute(s).` : ' Please wait a few minutes before trying again.';
    throw new ApiError(429, 'Too many requests.' + wait);
  }
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
      signal: AbortSignal.timeout(15000),
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
      signal: AbortSignal.timeout(15000),
      headers: {
        "X-CSRF-Token": token,
      },
    }),
  );

  csrfToken = data.data.csrfToken;
}

type RequestOptions = { method?: string; body?: unknown; anonymous?: boolean; notify?: boolean };

export function api<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const operation = () => request<T>(path, { ...options, method }, retry);
  if (["GET", "HEAD"].includes(method) || options.notify === false) return operation();
  return actionToast(operation, path, method);
}

async function request<T>(
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
      signal: AbortSignal.timeout(15000),
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
    (!options.anonymous || path === "/auth/me") &&
    !path.startsWith("/auth/refresh")
  ) {
    try {
      refreshing ??= rotate().finally(() => {
        refreshing = undefined;
      });

      await refreshing;

      return request<T>(path, options, false);
    } catch (error) {
      if (error instanceof ApiError && [401,403].includes(error.status)) {
        clearSession();
        throw new ApiError(401, "Your session has expired. Please log in again.");
      }
      throw error;
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

async function uploadRequest(
  file: File,
  purpose: string,
  retry = true,
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
      signal: AbortSignal.timeout(15000),
    headers: {
      "X-CSRF-Token": await csrf(),
    },
    body: form,
  });

  if (response.status === 401 && retry) {
    refreshing ??= rotate().finally(() => { refreshing = undefined; });
    await refreshing;
    return uploadRequest(file, purpose, false);
  }

  return (
    await decode<{
      id: string;
      url: string;
    }>(response)
  ).data;
}

/** Fetch evidence with the same session recovery used by API calls. */
export async function openProtectedUpload(uploadId: string): Promise<string> {
  const request=()=>fetch(`${base}/uploads/${encodeURIComponent(uploadId)}`,{credentials:'include',cache:'no-store'});
  let response=await request();
  if(response.status===401){
    refreshing ??= rotate().finally(()=>{refreshing=undefined});
    await refreshing;
    response=await request();
  }
  if(!response.ok)throw new ApiError(response.status,'Unable to load evidence. Please try again.');
  return URL.createObjectURL(await response.blob());
}

export function uploadImage(file: File, purpose: string, retry = true): Promise<{id: string; url: string}> {
  return actionToast(() => uploadRequest(file, purpose, retry), "/uploads", "POST");
}
