const bundledAssets = new Map([
  ["spacedrive-monogram-header.png", new URL("../spacedrive-monogram-header.png", import.meta.url).href],
  ["y2024.png", new URL("../y2024.png", import.meta.url).href],
  ["y2025.png", new URL("../y2025.png", import.meta.url).href],
  ["vclass.png", new URL("../vclass.png", import.meta.url).href],
  ["passenger/assets/alan-karadaghi.png", new URL("../passenger/assets/alan-karadaghi.png", import.meta.url).href],
  ["passenger/assets/services/simple-transfer.png", new URL("../passenger/assets/services/simple-transfer.png", import.meta.url).href],
  ["passenger/assets/services/city-tour.png", new URL("../passenger/assets/services/city-tour.png", import.meta.url).href],
  ["passenger/assets/services/hourly-concierge.png", new URL("../passenger/assets/services/hourly-concierge.png", import.meta.url).href],
]);

export function resolveAssetUrl(path, rootPath = "./") {
  if (!path) return "";
  if (/^(?:https?:|data:|blob:)/i.test(path)) return path;
  const normalized = path.replace(/^\.\//, "").replace(/^\//, "");
  return bundledAssets.get(normalized) || `${rootPath}${normalized}`;
}
