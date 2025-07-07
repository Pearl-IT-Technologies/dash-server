// server/socket.ts
import { Server } from "socket.io";

export const initSocket = (io: Server) => {
	io.on("connection", (socket) => {
		console.log("🔌 User connected:", socket.id);

		// Handle room joins
		socket.on("join-room", (room: string) => {
			socket.join(room);
			console.log(`📦 Socket ${socket.id} joined room: ${room}`);
		});

		socket.on("disconnect", () => {
			console.log("❌ User disconnected:", socket.id);
		});
	});
};
