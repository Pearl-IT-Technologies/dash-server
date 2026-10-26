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

const verifyMock = verifyPaystackPayment as jest.Mock;
const RATE = 1650; // currencyHelper default when no Setting exists

const address = {
	firstName: "Ada",
	lastName: "Obi",
	email: "ada@example.com",
	street: "1 Test St",
	city: "Lagos",
	state: "Lagos",
	zipCode: "100001",
	country: "Nigeria",
};

let seq = 0;
const makeProduct = (overrides: any = {}) =>
	Product.create({
		name: "Tee",
		description: "A tee",
		price: 40,
		images: ["https://example.com/a.jpg"],
		category: "tops",
		subcategory: "tees",
		sizes: ["M"],
		colors: ["black"],
		stockCount: 5,
		sku: `SKU-${++seq}`,
		...overrides,
	});

const paidKobo = (usd: number) => Math.round(usd * RATE) * 100;
const mockPaid = (kobo: number) => verifyMock.mockResolvedValue({ success: true, data: { status: "success", amount: kobo } });

const order = (items: any[], reference = `ref-${++seq}`, extra: any = {}) =>
	request(app)
		.post("/api/orders")
		.send({ items, shippingAddress: address, paymentMethod: "paystack", paymentDetails: { reference }, ...extra });

beforeAll(startDb);
afterEach(async () => {
	await clearDb();
	verifyMock.mockReset();
});
afterAll(stopDb);

describe("POST /api/orders hardening", () => {
	it("marks the order paid when the charged amount matches the server total", async () => {
		const p = await makeProduct();
		mockPaid(paidKobo(40)); // $40 > $30 => free shipping
		const res = await order([{ productId: p.id, quantity: 1 }]);
		expect(res.status).toBe(201);
		const saved = await Order.findOne();
		expect(saved!.paymentStatus).toBe("paid");
		expect(saved!.status).toBe("confirmed");
		expect((await Product.findById(p.id))!.stockCount).toBe(4);
	});

	it("rejects underpaid and overpaid orders outright without touching stock", async () => {
		const p = await makeProduct();
		for (const kobo of [100, paidKobo(40) - 100, paidKobo(40) + 100]) {
			mockPaid(kobo);
			const res = await order([{ productId: p.id, quantity: 1 }]);
			expect(res.status).toBe(400);
			expect(res.body.message).toMatch(/amount mismatch/i);
		}
		expect(await Order.countDocuments()).toBe(0);
		expect((await Product.findById(p.id))!.stockCount).toBe(5);
	});

	it("applies the $5 shipping rule under $30 and requires it in the charge", async () => {
		const p = await makeProduct({ price: 10 });
		mockPaid(paidKobo(10)); // missing shipping
		expect((await order([{ productId: p.id, quantity: 1 }])).status).toBe(400);
		mockPaid(paidKobo(10) + paidKobo(5));
		const res = await order([{ productId: p.id, quantity: 1 }]);
		expect(res.status).toBe(201);
		const saved = await Order.findOne();
		expect(saved!.shipping).toBe(5);
		expect(saved!.total).toBe(15);
	});

	it("quotes the exact amount to charge including shipping", async () => {
		const p = await makeProduct({ price: 10 });
		const res = await request(app).post("/api/orders/quote").send({ items: [{ productId: p.id, quantity: 2 }] });
		expect(res.status).toBe(200);
		expect(res.body.subtotal).toBe(2 * 10 * RATE);
		expect(res.body.shipping).toBe(5 * RATE);
		expect(res.body.amountKobo).toBe(paidKobo(10) * 2 + paidKobo(5));
		expect(res.body.shippingRule).toMatchObject({ freeShippingThresholdUSD: 30, feeUSD: 5 });
	});

	it("rejects a reused payment reference and restores stock", async () => {
		const p = await makeProduct();
		mockPaid(paidKobo(40));
		expect((await order([{ productId: p.id, quantity: 1 }], "dup-ref")).status).toBe(201);
		const res = await order([{ productId: p.id, quantity: 1 }], "dup-ref");
		expect(res.status).toBe(409);
		expect(await Order.countDocuments()).toBe(1);
		expect((await Product.findById(p.id))!.stockCount).toBe(4);
	});

	it("requires a reference for paystack orders", async () => {
		const p = await makeProduct();
		const res = await request(app)
			.post("/api/orders")
			.send({ items: [{ productId: p.id, quantity: 1 }], shippingAddress: address, paymentMethod: "paystack" });
		expect(res.status).toBe(400);
		expect(await Order.countDocuments()).toBe(0);
	});

	it("ignores userId in the body and uses the authenticated user", async () => {
		const p = await makeProduct();
		mockPaid(paidKobo(40));
		const res = await order([{ productId: p.id, quantity: 1 }], undefined, { userId: "64b000000000000000000001" });
		expect(res.status).toBe(201);
		expect((await Order.findOne())!.user).toBeUndefined();
	});

	it("rejects inactive and private products", async () => {
		const inactive = await makeProduct({ isActive: false });
		mockPaid(paidKobo(40));
		expect((await order([{ productId: inactive.id, quantity: 1 }])).status).toBe(404);

		const priv = await makeProduct({ visibility: "private" });
		expect((await order([{ productId: priv.id, quantity: 1 }])).status).toBe(404);
		expect(await Order.countDocuments()).toBe(0);
	});

	it("rolls back earlier reservations when a later item is out of stock", async () => {
		const a = await makeProduct({ stockCount: 5 });
		const b = await makeProduct({ stockCount: 1 });
		mockPaid(paidKobo(200));
		const res = await order([
			{ productId: a.id, quantity: 2 },
			{ productId: b.id, quantity: 3 },
		]);
		expect(res.status).toBe(400);
		expect((await Product.findById(a.id))!.stockCount).toBe(5);
		expect((await Product.findById(b.id))!.stockCount).toBe(1);
	});

	it("does not oversell the last unit under concurrent checkouts", async () => {
		const p = await makeProduct({ stockCount: 1 });
		mockPaid(paidKobo(40));
		const results = await Promise.all([1, 2, 3, 4, 5].map(() => order([{ productId: p.id, quantity: 1 }])));
		expect(results.filter((r) => r.status === 201)).toHaveLength(1);
		const after = await Product.findById(p.id);
		expect(after!.stockCount).toBe(0);
		expect(after!.inStock).toBe(false);
	});

	it("rejects invalid quantities and ids", async () => {
		mockPaid(paidKobo(40));
		expect((await order([{ productId: "nope", quantity: 1 }])).status).toBe(400);
		const p = await makeProduct();
		expect((await order([{ productId: p.id, quantity: 0 }])).status).toBe(400);
		expect((await order([{ productId: p.id, quantity: 1.5 }])).status).toBe(400);
	});
});

describe("products", () => {
	it("serves /api/products/categories (route order fix)", async () => {
		await makeProduct({ category: "tops" });
		const res = await request(app).get("/api/products/categories");
		expect(res.status).toBe(200);
		expect(res.body).toEqual(["tops"]);
	});

	it("ignores non-whitelisted fields on product update", async () => {
		const staff = await User.create({
			firstName: "S",
			lastName: "K",
			username: "sk",
			email: "sk@example.com",
			password: "Password123!",
			role: "storekeeper",
		});
		const token = jwt.sign({ userId: staff._id.toString() }, getJwtSecret());
		const p = await makeProduct();
		const res = await request(app)
			.put(`/api/products/${p.id}`)
			.set("Authorization", `Bearer ${token}`)
			.send({ name: "Renamed", rating: 5, reviewCount: 999, stockCount: 0 });
		expect(res.status).toBe(200);
		const saved = await Product.findById(p.id);
		expect(saved!.name).toBe("Renamed");
		expect(saved!.rating).toBe(0);
		expect(saved!.reviewCount).toBe(0);
		expect(saved!.inStock).toBe(false);
	});
});

describe("auth", () => {
	it("has no JWT secret fallback", () => {
		const prev = process.env.JWT_SECRET;
		delete process.env.JWT_SECRET;
		expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
		process.env.JWT_SECRET = prev;
	});
});

// keep Setting import used (exchange rate falls back to 1650 without a Setting doc)
void Setting;
