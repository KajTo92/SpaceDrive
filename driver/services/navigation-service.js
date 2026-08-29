function validCoordinate(location) {
  return Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);
}

export function buildNavigationUrl({ destination, provider = "google" }) {
  if (!destination || !validCoordinate(destination)) throw new Error("Destination coordinates are unavailable");
  const coordinate = `${destination.latitude},${destination.longitude}`;
  if (provider === "apple") {
    const params = new URLSearchParams({ daddr: coordinate, dirflg: "d" });
    return `https://maps.apple.com/?${params}`;
  }
  const params = new URLSearchParams({ api: "1", destination: coordinate, travelmode: "driving" });
  return `https://www.google.com/maps/dir/?${params}`;
}

export function openNavigation({ destination, provider }) {
  const url = buildNavigationUrl({ destination, provider });
  window.open(url, "_blank", "noopener,noreferrer");
  return url;
}
