import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/keystatic');
  return (
    <div className="border-default m-4 p-4">
      <h1 className="text-primary text-2xl font-bold">BracketBear CMS</h1>
      <p className="text-secondary">Welcome to the CMS</p>
    </div>
  );
}
