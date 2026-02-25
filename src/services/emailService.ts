import { transporter } from "../config/email";
import { emailTemplate } from "../utils/emailTemplate";

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

const sendMailWithRetry = async (mailData: any, retries = 2, retryDelayMs = 1000): Promise<any> => {
	for (let i = 0; i < retries; i++) {
		try {
			return await sendMail(mailData);
		} catch (error) {
			if (i === retries - 1) throw error;
			console.warn(
				`Retrying sendMail... Attempt ${i + 2} of ${retries}`,
				error instanceof Error ? error.message : error,
			);
			await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
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

// Password Reset OTP Mail
export async function passwordResetOtpMail(userEmail: string, otpCode: string) {
	try {
		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <p>Use the code below to reset your password:</p>
        <h2 style="text-align: center; font-size: 24px;">${otpCode}</h2>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br />The Dash Team</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: userEmail,
			subject: "Your Dash Password Reset Code",
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
	const { orderNumber, items, total, shippingAddress, paymentMethod } = orderDetails;

	try {
		// Generate items list HTML
		const itemsHTML = items
			.map(
				(item: any) => `
			<tr>
				<td style="padding: 8px; border-bottom: 1px solid #eee;">
					${item.name || item.title}
				</td>
				<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
					${item.quantity}
				</td>
				<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
					₦${item.price ? (item.price * item.quantity).toLocaleString() : "N/A"}
				</td>
			</tr>
		`,
			)
			.join("");

		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <p>Thank you for your order!</p>
        <p>Your order <strong>#${orderNumber}</strong> has been successfully placed and is being processed.</p>
        
        <h3 style="margin-top: 24px; margin-bottom: 16px; color: #333;">Order Items:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
              <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <p style="font-size: 18px; font-weight: bold; margin: 20px 0;">
          <strong>Total: ₦${total.toLocaleString()}</strong>
        </p>
        
        ${
					shippingAddress
						? `
          <h3 style="margin-top: 24px; margin-bottom: 16px; color: #333;">Shipping Address:</h3>
          <p style="margin: 0; padding: 12px; background-color: #f8f9fa; border-radius: 4px;">
            ${shippingAddress.firstName} ${shippingAddress.lastName}<br/>
            ${shippingAddress.street}<br/>
            ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode || ""}<br/>
            ${shippingAddress.country || ""}
          </p>
        `
						: ""
				}
        
        ${
					paymentMethod
						? `
          <p style="margin-top: 20px;"><strong>Payment Method:</strong> ${paymentMethod}</p>
        `
						: ""
				}
        
        <p style="margin-top: 24px;">We'll send you an update once your order ships.</p>
        <p>Best regards,<br />The Dash Team</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash <${process.env.SMTP_USER}>`,
			to: userEmail,
			subject: `Order Confirmed - #${orderNumber}`,
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Staff Order Notification Mail
export async function staffOrderNotificationMail(staffEmails: string | string[], orderDetails: any) {
	const { orderNumber, items, total, shippingAddress, paymentMethod, customerEmail } = orderDetails;

	try {
		// Handle multiple email addresses
		const emailList = Array.isArray(staffEmails) ? staffEmails : [staffEmails];

		// Generate items list HTML
		const itemsHTML = items
			.map(
				(item: any) => `
			<tr>
				<td style="padding: 8px; border-bottom: 1px solid #eee;">
					${item.name || item.title}
				</td>
				<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
					${item.quantity}
				</td>
				<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
					₦${item.price ? (item.price * item.quantity).toLocaleString() : "N/A"}
				</td>
			</tr>
		`,
			)
			.join("");

		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <h2 style="color: #e74c3c; margin-bottom: 20px;">🚨 New Order Alert</h2>
        <p>A new order has been placed and requires your attention.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Order Number:</strong> #${orderNumber}</p>
          <p><strong>Customer Email:</strong> ${customerEmail}</p>
          <p><strong>Order Total:</strong> ₦${total.toLocaleString()}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod || "N/A"}</p>
        </div>
        
        <h3 style="margin-top: 24px; margin-bottom: 16px; color: #333;">Order Items:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #34495e; color: white;">
              <th style="padding: 12px 8px; text-align: left;">Product</th>
              <th style="padding: 12px 8px; text-align: center;">Order Qty</th>
              <th style="padding: 12px 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        ${
					shippingAddress
						? `
          <h3 style="margin-top: 24px; margin-bottom: 16px; color: #333;">Shipping Address:</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px;">
            <p style="margin: 0;">
              ${shippingAddress.firstName} ${shippingAddress.lastName}<br/>
              ${shippingAddress.street}<br/>
              ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode || ""}<br/>
              ${shippingAddress.country || ""}
            </p>
          </div>
        `
						: ""
				}
        
        <p style="margin-top: 24px; color: #e74c3c; font-weight: bold;">
          ⚠️ Please process this order promptly and check inventory levels.
        </p>
        
        <p>Best regards,<br />Dash System</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash System <${process.env.SMTP_USER}>`,
			to: emailList.join(", "), // Send to multiple emails
			subject: `🚨 New Order Alert - #${orderNumber}`,
			html: emailTemplate(bodyContent),
		};

		return await sendMailWithRetry(mailOptions);
	} catch (error) {
		return { error: error instanceof Error && error.message };
	}
}

// Stock Alert Mail (Low Stock & Out of Stock)
export async function stockAlertMail(staffEmails: string | string[], stockDetails: any) {
	const { products, alertType } = stockDetails; // alertType: 'low_stock' or 'out_of_stock'

	try {
		// Handle multiple email addresses
		const emailList = Array.isArray(staffEmails) ? staffEmails : [staffEmails];

		const isOutOfStock = alertType === "out_of_stock";
		const alertColor = isOutOfStock ? "#e74c3c" : "#f39c12";
		const alertIcon = isOutOfStock ? "🚫" : "⚠️";
		const alertTitle = isOutOfStock ? "Products Out of Stock" : "Low Stock Alert";

		// Generate products list HTML
		const productsHTML = products
			.map(
				(product: any) => `
			<tr style="background-color: ${product.stock === 0 ? "#ffebee" : "#fff8e1"};">
				<td style="padding: 12px 8px; border-bottom: 1px solid #eee;">
					${product.name}
				</td>
				<td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center;">
					${product.sku || "N/A"}
				</td>
				<td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold; color: ${
					product.stock === 0 ? "#e74c3c" : "#f39c12"
				};">
					${product.stockCount}
				</td>
				<td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center;">
					${product.category || "N/A"}
				</td>
			</tr>
		`,
			)
			.join("");

		let bodyContent = `
      <td style="padding: 20px; line-height: 1.8;">
        <h2 style="color: ${alertColor}; margin-bottom: 20px;">${alertIcon} ${alertTitle}</h2>
        <p>The following products require immediate attention:</p>
        
        <div style="background-color: ${
					isOutOfStock ? "#ffebee" : "#fff8e1"
				}; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid ${alertColor};">
          <p style="margin: 0; font-weight: bold; color: ${alertColor};">
            ${
							isOutOfStock
								? `${products.length} product(s) are completely out of stock and cannot be sold.`
								: `${products.length} product(s) are running low on stock and need restocking soon.`
						}
          </p>
        </div>
        
        <h3 style="margin-top: 24px; margin-bottom: 16px; color: #333;">Affected Products:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: ${alertColor}; color: white;">
              <th style="padding: 12px 8px; text-align: left;">Product Name</th>
              <th style="padding: 12px 8px; text-align: center;">SKU</th>
              <th style="padding: 12px 8px; text-align: center;">Current Stock</th>
              <th style="padding: 12px 8px; text-align: center;">Category</th>
            </tr>
          </thead>
          <tbody>
            ${productsHTML}
          </tbody>
        </table>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Recommended Actions:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${
							isOutOfStock
								? `<li>Update product availability on website immediately</li>
               <li>Contact suppliers to restock these items</li>
               <li>Consider removing from active listings until restocked</li>`
								: `<li>Review and update reorder quantities</li>
               <li>Contact suppliers for restocking</li>
               <li>Monitor sales velocity for these products</li>`
						}
          </ul>
        </div>
        
        <p style="margin-top: 24px; color: ${alertColor}; font-weight: bold;">
          ${alertIcon} Please take immediate action to prevent sales disruption.
        </p>
        
        <p>Best regards,<br />Dash Inventory System</p>
      </td>
    `;

		let mailOptions = {
			from: `Dash Inventory <${process.env.SMTP_USER}>`,
			to: emailList.join(", "), // Send to multiple emails
			subject: `${alertIcon} ${alertTitle} - Action Required`,
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
			to: "storekeeper@dashshops.com",
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
			to: `${process.env.SMTP_USER}`, // Admin email
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
