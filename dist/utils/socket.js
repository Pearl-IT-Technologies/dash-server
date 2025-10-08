"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const initSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("🔌 User connected:", socket.id);
        socket.on("join-room", (room) => {
            socket.join(room);
            console.log(`📦 Socket ${socket.id} joined room: ${room}`);
        });
        socket.on("disconnect", () => {
            console.log("❌ User disconnected:", socket.id);
        });
    });
};
exports.initSocket = initSocket;
//# sourceMappingURL=socket.js.map