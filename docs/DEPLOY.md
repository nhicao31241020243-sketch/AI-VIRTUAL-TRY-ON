# Deploy lên Vercel

## 1) Push lên GitHub

```bash
git remote -v                       # kiểm tra remote
git push -u origin phase-3
```

Nếu chưa có remote: tạo repo trống trên GitHub rồi `git remote add origin <URL>`.

## 2) Import vào Vercel

1. Vào https://vercel.com/new và chọn repo vừa push.
2. Framework: Next.js (tự nhận diện). Giữ nguyên lệnh build mặc định.
3. Dùng Preview Deployment cho nhánh `phase-3`, hoặc merge vào nhánh production khi đã ổn.

## 3) Điền biến môi trường (Project Settings → Environment Variables)

| Biến | Giá trị |
| --- | --- |
| `TRYON_PROVIDER` | `gemini` hoặc `huggingface` |
| `GEMINI_API_KEY` | Khóa API từ [Google AI Studio](https://aistudio.google.com/apikey), chỉ cấu hình ở server khi dùng Gemini |
| `HF_TOKEN` | Token Hugging Face, chỉ cấu hình ở server khi dùng Hugging Face |
| `SUPABASE_URL` | URL của project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key, chỉ server-side; không dùng `NEXT_PUBLIC_` |
| `ADMIN_METRICS_PASSWORD` | Mật khẩu admin dài ít nhất 12 ký tự, chỉ server-side |
| `TRYON_RATE_LIMIT_ENABLED` | `true` |

Không dùng tiền tố `NEXT_PUBLIC_` cho khóa API. Redeploy sau khi thay đổi biến môi trường.
Provider Hugging Face hiện kết nối Space [yisol/IDM-VTON](https://huggingface.co/spaces/yisol/IDM-VTON) qua `/tryon`; thời gian và khả năng xử lý phụ thuộc trạng thái Space, hàng chờ và quota GPU.

Chạy migration `supabase/migrations/20261026010000_tryon_feedback_metrics.sql` trong Supabase SQL Editor trước khi dùng API feedback hoặc `/admin/metrics`. Dashboard được bảo vệ bằng mật khẩu server-side; metrics và feedback chỉ lưu metadata, không lưu ảnh.

## 4) Test preview trên điện thoại

1. Mở URL Preview (`*.vercel.app`) trên điện thoại.
2. Mở sản phẩm → "Thử đồ bằng AI" → chọn người mẫu hoặc tải ảnh → tick đồng ý → "Bắt đầu thử đồ AI".
3. Chờ Gemini tạo ảnh; kiểm tra slider Trước/Sau, Lưu ảnh, Thử lại, Thử món khác.
4. Kiểm tra `/products`, `/cart`, `/privacy`.

## Giới hạn cần biết

- `app/api/tryon/route.ts` đặt `maxDuration = 60` và gọi Gemini đồng bộ. Gói **Hobby** có giới hạn thời gian chạy hàm serverless riêng
  (kiểm tra mức hiện hành trên tài liệu Vercel).
- Rate limit in-memory **không bền** trên serverless; để chống spam thực sự hãy thay bằng Upstash Redis / Vercel KV qua
  interface `RateLimiter` trong `lib/rate-limit.ts`.
- Ảnh người tối đa 4MB; request được nén ở trình duyệt về chiều dài cạnh tối đa 1024px.
