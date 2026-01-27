import { storage } from "../storage";

async function main() {
  console.log("Seeding Federation Admin...");

  const username = "federation_admin";
  const password = "password123";
  const email = "admin@sportsreels.ai"; // Using allowed domain

  // Check if user exists
  const existingUser = await storage.getUserByUsername(username);
  if (existingUser) {
    console.log("Federation Admin already exists.");
    return;
  }

  const user = await storage.createUser({
    username,
    password,
    email,
    firstName: "Federation",
    lastName: "Admin",
    role: "federation_admin",
  });

  console.log(`Created Federation Admin: ${user.username} (${user.email})`);

  // Create default fee schedule
  console.log("Creating default fee schedule...");
  await storage.createFederationFeeSchedule({
    federationId: user.id,
    country: "Nigeria",
    baseFee: 225000,
    currency: "NGN",
    platformServiceCharge: 37500,
    isActive: true,
  });
  console.log("Default fee schedule created.");
}

main().catch(console.error);
