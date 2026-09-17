import { setupTestEnv, seedAdmin, clearTestStorage, cleanDatabase } from "./helpers";

setupTestEnv();
await cleanDatabase();
await clearTestStorage();
await seedAdmin();
