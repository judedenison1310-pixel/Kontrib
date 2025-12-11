export type CurrencyCode = "NGN" | "USD" | "EUR";

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "NGN", label: "Nigerian Naira (₦)", symbol: "₦" },
  { code: "USD", label: "US Dollar ($)", symbol: "$" },
  { code: "EUR", label: "Euro (€)", symbol: "€" },
];

export function formatCurrency(amount: string | number | null | undefined, currency: CurrencyCode = "NGN"): string {
  if (amount === null || amount === undefined) return getCurrencySymbol(currency) + "0";
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return getCurrencySymbol(currency) + "0";
  
  const localeMap: Record<CurrencyCode, string> = {
    NGN: 'en-NG',
    USD: 'en-US',
    EUR: 'de-DE',
  };
  
  return new Intl.NumberFormat(localeMap[currency], {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

export function getCurrencySymbol(currency: CurrencyCode = "NGN"): string {
  const symbols: Record<CurrencyCode, string> = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
  };
  return symbols[currency] || "₦";
}

export function formatNaira(amount: string | number | null | undefined): string {
  return formatCurrency(amount, "NGN");
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
