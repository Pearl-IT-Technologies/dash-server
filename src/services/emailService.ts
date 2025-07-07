import { transporter } from "@/config/email";
import { emailTemplate } from "@/utils/emailTemplate";

const sendMail = (mailData: any) => {
	return new Promise((resolve, reject) => {
		transporter.sendMail(mailData, (err, info) => {
			if (err) {
				console.error(err);
				reject(err);
			} else {
				console.log(info);
				resolve(info);
			}
		});
	});
};

const sendMailWithRetry = async (mailData: any, retries = 3): Promise<any> => {
	for (let i = 0; i < retries; i++) {
		try {
			return await sendMail(mailData);
		} catch (error) {
			if (i === retries - 1) throw error;
			console.log(`Retrying sendMail... Attempt ${i + 1}`);
		}
	}
};

// Welcome Mail
export async function welcomeMail(userEmail: string) {
	try {
		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <p>Welcome to Dash!</p>
        <p>We're thrilled to have you as part of our community. At Dash, we are dedicated to providing seamless services and support to our users.</p>
        <p>Best regards,<br />The Dash Team</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: userEmail,
			subject: "Welcome to Dash!",
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Password Reset Mail
export async function passwordResetMail(userEmail: string, resetToken: string) {
	const resetLink = `https://dashngshop.com/reset-password/${resetToken}`;
	try {
		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <p>A request was sent for a password reset. If this wasn't you, please contact our customer service.</p>
        <p>Click the reset link below to proceed:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 15px 30px; border-radius: 30px; background-color: #114000; color: #fafafa; text-decoration: none;">Reset Password</a>
        <p>Best regards,<br />The Dash Team</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: userEmail,
			subject: "Password Reset Request",
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Verification Code Mail
export async function verificationCodeMail(userEmail: string, verificationCode: string) {
	try {
		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <p>Use the code below to complete your registration:</p>
        <h2 style="text-align: center; font-size: 24px;">${verificationCode}</h2>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br />The Dash Team</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: userEmail,
			subject: "Your Dash Verification Code",
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Order Placement Mail
export async function orderPlacedMail(userEmail: string, orderDetails: any) {
	const { orderId, totalAmount, currency } = orderDetails;
	
	try {
		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <p>Thank you for your order!</p>
        <p>Your order <strong>#${orderId}</strong> has been successfully placed and is being processed.</p>
        <p><strong>Total: ${totalAmount} ${currency}</strong></p>
        <p>We'll send you an update once your order ships.</p>
        <p>Best regards,<br />The Dash Team</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: userEmail,
			subject: `Order Confirmed - #${orderId}`,
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Order Confirmation Mail (Payment confirmed)
export async function orderConfirmationMail(userEmail: string, orderDetails: any) {
	const { orderId, paymentMethod } = orderDetails;
	
	try {
		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <p>Payment confirmed for order <strong>#${orderId}</strong>!</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p>Your order is now being prepared for shipment.</p>
        <p>Best regards,<br />The Dash Team</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: userEmail,
			subject: `Payment Confirmed - Order ID: ${orderId}`,
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// New Product Mail
export async function newProductMail(userEmail: string, productDetails: any) {
	const { productName, productPrice, currency } = productDetails;
	
	try {
		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <p>New product alert: <strong>${productName}</strong></p>
        <p><strong>Price: ${productPrice} ${currency}</strong></p>
        <p>Check it out on our website!</p>
        <p>Best regards,<br />The Dash Team</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: userEmail,
			subject: `New Product: ${productName}`,
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Low Product Alert Mail (Admin)
export async function lowProductAlert(productDetails: any) {
	const { productName, currentStock, minimumStock } = productDetails;
	
	try {
		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <h3 style="color: #d32f2f;">Low Stock Alert</h3>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Current Stock:</strong> ${currentStock} units</p>
        <p><strong>Minimum Stock:</strong> ${minimumStock} units</p>
        <p>Please restock this item.</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: "beyndtech@gmail.com",
			subject: `Low Stock: ${productName}`,
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Admin Transaction Approval Mail
export async function adminTransactionAlert(userEmail: string, amount: number, currency: string) {
	try {
		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <p>A new transaction requires approval.</p>
        <p>User Email: ${userEmail}</p>
        <p>Amount: ${amount} ${currency}</p>
        <p>Please review and approve or reject the transaction.</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: "beyndtech@gmail.com",
			subject: "Transaction Approval Required",
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Transaction Status Update Mail
export async function transactionStatusMail(
	userEmail: string,
	type: string,
	amount: number,
	currency: string,
	status: string,
) {
	try {
		let bodyContent = `
    <td style="padding: 20px; line-height: 1.8;">
      <p>Dear Customer,</p>
      <p>Your <strong>${type.toLowerCase()}</strong> request for <strong>${amount} ${currency}</strong> has been <strong>${status.toLowerCase()}</strong>.</p>
      <p>If you didn't authorize this request, please contact our support team immediately.</p>
      <p>Best regards,<br />The Dash Team</p>
    </td>
  `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: userEmail,
			subject: `${type} ${status}`,
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Admin Mail
export async function adminMail(recipients: string | string[], subject: string, bodyContent: string) {
	try {
		const recipientList = Array.isArray(recipients) ? recipients : [recipients];

		let mailOptions = {
			from: `Dash Admin <${process.env.SMTP_USER}>`,
			to: recipientList.join(","),
			subject,
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Login Alert Mail
export async function loginAlertMail(userEmail: string, ipAddress?: string) {
	const loginDate = new Date();
	const formattedDate = loginDate.toLocaleString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

	try {
		const bodyContent = `
    <td style="padding: 20px; line-height: 1.8;">
      <p>Your account was logged into on <strong>${formattedDate}</strong>${
		ipAddress ? ` from IP address <strong>${ipAddress}</strong>` : ""
	}.</p>
      <p>If this wasn't you, please change your password immediately and contact support.</p>
      <p>Best regards,<br />The Dash Team</p>
    </td>
  `;

		const mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: userEmail,
			subject: `Login Alert - Dash`,
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
  } catch (error) {
		return { error: error instanceof Error && error.message };
	}
}