"use client";

import { useEffect, useState, type FormEvent } from "react";
import { browserClient } from "@/lib/supabase/browser";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email hoặc mật khẩu không đúng.",
  email_not_confirmed: "Bạn cần xác nhận email trước khi đăng nhập.",
  weak_password: "Mật khẩu quá yếu.",
  over_email_send_rate_limit: "Gửi email quá nhiều lần, hãy thử lại sau.",
};

type Db = NonNullable<ReturnType<typeof browserClient>>;

export function LoginForm({ next }: { next: string }) {
  const [signUp, setSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  // false trong HTML từ máy chủ: JavaScript chưa chạy thì trình duyệt sẽ tự gửi form, lộ mật khẩu.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const run = async (task: (db: Db, callback: string) => Promise<void>) => {
    setError(undefined);
    setNotice(undefined);
    const db = browserClient();
    if (!db) {
      setError("Chưa nối Supabase nên chưa đăng nhập được.");
      return;
    }
    setBusy(true);
    try {
      await task(db, `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`);
    } catch (e) {
      setError(MESSAGES[(e as { code?: string }).code ?? ""] ?? "Không thực hiện được, vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const google = () =>
    run(async (db, redirectTo) => {
      const { error } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) throw error;
    });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    void run(async (db, emailRedirectTo) => {
      if (!signUp) {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.assign(next);
        return;
      }
      const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo } });
      if (error) throw error;
      if (data.session) location.assign(next);
      else setNotice("Hãy mở email để xác nhận tài khoản.");
    });
  };

  return (
    <div className="card mx-auto max-w-md p-5 sm:p-8">
      <h1 className="font-display text-2xl font-bold">{signUp ? "Tạo tài khoản" : "Đăng nhập"}</h1>
      <button type="button" disabled={busy} className="btn-ghost mt-5 w-full" onClick={google}>
        Tiếp tục với Google
      </button>
      <p className="my-4 text-center text-xs text-fg3">hoặc dùng email</p>
      {/* method="post" phòng khi form vẫn bị gửi: dữ liệu không nằm trên địa chỉ. */}
      <form method="post" className="space-y-3" onSubmit={submit}>
        <label className="block text-sm font-semibold">
          Email
          <input name="email" type="email" required autoComplete="email" className="field mt-1" />
        </label>
        <label className="block text-sm font-semibold">
          Mật khẩu (từ 8 ký tự)
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={signUp ? "new-password" : "current-password"}
            className="field mt-1"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-crimson">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-[#1f6e36]">
            {notice}
          </p>
        )}
        <button type="submit" disabled={busy || !ready} className="btn-gold w-full">
          {signUp ? "Đăng ký" : "Đăng nhập"}
        </button>
      </form>
      <button type="button" className="mt-4 min-h-[44px] w-full text-sm text-blue underline" onClick={() => setSignUp(!signUp)}>
        {signUp ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}
      </button>
    </div>
  );
}
