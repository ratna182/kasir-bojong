-- Restore the documented cashier accounts without touching existing data.
INSERT INTO "warungs" ("id", "nama", "kode")
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Seafood & Nasi Uduk Vian Jaya 08 - Cabang 1', 'VJ08-1'),
  ('10000000-0000-4000-8000-000000000002', 'Seafood & Nasi Uduk Vian Jaya 08 - Cabang 2', 'VJ08-2'),
  ('10000000-0000-4000-8000-000000000003', 'Seafood & Nasi Uduk Vian Jaya 08 - Cabang 3', 'VJ08-3')
ON CONFLICT ("kode") DO NOTHING;

INSERT INTO "users" ("id", "warung_id", "username", "password_hash", "nama_lengkap", "role", "is_active")
SELECT v."id", w."id", v."username", '$2b$08$C5rOoaC7i5SLBcWfvpRi7.mhFejeTBVxzztDhGQ5hqs.tVTY6FGhW', v."nama_lengkap", 'KASIR'::"RoleUser", true
FROM (VALUES
  ('20000000-0000-4000-8000-000000000001', 'kasir1', 'Kasir Cabang 1', 'VJ08-1'),
  ('20000000-0000-4000-8000-000000000002', 'kasir2', 'Kasir Cabang 2', 'VJ08-2'),
  ('20000000-0000-4000-8000-000000000003', 'kasir3', 'Kasir Cabang 3', 'VJ08-3')
) AS v("id", "username", "nama_lengkap", "kode")
JOIN "warungs" w ON w."kode" = v."kode"
ON CONFLICT ("username") DO NOTHING;
