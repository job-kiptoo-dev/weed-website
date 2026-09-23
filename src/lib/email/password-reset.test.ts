import { describe, expect, it } from "vitest";
import { passwordResetEmail } from "./password-reset";

describe("passwordResetEmail", () => {
  it("addresses the user, includes the link and says it expires in 1 hour", () => {
    const url = "http://localhost:3001/api/auth/reset-password/tok";
    const message = passwordResetEmail({
      to: "ada@botanicssupply.example",
      name: "Ada",
      url,
    });
    expect(message).toMatchObject({
      kind: "password-reset",
      to: "ada@botanicssupply.example",
      actionUrl: url,
    });
    expect(message.text).toContain("Hi Ada,");
    expect(message.text).toContain(url);
    expect(message.text).toContain("expires in 1 hour");
  });
});
