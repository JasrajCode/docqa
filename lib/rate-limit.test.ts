import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The limiter keeps its buckets in module-level state, so each test imports a
// fresh copy of the module. Fake timers control Date.now() and the cleanup interval.
let checkRateLimit: typeof import("@/lib/rate-limit").checkRateLimit;
let getClientIp: typeof import("@/lib/rate-limit").getClientIp;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  vi.resetModules();
  ({ checkRateLimit, getClientIp } = await import("@/lib/rate-limit"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows up to max requests, then blocks", () => {
    const results = Array.from({ length: 4 }, () => checkRateLimit("ip:1", 3, HOUR));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
  });

  it("tracks each key separately", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("ip:1", 3, HOUR);
    expect(checkRateLimit("ip:1", 3, HOUR).ok).toBe(false);
    expect(checkRateLimit("ip:2", 3, HOUR).ok).toBe(true);
  });

  it("stays blocked until the window ends, then resets", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("ip:1", 3, HOUR);

    vi.advanceTimersByTime(HOUR - 1);
    expect(checkRateLimit("ip:1", 3, HOUR).ok).toBe(false);

    vi.advanceTimersByTime(1);
    const afterReset = checkRateLimit("ip:1", 3, HOUR);
    expect(afterReset.ok).toBe(true);
    expect(afterReset.remaining).toBe(2);
  });

  it("uses a fixed window: resetAt is set by the first request and does not slide", () => {
    const first = checkRateLimit("ip:1", 3, HOUR);
    expect(first.resetAt).toBe(Date.now() + HOUR);

    vi.advanceTimersByTime(10 * MINUTE);
    expect(checkRateLimit("ip:1", 3, HOUR).resetAt).toBe(first.resetAt);
  });

  it("enforces the daily cap even when the hourly window is fresh (demo route setup)", () => {
    // The demo route checks `demo:h:<ip>` (10/hour) and `demo:d:<ip>` (30/day).
    const ip = "203.0.113.7";
    for (let hour = 0; hour < 3; hour++) {
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(`demo:h:${ip}`, 10, HOUR).ok).toBe(true);
        expect(checkRateLimit(`demo:d:${ip}`, 30, 24 * HOUR).ok).toBe(true);
      }
      vi.advanceTimersByTime(HOUR);
    }
    expect(checkRateLimit(`demo:h:${ip}`, 10, HOUR).ok).toBe(true);
    expect(checkRateLimit(`demo:d:${ip}`, 30, 24 * HOUR).ok).toBe(false);
  });
});

describe("getClientIp", () => {
  const req = (headers: Record<string, string>) => new Request("http://localhost", { headers });

  it("uses the first address in x-forwarded-for", () => {
    expect(getClientIp(req({ "x-forwarded-for": "203.0.113.7 , 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(req({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    expect(getClientIp(req({}))).toBe("unknown");
  });
});
