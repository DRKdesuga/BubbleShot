import { ping } from "./healthService";

describe("ping", () => {
  it("returns the expected pong payload", () => {
    expect(ping()).toEqual({ ok: true, message: "pong" });
  });
});
