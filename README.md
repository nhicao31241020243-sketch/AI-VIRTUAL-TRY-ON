# Áo Ảo Thật - AI Virtual Try-On

## Dashboard phân tích sản phẩm & phản hồi

Nút **Dashboard** luôn hiển thị cố định góc dưới bên trái; nếu chưa đăng nhập, bấm nút sẽ được chuyển tới `/admin/login`. Dùng `ADMIN_METRICS_PASSWORD` để truy cập `/admin/metrics`. Có 👍/👎, lý do, nhận xét và dashboard traffic, clicks, thời gian, funnel, feedback, chất lượng dữ liệu, retention.

Thiết lập `ANALYTICS_SECRET` ngẫu nhiên ít nhất 32 ký tự. Không có Supabase thì chỉ môi trường phát triển dùng dữ liệu cục bộ trong `.data/analytics`; production yêu cầu Supabase và migration mới. Xem [thiết lập, phân quyền, định nghĩa chỉ số và kiểm tra](docs/ANALYTICS.md).

Ứng dụng thử đồ bằng AI xây dựng với Next.js 15 (App Router), TypeScript và Tailwind CSS.
Khách chọn sản phẩm, tải ảnh toàn thân hoặc chọn người mẫu, AI ghép trang phục, xem kết quả Trước/Sau rồi thêm vào giỏ.

## 1) Cài đặt

Yêu cầu Node.js 18.18+ (khuyến nghị 20+).

```bash
npm install
copy .env.example .env.local   # macOS/Linux: cp .env.example .env.local
```

## 2) Biến môi trường

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `TRYON_PROVIDER` | `gemini` | Provider thử đồ: `gemini` hoặc `huggingface`. |
| `GEMINI_API_KEY` | trống | API key Gemini, chỉ dùng ở server (`app/api/tryon`). Lấy tại [Google AI Studio](https://aistudio.google.com/apikey). |
| `HF_TOKEN` | trống | Hugging Face token, chỉ dùng ở server khi `TRYON_PROVIDER=huggingface`. |
| `SUPABASE_URL` | trống | URL project Supabase, chỉ dùng ở server để lưu metrics và feedback. |
| `SUPABASE_SERVICE_ROLE_KEY` | trống | Service-role key Supabase, chỉ dùng ở server; tuyệt đối không thêm tiền tố `NEXT_PUBLIC_`. |
| `ADMIN_METRICS_PASSWORD` | trống | Mật khẩu `/admin/metrics`, tối thiểu 12 ký tự; chỉ dùng ở server. |
| `TRYON_RATE_LIMIT_ENABLED` | `true` | Giới hạn 5 lượt/IP/giờ. `false` để tắt (chỉ khi phát triển). |

`.env.local` đã nằm trong `.gitignore`; không commit file `.env*` ngoài `.env.example`.

## 3) Cấu hình provider thử đồ

Đặt `TRYON_PROVIDER=gemini` và điền `GEMINI_API_KEY`, hoặc đặt `TRYON_PROVIDER=huggingface` và điền `HF_TOKEN` trong `.env.local`, sau đó khởi động:

```bash
npm run dev
```

Hugging Face dùng Space [yisol/IDM-VTON](https://huggingface.co/spaces/yisol/IDM-VTON) qua endpoint `/tryon`. Lượt dùng GPU phụ thuộc hàng chờ và quota Hugging Face; provider trả lỗi tiếng Việt nếu Space quá tải hoặc quota đã hết. IDM-VTON có điều khoản sử dụng riêng, hãy kiểm tra giấy phép trước khi dùng thương mại.

Các trang: `/` (sản phẩm), `/products`, `/cart`, `/privacy`, `/metrics` (ẩn khỏi menu). Gemini API có thể phát sinh chi phí; Hugging Face phụ thuộc quota GPU.

## 4) Metrics quản trị và feedback

1. Điền `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` và `ADMIN_METRICS_PASSWORD` vào `.env.local` hoặc Vercel Environment Variables. Mật khẩu quản trị cần ít nhất 12 ký tự.
2. Chạy migration `supabase/migrations/20261026010000_tryon_feedback_metrics.sql` trong Supabase SQL Editor.
3. Mở `/admin/metrics` và đăng nhập bằng `ADMIN_METRICS_PASSWORD`.

Service-role key và mật khẩu chỉ được đọc trong route server; không dùng biến `NEXT_PUBLIC_*` cho secret. Migration bật Row Level Security, không cấp quyền cho `anon`/`authenticated`, và chỉ cấp quyền cần thiết cho `service_role`. Bản ghi chỉ chứa mã sản phẩm, màu, provider, thời lượng, trạng thái hoặc đánh giá; không nhận hay lưu ảnh.

## 5) Giới hạn và bảo vệ chi phí

- Ảnh người được nén trên trình duyệt (tối đa 1024px); server kiểm tra định dạng JPG/PNG/WebP, chữ ký file và giới hạn 4MB.
- Thời gian xử lý tối đa 60 giây; lỗi/timeout hiển thị thông báo tiếng Việt và cho thử lại mà không cần tải lại ảnh.
- Rate limit theo IP được tách thành interface `RateLimiter` trong `lib/rate-limit.ts`.
  **Bản in-memory không bền trên serverless (Vercel):** mỗi instance có bộ nhớ riêng và bị reset khi cold start, nên giới hạn chỉ mang tính tương đối.
  Khi chạy thật, hãy cài đặt `RateLimiter` dùng Upstash Redis hoặc Vercel KV và trả về trong `createRateLimiter()`.

## 6) Quyền riêng tư

- Ảnh được gửi tới provider AI đang cấu hình (Gemini hoặc Hugging Face IDM-VTON) để tạo kết quả; ứng dụng không lưu ảnh vào cơ sở dữ liệu.
- Nếu dùng Gemini, việc Google xử lý dữ liệu tuân theo [điều khoản Gemini API](https://ai.google.dev/gemini-api/terms); hãy đọc kỹ trước khi gửi ảnh cá nhân.
- Metrics và feedback trong Supabase chỉ chứa metadata thử đồ, không chứa ảnh.
- Trang `/metrics` hiện tại hiển thị số liệu trong sessionStorage của trình duyệt; `/admin/metrics` tổng hợp số liệu đã lưu server-side trong Supabase.

## 8) Build và deploy

```bash
npx tsc --noEmit
npm run build
npm run start
```

Hướng dẫn deploy Vercel từng bước: [docs/DEPLOY.md](docs/DEPLOY.md).
