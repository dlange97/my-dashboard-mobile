// Minimal mock for react-native-reanimated in Jest (no native worklets needed)
export const useSharedValue = jest.fn((v: unknown) => ({ value: v }));
export const useAnimatedStyle = jest.fn((fn: () => unknown) => fn());
export const withTiming = jest.fn((v: unknown) => v);
export const withSpring = jest.fn((v: unknown) => v);
export const withDelay = jest.fn((_d: number, v: unknown) => v);
export const runOnJS = jest.fn((fn: (...args: unknown[]) => unknown) => fn);
export const Easing = {
  in: jest.fn(),
  out: jest.fn(),
  inOut: jest.fn(),
  linear: jest.fn(),
};

// Re-export Animated from react-native so components using Reanimated Animated still work
export { default as default } from "react-native/Libraries/Animated/Animated";
