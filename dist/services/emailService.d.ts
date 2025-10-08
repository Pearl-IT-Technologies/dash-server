export declare function welcomeMail(userEmail: string): Promise<any>;
export declare function passwordResetMail(userEmail: string, resetToken: string): Promise<any>;
export declare function verificationCodeMail(userEmail: string, verificationCode: string): Promise<any>;
export declare function orderPlacedMail(userEmail: string, orderDetails: any): Promise<any>;
export declare function staffOrderNotificationMail(staffEmails: string | string[], orderDetails: any): Promise<any>;
export declare function stockAlertMail(staffEmails: string | string[], stockDetails: any): Promise<any>;
export declare function orderConfirmationMail(userEmail: string, orderDetails: any): Promise<any>;
export declare function newProductMail(userEmail: string, productDetails: any): Promise<any>;
export declare function lowProductAlert(productDetails: any): Promise<any>;
export declare function adminTransactionAlert(userEmail: string, amount: number, currency: string): Promise<any>;
export declare function transactionStatusMail(userEmail: string, type: string, amount: number, currency: string, status: string): Promise<any>;
export declare function adminMail(recipients: string | string[], subject: string, bodyContent: string): Promise<any>;
export declare function loginAlertMail(userEmail: string, ipAddress?: string): Promise<any>;
//# sourceMappingURL=emailService.d.ts.map