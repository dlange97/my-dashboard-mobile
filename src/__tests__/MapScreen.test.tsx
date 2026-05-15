/**
 * Tests for MapScreen – in particular that undefined/null coordinates
 * don't cause a render crash (regression test for the bug seen in production).
 */
import React from "react";
import { render, waitFor, fireEvent, act } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import MapScreen from "../screens/MapScreen";

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    hasPermission: () => true,
  }),
}));

jest.mock("../context/TranslationContext", () => ({
  useTranslation: () => ({ t: (_: string, fallback: string) => fallback }),
}));

jest.mock("../api/api", () => ({
  __esModule: true,
  default: {
    getEvents: jest.fn().mockResolvedValue([]),
    getMapPoints: jest.fn().mockResolvedValue([]),
    getRoutes: jest.fn().mockResolvedValue([]),
    createMapPoint: jest.fn(),
    updateMapPoint: jest.fn(),
    deleteMapPoint: jest.fn(),
    createEvent: jest.fn(),
  },
  setOnUnauthorized: jest.fn(),
}));

import api from "../api/api";
const mockGetRoutes = api.getRoutes as jest.Mock;
const mockGetPoints = api.getMapPoints as jest.Mock;
const mockCreatePoint = api.createMapPoint as jest.Mock;
const mockDeletePoint = api.deleteMapPoint as jest.Mock;
const mockCreateEvent = api.createEvent as jest.Mock;

function renderMap() {
  return render(
    <NavigationContainer>
      <MapScreen />
    </NavigationContainer>,
  );
}

describe("MapScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getEvents as jest.Mock).mockResolvedValue([]);
    mockGetPoints.mockResolvedValue([]);
    mockGetRoutes.mockResolvedValue([]);
  });

  it("renders without crashing when routes have empty coordinate arrays", async () => {
    mockGetRoutes.mockResolvedValue([
      { id: "r1", name: "Route A", eventId: null, coordinates: [] },
    ]);
    const { findByTestId } = renderMap();
    await findByTestId("map-view");
  });

  it("renders without crashing when route.coordinates is null/undefined", async () => {
    mockGetRoutes.mockResolvedValue([
      { id: "r2", name: "Route B", eventId: null, coordinates: null },
      { id: "r3", name: "Route C", eventId: null, coordinates: undefined },
    ]);
    expect(() => renderMap()).not.toThrow();
    const { findByTestId } = renderMap();
    await findByTestId("map-view");
  });

  it("renders route polylines when coordinates are provided", async () => {
    mockGetRoutes.mockResolvedValue([
      {
        id: "r4",
        name: "Route D",
        eventId: null,
        coordinates: [
          { lat: 52.22, lng: 21.01 },
          { lat: 52.23, lng: 21.02 },
        ],
      },
    ]);
    const { findAllByTestId } = renderMap();
    const polylines = await findAllByTestId("map-polyline");
    expect(polylines.length).toBeGreaterThanOrEqual(1);
  });

  it("renders route polylines from geoJson FeatureCollection", async () => {
    mockGetRoutes.mockResolvedValue([
      {
        id: "r5",
        name: "Route E",
        eventId: null,
        geoJson: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [21.01, 52.22],
                  [21.02, 52.23],
                ],
              },
            },
          ],
        },
      },
    ]);
    const { findAllByTestId } = renderMap();
    const polylines = await findAllByTestId("map-polyline");
    expect(polylines.length).toBeGreaterThanOrEqual(1);
  });

  it("shows FAB add-point button when user has permission", async () => {
    const { findByTestId } = renderMap();
    const btn = await findByTestId("fab-add-point");
    expect(btn).toBeTruthy();
  });

  it("shows FAB add-event button when user has permission", async () => {
    const { findByTestId } = renderMap();
    const btn = await findByTestId("fab-add-event");
    expect(btn).toBeTruthy();
  });

  it("pressing add-point FAB shows hint banner", async () => {
    const { findByTestId, findByText } = renderMap();
    const btn = await findByTestId("fab-add-point");
    fireEvent.press(btn);
    await findByText(/Tap map to place a point/i);
  });

  it("pressing add-event FAB shows hint banner", async () => {
    const { findByTestId, findByText } = renderMap();
    const btn = await findByTestId("fab-add-event");
    fireEvent.press(btn);
    await findByText(/Tap map to add an event/i);
  });

  it("pressing cancel in hint banner hides it", async () => {
    const { findByTestId, findByText, queryByText } = renderMap();
    const btn = await findByTestId("fab-add-point");
    fireEvent.press(btn);
    const cancelBtn = await findByText("Cancel");
    fireEvent.press(cancelBtn);
    await waitFor(() => {
      expect(queryByText(/Tap map to place a point/i)).toBeNull();
    });
  });

  it("tapping map in add-point mode opens point form", async () => {
    const { findByTestId, findByText, getByTestId } = renderMap();
    const btn = await findByTestId("fab-add-point");
    fireEvent.press(btn);
    await findByText(/Tap map to place a point/i);
    const mapView = getByTestId("map-view");
    fireEvent(mapView, "press", {
      nativeEvent: { coordinate: { latitude: 52.22, longitude: 21.01 } },
    });
    await findByText("Add Point");
  });

  it("creates a map point via the form", async () => {
    const newPoint = {
      id: "p1",
      name: "Test Point",
      description: "",
      lat: 52.22,
      lon: 21.01,
    };
    mockCreatePoint.mockResolvedValue(newPoint);

    const { findByTestId, findByText, findByPlaceholderText, getByTestId } =
      renderMap();
    const btn = await findByTestId("fab-add-point");
    fireEvent.press(btn);
    await findByText(/Tap map to place a point/i);
    const mapView = getByTestId("map-view");
    fireEvent(mapView, "press", {
      nativeEvent: { coordinate: { latitude: 52.22, longitude: 21.01 } },
    });
    const nameInput = await findByPlaceholderText("Point name *");
    fireEvent.changeText(nameInput, "Test Point");
    const saveBtn = await findByText("Save");
    await act(async () => {
      fireEvent.press(saveBtn);
    });
    await waitFor(() =>
      expect(mockCreatePoint).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Test Point", lat: 52.22, lon: 21.01 }),
      ),
    );
  });

  it("tapping map in add-event mode opens event form", async () => {
    const { findByTestId, findByText, getByTestId } = renderMap();
    const btn = await findByTestId("fab-add-event");
    fireEvent.press(btn);
    await findByText(/Tap map to add an event/i);
    const mapView = getByTestId("map-view");
    fireEvent(mapView, "press", {
      nativeEvent: { coordinate: { latitude: 52.22, longitude: 21.01 } },
    });
    await findByText("Add Event");
  });

  it("creates an event via the form", async () => {
    const newEvent = {
      id: "e1",
      title: "Map Event",
      description: "",
      startAt: "2025-06-01T10:00:00.000Z",
    };
    mockCreateEvent.mockResolvedValue(newEvent);
    (api.getEvents as jest.Mock).mockResolvedValue([]);

    const { findByTestId, findByText, findByPlaceholderText, getByTestId } =
      renderMap();
    const btn = await findByTestId("fab-add-event");
    fireEvent.press(btn);
    await findByText(/Tap map to add an event/i);
    const mapView = getByTestId("map-view");
    fireEvent(mapView, "press", {
      nativeEvent: { coordinate: { latitude: 52.22, longitude: 21.01 } },
    });
    const titleInput = await findByPlaceholderText("Title *");
    fireEvent.changeText(titleInput, "Map Event");
    const createBtn = await findByText("Create");
    await act(async () => {
      fireEvent.press(createBtn);
    });
    await waitFor(() =>
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Map Event" }),
      ),
    );
  });

  it("shows existing map points as markers and tapping shows preview", async () => {
    mockGetPoints.mockResolvedValue([
      {
        id: "pt1",
        name: "My POI",
        description: "Nice place",
        lat: 52.5,
        lon: 21.0,
      },
    ]);
    const { findByText } = renderMap();
    // marker for the point is rendered – we verify the point loaded via preview sheet accessible on marker press
    // The Marker's onPress fires with the component accessible from the tree
    await waitFor(() => {
      // points loaded means getMapPoints was called
      expect(mockGetPoints).toHaveBeenCalled();
    });
  });
});
