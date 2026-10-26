import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;

export const startDb = async () => {
	mongo = await MongoMemoryServer.create();
	await mongoose.connect(mongo.getUri());
	await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
};

export const clearDb = async () => {
	await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
};

export const stopDb = async () => {
	await mongoose.disconnect();
	await mongo?.stop();
};
