"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplate = emailTemplate;
exports.stripHtmlToText = stripHtmlToText;
function emailTemplate(bodyContent) {
    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="x-apple-disable-message-reformatting">
	<title>Dash</title>
	<!--[if mso]>
	<style type="text/css">
		table {border-collapse: collapse;}
		.fallback-font {font-family: Arial, sans-serif;}
	</style>
	<![endif]-->
	<style type="text/css">
		body, table, td {font-family: Arial, Helvetica, sans-serif;}
		body {margin: 0; padding: 0; background-color: #f9f9f9;}
		table {border-spacing: 0;}
		img {border: 0; display: block;}
		a {color: #114000; text-decoration: none;}
	</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f9f9f9" style="padding: 20px 0;">
		<tr>
			<td align="center">
				<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width: 600px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
					<!-- Header -->
					<tr>
						<td align="center" style="padding: 20px; background-color: #13160F;">
							<img src="https://res.cloudinary.com/ddb1vjioq/image/upload/v1750676755/dashng-logo_buf5l2.png" width="120" height="auto" alt="Dash Logo" style="display: block;">
						</td>
					</tr>
					<!-- Body Content -->
					<tr>
						${bodyContent}
					</tr>
					<!-- Footer -->
					<tr>
						<td align="center" style="padding: 20px; background-color: #13160F; color: #fafafa; font-size: 12px; line-height: 1.5;">
							<p style="margin: 0 0 10px 0;">&copy; 2025 Dash. All Rights Reserved.</p>
							<p style="margin: 0; color: #aaaaaa;">
								You received this email because you have an account with Dash.<br>
								<a href="https://dashshops.com" style="color: #aaaaaa; text-decoration: underline;">Visit our website</a>
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
}
function stripHtmlToText(html) {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
//# sourceMappingURL=emailTemplate.js.map