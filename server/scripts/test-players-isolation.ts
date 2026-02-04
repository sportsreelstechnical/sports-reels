/**
 * E2E test: create two accounts, add players with each, verify each account
 * only sees their own players.
 *
 * Run: npx tsx server/scripts/test-players-isolation.ts
 */
const BASE = process.env.BASE_URL || "http://localhost:5001";

let cookieHeader: string | undefined;

async function fetchWithSession(
  path: string,
  opts: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const headers = new Headers(opts.headers);
  if (cookieHeader) headers.set("Cookie", cookieHeader);
  const res = await fetch(url, {
    ...opts,
    headers,
    credentials: "include",
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookieHeader = setCookie.split(";")[0];
  return res;
}

function clearSession() {
  cookieHeader = undefined;
}

async function signup(
  username: string,
  password: string,
  email: string,
  teamName: string,
  clubName: string
) {
  const res = await fetchWithSession("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      email,
      role: "sporting_director",
      teamName,
      clubName,
      country: "Nigeria",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Signup failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function login(username: string, password: string) {
  clearSession();
  const res = await fetchWithSession("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function createPlayer(firstName: string, lastName: string, nationality: string, position: string) {
  const res = await fetchWithSession("/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName,
      lastName,
      nationality,
      position,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create player failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function getPlayers(): Promise<unknown[]> {
  const res = await fetchWithSession("/api/players");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET /api/players failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Expected array, got ${typeof data}`);
  return data;
}

async function getPlayer(id: string): Promise<Response> {
  return fetchWithSession(`/api/players/${id}`);
}

async function main() {
  console.log("E2E: Two accounts, add players each, verify isolation\n");

  const stamp = Date.now();
  const userA = {
    username: `testa_${stamp}`,
    password: "TestPass123!",
    email: `testa_${stamp}@test.local`,
    teamName: "Team Alpha",
    clubName: "Club Alpha",
  };
  const userB = {
    username: `testb_${stamp}`,
    password: "TestPass123!",
    email: `testb_${stamp}@test.local`,
    teamName: "Team Beta",
    clubName: "Club Beta",
  };

  // 1. Signup A, add player 1
  console.log("1. Signup account A (Team Alpha)...");
  await signup(userA.username, userA.password, userA.email, userA.teamName, userA.clubName);
  console.log("   OK");

  console.log("2. Add player 'Alice One' as account A...");
  const player1 = await createPlayer("Alice", "One", "Nigeria", "Forward");
  const player1Id = (player1 as { id: string }).id;
  console.log("   OK, player id:", player1Id);

  console.log("3. GET /api/players as A...");
  const listA1 = (await getPlayers()) as { id: string }[];
  const aSeesPlayer1 = listA1.some((p) => p.id === player1Id);
  if (!aSeesPlayer1) {
    throw new Error(`A must see their player (Alice One). Got ${listA1.length} players.`);
  }
  console.log(`   OK, A sees their player (Alice One) among ${listA1.length} player(s)`);

  // 4. Signup B, add player 2
  console.log("4. Signup account B (Team Beta)...");
  await signup(userB.username, userB.password, userB.email, userB.teamName, userB.clubName);
  console.log("   OK");

  console.log("5. Add player 'Bob Two' as account B...");
  const player2 = await createPlayer("Bob", "Two", "Ghana", "Midfielder");
  const player2Id = (player2 as { id: string }).id;
  console.log("   OK, player id:", player2Id);

  console.log("6. GET /api/players as B...");
  const listB = (await getPlayers()) as { id: string }[];
  const bSeesPlayer2 = listB.some((p) => p.id === player2Id);
  const bSeesPlayer1 = listB.some((p) => p.id === player1Id);
  if (!bSeesPlayer2) {
    throw new Error(`B must see their player (Bob Two). Got ${listB.length} players.`);
  }
  if (bSeesPlayer1) {
    throw new Error("B must NOT see A's player (Alice One). Isolation broken.");
  }
  console.log(`   OK, B sees their player (Bob Two) only, not A's (${listB.length} total)`);

  // 7. Login as A again, verify A only sees player 1
  console.log("7. Login as A again...");
  await login(userA.username, userA.password);
  console.log("   OK");

  console.log("8. GET /api/players as A...");
  const listA2 = (await getPlayers()) as { id: string }[];
  const aSeesPlayer1Again = listA2.some((p) => p.id === player1Id);
  const aSeesPlayer2 = listA2.some((p) => p.id === player2Id);
  if (!aSeesPlayer1Again) {
    throw new Error(`A must see their player (Alice One) after re-login. Got ${listA2.length} players.`);
  }
  if (aSeesPlayer2) {
    throw new Error("A must NOT see B's player (Bob Two). Isolation broken.");
  }
  console.log(`   OK, A sees their player (Alice One) only, not B's (${listA2.length} total)`);

  // 9. A tries to fetch B's player by id → expect 404
  console.log("9. GET /api/players/:id (B's player) as A...");
  const resBPlayerAsA = await getPlayer(player2Id);
  if (resBPlayerAsA.status !== 404) {
    throw new Error(`Expected 404 when A fetches B's player, got ${resBPlayerAsA.status}`);
  }
  console.log("   OK, 404 (A cannot see B's player)");

  console.log("\n✓ All checks passed. Player isolation is working.");
}

main().catch((e) => {
  console.error("\n✗", e.message);
  process.exit(1);
});
