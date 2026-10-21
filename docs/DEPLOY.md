# Deploy lên Vercel

Mặc định deploy ở **DEMO MODE** để không tốn tiền API.

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

| Biến | Giá trị khi deploy demo |
| --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | `true` |
| `TRYON_RATE_LIMIT_ENABLED` | `true` |
| `REPLICATE_TRYON_MODEL` | `cuuupid/idm-vton` (có thể để trống) |
| `REPLICATE_API_TOKEN` | để trống ở demo |

`NEXT_PUBLIC_*` được nhúng lúc build, nên **phải Redeploy** sau khi đổi `NEXT_PUBLIC_DEMO_MODE`.
Server cũng tự dùng demo khi không có `REPLICATE_API_TOKEN`.

## 4) Test preview trên điện thoại

1. Mở URL Preview (`*.vercel.app`) trên điện thoại.
2. Mở sản phẩm → "Thử đồ bằng AI" → chọn người mẫu hoặc tải ảnh → tick đồng ý → "Bắt đầu thử đồ AI".
3. Sau khoảng 3 giây phải thấy kết quả; kiểm tra slider Trước/Sau, Lưu ảnh, Thử lại, Thử món khác.
4. Kiểm tra `/products`, `/cart`, `/privacy`.

## 5) Chuyển sang model thật (tốn phí)

Điền `REPLICATE_API_TOKEN`, đặt `NEXT_PUBLIC_DEMO_MODE=false`, rồi Redeploy. IDM-VTON chỉ dùng phi thương mại.

## Giới hạn cần biết

- `app/api/tryon/route.ts` đặt `maxDuration = 60`. Gói **Hobby** có giới hạn thời gian chạy hàm serverless riêng
  (kiểm tra mức hiện hành trên tài liệu Vercel). Route chỉ tạo prediction và được client polling nên mỗi request rất ngắn.
- Rate limit in-memory **không bền** trên serverless; để chống spam thực sự hãy thay bằng Upstash Redis / Vercel KV qua
  interface `RateLimiter` trong `lib/rate-limit.ts`.
- Body request tối đa 4MB; Vercel giới hạn body của function khoảng 4.5MB.
