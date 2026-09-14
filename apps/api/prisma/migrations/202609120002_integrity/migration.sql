BEGIN;
ALTER TABLE "Tournament" ADD CONSTRAINT "tournament_capacity_valid" CHECK ("minPlayers" >= 2 AND "maxPlayers" >= "minPlayers" AND "maxPlayers" <= 128);
ALTER TABLE "Tournament" ADD CONSTRAINT "tournament_dates_valid" CHECK ("registrationStartsAt" < "registrationDeadline" AND "registrationDeadline" < "startsAt");
ALTER TABLE "Match" ADD CONSTRAINT "distinct_opponents" CHECK ("homeId" IS NULL OR "awayId" IS NULL OR "homeId" <> "awayId");
ALTER TABLE "Match" ADD CONSTRAINT "nonnegative_scores" CHECK (("homeScore" IS NULL OR "homeScore" >= 0) AND ("awayScore" IS NULL OR "awayScore" >= 0));
ALTER TABLE "MatchResultSubmission" ADD CONSTRAINT "submission_scores_valid" CHECK ("homeScore" >= 0 AND "awayScore" >= 0);
CREATE UNIQUE INDEX "one_pending_submission_per_match" ON "MatchResultSubmission" ("matchId") WHERE "status" IN ('PENDING', 'DISPUTED');
COMMIT;
