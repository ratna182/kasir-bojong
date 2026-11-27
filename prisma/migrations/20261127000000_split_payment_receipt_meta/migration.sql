-- AlterEnum
ALTER TYPE "MetodePembayaran" ADD VALUE 'SPLIT';

-- AlterTable
ALTER TABLE "transaksis" ADD COLUMN "jumlah_cash" INTEGER,
ADD COLUMN "jumlah_transfer" INTEGER,
ADD COLUMN "uang_diterima" INTEGER,
ADD COLUMN "kembalian" INTEGER;
