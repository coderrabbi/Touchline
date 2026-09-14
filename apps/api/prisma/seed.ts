import "dotenv/config";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/config/prisma.js";
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
if (!adminPassword || adminPassword.length < 16)
  throw new Error("Set a strong SEED_ADMIN_PASSWORD before seeding.");
if (process.env.NODE_ENV === "production")
  throw new Error("Development seed is not permitted in production.");
const adminHash = await bcrypt.hash(adminPassword, 12);
const names = [
  "Alex Morgan",
  "Samir Khan",
  "Ryo Tanaka",
  "Leo Costa",
  "Omar Ahmed",
  "Noah Silva",
  "Kai Wilson",
  "Emil Jensen",
  "Mika Sato",
  "Arjun Das",
  "Zara Ali",
  "Diego Santos",
  "Hugo Martin",
  "Luca Rossi",
  "Nabil Hassan",
  "Ethan Brooks",
  "Yusuf Demir",
  "Mateo Cruz",
  "Amir Rahman",
  "Sofia Oliveira",
  "Nadia Rahman",
  "Haruto Mori",
  "Theo Bernard",
  "Ayaan Malik",
];
async function run() {
  const admin = await prisma.user.upsert({
    where: { email: "jordan@touchline.example" },
    update: {},
    create: {
      name: "Jordan Lee",
      username: "jordanlee",
      email: "jordan@touchline.example",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
      emailVerified: true,
      profile: {
        create: {
          country: "BD",
          platform: "STEAM_PC",
          efootballUsername: "JordanTL",
          timezone: "Asia/Dhaka",
        },
      },
    },
  });
  for (const [name, username] of [
    ["Maya Chen", "mayachen"],
    ["Daniel Park", "danielpark"],
  ])
    await prisma.user.upsert({
      where: { email: username + "@touchline.example" },
      update: {},
      create: {
        name: name!,
        username: username!,
        email: username + "@touchline.example",
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        role: "ADMIN",
        emailVerified: true,
      },
    });
  const players = [];
  for (const [i, name] of names.entries()) {
    const username = name.toLowerCase().replaceAll(" ", "_");
    players.push(
      await prisma.user.upsert({
        where: { username },
        update: {},
        create: {
          name,
          username,
          email: username + "@touchline.example",
          passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
          emailVerified: true,
          profile: {
            create: {
              country: ["BD", "JP", "PT", "GB", "DE", "ES"][i % 6]!,
              platform: i < 8 ? "STEAM_PC" : i < 16 ? "STEAM_PC" : "MOBILE",
              efootballUsername: username + "_10",
              timezone: "Asia/Dhaka",
            },
          },
        },
      }),
    );
  }
  const fixtures = [
    {
      name: "Midnight Champions Cup",
      slug: "midnight-champions-cup",
      format: "KNOCKOUT",
      platform: "STEAM_PC",
      status: "REGISTRATION_OPEN",
      maxPlayers: 32,
      offset: 6,
      region: "Asia",
    },
    {
      name: "European Elite League",
      slug: "european-elite-league",
      format: "LEAGUE",
      platform: "STEAM_PC",
      status: "ONGOING",
      maxPlayers: 16,
      offset: -2,
      region: "Europe",
    },
    {
      name: "Weekend Warriors",
      slug: "weekend-warriors",
      format: "GROUP_KNOCKOUT",
      platform: "MOBILE",
      status: "REGISTRATION_OPEN",
      maxPlayers: 64,
      offset: 7,
      region: "Global",
    },
    {
      name: "Asia Rising Invitational",
      slug: "asia-rising-invitational",
      format: "GROUP_STAGE",
      platform: "STEAM_PC",
      status: "UPCOMING",
      maxPlayers: 16,
      offset: 3,
      region: "Asia",
    },
    {
      name: "Summer Community Cup",
      slug: "summer-community-cup",
      format: "KNOCKOUT",
      platform: "STEAM_PC",
      status: "COMPLETED",
      maxPlayers: 8,
      offset: -12,
      region: "Global",
    },
  ] as const;
  for (const [index, f] of fixtures.entries()) {
    const { offset, ...fields } = f;
    const startsAt = new Date(Date.now() + offset * 86400000);
    const t = await prisma.tournament.upsert({
      where: { slug: f.slug },
      update: {},
      create: {
        ...fields,
        description:
          "Take your team from the first whistle to the final. A fair, competitive community tournament for dedicated eFootball players.",
        registrationStartsAt: new Date(startsAt.getTime() - 7 * 86400000),
        registrationDeadline: new Date(startsAt.getTime() - 86400000),
        startsAt,
        rules:
          "10-minute matches. Submit full-time screenshot evidence. Opponents must confirm results. Disputes are reviewed by an administrator. League points: win 3, draw 1, loss 0.",
        createdById: admin.id,
        publishedAt: new Date(),
        bannerUrl:
          "https://images.unsplash.com/photo-1674760726595-d12f5e45482a?auto=format&fit=crop&w=1600&q=85",
        numberOfGroups: f.format.includes("GROUP") ? 2 : 0,
      },
    });
    const eligible = players.filter((_, i) =>
      index === 0 || index === 3
        ? i < 8
        : index === 2
          ? i >= 16
          : i >= 8 && i < 16,
    );
    for (const [seed, user] of eligible.entries()) {
      await prisma.tournamentRegistration.upsert({
        where: { tournamentId_userId: { tournamentId: t.id, userId: user.id } },
        update: {},
        create: {
          tournamentId: t.id,
          userId: user.id,
          status: "APPROVED",
          rulesAcceptedAt: new Date(),
        },
      });
      await prisma.tournamentParticipant.upsert({
        where: { tournamentId_userId: { tournamentId: t.id, userId: user.id } },
        update: {},
        create: { tournamentId: t.id, userId: user.id, seed: seed + 1 },
      });
    }
  }
  await prisma.achievement.upsert({
    where: { code: "FIRST_VICTORY" },
    update: {},
    create: {
      code: "FIRST_VICTORY",
      name: "First victory",
      description: "Win your first official Touchline tournament match.",
    },
  });
  console.log(
    "Seeded 1 super admin, 2 admins, 24 players, 5 tournaments and eligible registrations. Existing accounts were preserved.",
  );
}
try {
  await run();
} finally {
  await prisma.$disconnect();
}
