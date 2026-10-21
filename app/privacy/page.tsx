export default function PrivacyPage() {
  return (
    <main className="container-wide py-8 sm:py-12 lg:py-16">
      <div className="max-w-3xl rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
        <p className="eyebrow">Quyền riêng tư</p>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Cam kết bảo mật ảnh thử đồ</h1>
        <ul className="mt-6 space-y-3 text-sm leading-6 text-ink/75">
          <li>• Ảnh bạn chọn chỉ dùng để tạo kết quả thử đồ bằng AI và không lưu vào cơ sở dữ liệu của chúng tôi.</li>
          <li>• Dữ liệu ảnh được xử lý tạm thời trong bộ nhớ và tự động xóa sau tối đa 5 phút.</li>
          <li>• Ảnh chỉ được gửi đến dịch vụ AI để tạo kết quả thử đồ; không chia sẻ cho mục đích quảng cáo.</li>
          <li>• Bạn có thể dừng quá trình bất kỳ lúc nào trong màn xử lý.</li>
        </ul>
      </div>
    </main>
  );
}
