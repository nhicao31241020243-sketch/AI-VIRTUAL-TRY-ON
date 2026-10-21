# Áo Ảo Thật - AI Virtual Try-On

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
| `REPLICATE_API_TOKEN` | trống | API token Replicate, chỉ dùng ở server (`app/api/tryon`). Trống => tự chạy demo mode. |
| `REPLICATE_TRYON_MODEL` | `cuuupid/idm-vton` | Model Replicate, dạng `owner/model` hoặc `owner/model:<version-sha-64-ký-tự>`. |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | `true`: không gọi Replicate, trả ảnh mẫu sau ~3 giây. |
| `TRYON_RATE_LIMIT_ENABLED` | `true` | Giới hạn 5 lượt/IP/giờ. `false` để tắt (chỉ khi phát triển). |

`.env.local` đã nằm trong `.gitignore`; không commit file `.env*` ngoài `.env.example`.

## 3) Chạy demo mode (không tốn tiền API)

Đặt `NEXT_PUBLIC_DEMO_MODE=true` hoặc để trống `REPLICATE_API_TOKEN`, rồi:

```bash
npm run dev
```

Các trang: `/` (sản phẩm), `/products`, `/cart`, `/privacy`, `/metrics` (ẩn khỏi menu).

## 4) Chuyển sang model thật

1. Tạo token tại Replicate và điền `REPLICATE_API_TOKEN` trong `.env.local`.
2. Đặt `NEXT_PUBLIC_DEMO_MODE=false`.
3. (Tuỳ chọn) đổi `REPLICATE_TRYON_MODEL` sang model khác. Tên các trường input của model nằm ở `lib/tryon-config.ts` (`inputFields`); hãy chỉnh lại nếu model mới dùng schema khác.
4. Khởi động lại server (`npm run dev` / deploy lại).

> Lưu ý: gọi model thật tốn phí theo lượt chạy trên Replicate.

## 5) Giới hạn và bảo vệ chi phí

- Ảnh được nén trên trình duyệt (tối đa 1024px, ~1MB/ảnh); server kiểm tra định dạng JPG/PNG/WebP, chữ ký file và dung lượng.
- Thời gian chờ tối đa 90 giây phía client; lỗi/timeout hiển thị thông báo tiếng Việt và cho thử lại mà không cần tải lại ảnh.
- Rate limit theo IP được tách thành interface `RateLimiter` trong `lib/rate-limit.ts`.
  **Bản in-memory không bền trên serverless (Vercel):** mỗi instance có bộ nhớ riêng và bị reset khi cold start, nên giới hạn chỉ mang tính tương đối.
  Khi chạy thật, hãy cài đặt `RateLimiter` dùng Upstash Redis hoặc Vercel KV và trả về trong `createRateLimiter()`.

## 6) Quyền riêng tư

- Ảnh chỉ xử lý tạm thời trong bộ nhớ, tự xóa khỏi trạng thái sau 5 phút; không lưu vào disk/database.
- Ảnh chỉ được gửi tới dịch vụ AI để tạo kết quả. Chỉ số trang `/metrics` chỉ lưu số liệu trong `sessionStorage`, không lưu ảnh.

## 7) Giấy phép mô hình

**IDM-VTON chỉ được dùng cho mục đích phi thương mại.** Nếu triển khai thương mại, hãy kiểm tra lại giấy phép
hoặc đổi sang model có giấy phép phù hợp bằng `REPLICATE_TRYON_MODEL` (và chỉnh `inputFields` nếu cần).

## 8) Build và deploy

```bash
npx tsc --noEmit
npm run build
npm run start
```

Hướng dẫn deploy Vercel từng bước: [docs/DEPLOY.md](docs/DEPLOY.md).
