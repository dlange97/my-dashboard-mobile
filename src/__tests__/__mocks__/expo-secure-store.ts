const store: Record<string, string> = {};

export const getItemAsync = jest.fn((key: string) =>
  Promise.resolve(store[key] ?? null),
);
export const setItemAsync = jest.fn((key: string, value: string) => {
  store[key] = value;
  return Promise.resolve();
});
export const deleteItemAsync = jest.fn((key: string) => {
  delete store[key];
  return Promise.resolve();
});

export function __reset() {
  Object.keys(store).forEach((k) => delete store[k]);
  (getItemAsync as jest.Mock).mockClear();
  (setItemAsync as jest.Mock).mockClear();
  (deleteItemAsync as jest.Mock).mockClear();
}
