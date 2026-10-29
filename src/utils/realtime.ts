import Product from "../models/Product";
import { convertProductPrices } from "./currencyHelper";
import { io } from "../index";
import { STAFF_ROOM, userRoom } from "./socket";

// Public products go to everyone (live storefront stock); non-public ones only to staff.
export const emitProductEvent = (event: string, product: any) => {
	const isPublic = product && product.isActive !== false && product.visibility !== "private";
	if (isPublic) {
		io.emit(event, product);
	} else {
		io.to(STAFF_ROOM).emit(event, product);
	}
};

export const emitProductDeleted = (product: any) => {
	if (product && product.isActive !== false && product.visibility !== "private") {
		io.emit("product-deleted", product.id);
	} else {
		io.to(STAFF_ROOM).emit("product-deleted", product.id);
	}
};

// Orders contain customer PII: only staff and the owning user receive them.
export const emitOrderEvent = (event: string, payload: any, userId?: any) => {
	let target = io.to(STAFF_ROOM);
	if (userId) {
		target = target.to(userRoom(String(userId._id ?? userId)));
	}
	target.emit(event, payload);
};

// Stock changed outside the product editor (orders, cancellations, receiving): always broadcast the
// same NGN-converted shape the product API returns, so staff screens don't get raw USD documents.
export const emitInventoryUpdate = async (productOrId: any) => {
	try {
		const product =
			productOrId instanceof Product ? productOrId : await Product.findById(productOrId?._id ?? productOrId);
		if (!product) return;
		emitProductEvent("inventory-updated", await convertProductPrices(product));
	} catch (error) {
		console.error("Failed to emit inventory update:", error);
	}
};
