/** Dùng details để nội dung vẫn nằm trong HTML cho công cụ tìm kiếm, nhưng ẩn với người đọc. */
export function Spoiler({ children }: { children: React.ReactNode }) {
  return (
    <details className="card p-4">
      <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-crimson">
        Bài viết tiết lộ nội dung phim. Bấm để đọc tiếp.
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
