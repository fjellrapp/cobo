-- AddHouseholdPublicId
ALTER TABLE "Household" ADD COLUMN "publicId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Household" ALTER COLUMN "description" SET DEFAULT '';
CREATE UNIQUE INDEX "Household_publicId_key" ON "Household"("publicId");

-- CreateHouseholdRole
CREATE TYPE "HouseholdRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateHouseholdMembership
CREATE TABLE "HouseholdMembership" (
    "id" SERIAL NOT NULL,
    "publicId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" INTEGER NOT NULL,
    "householdId" INTEGER NOT NULL,
    "role" "HouseholdRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    CONSTRAINT "HouseholdMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HouseholdMembership_userId_householdId_key"
    ON "HouseholdMembership"("userId", "householdId");
CREATE UNIQUE INDEX "HouseholdMembership_publicId_key"
    ON "HouseholdMembership"("publicId");
CREATE INDEX "HouseholdMembership_householdId_idx"
    ON "HouseholdMembership"("householdId");
CREATE INDEX "HouseholdMembership_userId_idx"
    ON "HouseholdMembership"("userId");

-- CreateHouseholdInvitation
CREATE TABLE "HouseholdInvitation" (
    "id" SERIAL NOT NULL,
    "publicId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "householdId" INTEGER NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" INTEGER,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "HouseholdInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HouseholdInvitation_publicId_key"
    ON "HouseholdInvitation"("publicId");
CREATE UNIQUE INDEX "HouseholdInvitation_tokenHash_key"
    ON "HouseholdInvitation"("tokenHash");
CREATE INDEX "HouseholdInvitation_householdId_expiresAt_idx"
    ON "HouseholdInvitation"("householdId", "expiresAt");

-- Backfill legacy household assignments. Earliest user is owner, with ID as a deterministic tie-break.
INSERT INTO "HouseholdMembership" ("userId", "householdId", "role", "joinedAt")
SELECT ranked."id",
       ranked."householdId",
       CASE WHEN ranked.owner_rank = 1 THEN 'OWNER'::"HouseholdRole"
            ELSE 'MEMBER'::"HouseholdRole" END,
       ranked."createdAt"
FROM (
    SELECT "id", "householdId", "createdAt",
           ROW_NUMBER() OVER (
               PARTITION BY "householdId"
               ORDER BY "createdAt" ASC, "id" ASC
           ) AS owner_rank
    FROM "User"
    WHERE "householdId" IS NOT NULL
) AS ranked;

ALTER TABLE "HouseholdMembership"
    ADD CONSTRAINT "HouseholdMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HouseholdMembership"
    ADD CONSTRAINT "HouseholdMembership_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdInvitation"
    ADD CONSTRAINT "HouseholdInvitation_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdInvitation"
    ADD CONSTRAINT "HouseholdInvitation_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HouseholdInvitation"
    ADD CONSTRAINT "HouseholdInvitation_acceptedByUserId_fkey"
    FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
