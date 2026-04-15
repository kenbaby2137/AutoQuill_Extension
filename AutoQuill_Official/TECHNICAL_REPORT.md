# AutoQuill - Technical Architecture & Problem Analysis Report
**Version:** 5.0 (Stable)  
**Author:** Antigravity AI  
**Context:** Automation for GPM Anti-detect Profiles (Chromium-based) on X.com (Twitter).

---

## 1. Tổng quan Kiến trúc (Architecture)
Hệ thống được chuyển đổi từ việc điều khiển trình duyệt qua **CDP (Chrome DevTools Protocol)** sang **OS-Level Messaging** để giải quyết triệt để lỗi Crash/Segmentation Fault trên các bản build tùy chỉnh của GPM.

- **Frontend:** Chrome Extension (Manifest V3) chịu trách nhiệm quản lý UI (Popup), chọn Persona và gửi yêu cầu gõ.
- **Backend:** FastAPI Server (Python) đóng vai trò "Driver" điều khiển hệ điều hành.
- **Cơ chế Automation:** Sử dụng Win32 API (`PostMessage`) để bơm tín hiệu `WM_CHAR` trực tiếp vào handle của tiến trình `Chrome_RenderWidgetHostHWND`.

---

## 2. Các vấn đề kỹ thuật đã xử lý (Problem Solving)

### 2.1 Lỗi Crash trình duyệt (Browser Crashes)
**Nguyên nhân:** GPM-Browser có các cơ chế chống debug và tùy chỉnh nhân Chromium khiến việc đính kèm (attach) Debugger qua extension gây xung đột bộ nhớ nặng (Segmentation Fault).
**Giải pháp:** Bỏ hoàn toàn CDP. Chuyển sang dùng `PostMessage` mức hệ điều hành. Cơ chế này trình duyệt coi là "Trusted Input" và cực kỳ ổn định.

### 2.2 Lỗi Nuốt chữ đầu (Character Swallowing)
**Nguyên nhân:** Khi cửa sổ trình duyệt nằm ở dưới nền (Background), tiến trình Renderer thường chuyển sang chế độ "Ngủ" (Suspended) để tiết kiệm CPU. Những phím đầu tiên gửi đến bị rơi vào hàng đợi trống và bị trình duyệt bỏ qua.
**Giải pháp:** 
- Thực hiện `SetForegroundWindow` cưỡng bức trước khi gõ.
- Thêm độ trễ (Delay) 1.0 giây sau khi cửa sổ lên đầu để Renderer nạp xong buffer.

### 2.3 Vướng mắc về Đa luồng & Gõ ngầm (Background/Parallel Typing)
**Thử thách:** Windows và Chrome có cơ chế **Occlusion Tracking**. Nếu một cửa sổ bị che khuất hoàn toàn, nó sẽ ngừng render và ngừng nhận event queue.
**Kết quả thực nghiệm:** Việc gõ song song 10-20 profile đồng thời gõ ngầm (Background) dẫn đến tỷ lệ lỗi cao (mất chữ, phím bị dừng khi user click chuột ra ngoài).
**Trạng thái hiện tại:** Hệ thống được cấu hình về chế độ **Single-Task Foreground** để đảm bảo độ tin cậy 100% cho các tài khoản quan trọng.

---

## 3. Hệ thống Persona & Humanization
Dữ liệu Persona là **Stateless** (Không trạng thái) đối với Server:
1. Extension lưu trữ cấu hình (WPM, Typos, Pauses) trong `lib/personas.js`.
2. Khi bắt đầu gõ, Extension đóng gói Persona thành JSON và gửi sang Server.
3. Server sử dụng thuật toán **Gaussian Distribution** để tạo ra độ trễ giữa các phím không đồng nhất, mô phỏng sinh học nhịp gõ của con người.
4. Tỷ lệ gõ sai (Typo Engine) dựa trên bản đồ các phím lân cận (`NEARBY_KEYS`) để mô phỏng việc gõ nhầm các phím cạnh nhau trên bàn phím QWERTY.

---

## 4. Giao diện Quản trị (Admin Dashboard)
- Hỗ trợ quản lý hàng trăm Profile qua Database SQLite.
- Cơ chế **Multi-Phrase Block**: Cho phép chia nhỏ nội dung gõ thành nhiều khối câu (`[N]`).
- Hỗ trợ **Bulk Import**: Định dạng `ProfileName|Phrase1|Phrase2...` giúp nạp dữ liệu quy mô lớn trong vài giây.

---

## 5. Hướng phát triển cho Chuyên gia tương lai
Nếu muốn đạt đến cảnh giới **Gõ ngầm đa luồng (True Background Parallel)**, chuyên gia kế nhiệm cần nghiên cứu:
1. **Direct Buffer Injection:** Nghiên cứu sâu vào bộ nhớ của tiến trình GPU trình duyệt để đẩy text vào buffer thay vì dùng Win32 Message.
2. **Handle Focus Signals:** Tìm cách giả lập hoàn hảo tín hiệu `WM_SETFOCUS` và `WM_ACTIVATE` mà không làm gián đoạn UI thread của người dùng.
3. **Efficiency Mode Bypass:** Giải quyết việc Windows tự động đưa trình duyệt chạy ngầm vào chế độ "Efficiency Mode" (Eco-mode).

---
*Báo cáo này được lập nhằm mục đích lưu trữ và bàn giao kỹ thuật.*
