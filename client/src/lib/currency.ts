export function formatNaira(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "₦0";
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "₦0";
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount).replace('NGN', '₦');
}

export function formatNumber(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "0";
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "0";
  return new Intl.NumberFormat('en-NG').format(numAmount);
}

export function calculateProgress(collected: string | number | null | undefined, target: string | number | null | undefined): number {
  if (target === null || target === undefined) return 0;
  if (collected === null || collected === undefined) return 0;
  
  const collectedNum = typeof collected === 'string' ? parseFloat(collected) : collected;
  const targetNum = typeof target === 'string' ? parseFloat(target) : target;
  
  if (isNaN(collectedNum) || isNaN(targetNum) || targetNum === 0) return 0;
  return Math.min(Math.round((collectedNum / targetNum) * 100), 100);
}
