import { API_BASE_URL } from "./endpoints";
import type { ApiEnvelope } from "./contracts";

export class HttpClientError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "HttpClientError";
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  rawResponse?: boolean;
}

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function hasBody(method?: string): boolean {
  return method !== undefined && !["GET", "HEAD"].includes(method.toUpperCase());
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined" || !document.cookie) {
    return null;
  }

  const parts = document.cookie.split(";").map((part) => part.trim());
  const prefix = `${name}=`;
  const match = parts.find((part) => part.startsWith(prefix));
  if (!match) {
    return null;
  }
  return decodeURIComponent(match.slice(prefix.length));
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const shouldSendBody = options.body !== undefined && hasBody(method);
  const headers = new Headers(options.headers ?? undefined);
  const normalizedMethod = method.toUpperCase();

  if (shouldSendBody && options.body !== null && !(options.body instanceof FormData) && !(options.body instanceof Blob)) {
    headers.set("Content-Type", "application/json");
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(normalizedMethod) && !headers.has("X-CSRFToken")) {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
      headers.set("X-CSRFToken", csrfToken);
    }
  }

  const requestUrl = isAbsoluteUrl(path) ? path : `${API_BASE_URL}${path}`;

  const response = await fetch(requestUrl, {
    ...options,
    method,
    headers,
    credentials: "include",
    body: shouldSendBody
      ? options.body instanceof FormData || options.body instanceof Blob
        ? (options.body as BodyInit)
        : JSON.stringify(options.body)
      : undefined,
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (options.rawResponse) {
    if (!response.ok || (payload && payload.success === false)) {
      const message =
        payload && payload.success === false
          ? `${payload.error.type}:${payload.error.code}`
          : `HTTP_${response.status}`;
      throw new HttpClientError(message, response.status, payload ?? undefined);
    }

    return payload as T;
  }

  if (!response.ok || !payload || payload.success === false) {
    const message =
      payload && payload.success === false
        ? `${payload.error.type}:${payload.error.code}`
        : `HTTP_${response.status}`;
    throw new HttpClientError(message, response.status, payload ?? undefined);
  }

  return payload.data;
}
