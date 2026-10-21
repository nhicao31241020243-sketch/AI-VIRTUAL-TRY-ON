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
- `NEXT_PUBLIC_DEMO_MODE`:
  - `false` (mặc định): gọi Replicate thật.
  - `true`: chạy demo nội bộ, không gọi Replicate, trả ảnh mẫu sau ~3 giây.

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
   - `NEXT_PUBLIC_DEMO_MODE`
4. Deploy.

## 6) Quyền riêng tư

- Ảnh chỉ xử lý tạm thời trong bộ nhớ và tự xóa sau 5 phút.
- Không lưu ảnh người dùng vào disk/database.
- Ảnh chỉ gửi tới dịch vụ AI để tạo kết quả thử đồ.

## 7) Lưu ý giấy phép mô hình

Mô hình IDM-VTON trên Replicate hiện có ghi chú **chỉ dùng phi thương mại**.
Nếu triển khai thương mại, cần kiểm tra lại license hoặc thay bằng model có giấy phép phù hợp.
