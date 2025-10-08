import mongoose from "mongoose";
export interface ISetting extends mongoose.Document {
    usdToNgnRate: number;
    lastUpdated: Date;
    updatedBy?: mongoose.Types.ObjectId;
}
declare const Setting: mongoose.Model<ISetting, {}, {}, {}, mongoose.Document<unknown, {}, ISetting, {}> & ISetting & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Setting;
//# sourceMappingURL=Setting.d.ts.map