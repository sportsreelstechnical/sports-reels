import { storage } from "../server/storage";

async function createAdmin() {
  try {
    const existing = await storage.getUserByUsername("admin");
    if (existing) {
      console.log("Admin user already exists");
      process.exit(0);
    }

    await storage.createUser({
      username: "admin",
      password: "admin123",

      email: "admin@sportsreels.com",
      firstName: "Platform",
      lastName: "Administrator",
      role: "admin",
    });

    console.log("Admin user created successfully");
    console.log("Username: admin");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    process.exit(0);
  }
}

createAdmin();
