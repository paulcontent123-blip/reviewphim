"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap text-center">
      <h1 className="font-display text-2xl font-bold">Có lỗi xảy ra</h1>
      <button type="button" className="btn-gold mt-4" onClick={reset}>
        Thử lại
      </button>
    </div>
  );
}
