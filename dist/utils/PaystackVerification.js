"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaystackPayment = void 0;
const verifyPaystackPayment = async (reference) => {
    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();
        return {
            success: data.status === true && data.data.status === 'success',
            data: data.data
        };
    }
    catch (error) {
        console.error('Paystack verification error:', error);
        return { success: false, data: null };
    }
};
exports.verifyPaystackPayment = verifyPaystackPayment;
//# sourceMappingURL=PaystackVerification.js.map