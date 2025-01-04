import type { NextPage } from "next";
import { PeppersGhostPageContent } from "../../_components/peppers-ghost-page-content";

type PageParams = { params: { id: string } };

const Page: NextPage<PageParams> = async ({ params }: PageParams) => {
  const controlId = params.id;
  return (
    <>
      <PeppersGhostPageContent controlId={controlId} />
    </>
  );
};

export default Page;
