import { getSession } from "@/lib/auth/session";
import { NavHeader } from "@/components/nav-header";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <>
      <NavHeader username={session.username} />
      <main className="flex-1">{children}</main>
    </>
  );
}
