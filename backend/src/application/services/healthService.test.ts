import { describe, expect, it } from "vitest";
import { ping } from "./healthService.js";

describe("ping", () => {
  it("returns the expected pong payload", () => {
    expect(ping()).toEqual({ ok: true, message: "pong" });
  });
});
