export function cookies() {
  return {
    get: () => ({ value: "mock-token" }),
  };
}
export function headers() {
  return new Map();
}
