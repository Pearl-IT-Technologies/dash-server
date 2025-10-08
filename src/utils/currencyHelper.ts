import Setting from "../models/Setting";

// Cache for exchange rate to avoid frequent DB calls
let cachedRate: { rate: number; lastFetched: Date } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get the current USD to NGN exchange rate from cache or database
 */
export async function getExchangeRate(): Promise<number> {
	// Check if we have a valid cached rate
	if (cachedRate && (Date.now() - cachedRate.lastFetched.getTime()) < CACHE_DURATION) {
		return cachedRate.rate;
	}

	try {
		// Fetch from database
		const settings = await Setting.findOne();
		const rate = settings?.usdToNgnRate || 1650; // Default fallback

		// Update cache
		cachedRate = {
			rate,
			lastFetched: new Date()
		};

		return rate;
	} catch (error) {
		console.error('Error fetching exchange rate:', error);
		// Return cached rate if available, otherwise default
		return cachedRate?.rate || 1650;
	}
}

/**
 * Convert a single product to include NGN prices
 */
export async function convertProductPrices(product: any) {
	if (!product) return product;

	const rate = await getExchangeRate();
	
	return {
		...product.toObject ? product.toObject() : product,
		priceUSD: product.price, // Original USD price
		priceNGN: Math.round(product.price * rate), // Converted NGN price
		price: Math.round(product.price * rate), // Keep as NGN for compatibility
		currency: {
			usdToNgnRate: rate,
			lastUpdated: cachedRate?.lastFetched || new Date()
		}
	};
}

/**
 * Convert an array of products to include NGN prices
 */
export async function convertProductsPrices(products: any[]) {
	if (!products || products.length === 0) return products;

	const rate = await getExchangeRate();
	const currencyInfo = {
		usdToNgnRate: rate,
		lastUpdated: cachedRate?.lastFetched || new Date()
	};

	return products.map(product => ({
		...product.toObject ? product.toObject() : product,
		priceUSD: product.price, // Original USD price
		priceNGN: Math.round(product.price * rate), // Converted NGN price
		price: Math.round(product.price * rate), // Keep as NGN for compatibility
		currency: currencyInfo
	}));
}

/**
 * Convert order item prices to include NGN prices
 */
export async function convertOrderPrices(order: any) {
	if (!order) return order;

	const rate = await getExchangeRate();
	const currencyInfo = {
		usdToNgnRate: rate,
		lastUpdated: cachedRate?.lastFetched || new Date()
	};

	const convertedOrder = {
		...order.toObject ? order.toObject() : order,
		// Convert main totals
		subtotalUSD: order.subtotal,
		subtotalNGN: Math.round(order.subtotal * rate),
		subtotal: Math.round(order.subtotal * rate), // For compatibility

		shippingUSD: order.shipping,
		shippingNGN: Math.round(order.shipping * rate),
		shipping: Math.round(order.shipping * rate), // For compatibility

		totalUSD: order.total,
		totalNGN: Math.round(order.total * rate),
		total: Math.round(order.total * rate), // For compatibility

		currency: currencyInfo,

		// Convert item prices
		items: order.items?.map((item: any) => ({
			...item,
			priceUSD: item.price,
			priceNGN: Math.round(item.price * rate),
			price: Math.round(item.price * rate), // For compatibility
		})) || []
	};

	return convertedOrder;
}

/**
 * Convert multiple orders
 */
export async function convertOrdersPrices(orders: any[]) {
	if (!orders || orders.length === 0) return orders;

	const rate = await getExchangeRate();
	const currencyInfo = {
		usdToNgnRate: rate,
		lastUpdated: cachedRate?.lastFetched || new Date()
	};

	return orders.map(order => ({
		...order.toObject ? order.toObject() : order,
		// Convert main totals
		subtotalUSD: order.subtotal,
		subtotalNGN: Math.round(order.subtotal * rate),
		subtotal: Math.round(order.subtotal * rate),

		shippingUSD: order.shipping,
		shippingNGN: Math.round(order.shipping * rate),
		shipping: Math.round(order.shipping * rate),

		totalUSD: order.total,
		totalNGN: Math.round(order.total * rate),
		total: Math.round(order.total * rate),

		currency: currencyInfo,

		// Convert item prices
		items: order.items?.map((item: any) => ({
			...item,
			priceUSD: item.price,
			priceNGN: Math.round(item.price * rate),
			price: Math.round(item.price * rate),
		})) || []
	}));
}

/**
 * Clear the cache (useful when exchange rate is updated)
 */
export function clearExchangeRateCache() {
	cachedRate = null;
}