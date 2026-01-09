import { Client } from "pg";

const connectionString = "postgres://postgres:postgres@localhost:5432/postgres";

async function createDb() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("Connected to default postgres database...");

    // Check if database exists
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'sports_reels'"
    );
    if (res.rowCount === 0) {
      console.log("Creating database sports_reels...");
      await client.query("CREATE DATABASE sports_reels");
      console.log("Database sports_reels created successfully.");
    } else {
      console.log("Database sports_reels already exists.");
    }
  } catch (err: any) {
    console.error("Error creating database:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDb();
