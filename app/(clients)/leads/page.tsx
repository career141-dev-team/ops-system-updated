import ClientsPage from "@/app/(clients)/clients/page";

/**
 * /leads route — renders the unified CL · Clients directory filtered to Leads
 * (or whichever filter is passed in searchParams) so all existing links and
 * redirects to /leads work with the exact Figma layout inside PageBox.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; filter?: string }>;
}) {
  const params = await searchParams;
  return (
    <ClientsPage
      searchParams={Promise.resolve({
        ...params,
        filter: params.filter ?? "leads",
      })}
    />
  );
}
