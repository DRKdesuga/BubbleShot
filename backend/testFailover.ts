import "dotenv/config";
import { DatabaseConnectionManager } from "./src/infrastructure/db/connectionManager.js";
import { execSync } from "child_process";

async function run() {
  console.log("\n=== Testing Database Connection Failover ===");
  const dbConnectionManager = new DatabaseConnectionManager();

  // 1. First connection
  await dbConnectionManager.query('SELECT 1');
  console.log("✅ 1. Initial Connection. Current host:", dbConnectionManager.currentHost);

  // 2. Shut down primary database
  console.log("\n🛑 2. Stopping primary DB remotely...");
  // Use docker compose stop to rely on compose project naming automatically
  execSync("docker compose stop db_primary", { stdio: 'inherit' });

  // 3. Trigger failover
  console.log("\n🔄 3. Attempting another query... (this should trigger failover output)");
  await dbConnectionManager.query('SELECT 1');
  console.log("✅ 4. Successfully completed query. Current host:", dbConnectionManager.currentHost);

  // 5. Cleanup
  console.log("\n⬆️ 5. Restarting primary DB for cleanup...");
  execSync("docker compose start db_primary", { stdio: 'inherit' });
  
  await dbConnectionManager.close();
  console.log("=== End of Test ===\n");
}

run().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
