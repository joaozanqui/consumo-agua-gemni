-- CreateTable
CREATE TABLE "Image" (
    "measure_uuid" SERIAL NOT NULL,
    "image" TEXT NOT NULL,
    "customer_code" TEXT NOT NULL,
    "measure_value" TEXT NOT NULL,
    "measure_datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "measure_type" TEXT NOT NULL,
    "has_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_value" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("measure_uuid")
);
