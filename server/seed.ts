import { storage } from "./storage";

async function seedPlayers() {
  console.log("🌱 Seeding players...");

  const samplePlayers = [
    {
      firstName: "Emmanuel",
      lastName: "Okonkwo",
      nationality: "Nigeria",
      dateOfBirth: "1998-03-15",
      position: "Striker",
      teamId: "demo-team",
      currentClubName: "Enyimba FC",
      nationalTeamCaps: 12,
      internationalCaps: 12,
      continentalGames: 8,
      clubMinutesCurrentSeason: 1850,
      totalCareerMinutes: 8500,
      height: 183,
      weight: 78,
      preferredFoot: "Right",
    },
    {
      firstName: "Kwame",
      lastName: "Mensah",
      nationality: "Ghana",
      dateOfBirth: "2000-07-22",
      position: "Midfielder",
      teamId: "demo-team",
      currentClubName: "Accra Hearts of Oak",
      nationalTeamCaps: 5,
      internationalCaps: 5,
      continentalGames: 4,
      clubMinutesCurrentSeason: 920,
      totalCareerMinutes: 4200,
    },
    {
      firstName: "Ahmed",
      lastName: "El-Sayed",
      nationality: "Egypt",
      dateOfBirth: "1996-11-03",
      position: "Defender",
      teamId: "demo-team",
      currentClubName: "Al Ahly SC",
      nationalTeamCaps: 28,
      internationalCaps: 28,
      continentalGames: 22,
      clubMinutesCurrentSeason: 2340,
      totalCareerMinutes: 15800,
      height: 186,
      weight: 82,
      preferredFoot: "Left",
    },
    {
      firstName: "Carlos",
      lastName: "Ramirez",
      nationality: "Colombia",
      dateOfBirth: "2001-05-18",
      position: "Winger",
      teamId: "demo-team",
      currentClubName: "Atletico Nacional",
      nationalTeamCaps: 2,
      internationalCaps: 2,
      continentalGames: 6,
      clubMinutesCurrentSeason: 650,
      totalCareerMinutes: 2100,
    },
  ];

  for (const playerData of samplePlayers) {
    try {
      const player = await storage.createPlayer(playerData);
      console.log(`✅ Created player: ${player.firstName} ${player.lastName}`);
    } catch (error) {
      console.error(
        `❌ Failed to create player ${playerData.firstName} ${playerData.lastName}:`,
        error,
      );
    }
  }

  console.log("✨ Seeding complete!");
}

seedPlayers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
