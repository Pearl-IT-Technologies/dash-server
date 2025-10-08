"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaffMails = void 0;
const User_1 = __importDefault(require("../models/User"));
const getStaffMails = async (roles) => {
    const staffEmails = await User_1.default.find({ role: { $in: roles } }, "email").distinct("email");
    return staffEmails;
};
exports.getStaffMails = getStaffMails;
//# sourceMappingURL=GetStaffMails.js.map