-- AlterTable
ALTER TABLE "public"."Canvas" ADD COLUMN     "reducedImage" TEXT,
ALTER COLUMN "displayImage" DROP NOT NULL,
ALTER COLUMN "manufacturerImage" DROP NOT NULL;
