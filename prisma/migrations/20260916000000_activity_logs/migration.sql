CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "warung_id" TEXT,
  "aktivitas" TEXT NOT NULL,
  "detail" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "activity_logs_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "warungs"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "activity_logs_warung_id_created_at_idx" ON "activity_logs" ("warung_id", "created_at");
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_created_at_idx" ON "activity_logs" ("user_id", "created_at");
