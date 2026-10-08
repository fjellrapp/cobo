-- Contract migration: membership rows are now the sole source of household membership.
ALTER TABLE "User" DROP CONSTRAINT "User_householdId_fkey";
ALTER TABLE "User" DROP COLUMN "householdId";
