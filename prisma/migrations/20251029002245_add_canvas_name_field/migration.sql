/*
  Warnings:

  - You are about to drop the column `displayImage` on the `Canvas` table. All the data in the column will be lost.
  - You are about to drop the column `reducedImage` on the `Canvas` table. All the data in the column will be lost.
  - Added the required column `name` to the `Canvas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Canvas" DROP COLUMN "displayImage",
DROP COLUMN "reducedImage",
ADD COLUMN     "name" TEXT NOT NULL;
