import Image from "next/image";

export default function Home() {
  const thisYear = new Date().getFullYear();
  
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="row-start-1 flex gap-6 items-center justify-center">
        <Image src="/logo.svg" alt="Logo" width={48} height={48} />
        <h1 className="text-2xl font-bold">Bracket Bear</h1>
      </header>
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div>
          Home Page
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center bg-red-950">
        Copyright &copy;2022-{thisYear} Harrison Callahan. All rights reserved.
      </footer>
    </div>
  );
}
