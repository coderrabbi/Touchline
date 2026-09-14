BEGIN;
-- Claims reserve legacy conflicts without renaming existing people's accounts.
CREATE TABLE "EfootballUsernameClaim" ("key" TEXT PRIMARY KEY, "profileId" UUID);
INSERT INTO "EfootballUsernameClaim" ("key","profileId")
SELECT lower(trim("efootballUsername")), CASE WHEN count(*)=1 THEN (array_agg("id"))[1] ELSE NULL END
FROM "Profile" GROUP BY lower(trim("efootballUsername"));

CREATE FUNCTION claim_efootball_username() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE claimed TEXT;
BEGIN
  NEW."efootballUsername" := trim(NEW."efootballUsername");
  IF TG_OP='UPDATE' AND lower(NEW."efootballUsername")=lower(trim(OLD."efootballUsername")) THEN RETURN NEW; END IF;
  INSERT INTO "EfootballUsernameClaim" ("key","profileId") VALUES (lower(NEW."efootballUsername"),NEW."id")
  ON CONFLICT ("key") DO UPDATE SET "profileId"=EXCLUDED."profileId"
  WHERE "EfootballUsernameClaim"."profileId"=EXCLUDED."profileId"
  RETURNING "key" INTO claimed;
  IF claimed IS NULL THEN
    RAISE EXCEPTION 'eFootball username already in use' USING ERRCODE='23505', CONSTRAINT='efootball_username_unique';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER claim_efootball_username BEFORE INSERT OR UPDATE OF "efootballUsername" ON "Profile"
FOR EACH ROW EXECUTE FUNCTION claim_efootball_username();

CREATE FUNCTION release_efootball_username() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE remaining BIGINT; owner UUID; oldkey TEXT;
BEGIN
  oldkey := lower(trim(OLD."efootballUsername"));
  IF TG_OP='UPDATE' AND lower(trim(NEW."efootballUsername"))=oldkey THEN RETURN NULL; END IF;
  SELECT count(*),(array_agg("id"))[1] INTO remaining,owner FROM "Profile" WHERE lower(trim("efootballUsername"))=oldkey;
  IF remaining=0 THEN DELETE FROM "EfootballUsernameClaim" WHERE "key"=oldkey;
  ELSE UPDATE "EfootballUsernameClaim" SET "profileId"=CASE WHEN remaining=1 THEN owner ELSE NULL END WHERE "key"=oldkey;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER release_efootball_username AFTER DELETE OR UPDATE OF "efootballUsername" ON "Profile"
FOR EACH ROW EXECUTE FUNCTION release_efootball_username();
COMMIT;
