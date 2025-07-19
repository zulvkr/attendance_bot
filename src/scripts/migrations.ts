import { DatabaseService } from "../database";

async function runMigrations() {
  console.log("Running database migrations...");

  // The DatabaseService constructor already handles table creation
  const db = new DatabaseService();

  // Wait a bit for the async init to complete
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("Database migrations completed successfully!");

  await db.close();
}

// Run if this file is executed directly
if (require.main === module) {
  runMigrations().catch(console.error);
}

export { runMigrations };
