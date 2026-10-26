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
