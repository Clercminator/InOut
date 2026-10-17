import { sharedPage } from "./shared-page";
declare const __SHARED_TEMPLATE__: string;
export const GET = (request: Request) => sharedPage(request, __SHARED_TEMPLATE__);
export const HEAD = GET;
