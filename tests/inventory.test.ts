process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

jest.mock("../src/utils/PaystackVerification", () => ({ verifyPaystackPayment: jest.fn() }));
jest.mock("../src/services/emailService", () => ({
	orderPlacedMail: jest.fn(),
	staffOrderNotificationMail: jest.fn(),
	stockAlertMail: jest.fn(),
	paymentRejectedAlertMail: jest.fn(),
}));
jest.mock("../src/utils/GetStaffMails", () => ({ getStaffMails: jest.fn().mockResolvedValue([]) }));

import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/index";
import Product from "../src/models/Product";
import Order from "../src/models/Order";
import User from "../src/models/User";
import Setting from "../src/models/Setting";
import { verifyPaystackPayment } from "../src/utils/PaystackVerification";
import { getJwtSecret } from "../src/middleware/auth";
import { startDb, clearDb, stopDb } from "./setup";
import { io } from "../src/index";


const RATE = 1650;
const address = { firstName: "A", lastName: "B", email: "a@b.co", street: "1 St", city: "Lagos", state: "Lagos", zipCode: "1", country: "Nigeria" };

let seq = 0;
const makeProduct = (overrides: any = {}) =>
	Product.create({
		name: "Loafer",
		description: "Leather loafer",
		price: 40,
		images: ["https://example.com/a.jpg"],
		category: "shoes",
		subcategory: "loafers",
		sizes: ["42", "43"],
		colors: ["Black"],
		stockCount: 5,
		sku: `INV-${++seq}`,
		...overrides,
	});

const staffToken = async (role = "salesrep") => {
	const user = await User.create({ firstName: "S", lastName: "R", username: `u${++seq}`, email: `u${seq}@x.co`, password: "Password123!", role });
	return jwt.sign({ userId: user._id.toString() }, getJwtSecret());
};

let emitSpy: jest.SpyInstance;
beforeAll(startDb);
beforeEach(() => {
	emitSpy = jest.spyOn(io, "emit");
});
afterEach(async () => {
	emitSpy.mockRestore();
	await clearDb();
});
afterAll(stopDb);

const inventoryEvents = () => emitSpy.mock.calls.filter(([event]) => event === "inventory-updated").map(([, payload]) => payload);

describe("salesrep receipt (cash order) stock updates", () => {
	it("decrements stock on a multi-unit sale and broadcasts the NGN-converted product", async () => {
		const p = await makeProduct();
		const auth = await staffToken();
		const res = await request(app)
			.post("/api/orders")
			.set("Authorization", `Bearer ${auth}`)
			.send({ items: [{ productId: p.id, quantity: 3, size: "42", color: "Black" }], shippingAddress: address, paymentMethod: "cash" });
		expect(res.status).toBe(201);
		const saved = await Product.findById(p.id);
		expect(saved!.stockCount).toBe(2);
		expect(saved!.inStock).toBe(true);

		const [payload] = inventoryEvents();
		expect(String(payload.id)).toBe(p.id);
		expect(payload).toMatchObject({ stockCount: 2, priceUSD: 40, price: 40 * RATE, priceNGN: 40 * RATE });
	});

	it("restores stock on cancel and broadcasts it", async () => {
		const p = await makeProduct({ stockCount: 1 });
		const auth = await staffToken("admin");
		const res = await request(app)
			.post("/api/orders")
			.set("Authorization", `Bearer ${auth}`)
			.send({ items: [{ productId: p.id, quantity: 1, size: "42", color: "Black" }], shippingAddress: address, paymentMethod: "cash" });
		expect(res.status).toBe(201);
		expect((await Product.findById(p.id))!.inStock).toBe(false);
		emitSpy.mockClear();

		const orderId = res.body.order?._id || res.body.order?.id || res.body._id || res.body.id;
		const cancel = await request(app).patch(`/api/orders/${orderId}/cancel`).set("Authorization", `Bearer ${auth}`).send({ reason: "test" });
		expect(cancel.status).toBe(200);
		const restored = await Product.findById(p.id);
		expect(restored!.stockCount).toBe(1);
		expect(restored!.inStock).toBe(true);
		expect(inventoryEvents()[0]).toMatchObject({ stockCount: 1, price: 40 * RATE });
	});
});

describe("receiving", () => {
	it("adds a string quantity numerically (no '10' + 5 concatenation)", async () => {
		const p = await makeProduct({ stockCount: 10 });
		const auth = await staffToken("storekeeper");
		const res = await request(app).post("/api/products/receiving").set("Authorization", `Bearer ${auth}`).send({ productId: p.id, quantity: "5" });
		expect(res.status).toBe(201);
		expect((await Product.findById(p.id))!.stockCount).toBe(15);
		expect(inventoryEvents()[0]).toMatchObject({ stockCount: 15, price: 40 * RATE });
	});

	it("rejects non-integer quantities", async () => {
		const p = await makeProduct();
		const auth = await staffToken("storekeeper");
		const res = await request(app).post("/api/products/receiving").set("Authorization", `Bearer ${auth}`).send({ productId: p.id, quantity: "2.5" });
		expect(res.status).toBe(400);
	});
});
