import { getExchangeRate } from "./currencyHelper";

// Canonical shipping rule (USD). The client must use the quote endpoint rather than hardcoding this.
export const FREE_SHIPPING_THRESHOLD_USD = 30;
export const SHIPPING_FEE_USD = 5;

export const calculateShippingUsd = (subtotalUsd: number) => (subtotalUsd > FREE_SHIPPING_THRESHOLD_USD ? 0 : SHIPPING_FEE_USD);

export interface PricedItem {
	price: number; // USD
	quantity: number;
}

// Totals in USD (stored on the order) and NGN/kobo (what Paystack must charge).
// Per-item NGN prices are rounded the same way the storefront displays them (convertProductPrices).
export const buildQuote = async (items: PricedItem[]) => {
	const rate = await getExchangeRate();
	const subtotalUSD = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const shippingUSD = calculateShippingUsd(subtotalUSD);
	const subtotalNGN = items.reduce((sum, item) => sum + Math.round(item.price * rate) * item.quantity, 0);
	const shippingNGN = Math.round(shippingUSD * rate);
	const totalNGN = subtotalNGN + shippingNGN;

	return {
		rate,
		subtotalUSD,
		shippingUSD,
		totalUSD: subtotalUSD + shippingUSD,
		subtotalNGN,
		shippingNGN,
		totalNGN,
		amountKobo: totalNGN * 100,
		shippingRule: {
			freeShippingThresholdUSD: FREE_SHIPPING_THRESHOLD_USD,
			feeUSD: SHIPPING_FEE_USD,
			freeShippingThresholdNGN: Math.round(FREE_SHIPPING_THRESHOLD_USD * rate),
			feeNGN: Math.round(SHIPPING_FEE_USD * rate),
		},
	};
};
