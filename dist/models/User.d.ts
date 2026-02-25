import mongoose, { Document } from "mongoose";
interface IAddress {
    _id?: string;
    type?: "billing" | "shipping";
    isDefault?: boolean;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
}
export type UserAddress = Array<IAddress>;
export interface IUser extends Document {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    role: "customer" | "storekeeper" | "salesrep" | "admin";
    avatar?: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: "male" | "female" | "other";
    addresses: UserAddress;
    preferences: {
        newsletter: boolean;
        smsNotifications: boolean;
        emailNotifications: boolean;
    };
    wishlist: mongoose.Types.ObjectId[];
    isActive: boolean;
    lastLogin?: Date;
    resetPasswordOtpHash?: string;
    resetPasswordOtpExpires?: Date;
    resetPasswordOtpAttempts?: number;
    resetPasswordOtpSentAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    getFullName(): string;
}
declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}> & IUser & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
export default User;
//# sourceMappingURL=User.d.ts.map