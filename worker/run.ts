import { main } from "./cli";

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown worker error");
  process.exitCode = 1;
});
