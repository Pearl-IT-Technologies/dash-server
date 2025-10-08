import mongoose, { Document } from "mongoose";
export interface IOrderItem {
    product: mongoose.Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
    size: string;
    color: string;
    image: string;
}
export interface IShippingAddress {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}
export interface IOrder extends Document {
    orderNumber: string;
    user?: mongoose.Types.ObjectId;
    items: IOrderItem[];
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    paymentMethod: string;
    paymentDetails?: any;
    shippingAddress: IShippingAddress;
    billingAddress?: IShippingAddress;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;
    cancelReason?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const Order: mongoose.Model<IOrder, {}, {}, {}, mongoose.Document<unknown, {}, IOrder, {}> & IOrder & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Order;
//# sourceMappingURL=Order.d.ts.map