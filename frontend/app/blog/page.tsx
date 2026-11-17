import { archiveRoute } from "@/lib/routes";

const route = archiveRoute("posts", "Blog");

export const metadata = route.metadata;
export default route.Page;
