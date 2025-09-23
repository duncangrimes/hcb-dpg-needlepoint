/*
  Warnings:

  - Added the required column `numColors` to the `Canvas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Canvas" ADD COLUMN     "numColors" INTEGER NOT NULL;
