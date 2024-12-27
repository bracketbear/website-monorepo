import Image from "next/image";

export default function Home() {
  const thisYear = new Date().getFullYear();

  return (
    <div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-[family-name:var(--font-geist-sans)] sm:p-20">
      <header className="row-start-1 flex items-center justify-center gap-6">
        <Image src="/logo.svg" alt="Logo" width={48} height={48} />
        <h1 className="text-2xl font-bold">Bracket Bear</h1>
      </header>
      <main className="row-start-2 flex flex-col  items-center gap-8 sm:items-start ">
        <div>Home Page</div>
      </main>
      <footer className="row-start-3 flex flex-wrap items-center justify-center gap-6 bg-gray-900 p-4 font-bold text-white">
        Copyright &copy;2022-{thisYear} Harrison Callahan. All rights reserved.
      </footer>
    </div>
  );
}
