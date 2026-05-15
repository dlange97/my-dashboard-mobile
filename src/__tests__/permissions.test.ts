/**
 * Unit tests for src/auth/permissions.ts
 */
import {
  decodeJwtClaims,
  hasPermission,
  hasAnyPermission,
} from "../auth/permissions";

function buildFakeJwt(payload: Record<string, unknown> = {}): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(
    JSON.stringify({ sub: "user-1", exp: 9999999999, ...payload }),
  );
  return `${header}.${body}.fakesig`;
}

describe("decodeJwtClaims", () => {
  it("returns null for null input", () => {
    expect(decodeJwtClaims(null)).toBeNull();
  });

  it("returns null for malformed token", () => {
    expect(decodeJwtClaims("not.a.jwt")).toBeNull();
  });

  it("decodes a valid fake JWT payload", () => {
    const token = buildFakeJwt({
      email: "test@test.com",
      roles: ["ROLE_ADMIN"],
    });
    const claims = decodeJwtClaims(token);
    expect(claims).not.toBeNull();
    expect(claims?.email).toBe("test@test.com");
    expect(claims?.roles).toEqual(["ROLE_ADMIN"]);
  });
});

describe("hasPermission", () => {
  const user = { permissions: ["todos.view", "dashboard.view"] };

  it("returns true when permission is in list", () => {
    expect(hasPermission(user, "todos.view")).toBe(true);
  });

  it("returns false when permission is missing", () => {
    expect(hasPermission(user, "admin.delete")).toBe(false);
  });

  it("returns true when permission is undefined (public)", () => {
    expect(hasPermission(user, undefined)).toBe(true);
  });

  it("returns false for null user", () => {
    expect(hasPermission(null, "todos.view")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  const user = { permissions: ["todos.view", "shopping.view"] };

  it("returns true when at least one permission matches", () => {
    expect(hasAnyPermission(user, ["admin.all", "todos.view"])).toBe(true);
  });

  it("returns false when none match", () => {
    expect(hasAnyPermission(user, ["admin.all", "events.edit"])).toBe(false);
  });

  it("returns false for empty list", () => {
    expect(hasAnyPermission(user, [])).toBe(false);
  });
});
