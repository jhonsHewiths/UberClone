const base = 3500;
const basekm = 1200;
const baseMin = 250;
const baseMinimum = 6000;
const comision = 0.2;

const categoryMultipliers = {
  Económico: 1,
  XL: 1.4,
  Premium: 1.8,
};

export function calculateFare({
  distanceKm,
  durationMin,
  category = 'Económico',
  tip = 0,
}) {
  const multiplier = categoryMultipliers[category] || categoryMultipliers.Económico;
  const subtotal = (base + distanceKm * basekm + durationMin * baseMin) * multiplier;
  const fare = Math.max(baseMinimum, Math.round(subtotal / 100) * 100);
  const commission = Math.round(fare * comision);

  return {
    fare,
    commission,
    tip,
    total: fare + tip,
    driverEarnings: fare - commission + tip,
    commissionRate: comision,
  };
}
