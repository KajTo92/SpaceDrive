// Add the direct WhatsApp number in international format, for example: "41791234567".
const WHATSAPP_NUMBER = "+41772440004";
const INQUIRY_EMAIL = "jan@spacecode.ch";
const BASE_FARE_CHF = 7;
const SHORT_DISTANCE_LIMIT_KM = 20;
const SHORT_DISTANCE_RATE_CHF = 2;
const LONG_DISTANCE_RATE_CHF = 1.5;
const AUTOCOMPLETE_MIN_LENGTH = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 220;

const translations = {
  en: {
    eyebrow: "Private transfers in Switzerland",
    siteTagline: "Your best chauffeur service in Switzerland.",
    headline: "Book your ride",
    pickupLabel: "Pickup location",
    pickupPlaceholder: "Zurich Airport",
    destinationLabel: "Destination",
    destinationPlaceholder: "St. Moritz",
    calculateButton: "Show route and price",
    distance: "Distance",
    duration: "Travel time",
    price: "Estimated price",
    whatsappButton: "Send inquiry on WhatsApp",
    emailButton: "Send inquiry per mail",
    emailSubject: "SpaceDrive transfer inquiry",
    nameLabel: "Name",
    namePlaceholder: "John Smith",
    telephoneLabel: "Telephone number",
    telephonePlaceholder: "+41 79 123 45 67",
    routeNote: "Enter pickup and destination to calculate route.",
    calculating: "Calculating route...",
    calculated: "Estimated transfer price. Final quote will be confirmed by SpaceDrive.",
    geocodeError: "Route distance could not be calculated. You can still send the inquiry.",
    missingRoute: "Please enter both pickup and destination.",
    missingContact: "Please enter your name and telephone number.",
    searchingPlaces: "Searching...",
    noPlaces: "No matching place found",
    pricesEyebrow: "Transparent estimates",
    pricesHeadline: "Pricing",
    baseFare: "Base fare",
    perKmShort: "Per km up to 20 km",
    perKmLong: "Per km over 20 km",
    airportService: "Airport service",
    included: "Included",
    pricingText:
      "Final pricing can vary by vehicle class, waiting time, night service, and special requests.",
    aboutEyebrow: "Premium private transport",
    aboutHeadline: "About SpaceDrive",
    aboutText:
      "SpaceDrive offers comfortable private transfers across Switzerland for airport pickups, hotels, ski resorts, business travel, and point-to-point journeys.",
    aboutPointOne: "Professional drivers",
    aboutPointTwo: "Reliable scheduling",
    aboutPointThree: "Discreet premium service",
    fleetHeadline: "Our cars",
    whatsappMessage: ({ pickup, destination, distance, duration, price, name, telephone }) =>
      `Hello SpaceDrive, I would like to request a transfer.\n\nName: ${name}\nTelephone: ${telephone}\nPickup: ${pickup}\nDestination: ${destination}\nDistance: ${distance}\nTravel time: ${duration}\nEstimated price: ${price}\n\nPlease send me availability and a final quote.`,
  },
  de: {
    eyebrow: "Private Transfers in der Schweiz",
    siteTagline: "Ihr bester Chauffeurservice in der Schweiz.",
    headline: "Fahrt buchen",
    pickupLabel: "Abholort",
    pickupPlaceholder: "Flughafen Zürich",
    destinationLabel: "Zielort",
    destinationPlaceholder: "St. Moritz",
    calculateButton: "Route und Preis anzeigen",
    distance: "Distanz",
    duration: "Fahrzeit",
    price: "Geschätzter Preis",
    whatsappButton: "Anfrage per WhatsApp senden",
    emailButton: "Anfrage per E-Mail senden",
    emailSubject: "SpaceDrive Transfer Anfrage",
    nameLabel: "Name",
    namePlaceholder: "Max Muster",
    telephoneLabel: "Telefonnummer",
    telephonePlaceholder: "+41 79 123 45 67",
    routeNote: "Geben Sie Abholort und Ziel ein, um die Route zu berechnen.",
    calculating: "Route wird berechnet...",
    calculated: "Geschätzter Transferpreis. Das finale Angebot wird von SpaceDrive bestätigt.",
    geocodeError:
      "Die Routendistanz konnte nicht berechnet werden. Sie können die Anfrage trotzdem senden.",
    missingRoute: "Bitte geben Sie Abholort und Ziel ein.",
    missingContact: "Bitte geben Sie Ihren Namen und Ihre Telefonnummer ein.",
    searchingPlaces: "Suche...",
    noPlaces: "Kein passender Ort gefunden",
    pricesEyebrow: "Transparente Schätzung",
    pricesHeadline: "Preise",
    baseFare: "Grundpreis",
    perKmShort: "Pro km bis 20 km",
    perKmLong: "Pro km über 20 km",
    airportService: "Flughafenservice",
    included: "Inklusive",
    pricingText:
      "Der finale Preis kann je nach Fahrzeugklasse, Wartezeit, Nachtservice und Sonderwünschen variieren.",
    aboutEyebrow: "Premium-Privattransport",
    aboutHeadline: "Über SpaceDrive",
    aboutText:
      "SpaceDrive bietet komfortable private Transfers in der ganzen Schweiz für Flughäfen, Hotels, Skigebiete, Geschäftsreisen und Punkt-zu-Punkt-Fahrten.",
    aboutPointOne: "Professionelle Fahrer",
    aboutPointTwo: "Zuverlässige Planung",
    aboutPointThree: "Diskreter Premium-Service",
    fleetHeadline: "Unsere Fahrzeuge",
    whatsappMessage: ({ pickup, destination, distance, duration, price, name, telephone }) =>
      `Hallo SpaceDrive, ich möchte einen Transfer anfragen.\n\nName: ${name}\nTelefon: ${telephone}\nAbholung: ${pickup}\nZiel: ${destination}\nDistanz: ${distance}\nFahrzeit: ${duration}\nGeschätzter Preis: ${price}\n\nBitte senden Sie mir Verfügbarkeit und ein finales Angebot.`,
  },
};

const state = {
  lang: localStorage.getItem("spacedrive-language") || "en",
  route: null,
};

const elements = {
  pickup: document.querySelector("#pickup"),
  destination: document.querySelector("#destination"),
  customerName: document.querySelector("#customerName"),
  telephone: document.querySelector("#telephone"),
  form: document.querySelector("#routeForm"),
  swap: document.querySelector("#swapRoute"),
  map: document.querySelector("#mapFrame"),
  distance: document.querySelector("#distanceValue"),
  duration: document.querySelector("#durationValue"),
  price: document.querySelector("#priceValue"),
  note: document.querySelector("#routeNote"),
  whatsapp: document.querySelector("#whatsappButton"),
  email: document.querySelector("#emailButton"),
  langButtons: document.querySelectorAll(".lang-button"),
  navItems: document.querySelectorAll(".nav-item"),
  views: document.querySelectorAll(".app-view"),
  tagline: document.querySelector(".site-tagline"),
  pickupSuggestions: document.querySelector("#pickupSuggestions"),
  destinationSuggestions: document.querySelector("#destinationSuggestions"),
};

function t(key) {
  return translations[state.lang][key] || translations.en[key] || key;
}

function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem("spacedrive-language", lang);
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });

  elements.langButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === lang);
  });
}

function setActiveView(viewName) {
  const nextView = viewName || "order";

  elements.views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === nextView);
  });

  elements.navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.nav === nextView);
  });

  if (elements.tagline) {
    elements.tagline.hidden = nextView !== "order";
  }
}

function setNote(message, isError = false) {
  elements.note.textContent = message;
  elements.note.classList.toggle("is-error", isError);
}

function updateMap(pickup, destination) {
  const hasRoute = pickup && destination;
  const src = hasRoute
    ? `https://www.google.com/maps?output=embed&saddr=${encodeURIComponent(
        pickup,
      )}&daddr=${encodeURIComponent(destination)}`
    : "https://www.google.com/maps?output=embed&q=Switzerland";

  elements.map.src = src;
}

function formatDistance(km) {
  return `${km.toLocaleString(state.lang === "de" ? "de-CH" : "en-CH", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })} km`;
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return state.lang === "de" ? `${mins} Min.` : `${mins} min`;
  }

  return state.lang === "de" ? `${hours} Std. ${mins} Min.` : `${hours} hr ${mins} min`;
}

function formatPrice(value) {
  return `CHF ${Math.round(value).toLocaleString("de-CH")}`;
}

function calculatePrice(distanceKm) {
  const rate =
    distanceKm <= SHORT_DISTANCE_LIMIT_KM ? SHORT_DISTANCE_RATE_CHF : LONG_DISTANCE_RATE_CHF;
  return BASE_FARE_CHF + distanceKm * rate;
}

function getPhotonUrl(query, limit = 5) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("lang", state.lang);
  url.searchParams.set("q", `${query}, Switzerland`);
  return url;
}

function getPlaceTitle(properties) {
  return (
    properties.name ||
    [properties.street, properties.housenumber].filter(Boolean).join(" ") ||
    properties.city ||
    properties.postcode ||
    "Switzerland"
  );
}

function getPlaceDetail(properties) {
  return [properties.street, properties.housenumber, properties.postcode, properties.city]
    .filter(Boolean)
    .join(", ");
}

function getPlaceValue(feature) {
  const properties = feature.properties || {};
  const title = getPlaceTitle(properties);
  const detail = getPlaceDetail(properties);
  return [title, detail || properties.state || properties.country].filter(Boolean).join(", ");
}

async function fetchPlaceFeatures(query, limit = 5) {
  const response = await fetch(getPhotonUrl(query, limit));
  if (!response.ok) {
    throw new Error("Geocoding failed");
  }

  const data = await response.json();
  return (data.features || []).filter((feature) => feature.properties?.countrycode === "CH");
}

async function geocode(query) {
  const features = await fetchPlaceFeatures(query, 5);
  const result = features[0];

  if (!result) {
    throw new Error("Location not found");
  }

  const [lon, lat] = result.geometry.coordinates;

  return {
    lat: Number(lat),
    lon: Number(lon),
  };
}

async function getDrivingRoute(pickup, destination) {
  const [origin, target] = await Promise.all([geocode(pickup), geocode(destination)]);
  const coordinates = `${origin.lon},${origin.lat};${target.lon},${target.lat}`;
  const routeUrls = [
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=false`,
  ];

  let routeData = null;

  for (const routeUrl of routeUrls) {
    try {
      const response = await fetch(routeUrl);
      if (response.ok) {
        routeData = await response.json();
        break;
      }
    } catch (error) {
      routeData = null;
    }
  }

  const [route] = routeData?.routes || [];

  if (!route) {
    throw new Error("Route not found");
  }

  return {
    distanceKm: route.distance / 1000,
    durationSeconds: route.duration,
  };
}

function setRouteSummary(route) {
  state.route = route;
  elements.distance.textContent = route.distance;
  elements.duration.textContent = route.duration;
  elements.price.textContent = route.price;
  elements.whatsapp.disabled = false;
  elements.email.disabled = false;
}

function resetRouteSummary() {
  state.route = null;
  elements.distance.textContent = "--";
  elements.duration.textContent = "--";
  elements.price.textContent = "--";
  elements.whatsapp.disabled = true;
  elements.email.disabled = true;
}

function getRouteInputs() {
  return {
    pickup: elements.pickup.value.trim(),
    destination: elements.destination.value.trim(),
  };
}

function getContactInputs() {
  return {
    name: elements.customerName.value.trim(),
    telephone: elements.telephone.value.trim(),
  };
}

function getInquiryPayload() {
  if (!state.route) {
    return null;
  }

  const contact = getContactInputs();

  if (!contact.name || !contact.telephone) {
    setNote(t("missingContact"), true);
    (contact.name ? elements.telephone : elements.customerName).focus();
    return null;
  }

  return { ...state.route, ...contact };
}

function getInquiryMessage(payload) {
  return t("whatsappMessage")(payload);
}

function getMailtoUrl(payload) {
  const subject = encodeURIComponent(t("emailSubject"));
  const body = encodeURIComponent(getInquiryMessage(payload));
  return `mailto:${INQUIRY_EMAIL}?subject=${subject}&body=${body}`;
}

function debounce(callback, delay) {
  let timeoutId;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delay);
  };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function hideAutocomplete(input, list) {
  list.hidden = true;
  list.innerHTML = "";
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}

function renderAutocomplete(input, list, features, activeIndex = -1) {
  if (!features.length) {
    list.innerHTML = `<div class="autocomplete-empty">${escapeHtml(t("noPlaces"))}</div>`;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    return;
  }

  list.innerHTML = features
    .map((feature, index) => {
      const properties = feature.properties || {};
      const title = getPlaceTitle(properties);
      const detail = getPlaceDetail(properties) || properties.state || properties.country || "";
      const optionId = `${list.id}-option-${index}`;

      return `
        <button
          class="autocomplete-option${index === activeIndex ? " is-active" : ""}"
          id="${optionId}"
          type="button"
          role="option"
          aria-selected="${index === activeIndex ? "true" : "false"}"
          data-index="${index}"
        >
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(detail)}</span>
        </button>
      `;
    })
    .join("");

  list.hidden = false;
  input.setAttribute("aria-expanded", "true");

  if (activeIndex >= 0) {
    input.setAttribute("aria-activedescendant", `${list.id}-option-${activeIndex}`);
  } else {
    input.removeAttribute("aria-activedescendant");
  }
}

function setAutocompleteLoading(input, list) {
  list.innerHTML = `<div class="autocomplete-empty">${escapeHtml(t("searchingPlaces"))}</div>`;
  list.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

function initAutocomplete(input, list) {
  let features = [];
  let activeIndex = -1;
  let requestId = 0;

  const selectFeature = (feature) => {
    input.value = getPlaceValue(feature);
    hideAutocomplete(input, list);
    resetRouteSummary();
    setNote(t("routeNote"));
  };

  const search = debounce(async () => {
    const query = input.value.trim();
    const currentRequest = ++requestId;

    if (query.length < AUTOCOMPLETE_MIN_LENGTH) {
      features = [];
      activeIndex = -1;
      hideAutocomplete(input, list);
      return;
    }

    setAutocompleteLoading(input, list);

    try {
      features = await fetchPlaceFeatures(query, 7);
      if (currentRequest !== requestId) {
        return;
      }
      activeIndex = -1;
      renderAutocomplete(input, list, features, activeIndex);
    } catch (error) {
      if (currentRequest === requestId) {
        features = [];
        activeIndex = -1;
        renderAutocomplete(input, list, features, activeIndex);
      }
    }
  }, AUTOCOMPLETE_DEBOUNCE_MS);

  input.addEventListener("input", () => {
    resetRouteSummary();
    setNote(t("routeNote"));
    search();
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= AUTOCOMPLETE_MIN_LENGTH) {
      search();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (list.hidden || !features.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, features.length - 1);
      renderAutocomplete(input, list, features, activeIndex);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderAutocomplete(input, list, features, activeIndex);
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectFeature(features[activeIndex]);
    }

    if (event.key === "Escape") {
      hideAutocomplete(input, list);
    }
  });

  list.addEventListener("pointerdown", (event) => {
    const option = event.target.closest(".autocomplete-option");

    if (!option) {
      return;
    }

    event.preventDefault();
    const feature = features[Number(option.dataset.index)];

    if (feature) {
      selectFeature(feature);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(`#${input.id}`) && !event.target.closest(`#${list.id}`)) {
      hideAutocomplete(input, list);
    }
  });
}

async function handleRouteSubmit(event) {
  event.preventDefault();

  const { pickup, destination } = getRouteInputs();

  if (!pickup || !destination) {
    resetRouteSummary();
    setNote(t("missingRoute"), true);
    return;
  }

  updateMap(pickup, destination);
  resetRouteSummary();
  setNote(t("calculating"));

  try {
    const route = await getDrivingRoute(pickup, destination);
    const distance = formatDistance(route.distanceKm);
    const duration = formatDuration(route.durationSeconds);
    const price = formatPrice(calculatePrice(route.distanceKm));

    setRouteSummary({ pickup, destination, distance, duration, price });
    setNote(t("calculated"));
  } catch (error) {
    setRouteSummary({
      pickup,
      destination,
      distance: state.lang === "de" ? "Nicht berechnet" : "Not calculated",
      duration: state.lang === "de" ? "Nicht berechnet" : "Not calculated",
      price: state.lang === "de" ? "Auf Anfrage" : "On request",
    });
    setNote(t("geocodeError"), true);
  }
}

function openWhatsApp() {
  const payload = getInquiryPayload();

  if (!payload) {
    return;
  }

  const message = getInquiryMessage(payload);
  const baseUrl = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}`
    : "https://wa.me/";
  const separator = WHATSAPP_NUMBER ? "?text=" : "?text=";
  window.open(`${baseUrl}${separator}${encodeURIComponent(message)}`, "_blank", "noopener");
}

function openEmail() {
  const payload = getInquiryPayload();

  if (!payload) {
    return;
  }

  window.location.href = getMailtoUrl(payload);
}

function initNavigation() {
  elements.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      setActiveView(item.dataset.nav);
    });
  });

  window.addEventListener("hashchange", () => {
    setActiveView(window.location.hash.replace("#", ""));
  });

  setActiveView(window.location.hash.replace("#", "") || "order");
}

function initLanguageSwitch() {
  elements.langButtons.forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.lang));
  });

  setLanguage(state.lang);
}

function initSwapButton() {
  elements.swap.addEventListener("click", () => {
    const pickup = elements.pickup.value;
    elements.pickup.value = elements.destination.value;
    elements.destination.value = pickup;
    hideAutocomplete(elements.pickup, elements.pickupSuggestions);
    hideAutocomplete(elements.destination, elements.destinationSuggestions);
    resetRouteSummary();
    updateMap(elements.pickup.value.trim(), elements.destination.value.trim());
    setNote(t("routeNote"));
  });
}

function initApp() {
  initLanguageSwitch();
  initNavigation();
  initAutocomplete(elements.pickup, elements.pickupSuggestions);
  initAutocomplete(elements.destination, elements.destinationSuggestions);
  initSwapButton();
  elements.form.addEventListener("submit", handleRouteSubmit);
  elements.whatsapp.addEventListener("click", openWhatsApp);
  elements.email.addEventListener("click", openEmail);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

initApp();
