# Áo Ảo Thật - AI Virtual Try-On

Ứng dụng demo thử đồ bằng AI với Next.js App Router + TypeScript + Tailwind.

## 1) Cài đặt

```bash
npm install
```

## 2) Cấu hình môi trường

Tạo file `.env.local` từ mẫu:

```bash
copy .env.example .env.local
```

Thiết lập:

- `REPLICATE_API_TOKEN`: API key từ Replicate.
- `REPLICATE_TRYON_MODEL`: model Replicate dạng `chu-so-huu/ten-model`; có thể kèm version SHA 64 ký tự sau dấu `:`. Mặc định là `cuuupid/idm-vton`.
- `NEXT_PUBLIC_DEMO_MODE`:
  - `false` (mặc định): gọi Replicate nếu đã cấu hình token.
  - `true`: chạy demo nội bộ, không gọi Replicate, trả ảnh mẫu sau ~3 giây.
  - Khi chưa có `REPLICATE_API_TOKEN`, ứng dụng tự chuyển sang demo.
- `TRYON_RATE_LIMIT_ENABLED`: bật giới hạn 5 lượt/IP mỗi giờ (mặc định `true`); chỉ tắt khi phát triển thử nghiệm.

Ảnh người và ảnh sản phẩm được nén phía trình duyệt tối đa 1024px và 1MB mỗi ảnh. Thời gian chờ tối đa cho một lượt thử là 90 giây.

## 3) Chạy local

```bash
npm run dev
```

Mở:

- `http://localhost:3000` — trang sản phẩm chính
- `http://localhost:3000/products` — danh sách sản phẩm
- `http://localhost:3000/cart` — giỏ hàng
- `http://localhost:3000/privacy` — quyền riêng tư
- `http://localhost:3000/metrics` — chỉ số phiên (ẩn menu)

## 4) Build production

```bash
npx tsc --noEmit
npm run build
npm run start
```

## 5) Triển khai Vercel

1. Push code lên GitHub.
2. Import repo vào Vercel.
3. Khai báo biến môi trường trong Project Settings:
   - `REPLICATE_API_TOKEN`
   - `REPLICATE_TRYON_MODEL`
   - `NEXT_PUBLIC_DEMO_MODE`
   - `TRYON_RATE_LIMIT_ENABLED`
4. Deploy.

## 6) Quyền riêng tư

- Ảnh chỉ xử lý tạm thời trong bộ nhớ và tự xóa sau 5 phút.
- Không lưu ảnh người dùng vào disk/database.
- Ảnh chỉ gửi tới dịch vụ AI để tạo kết quả thử đồ.

## 7) Lưu ý giấy phép mô hình

Mô hình IDM-VTON trên Replicate hiện có ghi chú **chỉ dùng phi thương mại**.
Nếu triển khai thương mại, cần kiểm tra lại license hoặc thay bằng model có giấy phép phù hợp.
