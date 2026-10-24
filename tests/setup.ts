import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;

export const startDb = async () => {
	mongo = await MongoMemoryServer.create();
	await mongoose.connect(mongo.getUri());
	// Setting has a pre-existing invalid empty index (src/models/Setting.ts), so only sync the models under test
	await Promise.all(["Order", "Product", "User"].map((name) => mongoose.model(name).syncIndexes()));
};

export const clearDb = async () => {
	await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
};

export const stopDb = async () => {
	await mongoose.disconnect();
	await mongo?.stop();
};
