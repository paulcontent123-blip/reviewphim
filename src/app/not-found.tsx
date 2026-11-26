import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap text-center">
      <h1 className="font-display text-2xl font-bold">Không tìm thấy trang</h1>
      <Link href="/" className="btn-gold mt-4">
        Về trang chủ
      </Link>
    </div>
  );
}
