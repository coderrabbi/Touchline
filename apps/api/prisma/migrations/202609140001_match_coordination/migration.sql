CREATE TABLE "MatchCoordination" (
 "matchId" UUID NOT NULL PRIMARY KEY REFERENCES "Match"("id") ON DELETE CASCADE,
 "homeReadyAt" TIMESTAMP(3), "awayReadyAt" TIMESTAMP(3),
 "lobbyDetails" VARCHAR(1000), "noShowReporterId" UUID,
 "noShowReason" VARCHAR(2000), "noShowReportedAt" TIMESTAMP(3),
 "decision" VARCHAR(2000), "updatedAt" TIMESTAMP(3) NOT NULL
);
