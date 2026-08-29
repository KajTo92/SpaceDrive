function routePoint(place) {
  const label = [place?.name, place?.address].filter(Boolean).join(", ");
  if (label) return label;
  if (Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude)) {
    return `${place.latitude},${place.longitude}`;
  }
  return "Switzerland";
}

function googleMapsRouteUrl(pickup, destination) {
  const start = encodeURIComponent(routePoint(pickup));
  const end = encodeURIComponent(routePoint(destination));
  return `https://www.google.com/maps?output=embed&saddr=${start}&daddr=${end}&z=7`;
}

export async function LiveTripMap(container, { pickup, destination }) {
  if (!container || !pickup || !destination) return null;

  const iframe = document.createElement("iframe");
  iframe.title = `Google Maps route from ${pickup.name} to ${destination.name}`;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  iframe.src = googleMapsRouteUrl(pickup, destination);
  iframe.addEventListener("load", () => { container.dataset.mapState = "ready"; }, { once: true });
  iframe.addEventListener("error", () => { container.dataset.mapState = "error"; }, { once: true });

  container.replaceChildren(iframe);
  container.dataset.mapProvider = "google";
  container.dataset.mapState = "loading";
  return iframe;
}
