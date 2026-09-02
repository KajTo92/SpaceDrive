const normalized = (value) => String(value || "").trim().toLocaleLowerCase().replace(/[\s,]+/g, " ");
const validCoordinate = (value) => value !== null && value !== "" && Number.isFinite(Number(value));

export function routePoint(place) {
  if (validCoordinate(place?.latitude) && validCoordinate(place?.longitude)) {
    return `${Number(place.latitude)},${Number(place.longitude)}`;
  }

  const name = String(place?.name || "").trim();
  const address = String(place?.address || "").trim();
  if (!name) return address || "Switzerland";
  if (!address || normalized(name) === normalized(address)) return name;
  if (normalized(address).startsWith(normalized(name))) return address;
  if (normalized(name).startsWith(normalized(address))) return name;
  return `${name}, ${address}`;
}

export function googleMapsRouteUrl(pickup, destination) {
  const start = encodeURIComponent(routePoint(pickup));
  const end = encodeURIComponent(routePoint(destination));
  return `https://www.google.com/maps?output=embed&saddr=${start}&daddr=${end}&z=7`;
}

async function preciseRoutePoint(place) {
  const fallback = routePoint(place);
  if (validCoordinate(place?.latitude) && validCoordinate(place?.longitude)) return fallback;

  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("limit", "1");
    url.searchParams.set("lang", "en");
    url.searchParams.set("q", `${fallback}, Switzerland`);
    const response = await fetch(url);
    const feature = response.ok ? (await response.json()).features?.[0] : null;
    const [longitude, latitude] = feature?.geometry?.coordinates || [];
    return validCoordinate(latitude) && validCoordinate(longitude) ? `${Number(latitude)},${Number(longitude)}` : fallback;
  } catch {
    return fallback;
  }
}

export async function LiveTripMap(container, { pickup, destination }) {
  if (!container || !pickup || !destination) return null;

  container.dataset.mapProvider = "google";
  container.dataset.mapState = "loading";
  const [start, end] = await Promise.all([preciseRoutePoint(pickup), preciseRoutePoint(destination)]);
  const iframe = document.createElement("iframe");
  iframe.title = `Google Maps route from ${pickup.name} to ${destination.name}`;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  iframe.src = googleMapsRouteUrl({ name: start }, { name: end });
  iframe.addEventListener("load", () => { container.dataset.mapState = "ready"; }, { once: true });
  iframe.addEventListener("error", () => { container.dataset.mapState = "error"; }, { once: true });

  container.replaceChildren(iframe);
  return iframe;
}
