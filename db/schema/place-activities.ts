import { index, integer, pgTable, primaryKey, smallint } from "drizzle-orm/pg-core";
import { activities } from "./activities";
import { places } from "./places";

// Activities of each site (HU-14): derived by ingest or chosen by the community.
// The composite key prevents duplicates per site.
export const placeActivities = pgTable(
  "place_activities",
  {
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    // Restrict: removing an activity in use must be a deliberate migration, not a side effect.
    activityId: smallint("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.placeId, t.activityId] }),
    // The key leads with place_id; the "Actividad" filter looks sites up by activity (HU-19).
    index("place_activities_activity_id_idx").on(t.activityId),
  ],
).enableRLS();
