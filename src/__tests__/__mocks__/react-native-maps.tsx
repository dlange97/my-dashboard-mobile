import React from "react";
import { View, Text } from "react-native";

const MapView = jest.fn(({ children }: any) => (
  <View testID="map-view">{children}</View>
));
const Marker = jest.fn(() => <View testID="map-marker" />);
const Polyline = jest.fn(() => <View testID="map-polyline" />);

export default MapView;
export { Marker, Polyline };
export type { Region } from "react-native-maps";
