BEGIN;

ALTER TABLE "Household" ADD COLUMN "addressId" INTEGER;

-- Preserve the address links previously encoded in the household primary key.
UPDATE "Household" AS household
SET "addressId" = household."id"
FROM "Address" AS address
WHERE address."id" = household."id";

ALTER TABLE "Household" DROP CONSTRAINT "Household_id_fkey";
ALTER TABLE "Household"
    ADD CONSTRAINT "Household_addressId_fkey"
    FOREIGN KEY ("addressId") REFERENCES "Address"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
