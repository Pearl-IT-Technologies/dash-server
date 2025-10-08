import mongoose, { Document } from "mongoose";
export interface IReceiving extends Document {
    product: mongoose.Types.ObjectId;
    quantity: number;
    note?: string;
    receivedBy: mongoose.Types.ObjectId;
    receivedAt: Date;
}
export declare const Receiving: mongoose.Model<IReceiving, {}, {}, {}, mongoose.Document<unknown, {}, IReceiving, {}> & IReceiving & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Receiving.d.ts.map