import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/keystatic');
  return (
    <div className="border-default p-4 m-4">
      <h1 className="text-2xl font-bold text-primary">BracketBear CMS</h1>
      <p className="text-secondary">Welcome to the CMS</p>
    </div>
  );
}
