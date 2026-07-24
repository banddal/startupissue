// 웹 코드에서 service_role 키 참조를 차단한다. (결정 문서 001 불변조건 3)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const TARGET = "src";
const NEEDLE = "SERVICE_ROLE";
const hits = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      const text = readFileSync(p, "utf8");
      if (text.includes(NEEDLE)) hits.push(p);
    }
  }
}

walk(TARGET);

if (hits.length > 0) {
  console.error("service_role 참조가 웹 코드에서 발견되었습니다:");
  for (const h of hits) console.error("  " + h);
  process.exit(1);
}
console.log("OK — 웹 코드에 service_role 참조 없음");
