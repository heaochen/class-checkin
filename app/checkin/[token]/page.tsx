import CheckinClient from "@/components/CheckinClient";

type CheckinPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ debug?: string | string[] }>;
};

export default async function CheckinPage({
  params,
  searchParams,
}: CheckinPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const debugValue = Array.isArray(query.debug) ? query.debug[0] : query.debug;
  return <CheckinClient token={token} debug={debugValue === "1"} />;
}
