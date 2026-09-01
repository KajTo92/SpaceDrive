export const CITY_TOUR_MIN_HOURS = 3;
export const CITY_TOUR_MAX_HOURS = 12;

export const CITY_TOUR_PRICING = Object.freeze({
  "Tesla Model Y": 85,
  "Mercedes V-Class": 125,
});

export function calculateCityTourPrice(vehicle, hours) {
  const hourlyRate = CITY_TOUR_PRICING[vehicle];
  const duration = Number(hours);

  if (!hourlyRate || !Number.isFinite(duration) || duration < CITY_TOUR_MIN_HOURS) {
    return null;
  }

  return {
    hourlyRate,
    total: Math.round(hourlyRate * duration),
  };
}
