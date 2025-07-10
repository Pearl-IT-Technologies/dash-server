import User from "@/models/User";

// Get staff emails for notifications
export const getStaffMails = async (roles: string[]) : Promise<string[]> => {
	const staffEmails = await User.find({ role: { $in: roles } }, "email").distinct("email");

	return staffEmails;
};
