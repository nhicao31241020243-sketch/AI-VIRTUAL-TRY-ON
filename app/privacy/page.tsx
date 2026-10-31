export default function PrivacyPage() {
  return (
    <main className="container-wide py-8 sm:py-12 lg:py-16">
      <div className="max-w-3xl rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
        <p className="eyebrow">Quyền riêng tư</p>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Cam kết bảo mật ảnh thử đồ</h1>
        <ul className="mt-6 space-y-3 text-sm leading-6 text-ink/75">
          <li>• Ảnh bạn chọn chỉ dùng để tạo kết quả thử đồ bằng AI và không lưu vào cơ sở dữ liệu của chúng tôi.</li>
          <li>• Ảnh được gửi đến provider AI đang cấu hình: <a className="underline" href="https://ai.google.dev/gemini-api/terms">Gemini API</a> hoặc <a className="underline" href="https://huggingface.co/spaces/yisol/IDM-VTON">Hugging Face IDM-VTON</a>.</li>
          <li>• Metrics thử đồ lưu mã sản phẩm, màu sắc, provider, thời lượng và trạng thái; không lưu ảnh.</li>
          <li>• Phân tích hành vi dùng cookie mã ngẫu nhiên tối đa 90 ngày, phiên 30 phút: ghi trang (không có tham số URL), nhóm nguồn truy cập, loại thiết bị, nhấp vào thành phần đã chọn, độ sâu cuộn, thời gian tab hoạt động và các bước thử đồ/giỏ hàng. Không lưu IP, toàn bộ User-Agent, nội dung biểu mẫu hay ảnh vào analytics.</li>
          <li>• Bạn có thể tắt theo dõi hành vi ở cuối trang. Ứng dụng tôn trọng tín hiệu Do Not Track / Global Privacy Control. Phản hồi bạn chủ động gửi vẫn được lưu, gắn với mã cookie để cập nhật thay vì ghi trùng.</li>
          <li>• Phản hồi gồm 👍/👎, lý do và nhận xét tùy chọn tối đa 500 ký tự. Đừng nhập thông tin cá nhân; chỉ người có quyền quản trị phân tích xem được nhận xét. Lịch sử các phiên bản nhận xét không được lưu.</li>
          <li>• Dashboard tổng hợp tối đa 90 ngày gần nhất. Dữ liệu Supabase được xóa theo tác vụ dọn dẹp do quản trị viên cấu hình; môi trường phát triển dọn dữ liệu cục bộ khi ghi. Các tín hiệu chỉ mang tính ước tính, không đo chính xác mức độ tập trung.</li>
          <li>• Ứng dụng không dùng ảnh hoặc đánh giá cho mục đích quảng cáo.</li>
          <li>• Bạn có thể dừng quá trình bất kỳ lúc nào trong màn xử lý.</li>
        </ul>
      </div>
    </main>
  );
}
