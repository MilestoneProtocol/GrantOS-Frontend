type BuilderProfilePageProps = {
  params: Promise<{ address: string }>;
};

export default async function BuilderProfilePage({ params }: BuilderProfilePageProps) {
  const { address } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Builder Profile</h1>
        <p className="mt-2 text-sm text-slate-500">Profile route is scaffolded for dashboard navigation.</p>
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">{address}</p>
      </div>
    </main>
  );
}

