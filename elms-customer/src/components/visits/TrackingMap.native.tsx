import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

interface TrackingMapProps {
  lat: number;
  lng: number;
  destinationLat?: number;
  destinationLng?: number;
  workerTitle?: string;
  destinationTitle?: string;
  style?: StyleProp<ViewStyle>;
}

export function TrackingMap({
  lat,
  lng,
  destinationLat,
  destinationLng,
  workerTitle = "موقع المندوب",
  destinationTitle = "موقع العميل",
  style,
}: TrackingMapProps) {
  const centerLat = destinationLat != null ? (lat + destinationLat) / 2 : lat;
  const centerLng = destinationLng != null ? (lng + destinationLng) / 2 : lng;
  const latitudeDelta =
    destinationLat != null ? Math.max(Math.abs(lat - destinationLat) * 1.8, 0.02) : 0.02;
  const longitudeDelta =
    destinationLng != null ? Math.max(Math.abs(lng - destinationLng) * 1.8, 0.02) : 0.02;

  return (
    <MapView
      style={style}
      initialRegion={{
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta,
        longitudeDelta,
      }}
      region={{
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta,
        longitudeDelta,
      }}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} title={workerTitle} />
      {destinationLat != null && destinationLng != null ? (
        <>
          <Marker
            coordinate={{ latitude: destinationLat, longitude: destinationLng }}
            title={destinationTitle}
            pinColor="#0F6B5C"
          />
          <Polyline
            coordinates={[
              { latitude: lat, longitude: lng },
              { latitude: destinationLat, longitude: destinationLng },
            ]}
            strokeColor="#0F6B5C"
            strokeWidth={4}
          />
        </>
      ) : null}
    </MapView>
  );
}
