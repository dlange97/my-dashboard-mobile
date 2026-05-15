/**
 * Tests for DashboardScreen
 * Mocks auth context to simulate an authenticated user.
 */
import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import DashboardScreen from "../screens/DashboardScreen";

jest.mock("../api/api", () => ({
  __esModule: true,
  default: {
    getTodos: jest.fn().mockResolvedValue([
      {
        id: "1",
        text: "Buy milk",
        done: false,
        dueDate: null,
        ownerId: "u1",
        createdAt: "",
      },
      {
        id: "2",
        text: "Do laundry",
        done: true,
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
    ]),
    getEvents: jest.fn().mockResolvedValue([
      {
        id: "e1",
        title: "Team Meeting",
        description: "",
        startAt: "2099-01-01T10:00:00Z",
        endAt: null,
        location: null,
        ownerId: "u1",
      },
    ]),
    getNotes: jest.fn().mockResolvedValue([
      { id: "n1", title: "Note 1", content: "Hello", createdAt: "" },
      { id: "n2", title: "Note 2", content: "World", createdAt: "" },
    ]),
  },
  setOnUnauthorized: jest.fn(),
}));

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "admin@test.com",
      firstName: "Admin",
      lastName: "Test",
      roles: ["ROLE_ADMIN"],
      permissions: [
        "dashboard.view",
        "todos.view",
        "shopping.view",
        "events.view",
      ],
      status: "active",
      language: "en",
      dashboardLayout: null,
      instanceId: null,
    },
    isAuthenticated: true,
    hasPermission: (p: string) =>
      ["dashboard.view", "todos.view", "shopping.view", "events.view"].includes(
        p,
      ),
    hasAnyPermission: () => true,
  }),
}));

jest.mock("../context/TranslationContext", () => ({
  useTranslation: () => ({ t: (_: string, fallback: string) => fallback }),
}));

jest.mock("../context/InboxContext", () => ({
  useInbox: () => ({ unreadCount: 3 }),
}));

function renderDashboard() {
  return render(
    <NavigationContainer>
      <DashboardScreen />
    </NavigationContainer>,
  );
}

describe("DashboardScreen", () => {
  it("renders greeting with user first name", async () => {
    const { findByText } = renderDashboard();
    await findByText(/Hello.*Admin/);
  });

  it("shows Todos summary card", async () => {
    const { findByText } = renderDashboard();
    await findByText("Todos");
  });

  it("shows Shopping summary card", async () => {
    const { findByText } = renderDashboard();
    await findByText("Shopping");
  });

  it("shows Events summary card", async () => {
    const { findByText } = renderDashboard();
    await findByText("Events");
  });

  it("shows Inbox card with unread count", async () => {
    const { findByText } = renderDashboard();
    await findByText("Inbox");
    await findByText("3");
  });

  it("shows notes section on home", async () => {
    const { findByText } = renderDashboard();
    await findByText("Show less");
  });

  it("shows 1 pending todo (not done)", async () => {
    const { findAllByText } = renderDashboard();
    // 1 pending todo — value appears in the Todos card
    const ones = await findAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });
});
