import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { User } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedAdmins = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI, { family: 4 });
    console.log("Connected to MongoDB for seeding...");

    // Check if admins already exist
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount >= 2) {
      console.log("Admins already seeded! Aborting to prevent duplicates.");
      process.exit(0);
    }

    // Hash the default passwords (salt rounds = 10)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword1 = await bcrypt.hash("Joe123", salt);
    const hashedPassword2 = await bcrypt.hash("Heitham123", salt);

    // Create Admin 1
    await User.create({
      username: "Joe-Admin",
      password: hashedPassword1,
      role: 'admin'
    });

    // Create Admin 2
    await User.create({
      username: "Heitham-Admin",
      password: hashedPassword2,
      role: 'admin'
    });

    console.log("Successfully created 2 Admin accounts!");
    console.log("Admin 1: Username: 'master_admin_1' | Password: 'admin123'");
    console.log("Admin 2: Username: 'master_admin_2' | Password: 'admin123'");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedAdmins();
