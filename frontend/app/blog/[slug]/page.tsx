import { singleRoute } from "@/lib/routes";

const route = singleRoute("posts");

export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;
