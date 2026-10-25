process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

jest.mock("../src/utils/PaystackVerification", () => ({ verifyPaystackPayment: jest.fn() }));
jest.mock("../src/services/emailService", () => ({
	orderPlacedMail: jest.fn(),
	staffOrderNotificationMail: jest.fn(),
	stockAlertMail: jest.fn(),
	paymentRejectedAlertMail: jest.fn(),
}));

import request from "supertest";
import app from "../src/index";
import Product from "../src/models/Product";
import Order from "../src/models/Order";
import User from "../src/models/User";
import { verifyPaystackPayment } from "../src/utils/PaystackVerification";
import { paymentRejectedAlertMail } from "../src/services/emailService";
import { startDb, clearDb, stopDb } from "./setup";

const verifyMock = verifyPaystackPayment as jest.Mock;
const alertMock = paymentRejectedAlertMail as jest.Mock;
const RATE = 1650;
const kobo = (usd: number) => Math.round(usd * RATE) * 100;
const mockPaid = (amount: number) =>
	verifyMock.mockResolvedValue({ success: true, data: { status: "success", amount, currency: "NGN" } });

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
		sku: `AL-${++seq}`,
		...overrides,
	});

const order = (items: any[], reference = `ref-${++seq}`) =>
	request(app)
		.post("/api/orders")
		.send({ items, shippingAddress: address, paymentMethod: "paystack", paymentDetails: { reference } });

beforeAll(startDb);
beforeEach(async () => {
	await User.create({
		firstName: "A",
		lastName: "D",
		username: `admin${++seq}`,
		email: "admin@example.com",
		password: "Password123!",
		role: "admin",
	});
});
afterEach(async () => {
	await clearDb();
	verifyMock.mockReset();
	alertMock.mockReset();
	delete process.env.ALERT_EMAIL;
});
afterAll(stopDb);

describe("payment captured but order rejected alerts", () => {
	it("alerts admins on amount mismatch with reference, amount, email and reason", async () => {
		const p = await makeProduct();
		mockPaid(kobo(10));
		const res = await order([{ productId: p.id, quantity: 1 }], "ref-mismatch");
		expect(res.status).toBe(400);
		expect(alertMock).toHaveBeenCalledTimes(1);
		const [recipients, details] = alertMock.mock.calls[0];
		expect(recipients).toEqual(["admin@example.com"]);
		expect(details).toMatchObject({
			reference: "ref-mismatch",
			amountNGN: 10 * RATE,
			customerEmail: "ada@example.com",
			privateLink: false,
		});
		expect(details.reason).toMatch(/amount mismatch/i);
	});

	it("alerts when stock is gone after payment", async () => {
		const p = await makeProduct({ stockCount: 0 });
		mockPaid(kobo(40));
		expect((await order([{ productId: p.id, quantity: 1 }])).status).toBe(400);
		expect(alertMock.mock.calls[0][1].reason).toMatch(/Insufficient stock/);
	});

	it("alerts when a product disappeared before verification (verifies with Paystack itself)", async () => {
		const p = await makeProduct({ isActive: false });
		mockPaid(kobo(40));
		expect((await order([{ productId: p.id, quantity: 1 }])).status).toBe(404);
		expect(alertMock).toHaveBeenCalledTimes(1);
	});

	it("uses ALERT_EMAIL when set", async () => {
		process.env.ALERT_EMAIL = "ops@example.com, owner@example.com";
		const p = await makeProduct();
		mockPaid(kobo(10));
		await order([{ productId: p.id, quantity: 1 }]);
		expect(alertMock.mock.calls[0][0]).toEqual(["ops@example.com", "owner@example.com"]);
	});

	it("does not alert for unpaid references or a reference that already has an order", async () => {
		const p = await makeProduct();
		verifyMock.mockResolvedValue({ success: false, data: null });
		expect((await order([{ productId: p.id, quantity: 1 }])).status).toBe(400);

		mockPaid(kobo(40));
		expect((await order([{ productId: p.id, quantity: 1 }], "used")).status).toBe(201);
		expect((await order([{ productId: p.id, quantity: 1 }], "used")).status).toBe(409);
		expect(alertMock).not.toHaveBeenCalled();
	});

	it("never changes the response when the alert email fails", async () => {
		alertMock.mockRejectedValue(new Error("SMTP down"));
		const p = await makeProduct();
		mockPaid(kobo(10));
		const res = await order([{ productId: p.id, quantity: 1 }]);
		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/amount mismatch/i);
		expect(await Order.countDocuments()).toBe(0);
	});
});
