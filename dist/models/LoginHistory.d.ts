import { Document, Types } from "mongoose";
interface ILoginHistory extends Document {
    userId: Types.ObjectId;
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    method?: string;
    location: {
        city: string;
        region: string;
        country: string;
    };
}
export declare const LoginHistory: import("mongoose").Model<ILoginHistory, {}, {}, {}, Document<unknown, {}, ILoginHistory, {}> & ILoginHistory & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export {};
//# sourceMappingURL=LoginHistory.d.ts.map