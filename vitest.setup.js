import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: () => ({ value: "mock-token" }),
  }),
}));
