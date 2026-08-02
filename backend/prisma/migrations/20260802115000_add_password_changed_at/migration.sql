-- Historical schema drift repair: this field existed in schema.prisma and local
-- databases created with db push, but was missing from the migration history.
ALTER TABLE "t_user" ADD COLUMN "passwordChangedAt" DATETIME;
