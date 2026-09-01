export const SPACE_DRIVE_FLEET = Object.freeze([
  Object.freeze({ id: "vehicle-model-y-2024", brand: "Tesla", model: "Model Y", year: 2024, category: "Business Class", seats: 4, luggageCapacity: "3 large cases", image: "y2024.png" }),
  Object.freeze({ id: "vehicle-model-y-2025", brand: "Tesla", model: "Model Y", year: 2025, category: "First Class", seats: 4, luggageCapacity: "3 large cases", image: "y2025.png" }),
  Object.freeze({ id: "vehicle-v-class", brand: "Mercedes-Benz", model: "V-Class", year: 2025, category: "Group Class", seats: 7, luggageCapacity: "7 large cases", image: "vclass.png" }),
]);

export const getFleetVehicle = (vehicleId) => SPACE_DRIVE_FLEET.find((vehicle) => vehicle.id === vehicleId) || null;
export const fleetVehicleName = (vehicle) => vehicle ? `${vehicle.brand} ${vehicle.model}${vehicle.model === "Model Y" ? ` ${vehicle.year}` : ""}` : "Vehicle pending";
