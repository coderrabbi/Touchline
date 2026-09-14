import { prisma } from "../src/config/prisma.js";
import { generate } from "../src/services/fixture.service.js";
import { resolve } from "../src/services/result.service.js";
if (process.env.NODE_ENV === "production")
  throw Error("Development seed only.");
try {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "jordan@touchline.example" },
  });
  for (const slug of [
    "european-elite-league",
    "asia-rising-invitational",
    "summer-community-cup",
  ]) {
    const t = await prisma.tournament.findUnique({
      where: { slug },
      include: { _count: { select: { matches: true } } },
    });
    if (!t || t._count.matches) continue;
    await prisma.tournament.update({
      where: { id: t.id },
      data: { status: "REGISTRATION_CLOSED" },
    });
    await generate(admin.id, t.id);
    if (slug === "asia-rising-invitational") continue;
    await prisma.tournament.update({
      where: { id: t.id },
      data: { status: "ONGOING" },
    });
    let remaining = slug === "summer-community-cup" ? 100 : 6;
    while (remaining-- > 0) {
      const match = await prisma.match.findFirst({
        where: {
          tournamentId: t.id,
          status: "SCHEDULED",
          homeId: { not: null },
          awayId: { not: null },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      });
      if (!match) break;
      await resolve(
        admin.id,
        match.id,
        { homeScore: 2 + (remaining % 3), awayScore: 1 },
        "Fictional seed result for development.",
      );
    }
  }
  console.log(
    "Seeded fixtures, official results, standings and a completed knockout champion.",
  );
} finally {
  await prisma.$disconnect();
}
