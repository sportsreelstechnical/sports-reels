/**
 * Test script for GET /api/players.
 * Run: npx tsx server/scripts/test-players-endpoint.ts
 * Optional env: TEST_USER, TEST_PASSWORD to test authenticated response.
 */
const BASE = process.env.BASE_URL || "http://localhost:5001";

async function main() {
  console.log("Testing GET /api/players\n");

  // 1. Unauthenticated → expect 401
  const unauthRes = await fetch(`${BASE}/api/players`, { credentials: "include" });
  const unauthOk = unauthRes.status === 401;
  console.log(unauthOk ? "✓ Unauthenticated: 401 Unauthorized" : `✗ Unauthenticated: got ${unauthRes.status}`);
  if (!unauthOk) {
    const body = await unauthRes.text();
    console.log("  Response:", body.slice(0, 200));
  }

  // 2. Authenticated (if credentials provided)
  const user = process.env.TEST_USER;
  const pass = process.env.TEST_PASSWORD;
  if (user && pass) {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass }),
      credentials: "include",
    });
    if (!loginRes.ok) {
      console.log("\n✗ Login failed:", loginRes.status, await loginRes.text());
      process.exit(1);
    }
    console.log("\n✓ Login OK");

    const playersRes = await fetch(`${BASE}/api/players`, { credentials: "include" });
    const playersOk = playersRes.status === 200;
    console.log(playersOk ? "✓ GET /api/players: 200" : `✗ GET /api/players: ${playersRes.status}`);
    const data = await playersRes.json();
    const isArray = Array.isArray(data);
    console.log(isArray ? `  Body: array of ${data.length} player(s)` : "  Body:", typeof data, JSON.stringify(data).slice(0, 100));
    if (!playersOk || !isArray) process.exit(1);
  } else {
    console.log("\n(Set TEST_USER and TEST_PASSWORD to test authenticated GET /api/players)");
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
