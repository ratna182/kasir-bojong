type ActivityDb = {
  activityLog?: {
    create: (args: { data: { userId: string; warungId: string | null; aktivitas: string; detail: string | null } }) => Promise<unknown>
  }
}

export async function recordActivity(
  db: ActivityDb,
  data: { userId: string; warungId?: string | null; aktivitas: string; detail?: string },
) {
  // Allows existing isolated route mocks to exercise the business flow.
  if (!db.activityLog) return null
  return db.activityLog.create({
    data: {
      userId: data.userId,
      warungId: data.warungId ?? null,
      aktivitas: data.aktivitas,
      detail: data.detail ?? null,
    },
  })
}
