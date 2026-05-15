/**
 * Tests for ProfileScreen
 */
import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import ProfileScreen from "../screens/ProfileScreen";

const mockLogout = jest.fn();

jest.mock("../api/api", () => ({
  __esModule: true,
  default: {
    getTodos: jest.fn().mockResolvedValue([
      {
        id: "1",
        text: "Task A",
        done: true,
        dueDate: null,
        ownerId: "u1",
        createdAt: "",
      },
      {
        id: "2",
        text: "Task B",
        done: false,
        dueDate: null,
        ownerId: "u1",
        createdAt: "",
      },
      {
        id: "3",
        text: "Task C",
        done: false,
        dueDate: null,
        ownerId: "u1",
        createdAt: "",
      },
    ]),
    getLists: jest.fn().mockResolvedValue([
      {
        id: "l1",
        name: "Groceries",
        status: "open",
        ownerId: "u1",
        products: [],
        createdAt: "",
      },
      {
        id: "l2",
        name: "Hardware",
        status: "open",
        ownerId: "u1",
        products: [],
        createdAt: "",
      },
    ]),
    getEvents: jest.fn().mockResolvedValue([
      {
        id: "e1",
        title: "Sprint Review",
        description: "",
        startAt: "2099-06-10T10:00:00Z",
        endAt: null,
        location: null,
        ownerId: "u1",
      },
    ]),
  },
  setOnUnauthorized: jest.fn(),
}));

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "jan@test.com",
      firstName: "Jan",
      lastName: "Kowalski",
      roles: ["ROLE_ADMIN"],
      permissions: ["todos.view", "shopping.view", "events.view"],
      status: "active",
      language: "pl",
      dashboardLayout: null,
      instanceId: null,
    },
    logout: mockLogout,
    hasPermission: () => true,
  }),
}));

jest.mock("../context/TranslationContext", () => ({
  useTranslation: () => ({ t: (_: string, fallback: string) => fallback }),
}));

function renderProfile() {
  return render(
    <NavigationContainer>
      <ProfileScreen />
    </NavigationContainer>,
  );
}

describe("ProfileScreen", () => {
  beforeEach(() => mockLogout.mockClear());

  it("renders user full name and email", async () => {
    const { findAllByText } = renderProfile();
    const names = await findAllByText("Jan Kowalski");
    expect(names.length).toBeGreaterThanOrEqual(1);
    const emails = await findAllByText("jan@test.com");
    expect(emails.length).toBeGreaterThanOrEqual(1);
  });

  it("shows initials in avatar", async () => {
    const { findByText } = renderProfile();
    await findByText("JK");
  });

  it("displays role badge", async () => {
    const { findAllByText } = renderProfile();
    const badges = await findAllByText("ADMIN");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows todo stats after load", async () => {
    const { findByText } = renderProfile();
    await findByText("1/3"); // done/total
  });

  it("shows shopping list count", async () => {
    const { findByText } = renderProfile();
    await findByText("2");
  });

  it("shows upcoming event title", async () => {
    const { findByText } = renderProfile();
    await findByText("Sprint Review");
  });

  it("calls logout when Sign out is pressed", async () => {
    const { findByText } = renderProfile();
    const btn = await findByText("Sign out");
    fireEvent.press(btn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
