-- AlterTable: 成长值（累计，只增不减，用于等级体系）
ALTER TABLE "t_user" ADD COLUMN "growth" INTEGER NOT NULL DEFAULT 0;
