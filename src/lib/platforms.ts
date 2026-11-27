import type { Platform, WatchOption } from "@/lib/types";

/** Tên, màu nhận diện và thứ tự hiển thị. CGV là đặt vé, còn lại là xem trực tuyến. */
export const PLATFORMS: Record<Platform, { name: string; color: string; order: number }> = {
  cgv: { name: "CGV Cinemas", color: "#C8102E", order: 0 },
  vieon: { name: "VieON", color: "#0B5C2E", order: 1 },
  fptplay: { name: "FPT Play", color: "#C2410C", order: 2 },
  galaxyplay: { name: "Galaxy Play", color: "#4C1D95", order: 3 },
  netflix: { name: "Netflix", color: "#B20710", order: 4 },
  other: { name: "Nền tảng khác", color: "#5A5650", order: 5 },
};

export const TYPES = { subscription: "Thuê bao", rent: "Thuê lẻ", buy: "Mua", free: "Miễn phí" } as const;

export const sortOptions = (o: WatchOption[]) =>
  [...o].sort((a, b) => PLATFORMS[a.platform].order - PLATFORMS[b.platform].order);

export const optionAction = (o: WatchOption) => (o.platform === "cgv" ? "Đặt vé" : "Xem");

export const optionDetail = (o: WatchOption) =>
  o.platform === "cgv" ? "Phim rạp" : [o.type && TYPES[o.type], o.quality, o.label].filter(Boolean).join(" · ");
