"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTransporter = exports.transporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
exports.transporter = nodemailer_1.default.createTransport({
    pool: true,
    host: "smtp.hostinger.com",
    port: 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    secure: true,
    tls: {
        rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
});
const verifyTransporter = async (retries = 3, delay = 5000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await exports.transporter.verify();
            console.log("Transporter Verified");
            return;
        }
        catch (error) {
            console.error(`Transporter verification failed on attempt ${attempt}`, error instanceof Error && error.message);
            if (attempt < retries) {
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
            else {
                console.error("All attempts to verify transporter failed. Exiting...");
                process.exit(1);
            }
        }
    }
};
exports.verifyTransporter = verifyTransporter;
//# sourceMappingURL=email.js.map