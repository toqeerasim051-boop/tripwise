export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Every failed request surfaces as an ApiError.
 * kind: 'http' (non-2xx), 'network' (offline/CORS/DNS), 'timeout', 'parse' (bad JSON),
 *       'api' (2xx with an error body), 'config' (e.g. missing API key).
 */
export class ApiError extends Error {
  /** `code` is the API's machine-readable error code when it sends one (e.g. 'originNotAllowed'). */
  constructor(message, { kind, status = null, url = null, code = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.url = url;
    this.code = code;
  }
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}

function createAbortError(signal) {
  return signal?.reason instanceof Error
    ? signal.reason
    : new DOMException('The operation was aborted.', 'AbortError');
}

/** Pulls a human-readable message out of the error bodies used by our APIs. */
function extractErrorMessage(body) {
  if (!body || typeof body !== 'object') return null;
  if (Array.isArray(body.errors) && typeof body.errors[0]?.message === 'string') {
    return body.errors[0].message; // REST Countries
  }
  if (typeof body.reason === 'string') return body.reason; // Open-Meteo
  if (typeof body.message === 'string') return body.message;
  return null;
}

/**
 * GET a JSON resource with a timeout, typed errors and AbortSignal support.
 * A caller-initiated abort rethrows the AbortError untouched so hooks can ignore it.
 */
export async function getJson(url, { signal, headers, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (signal?.aborted) throw createAbortError(signal);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', forwardAbort, { once: true });

  const rethrowIfAborted = (cause) => {
    if (signal?.aborted) throw createAbortError(signal);
    if (timedOut) {
      throw new ApiError(`Request timed out after ${timeoutMs} ms`, {
        kind: 'timeout',
        url,
        cause,
      });
    }
  };

  try {
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', ...headers },
      });
    } catch (cause) {
      rethrowIfAborted(cause);
      throw new ApiError('Network request failed', { kind: 'network', url, cause });
    }

    let body;
    try {
      body = await response.json();
    } catch (cause) {
      rethrowIfAborted(cause);
      if (!response.ok) {
        throw new ApiError(`Request failed with status ${response.status}`, {
          kind: 'http',
          status: response.status,
          url,
        });
      }
      throw new ApiError('Response was not valid JSON', { kind: 'parse', url, cause });
    }

    if (!response.ok) {
      const detail = extractErrorMessage(body);
      const code = body?.errors?.[0]?.code;
      throw new ApiError(detail ?? `Request failed with status ${response.status}`, {
        kind: 'http',
        status: response.status,
        url,
        code: typeof code === 'string' ? code : null,
      });
    }

    return body;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

/**
 * Lets one caller stop waiting on a shared (cached) promise without cancelling it for others.
 */
export function withAbort(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(createAbortError(signal));

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(createAbortError(signal));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

/** User-facing message for any error thrown by the services. Technical detail stays in the console. */
export function getErrorMessage(error) {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';

  switch (error.kind) {
    case 'timeout':
      return 'The request took too long. Check your connection and try again.';
    case 'network':
      return "Couldn't reach the server. Check your internet connection and try again.";
    case 'config':
      return 'This feature is not configured yet. Please contact the site owner.';
    case 'http':
      if (error.status === 404) return "We couldn't find what you were looking for.";
      if (error.status === 401) return 'The data service rejected our credentials.';
      if (error.code === 'originNotAllowed') {
        return "This website isn't allowed to use the country data service yet. The site owner needs to add it to the API key's allowed origins.";
      }
      if (error.status === 403)
        return 'The data service limit has been reached. Please try again later.';
      if (error.status === 429) return 'Too many requests. Please wait a moment and try again.';
      if (error.status >= 500)
        return 'The data service is having problems. Please try again later.';
      return 'The request could not be completed. Please try again.';
    default:
      return 'We received an unexpected response. Please try again.';
  }
}

/**
 * True for failures that may pass on their own (offline, timeout, rate limit, server error),
 * when showing an older cached copy beats showing an error.
 */
export function isTemporaryError(error) {
  if (!(error instanceof ApiError)) return false;
  if (error.kind === 'network' || error.kind === 'timeout') return true;
  return error.kind === 'http' && (error.status === 429 || error.status >= 500);
}
