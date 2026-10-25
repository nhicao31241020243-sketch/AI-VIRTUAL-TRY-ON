export default function PrivacyPage() {
  return (
    <main className="container-wide py-8 sm:py-12 lg:py-16">
      <div className="max-w-3xl rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
        <p className="eyebrow">Quyền riêng tư</p>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Cam kết bảo mật ảnh thử đồ</h1>
        <ul className="mt-6 space-y-3 text-sm leading-6 text-ink/75">
          <li>• Ảnh bạn chọn chỉ dùng để tạo kết quả thử đồ bằng AI và không lưu vào cơ sở dữ liệu của chúng tôi.</li>
          <li>• Ảnh được gửi đến provider AI đang cấu hình: <a className="underline" href="https://ai.google.dev/gemini-api/terms">Gemini API</a> hoặc <a className="underline" href="https://huggingface.co/spaces/yisol/IDM-VTON">Hugging Face IDM-VTON</a>.</li>
          <li>• Metrics và đánh giá chỉ lưu mã sản phẩm, màu sắc, provider, thời lượng xử lý, trạng thái và lý do đánh giá; không lưu ảnh.</li>
          <li>• Ứng dụng không dùng ảnh hoặc đánh giá cho mục đích quảng cáo.</li>
          <li>• Bạn có thể dừng quá trình bất kỳ lúc nào trong màn xử lý.</li>
        </ul>
      </div>
    </main>
  );
}
