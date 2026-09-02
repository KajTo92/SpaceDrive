function validCoordinate(location) {
  return location?.latitude !== null && location?.latitude !== "" && location?.longitude !== null && location?.longitude !== "" && Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));
}

export function buildNavigationUrl({ destination, provider = "google" }) {
  if (!destination) throw new Error("Destination is unavailable");
  const target = validCoordinate(destination) ? `${Number(destination.latitude)},${Number(destination.longitude)}` : String(destination.address || destination.name || "").trim();
  if (!target) throw new Error("Destination is unavailable");
  if (provider === "apple") {
    const params = new URLSearchParams({ daddr: target, dirflg: "d" });
    return `https://maps.apple.com/?${params}`;
  }
  const params = new URLSearchParams({ api: "1", destination: target, travelmode: "driving" });
  return `https://www.google.com/maps/dir/?${params}`;
}

export function openNavigation({ destination, provider }) {
  const url = buildNavigationUrl({ destination, provider });
  window.open(url, "_blank", "noopener,noreferrer");
  return url;
}
