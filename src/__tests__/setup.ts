// Global test setup – runs after jest framework is available
// (extend-expect is loaded separately via setupFilesAfterFramework)

// Silence noisy RN/Expo warnings in test output
jest.spyOn(console, "warn").mockImplementation((msg) => {
  if (
    typeof msg === "string" &&
    (msg.includes("Require cycle") ||
      msg.includes("new NativeEventEmitter") ||
      msg.includes("No native") ||
      msg.includes("useNativeDriver"))
  ) {
    return;
  }
  console.warn(msg);
});
