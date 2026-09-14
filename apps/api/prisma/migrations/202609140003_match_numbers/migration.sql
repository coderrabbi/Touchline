ALTER TABLE "Match" ADD COLUMN "matchNumber" SERIAL NOT NULL;
CREATE UNIQUE INDEX "Match_matchNumber_key" ON "Match"("matchNumber");
