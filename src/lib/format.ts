export function agorotToShekels(agorot: number): number {
  return agorot / 100;
}

export function shekelsToAgorot(shekels: number): number {
  return Math.round(shekels * 100);
}

export function formatPrice(agorot: number): string {
  const shekels = agorotToShekels(agorot);
  const hasFraction = !Number.isInteger(shekels);
  const formatted = hasFraction ? shekels.toFixed(2) : shekels.toString();
  return `${formatted} ₪`;
}
