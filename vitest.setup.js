import { vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: () => ({ value: "mock-token" }),
  }),
}));
