import { archiveRoute } from "@/lib/routes";

const route = archiveRoute("projects", "Projects");

export const metadata = route.metadata;
export default route.Page;
