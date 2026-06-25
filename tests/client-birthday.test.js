import { describe, expect, it } from "vitest";
import { calculateAgeAndCountdown } from "../src/lib/customer-profiles/birthday-helpers.js";

describe("client birthday helper functions", () => {
  it("calculates age correctly when birthday has passed", () => {
    const today = new Date("2026-06-25");
    const result = calculateAgeAndCountdown("1990-03-15", today);
    expect(result.age).toBe(36);
  });

  it("calculates age correctly when birthday is in the future", () => {
    const today = new Date("2026-06-25");
    const result = calculateAgeAndCountdown("1990-10-25", today);
    expect(result.age).toBe(35);
  });

  it("calculates countdown days correctly for upcoming birthdays", () => {
    const today = new Date("2026-06-25");
    const result = calculateAgeAndCountdown("1990-06-30", today);
    expect(result.daysToBirthday).toBe(5);
  });

  it("calculates countdown days correctly for today's birthday", () => {
    const today = new Date("2026-06-25");
    const result = calculateAgeAndCountdown("1990-06-25", today);
    expect(result.daysToBirthday).toBe(0);
  });

  it("returns null values for missing date of birth", () => {
    const result = calculateAgeAndCountdown("", new Date());
    expect(result.age).toBeNull();
    expect(result.daysToBirthday).toBeNull();
  });
});
