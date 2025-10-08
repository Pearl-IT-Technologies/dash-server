import nodemailer from "nodemailer";
export declare const transporter: nodemailer.Transporter<import("nodemailer/lib/smtp-pool").SentMessageInfo, import("nodemailer/lib/smtp-pool").Options>;
export declare const verifyTransporter: (retries?: number, delay?: number) => Promise<void>;
//# sourceMappingURL=email.d.ts.map