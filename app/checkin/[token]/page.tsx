import CheckinClient from "@/components/CheckinClient";

type CheckinPageProps = {
  params: Promise<{ token: string }>;
};

export default async function CheckinPage({ params }: CheckinPageProps) {
  const { token } = await params;
  return <CheckinClient token={token} />;
}
