import type { NextPage } from "next";
import { PeppersGhostPageContent } from "../../_components/peppers-ghost-page-content";

interface PageParams {
  params: Promise<{ id: string }>;
}

const Page: NextPage<PageParams> = async ({ params }: PageParams) => {
  const { id } = await params;
  return (
    <>
      <PeppersGhostPageContent controlId={id} />
    </>
  );
};

export default Page;
