import { runBackfill } from "./backfill";
import { main } from "./cli";

const command = process.argv[2];
const operation = command === "backfill"
  ? runBackfill()
  : main();

const keepAlive = setInterval(() => undefined, 1_000);
operation
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Unknown worker error");
    process.exitCode = 1;
  })
  .finally(() => clearInterval(keepAlive));
