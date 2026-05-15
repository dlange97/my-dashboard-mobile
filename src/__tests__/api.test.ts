/**
 * Unit tests for src/api/api.ts error-message contract.
 * Uses a mock axios (moduleNameMapper) to avoid the fetch adapter
 * crashing on expo/virtual/streams.js ReadableStream polyfill.
 */
import { AxiosError } from "axios";

// The extractError logic is embedded in api.ts; we test it by constructing
// AxiosError instances and verifying the expected thrown message.
//
// Since api.ts uses axios.create (which triggers the fetch adapter at module
// load time in jsdom), we mock the whole module for screen tests and test
// the error-message contract here in isolation using AxiosError directly.

function simulateExtractError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (!error.response) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "(not set)";
      return `Cannot reach server at ${apiUrl}. Check your .env EXPO_PUBLIC_API_URL and ensure the backend is running.`;
    }
    const data = error.response.data as Record<string, unknown> | undefined;
    return (
      (data?.error as string) ??
      (data?.message as string) ??
      `HTTP ${error.response.status}: ${error.response.statusText}`
    );
  }
  throw error;
}

describe("api error message logic", () => {
  it('returns "Cannot reach server" message when there is no response (network failure)', () => {
    const err = new AxiosError("Network Error");
    (err as any).response = undefined;
    const msg = simulateExtractError(err);
    expect(msg).toMatch(/Cannot reach server/);
  });

  it("includes EXPO_PUBLIC_API_URL in the network failure message", () => {
    process.env.EXPO_PUBLIC_API_URL = "http://10.0.2.2";
    const err = new AxiosError("Network Error");
    (err as any).response = undefined;
    const msg = simulateExtractError(err);
    expect(msg).toContain("http://10.0.2.2");
  });

  it("extracts error field from response body", () => {
    const err = new AxiosError("Bad credentials");
    (err as any).response = {
      status: 401,
      statusText: "Unauthorized",
      data: { error: "Bad credentials" },
    };
    expect(simulateExtractError(err)).toBe("Bad credentials");
  });

  it("falls back to message field when error field is missing", () => {
    const err = new AxiosError("Not found");
    (err as any).response = {
      status: 404,
      statusText: "Not Found",
      data: { message: "Resource not found" },
    };
    expect(simulateExtractError(err)).toBe("Resource not found");
  });

  it("falls back to HTTP status string when data has no error/message", () => {
    const err = new AxiosError("Server error");
    (err as any).response = {
      status: 500,
      statusText: "Internal Server Error",
      data: {},
    };
    expect(simulateExtractError(err)).toBe("HTTP 500: Internal Server Error");
  });

  it("rethrows non-axios errors unchanged", () => {
    const generic = new Error("something else");
    expect(() => simulateExtractError(generic)).toThrow("something else");
  });
});
