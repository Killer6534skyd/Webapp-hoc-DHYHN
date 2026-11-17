# Hệ Thống Ôn Tập Y Khoa Đa Học Phần ĐHYHN (Y1–Y6)

Project này được tách và chuẩn hóa từ file đơn lẻ `2.1.1.html` (~7.5 MB) thành cấu trúc thư mục mô-đun để dễ quản lý, chỉnh sửa câu hỏi từng môn, kiểm tra lỗi tự động và triển khai lên GitHub Pages.

## Cấu trúc thư mục

```text
webapp-hoc-dhyhn/
├── index.html                        # Khung HTML chính & nạp CSS/JS
├── package.json                      # Các lệnh chạy dev, kiểm tra & đóng gói
├── .gitignore                        # Bỏ qua dist/, node_modules/, file tạm
├── .github/
│   └── workflows/
│       └── deploy-pages.yml          # Tự động kiểm tra & xuất bản lên GitHub Pages
├── styles/
│   └── main.css                      # CSS tùy chỉnh (ngoài Tailwind CDN)
├── data/
│   ├── courses-init.js               # Khởi tạo COURSE_BANKS_DATA
│   ├── courses-bootstrap.js          # Nạp khóa học tự tạo từ localStorage & hydrate dữ liệu
│   └── courses/                      # 16 file dữ liệu riêng biệt (đã format dễ đọc & dễ diff)
│       ├── s22_ntmd.js
│       ├── s310_truyen_nhiem.js
│       ├── s37_s38_ung_thu.js
│       └── ... (13 học phần khác)
├── js/
│   ├── state.js                      # State toàn cục, localStorage, modal, chuyển tab, quy tắc chấm điểm
│   ├── study.js                      # Chế độ Ôn tập & Giải đáp, lọc, tìm kiếm, bookmark
│   ├── exam.js                       # Chế độ Thi thử tính giờ, bảng câu hỏi, chấm điểm
│   ├── flashcard.js                  # Chế độ Flashcard 3D
│   ├── analytics.js                  # Tổng kết Session, xuất/nhập JSON, hồ sơ & cố vấn học tập
│   ├── profiles-cloud.js             # Đa profile, đồng bộ Google/Microsoft & Apps Script
│   ├── question-manager.js           # Quản lý/biên soạn câu hỏi, media, case thân chung, lịch sử sửa
│   ├── annotations.js                # Bôi đậm (highlight) & ghi chú (comment) trực tiếp trên văn bản
│   ├── course-hub.js                 # Quản lý danh sách học phần, đổi môn, tạo môn mới, prompt AI
│   └── init.js                       # Khởi chạy ứng dụng khi tải trang (DOMContentLoaded)
└── scripts/
    ├── validate-project.js           # Kiểm tra cú pháp JS & tính toàn vẹn 16 học phần (2.627 câu)
    └── build-single-html.py          # Đóng gói lại thành 1 file HTML duy nhất trong dist/
```

## Các lệnh thường dùng

- **Chạy thử trên máy (Local Dev Server):**
  ```bash
  npm start
  # hoặc: python3 -m http.server 8080
  ```
  Sau đó mở trình duyệt tại `http://localhost:8080`.

- **Kiểm tra lỗi cú pháp & dữ liệu toàn bộ 16 học phần:**
  ```bash
  npm run check
  ```

- **Đóng gói lại thành 1 file HTML duy nhất (để gửi offline hoặc lưu Google Drive):**
  ```bash
  npm run build:single
  ```
  File đầu ra sẽ nằm tại `dist/webapp-dhyhn-bundle.html`.

## Cách thêm hoặc sửa học phần

- **Sửa câu hỏi của một môn:** Mở đúng file trong `data/courses/<ma_mon>.js` (đã được format đẹp từng dòng thay vì 1 dòng nén dài). Sau khi sửa xong, chạy `npm run check` để đảm bảo không bị lỗi dấu phẩy/ngoặc.
- **Thêm môn học mới:**
  1. Tạo file `data/courses/<ma_mon_moi>.js` theo cấu trúc `COURSE_BANKS_DATA['<ma_mon_moi>'] = { ... };`.
  2. Thêm thẻ `<script src="data/courses/<ma_mon_moi>.js"></script>` vào `index.html` (trước `data/courses-bootstrap.js`).
  3. Chạy `npm run check` để xác thực.
