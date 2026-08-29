export const locationPermissionState = Object.freeze({
  GRANTED: "granted",
  DENIED: "denied",
  PROMPT: "prompt",
  UNAVAILABLE: "unavailable",
});

export async function getLocationPermission() {
  if (!("geolocation" in navigator)) return locationPermissionState.UNAVAILABLE;
  if (!navigator.permissions?.query) return locationPermissionState.PROMPT;
  try { return (await navigator.permissions.query({ name: "geolocation" })).state; }
  catch { return locationPermissionState.PROMPT; }
}

export function startLocationTracking({ onLocation, onError }) {
  if (!("geolocation" in navigator)) {
    onError?.({ code: "unavailable", message: "Location is not available on this device." });
    return null;
  }
  return navigator.geolocation.watchPosition(
    (position) => onLocation?.({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      heading: position.coords.heading ?? undefined,
      speed: position.coords.speed ?? undefined,
      accuracy: position.coords.accuracy,
      updatedAt: new Date(position.timestamp).toISOString(),
    }),
    (error) => onError?.({ code: error.code === 1 ? "denied" : "unavailable", message: error.code === 1 ? "Location permission was denied." : "Your location could not be determined." }),
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
  );
}

export function stopLocationTracking(watchId) {
  if (watchId !== null && watchId !== undefined && "geolocation" in navigator) navigator.geolocation.clearWatch(watchId);
}

export async function sendDriverLocation(_rideId, location) {
  return location;
}
