/**
 * Configuration and types that CLIENT COMPONENTS are allowed to import.
 *
 * `@/data/settings.ts` is 767 lines of seed data with a handful of genuine
 * config constants scattered through it. A client component that reaches in
 * for one of those constants ships the whole file to the browser — AGENTS.md
 * rule 5, "keep data modules out of client components once the API exists".
 *
 * What is left here is shape, not business data: the role keys the JWT can
 * carry. The four delivery channels and their carriers used to live here too;
 * they are rows in "DeliveryChannel" / "Courier" and every screen now reads
 * them from the API (GET /dispatch/lookups, and the channel name on each
 * order), so a channel or courier changed in the database shows everywhere.
 * `@/data/settings` and `@/data/mock` are deleted (E3, 27 Sep).
 */

/* ─────────────────────────────── Roles ─────────────────────────────── */

/**
 * The staff roles. Mirrors "Role".RoleKey in the database.
 *
 * warehouse-keeper (role id 9) was removed from the system: the owner's
 * instruction was that there is no need for a separate warehouse role or
 * panel, since the order desk already does the physical stock work in this
 * chain (see OrderWorkflow.cs). "Warehouse" survives as a LOCATION -- stock
 * still sits there and a transfer can still move it -- just not as a job
 * title anybody signs in as. See backend/database/24_remove_warehouse_role.sql.
 */
export type RoleKey =
  | "super-admin"
  | "accountant"
  | "order-dept"
  | "sales";
