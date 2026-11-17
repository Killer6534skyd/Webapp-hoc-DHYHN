# Changelog

Tất cả những thay đổi đáng chú ý của dự án **Hệ Thống Ôn Tập Y Khoa Đa Học Phần ĐHYHN (Y1–Y6)** sẽ được ghi nhận tại đây.

## [v2.2.0] - 2026-11-17

### ✨ Tính năng mới (Added)
- **Hỗ trợ PWA & Học Offline (`manifest.json` + `sw.js`):**
  - Cho phép cài đặt trực tiếp lên màn hình chính điện thoại/máy tính bảng (Add to Home Screen) và mở ở chế độ toàn màn hình (`standalone`).
  - Tự động lưu đệm (cache) tài nguyên ứng dụng và ngân hàng câu hỏi bằng Service Worker (`stale-while-revalidate`), giúp mở web nhanh và ôn tập ngay cả khi mất kết nối mạng.
- **Tối ưu hiển thị khi chia sẻ liên kết (Open Graph & Twitter Card):**
  - Bổ sung đầy đủ thẻ `<meta>` với nội dung mô tả `"Ôn tập các Module YHN - By CrptedP"` và biểu tượng y khoa, giúp hiển thị thẻ preview đẹp mắt khi chia sẻ qua Zalo, Messenger, Facebook, Discord.
- **Hệ thống Phím tắt toàn diện (Keyboard Shortcuts) & Bảng tra cứu nhanh (`?`):**
  - **Chế độ Ôn tập:** `1–4` hoặc `A–D` chọn đáp án câu đang xem; `J`/`K` hoặc `→`/`←` chuyển câu tiếp/trước; `H` bật/tắt gợi ý lâm sàng; `E` bật/tắt giải thích; `B` đánh dấu ⭐ câu hỏi; `/` nhảy nhanh vào ô tìm kiếm.
  - **Chế độ Thi thử Tính giờ:** `1–4` hoặc `A–D` chọn phương án; `→`/`Enter` và `←` chuyển câu; `F` đặt cờ 🚩 xem lại; `H` xem gợi ý; `P` tạm dừng/tiếp tục đồng hồ thi.
  - **Chế độ Flashcard 3D:** `Space` lật thẻ; `←`/`→` chuyển thẻ; `1`/`2`/`3` đánh giá Khó/Vừa/Dễ; `H` xem gợi ý; `R` trộn ngẫu nhiên bộ thẻ.
  - **Toàn cục:** `Alt + 1..7` chuyển nhanh giữa 7 tab; `M` mở Cổng chọn 16 Học phần (Y1–Y6); `?` mở bảng hướng dẫn phím tắt; `Esc` đóng hộp thoại đang mở.
- **Nạp học phần linh hoạt (On-demand Course Loader):**
  - Bổ sung `COURSE_SCRIPT_MANIFEST` và hàm `ensureCourseScriptLoaded()` trong `data/courses-bootstrap.js` để hỗ trợ nạp động từng học phần khi cần mở rộng thêm nhiều module mới.

### 🔄 Thay đổi & Cải tiến (Changed)
- **Chuẩn hóa tên file khi xuất dữ liệu học tập (Export JSON):**
  - Loại bỏ tên file cố định `ho_so_on_tap_truyen_nhiem_full.json` / `phien_hoc_truyen_nhiem_...`.
  - Tự động đặt tên file theo định dạng **tên người dùng không dấu + thời gian (`giờ-ngày-tháng`)**, ví dụ: `sinh-vien-y-khoa-dhyhn-10h25-17-11.json`.
- **Biểu tượng trang web (Favicon):**
  - Thêm `favicon.svg` chủ đề chữ thập y khoa đồng bộ màu giao diện Emerald/Teal.
- **Nâng cấp phiên bản:**
  - Đồng bộ số hiệu phiên bản lên **2.2.0** trên toàn bộ giao diện, `package.json` và 16 học phần.

---

## [v2.1.1] - 2026-11-17

- Tách và chuẩn hóa từ file đơn lẻ `2.1.1.html` thành cấu trúc thư mục mô-đun (`index.html`, `styles/`, `data/courses/`, `js/`, `scripts/`).
- Tích hợp 16 học phần (Y2 & Y5) với tổng cộng 2.627 câu hỏi và tình huống lâm sàng chuẩn ĐHYHN.
- Thiết lập GitHub Actions tự động kiểm tra (`npm run check`) và triển khai lên GitHub Pages & Vercel.
