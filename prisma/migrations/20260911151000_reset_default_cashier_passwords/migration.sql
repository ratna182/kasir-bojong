-- Restore access for the documented default cashier accounts.
UPDATE "users"
SET
  "password_hash" = '$2b$08$C5rOoaC7i5SLBcWfvpRi7.mhFejeTBVxzztDhGQ5hqs.tVTY6FGhW',
  "is_active" = true
WHERE "username" IN ('kasir1', 'kasir2', 'kasir3')
  AND "role" = 'KASIR'::"RoleUser";
