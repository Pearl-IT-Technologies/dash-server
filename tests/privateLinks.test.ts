process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.PRIVATE_LINK_RESOLVE_LIMIT = "1000";

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
import PrivateLink from "../src/models/PrivateLink";
import PrivateLinkEvent from "../src/models/PrivateLinkEvent";
import { verifyPaystackPayment } from "../src/utils/PaystackVerification";
import { getJwtSecret } from "../src/middleware/auth";
import { startDb, clearDb, stopDb } from "./setup";

const verifyMock = verifyPaystackPayment as jest.Mock;
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
		name: "Custom gown",
		description: "Made to order",
		price: 100,
		images: ["https://example.com/a.jpg"],
		category: "dresses",
		subcategory: "gowns",
		sizes: ["M", "L"],
		colors: ["red"],
		stockCount: 5,
		sku: `PL-${++seq}`,
		...overrides,
	});

const tokenFor = async (role: string) => {
	const user = await User.create({
		firstName: "T",
		lastName: role,
		username: `${role}${++seq}`,
		email: `${role}${seq}@example.com`,
		password: "Password123!",
		role,
	});
	return { user, token: jwt.sign({ userId: user._id.toString() }, getJwtSecret()) };
};

const createLink = async (auth: string, body: any) =>
	request(app).post("/api/private-links").set("Authorization", `Bearer ${auth}`).send(body);

const checkout = (privateLinkToken: string, reference = `ref-${++seq}`, extra: any = {}) =>
	request(app)
		.post("/api/orders")
		.send({ privateLinkToken, shippingAddress: address, paymentMethod: "paystack", paymentDetails: { reference }, ...extra });

beforeAll(startDb);
afterEach(async () => {
	await clearDb();
	verifyMock.mockReset();
});
afterAll(stopDb);

describe("product visibility", () => {
	it("hides private products from every public endpoint", async () => {
		const pub = await makeProduct({ category: "public-cat" });
		const priv = await makeProduct({ visibility: "private", category: "secret-cat" });

		const list = await request(app).get("/api/products");
		expect(list.body.map((p: any) => p.id)).toEqual([pub.id]);
		expect((await request(app).get(`/api/products/${priv.id}`)).status).toBe(404);
		expect((await request(app).get("/api/products/categories")).body).toEqual(["public-cat"]);

		const { token } = await tokenFor("customer");
		const wish = await request(app)
			.post("/api/auth/wishlist/toggle")
			.set("Authorization", `Bearer ${token}`)
			.send({ productId: priv.id });
		expect(wish.status).toBe(404);
	});

	it("lets staff list all products and toggle visibility; customers cannot", async () => {
		const p = await makeProduct();
		const staff = await tokenFor("salesrep");
		const customer = await tokenFor("customer");

		expect(
			(await request(app).patch(`/api/products/${p.id}/visibility`).set("Authorization", `Bearer ${customer.token}`).send({ visibility: "private" }))
				.status,
		).toBe(403);
		const res = await request(app)
			.patch(`/api/products/${p.id}/visibility`)
			.set("Authorization", `Bearer ${staff.token}`)
			.send({ visibility: "private" });
		expect(res.status).toBe(200);
		expect(res.body.visibility).toBe("private");

		const all = await request(app).get("/api/products/admin/all").set("Authorization", `Bearer ${staff.token}`);
		expect(all.status).toBe(200);
		expect(all.body).toHaveLength(1);
		expect((await request(app).get("/api/products/admin/all").set("Authorization", `Bearer ${customer.token}`)).status).toBe(403);
		expect((await request(app).get("/api/products")).body).toHaveLength(0);
	});

	it("blocks ordering private products without a link", async () => {
		const priv = await makeProduct({ visibility: "private" });
		mockPaid(kobo(100));
		const res = await request(app)
			.post("/api/orders")
			.send({ items: [{ productId: priv.id, quantity: 1 }], shippingAddress: address, paymentMethod: "paystack", paymentDetails: { reference: "x1" } });
		expect(res.status).toBe(404);
	});
});

describe("private link management", () => {
	it("allows each staff role and rejects customers and anonymous users", async () => {
		const p = await makeProduct({ visibility: "private" });
		for (const role of ["admin", "salesrep", "storekeeper"]) {
			const { token } = await tokenFor(role);
			const res = await createLink(token, { title: `For ${role}`, items: [{ product: p.id, size: "M", quantity: 1 }] });
			expect(res.status).toBe(201);
		}
		const customer = await tokenFor("customer");
		expect((await createLink(customer.token, { title: "x", items: [{ product: p.id, quantity: 1 }] })).status).toBe(403);
		expect((await request(app).get("/api/private-links").set("Authorization", `Bearer ${customer.token}`)).status).toBe(403);
		expect((await request(app).get("/api/private-links")).status).toBe(401);
	});

	it("stores only a token hash, defaults to 48h and returns the url once", async () => {
		const p = await makeProduct({ visibility: "private" });
		const { token: auth } = await tokenFor("admin");
		const res = await createLink(auth, { title: "VIP", items: [{ product: p.id, size: "L", color: "red", quantity: 2 }] });
		expect(res.body.token).toHaveLength(43);
		expect(res.body.url).toMatch(new RegExp(`/p/${res.body.token}$`));
		expect(res.body.tokenHash).toBeUndefined();
		const hours = (new Date(res.body.expiresAt).getTime() - Date.now()) / 3600000;
		expect(hours).toBeGreaterThan(47.9);
		expect(hours).toBeLessThanOrEqual(48);

		const stored = await PrivateLink.findById(res.body.id).select("+tokenHash");
		expect(stored!.tokenHash).not.toBe(res.body.token);

		const list = await request(app).get("/api/private-links").set("Authorization", `Bearer ${auth}`);
		expect(list.body[0].token).toBeUndefined();
		expect(list.body[0].status).toBe("active");
	});

	it("validates preset variants and quantities", async () => {
		const p = await makeProduct();
		const { token } = await tokenFor("admin");
		expect((await createLink(token, { title: "x", items: [{ product: p.id, size: "XXL", quantity: 1 }] })).status).toBe(400);
		expect((await createLink(token, { title: "x", items: [{ product: p.id, quantity: 0 }] })).status).toBe(400);
		expect((await createLink(token, { title: "x", items: [] })).status).toBe(400);
		expect((await createLink(token, { title: "x", items: [{ product: p.id, quantity: 1 }], expiresInHours: -1 })).status).toBe(400);
	});

	it("updates, revokes and records audit events", async () => {
		const p = await makeProduct();
		const { token } = await tokenFor("storekeeper");
		const created = await createLink(token, { title: "Old", items: [{ product: p.id, quantity: 1 }] });
		const id = created.body.id;

		const upd = await request(app)
			.patch(`/api/private-links/${id}`)
			.set("Authorization", `Bearer ${token}`)
			.send({ title: "New", expiresInHours: 2, maxUses: 3 });
		expect(upd.status).toBe(200);
		expect(upd.body.title).toBe("New");
		expect(upd.body.maxUses).toBe(3);

		expect((await request(app).post(`/api/private-links/${id}/revoke`).set("Authorization", `Bearer ${token}`)).status).toBe(200);
		expect((await request(app).post(`/api/private-links/${id}/revoke`).set("Authorization", `Bearer ${token}`)).status).toBe(404);

		const detail = await request(app).get(`/api/private-links/${id}`).set("Authorization", `Bearer ${token}`);
		expect(detail.body.status).toBe("revoked");
		expect(detail.body.events.map((e: any) => e.action).sort()).toEqual(["created", "revoked", "updated"]);
	});
});

describe("resolve", () => {
	it("returns the preset cart with noindex, and a uniform 404 otherwise", async () => {
		const p = await makeProduct({ visibility: "private" });
		const { token: auth } = await tokenFor("admin");
		const link = (await createLink(auth, { title: "VIP", items: [{ product: p.id, size: "M", quantity: 2 }] })).body;

		const ok = await request(app).get(`/api/private-links/resolve/${link.token}`);
		expect(ok.status).toBe(200);
		expect(ok.headers["x-robots-tag"]).toMatch(/noindex/);
		expect(ok.body.items[0]).toMatchObject({ size: "M", quantity: 2, lineTotalNGN: 2 * 100 * RATE, available: true });

		const bogus = await request(app).get("/api/private-links/resolve/not-a-real-token");
		expect(bogus.status).toBe(404);

		await PrivateLink.updateOne({ _id: link.id }, { expiresAt: new Date(Date.now() - 1000) });
		const expired = await request(app).get(`/api/private-links/resolve/${link.token}`);
		expect(expired.status).toBe(404);
		expect(expired.body.message).toBe(bogus.body.message);

		await PrivateLink.updateOne({ _id: link.id }, { expiresAt: new Date(Date.now() + 3600000), revokedAt: new Date() });
		expect((await request(app).get(`/api/private-links/resolve/${link.token}`)).status).toBe(404);

		await PrivateLink.updateOne({ _id: link.id }, { revokedAt: null, maxUses: 1, uses: 1 });
		expect((await request(app).get(`/api/private-links/resolve/${link.token}`)).status).toBe(404);
	});
});

describe("private link checkout", () => {
	const setup = async (linkBody: any = {}, productOverrides: any = {}) => {
		const p = await makeProduct({ visibility: "private", ...productOverrides });
		const { token: auth } = await tokenFor("salesrep");
		const link = (await createLink(auth, { title: "VIP", items: [{ product: p.id, size: "L", color: "red", quantity: 2 }], ...linkBody })).body;
		return { p, link };
	};

	it("creates a confirmed guest order from the link's preset cart, ignoring body items", async () => {
		const { p, link } = await setup();
		const other = await makeProduct({ price: 1 });
		mockPaid(kobo(100) * 2); // 2 x $100, free shipping
		const res = await checkout(link.token, undefined, { items: [{ productId: other.id, quantity: 9 }] });
		expect(res.status).toBe(201);

		const saved = await Order.findOne();
		expect(saved!.source).toBe("private_link");
		expect(String(saved!.privateLink)).toBe(link.id);
		expect(saved!.status).toBe("confirmed");
		expect(saved!.paymentStatus).toBe("paid");
		expect(saved!.items).toHaveLength(1);
		expect(saved!.items[0]).toMatchObject({ size: "L", color: "red", quantity: 2 });
		expect((await Product.findById(p.id))!.stockCount).toBe(3);
		expect((await Product.findById(other.id))!.stockCount).toBe(5);
		expect((await PrivateLink.findById(link.id))!.uses).toBe(1);
		expect(await PrivateLinkEvent.countDocuments({ action: "ordered" })).toBe(1);
	});

	it("quotes a link and rejects a wrong amount with no order", async () => {
		const { link } = await setup();
		const quote = await request(app).post("/api/orders/quote").send({ privateLinkToken: link.token });
		expect(quote.status).toBe(200);
		expect(quote.body.amountKobo).toBe(kobo(100) * 2);
		expect(quote.body.privateLink.title).toBe("VIP");

		mockPaid(kobo(100));
		expect((await checkout(link.token)).status).toBe(400);
		expect(await Order.countDocuments()).toBe(0);
		expect((await PrivateLink.findById(link.id))!.uses).toBe(0);
	});

	it("keeps a correctly paid order pending for review when the link expired mid-payment", async () => {
		const { link } = await setup();
		await PrivateLink.updateOne({ _id: link.id }, { expiresAt: new Date(Date.now() - 1000) });
		mockPaid(kobo(100) * 2);
		const res = await checkout(link.token);
		expect(res.status).toBe(201);
		const saved = await Order.findOne();
		expect(saved!.status).toBe("pending");
		expect(saved!.paymentStatus).toBe("paid");
		expect(saved!.notes).toMatch(/NEEDS REVIEW.*expired/);
		expect(await PrivateLinkEvent.countDocuments({ action: "order_needs_review" })).toBe(1);
	});

	it("treats a revoked link the same way (pending review)", async () => {
		const { link } = await setup();
		await PrivateLink.updateOne({ _id: link.id }, { revokedAt: new Date() });
		mockPaid(kobo(100) * 2);
		expect((await checkout(link.token)).status).toBe(201);
		expect((await Order.findOne())!.notes).toMatch(/revoked/);
	});

	it("enforces maxUses atomically under concurrency", async () => {
		const { link } = await setup({ maxUses: 1 }, { stockCount: 20 });
		mockPaid(kobo(100) * 2);
		const results = await Promise.all([1, 2, 3, 4].map(() => checkout(link.token)));
		expect(results.every((r) => r.status === 201)).toBe(true);
		const orders = await Order.find();
		expect(orders.filter((o) => o.status === "confirmed")).toHaveLength(1);
		expect(orders.filter((o) => o.status === "pending")).toHaveLength(3);
		expect((await PrivateLink.findById(link.id))!.uses).toBe(1);
	});

	it("rejects unknown tokens, non-paystack payment and insufficient stock", async () => {
		mockPaid(kobo(100) * 2);
		expect((await checkout("bogus")).status).toBe(404);

		const { link, p } = await setup();
		expect((await checkout(link.token, undefined, { paymentMethod: "cash" })).status).toBe(400);

		await Product.updateOne({ _id: p._id }, { stockCount: 1 });
		const res = await checkout(link.token);
		expect(res.status).toBe(400);
		expect(await Order.countDocuments()).toBe(0);
		expect((await PrivateLink.findById(link.id))!.uses).toBe(0);
	});
});
