export const getPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: "denied", granted: false }),
);
export const requestPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: "denied", granted: false }),
);
export const getExpoPushTokenAsync = jest.fn(() =>
  Promise.resolve({ data: "ExponentPushToken[test]" }),
);
export const addNotificationReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));
export const addNotificationResponseReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));
export const setNotificationHandler = jest.fn();
export const AndroidImportance = { MAX: 5 };
export const setNotificationChannelAsync = jest.fn(() => Promise.resolve(null));
