// Single source of truth for what the public storefront may see or order.
// Products without a visibility field (pre-migration) are treated as public.
export const PUBLIC_PRODUCT_FILTER = { isActive: true, visibility: { $ne: "private" } };

export const isPublicProduct = (product: any) =>
	!!product && product.isActive !== false && product.visibility !== "private";
