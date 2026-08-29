// Inject NEXT_PUBLIC_MAPBOX_TOKEN into this public configuration at deploy time.
globalThis.SPACE_DRIVE_CONFIG = globalThis.SPACE_DRIVE_CONFIG || {
  NEXT_PUBLIC_MAPBOX_TOKEN: "",
};
