import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load the .env file from the root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(process.cwd(), '.env') });

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || "mongodb://app_aast_db_user:Q66Rcsk6dHogOVAI@ac-no7pgen-shard-00-00.ikeeu3m.mongodb.net:27017,ac-no7pgen-shard-00-01.ikeeu3m.mongodb.net:27017,ac-no7pgen-shard-00-02.ikeeu3m.mongodb.net:27017/cambridge_helper?ssl=true&replicaSet=atlas-lukzwe-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
    if (!mongoURI) {
      throw new Error("MONGO_URI is missing from .env file");
    }

    await mongoose.connect(mongoURI, { family: 4 });
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Don't crash the app, but log the failure
  }
};
