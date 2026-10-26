// server/socket.ts
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { getJwtSecret } from "../middleware/auth";

export const STAFF_ROOM = "staff";
export const STAFF_ROLES = ["admin", "storekeeper", "salesrep"];
export const userRoom = (userId: string) => `user:${userId}`;

export const initSocket = (io: Server) => {
	// Optional auth: a valid JWT in handshake.auth.token puts staff in the staff room
	// and every user in their own room. Anonymous sockets still get public events.
	io.use(async (socket, next) => {
		const token = socket.handshake.auth?.token;
		if (token) {
			try {
				const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
				const user = await User.findById(decoded.userId);
				if (user && user.isActive) {
					socket.data.userId = user._id.toString();
					socket.data.role = user.role;
				}
			} catch (error) {
				// Invalid token: continue as anonymous
			}
		}
		next();
	});

	io.on("connection", (socket) => {
		console.log("🔌 User connected:", socket.id);

		if (socket.data.userId) {
			socket.join(userRoom(socket.data.userId));
		}
		if (STAFF_ROLES.includes(socket.data.role)) {
			socket.join(STAFF_ROOM);
		}

		// Handle room joins (protected rooms can only be joined via auth above)
		socket.on("join-room", (room: string) => {
			if (typeof room !== "string" || room === STAFF_ROOM || room.startsWith("user:")) return;
			socket.join(room);
			console.log(`📦 Socket ${socket.id} joined room: ${room}`);
		});

		socket.on("disconnect", () => {
			console.log("❌ User disconnected:", socket.id);
		});
	});
};
