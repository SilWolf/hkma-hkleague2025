import Link from "next/link";

export default function NotFound() {
  return (
    <section className="">
      <div className="container mx-auto text-center py-20 space-y-8">
        <img
          src="/images/logo.png"
          className="w-48 mx-auto"
          alt="HK-League 2024"
        />
        <h2 className="text-4xl">找不到頁面</h2>
        <p>
          <Link href="/">找回主頁</Link>
        </p>
      </div>
    </section>
  );
}