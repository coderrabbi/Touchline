BEGIN;
CREATE TABLE "TournamentCommunity" (
  "tournamentId" UUID NOT NULL PRIMARY KEY,
  "groupLink" VARCHAR(2048),
  CONSTRAINT "TournamentCommunity_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ChatMessage" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tournamentId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "clientId" UUID NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChatMessage_body_nonempty" CHECK (length(trim("body")) > 0)
);
CREATE UNIQUE INDEX "ChatMessage_authorId_clientId_key" ON "ChatMessage"("authorId", "clientId");
CREATE INDEX "ChatMessage_tournamentId_createdAt_id_idx" ON "ChatMessage"("tournamentId", "createdAt", "id");
COMMIT;
