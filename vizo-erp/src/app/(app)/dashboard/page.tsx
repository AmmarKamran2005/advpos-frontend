import { DashboardForRole } from "@/components/portals/dashboard-for-role";

/**
 * Every role now opens on its own dashboard (see DashboardForRole). This page
 * is just the mount point — the heavy per-role screens live under
 * components/portals and only the one matching the signed-in role loads.
 */
export default function DashboardPage() {
  return <DashboardForRole />;
}
