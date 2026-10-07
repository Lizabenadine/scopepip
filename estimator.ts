export interface EstimatorInput {
  length: number;
  width: number;
  height: number;
  productionRateSqFtPerHour?: number;
  gallonCoverageSqFt?: number;
  coats?: number;
  hourlyRate?: number;
  costPerGallon?: number;
}

export function calculateEstimate({
  length,
  width,
  height,
  productionRateSqFtPerHour = 150,
  gallonCoverageSqFt = 350,
  coats = 2,
  hourlyRate = 50,
  costPerGallon = 45,
}: EstimatorInput) {
  const perimeter = (Number(length) + Number(width)) * 2;
  const wallSqFt = perimeter * Number(height);

  const totalSqFtToPaint = wallSqFt * coats;
  const laborHours = totalSqFtToPaint / productionRateSqFtPerHour;
  const laborCost = laborHours * hourlyRate;

  const gallonsNeeded = Math.ceil(totalSqFtToPaint / gallonCoverageSqFt);
  const materialCost = gallonsNeeded * costPerGallon;

  const subtotal = laborCost + materialCost;

  return {
    wallSqFt,
    laborHours: Number(laborHours.toFixed(2)),
    gallonsNeeded,
    laborCost: Number(laborCost.toFixed(2)),
    materialCost: Number(materialCost.toFixed(2)),
    totalPrice: Number(subtotal.toFixed(2)),
  };
}