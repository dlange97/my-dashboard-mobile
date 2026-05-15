/**
 * Tests for LoginScreen
 */
import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { renderWithProviders } from "./helpers";
import LoginScreen from "../screens/LoginScreen";

// Mock the api module
jest.mock("../api/api", () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    requestAccess: jest.fn(),
    me: jest.fn().mockResolvedValue(null),
  },
  setOnUnauthorized: jest.fn(),
}));

import api from "../api/api";
const mockLogin = api.login as jest.Mock;
const mockRequestAccess = api.requestAccess as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("LoginScreen – render", () => {
  it("shows brand title and sign in subtitle", () => {
    const { getByText } = renderWithProviders(<LoginScreen />);
    expect(getByText("My Dashboard")).toBeTruthy();
    expect(getByText("Sign in to your account")).toBeTruthy();
  });

  it("renders Email and Password labels", () => {
    const { getByText } = renderWithProviders(<LoginScreen />);
    expect(getByText("Email")).toBeTruthy();
    expect(getByText("Password")).toBeTruthy();
  });

  it("shows Sign In and Request Access buttons", () => {
    const { getByText } = renderWithProviders(<LoginScreen />);
    expect(getByText("Sign In")).toBeTruthy();
    expect(getByText("Request Access")).toBeTruthy();
  });
});

describe("LoginScreen – login flow", () => {
  it("calls api.login with entered credentials on submit", async () => {
    mockLogin.mockResolvedValue({ token: "tok", user: { email: "a@b.com" } });
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <LoginScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "a@b.com");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "secret123");
    await act(async () => {
      fireEvent.press(getByText("Sign In"));
    });

    expect(mockLogin).toHaveBeenCalledWith("a@b.com", "secret123");
  });

  it("shows error message when login fails", async () => {
    mockLogin.mockRejectedValue(new Error("Bad credentials"));
    const { getByPlaceholderText, getByText, findByText } = renderWithProviders(
      <LoginScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "a@b.com");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "wrong");
    await act(async () => {
      fireEvent.press(getByText("Sign In"));
    });

    await findByText("Bad credentials");
  });

  it("shows network error when server is unreachable", async () => {
    mockLogin.mockRejectedValue(
      new Error("Cannot reach server at http://10.0.2.2"),
    );
    const { getByPlaceholderText, getByText, findByText } = renderWithProviders(
      <LoginScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("you@example.com"), "a@b.com");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "pass");
    await act(async () => {
      fireEvent.press(getByText("Sign In"));
    });

    await findByText(/Cannot reach server/);
  });
});

describe("LoginScreen – request access flow", () => {
  it("switches to request access view and back", () => {
    const { getByText, queryByText } = renderWithProviders(<LoginScreen />);
    fireEvent.press(getByText("Request Access"));
    expect(getByText("← Back to login")).toBeTruthy();
    fireEvent.press(getByText("← Back to login"));
    expect(queryByText("← Back to login")).toBeNull();
  });

  it("shows error when request access is submitted without email", async () => {
    const { getByText, findByText } = renderWithProviders(<LoginScreen />);
    fireEvent.press(getByText("Request Access"));
    await act(async () => {
      fireEvent.press(getByText("Send Request"));
    });
    await findByText(/Enter your email/i);
  });
});
