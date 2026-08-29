import { getLocationPermission, sendDriverLocation, startLocationTracking, stopLocationTracking } from "../services/location-service.js?v=2";

export function useDriverLocation({ rideId, onChange } = {}) {
  let watchId = null;
  let state = { isTracking: false, permission: "prompt", location: null, error: null };
  const emit = () => onChange?.({ ...state });

  const refreshPermission = async () => {
    state.permission = await getLocationPermission();
    emit();
    return state.permission;
  };

  const startTracking = async () => {
    state.error = null;
    watchId = startLocationTracking({
      onLocation: async (location) => {
        state = { ...state, isTracking: true, permission: "granted", location, error: null };
        await sendDriverLocation(rideId, location);
        emit();
      },
      onError: (error) => {
        state = { ...state, isTracking: false, permission: error.code === "denied" ? "denied" : state.permission, error };
        emit();
      },
    });
    state.isTracking = watchId !== null;
    emit();
  };

  const stopTracking = () => {
    stopLocationTracking(watchId);
    watchId = null;
    state.isTracking = false;
    emit();
  };

  refreshPermission();
  return { getState: () => ({ ...state }), refreshPermission, startTracking, stopTracking };
}
