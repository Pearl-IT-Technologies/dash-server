"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExchangeRate = getExchangeRate;
exports.convertProductPrices = convertProductPrices;
exports.convertProductsPrices = convertProductsPrices;
exports.convertOrderPrices = convertOrderPrices;
exports.convertOrdersPrices = convertOrdersPrices;
exports.clearExchangeRateCache = clearExchangeRateCache;
const Setting_1 = __importDefault(require("../models/Setting"));
let cachedRate = null;
const CACHE_DURATION = 5 * 60 * 1000;
async function getExchangeRate() {
    if (cachedRate && Date.now() - cachedRate.lastFetched.getTime() < CACHE_DURATION) {
        return cachedRate.rate;
    }
    try {
        const settings = await Setting_1.default.findOne();
        const rate = settings?.usdToNgnRate || 1650;
        cachedRate = {
            rate,
            lastFetched: new Date(),
        };
        return rate;
    }
    catch (error) {
        console.error("Error fetching exchange rate:", error);
        return cachedRate?.rate || 1650;
    }
}
async function convertProductPrices(product) {
    if (!product)
        return product;
    const rate = await getExchangeRate();
    const originalPriceUSD = product.originalPrice;
    const originalPriceNGN = typeof originalPriceUSD === "number" ? Math.round(originalPriceUSD * rate) : undefined;
    return {
        ...(product.toJSON ? product.toJSON() : product),
        priceUSD: product.price,
        priceNGN: Math.round(product.price * rate),
        price: Math.round(product.price * rate),
        originalPriceUSD,
        originalPriceNGN,
        originalPrice: originalPriceNGN ?? product.originalPrice,
        currency: {
            usdToNgnRate: rate,
            lastUpdated: cachedRate?.lastFetched || new Date(),
        },
    };
}
async function convertProductsPrices(products) {
    if (!products || products.length === 0)
        return products;
    const rate = await getExchangeRate();
    const currencyInfo = {
        usdToNgnRate: rate,
        lastUpdated: cachedRate?.lastFetched || new Date(),
    };
    return products.map((product) => ({
        ...(product.toJSON ? product.toJSON() : product),
        priceUSD: product.price,
        priceNGN: Math.round(product.price * rate),
        price: Math.round(product.price * rate),
        originalPriceUSD: product.originalPrice,
        originalPriceNGN: typeof product.originalPrice === "number" ? Math.round(product.originalPrice * rate) : undefined,
        originalPrice: typeof product.originalPrice === "number" ? Math.round(product.originalPrice * rate) : undefined,
        currency: currencyInfo,
    }));
}
async function convertOrderPrices(order) {
    if (!order)
        return order;
    const rate = await getExchangeRate();
    const currencyInfo = {
        usdToNgnRate: rate,
        lastUpdated: cachedRate?.lastFetched || new Date(),
    };
    const convertedOrder = {
        ...(order.toJSON ? order.toJSON() : order),
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
        items: order.items?.map((item) => ({
            ...item,
            priceUSD: item.price,
            priceNGN: Math.round(item.price * rate),
            price: Math.round(item.price * rate),
        })) || [],
    };
    return convertedOrder;
}
async function convertOrdersPrices(orders) {
    if (!orders || orders.length === 0)
        return orders;
    const rate = await getExchangeRate();
    const currencyInfo = {
        usdToNgnRate: rate,
        lastUpdated: cachedRate?.lastFetched || new Date(),
    };
    return orders.map((order) => ({
        ...(order.toJSON ? order.toJSON() : order),
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
        items: order.items?.map((item) => ({
            ...item,
            priceUSD: item.price,
            priceNGN: Math.round(item.price * rate),
            price: Math.round(item.price * rate),
        })) || [],
    }));
}
function clearExchangeRateCache() {
    cachedRate = null;
}
//# sourceMappingURL=currencyHelper.js.map