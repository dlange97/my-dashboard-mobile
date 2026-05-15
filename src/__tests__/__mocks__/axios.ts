// Minimal axios mock for Jest – prevents the fetch adapter from loading
// (expo/virtual/streams.js has an incomplete ReadableStream that crashes on import)

class AxiosError extends Error {
  response: unknown;
  constructor(message?: string) {
    super(message);
    this.name = "AxiosError";
  }
}
AxiosError.prototype.isAxiosError = true;

function isAxiosError(val: unknown): val is AxiosError {
  return val instanceof AxiosError;
}

const axiosMock = {
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  AxiosError,
  isAxiosError,
  default: undefined as any,
};
axiosMock.default = axiosMock;

module.exports = axiosMock;
module.exports.AxiosError = AxiosError;
module.exports.default = axiosMock;
