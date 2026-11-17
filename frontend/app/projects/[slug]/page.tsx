import { singleRoute } from "@/lib/routes";

// Custom post type "project" (rest_base: projects). Copy this folder for other CPTs.
const route = singleRoute("projects");

export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;
