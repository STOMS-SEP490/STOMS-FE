# DANH SÁCH TẤT CẢ API ENDPOINTS ĐANG SỬ DỤNG TRONG STOMS-FE

## 1. AUTHENTICATION & AUTHORIZATION

### Auth API (`/auth`)
- `POST /auth/login` - Đăng nhập
- `POST /auth/refresh` - Làm mới token
- `POST /auth/logout` - Đăng xuất
- `PUT /auth/reset-password` - Admin reset mật khẩu user
- `POST /auth/forgot-password/request-otp` - Yêu cầu OTP quên mật khẩu
- `POST /auth/forgot-password/otp-verifications` - Xác thực OTP
- `POST /auth/forgot-password/completions` - Hoàn tất đặt lại mật khẩu

## 2. USER MANAGEMENT

### Users API (`/users`)
- `GET /users/filter` - Lấy danh sách users (có phân trang & filter)
- `GET /users/{id}` - Lấy thông tin user theo ID
- `PUT /users/{userId}/activate` - Kích hoạt user
- `PUT /users/{userId}/deactivate` - Vô hiệu hóa user
- `PUT /users/assign-role` - Gán role cho nhiều user
- `PUT /users/{id}/change-password` - Admin đổi mật khẩu user
- `PUT /users/change-password` - User tự đổi mật khẩu
- `POST /users` - Tạo user mới
- `POST /users/bulk` - Tạo nhiều user cùng lúc

### Roles API (`/roles`)
- `GET /roles/filter` - Lấy danh sách roles (có phân trang & filter)
- `GET /roles/{id}` - Lấy thông tin role theo ID
- `POST /roles` - Tạo role mới
- `PUT /roles/{id}` - Cập nhật role
- `DELETE /roles/{id}` - Xóa role

## 3. MEMBER MANAGEMENT

### Members API (`/members`)
- `GET /members/filter` - Lấy danh sách members (có phân trang & filter)
- `GET /members/{id}` - Lấy thông tin member theo ID
- `PUT /members/{memberId}/role` - Gán role cho member
- `PUT /members/{memberId}/avatar` - Upload avatar cho member
- `PUT /members/{memberId}` - Cập nhật thông tin member (admin)
- `PUT /members` - Member tự cập nhật thông tin (multipart/form-data)
- `POST /members` - Tạo member mới

### Member Skills API (`/member-skills`)
- `GET /member-skills/filter` - Lấy danh sách skills của member
- `POST /member-skills/bulk` - Gán nhiều skills cho member
- `DELETE /member-skills/{memberId}/{skillId}` - Gỡ skill khỏi member
- `PUT /member-skills/member/{memberId}/skills/deactivate` - Vô hiệu hóa nhiều skills
- `PUT /member-skills/member/{memberId}/skills/activate` - Kích hoạt nhiều skills

## 4. TEAM MANAGEMENT

### Teams API (`/teams`)
- `GET /teams/filter` - Lấy danh sách teams (có phân trang & filter)
- `GET /teams/{id}` - Lấy thông tin team theo ID
- `GET /teams/my-team` - Lấy thông tin team của user hiện tại
- `GET /teams/member/{memberId}` - Lấy team theo member ID (deprecated)
- `POST /teams` - Tạo team mới
- `PUT /teams/{id}` - Cập nhật team
- `DELETE /teams/{id}` - Xóa team
- `PUT /teams/{teamId}/leader` - Gán trưởng nhóm

### Team Members API (`/team-members`)
- `POST /team-members` - Thêm members vào team
- `DELETE /team-members` - Xóa members khỏi team

### Team Topics API (`/team-topics`)
- `POST /team-topics/bulk` - Gán nhiều topics cho team
- `DELETE /team-topics/team/{teamId}/topics` - Gỡ nhiều topics khỏi team
- `PUT /team-topics/team/{teamId}/topics/activate` - Kích hoạt nhiều topics
- `PUT /team-topics/team/{teamId}/topics/deactivate` - Vô hiệu hóa nhiều topics

### Team Sessions API (`/team-sessions`)
- `POST /team-sessions/bulk` - Gán nhiều teams cho session
- `PUT /team-sessions/bulk` - Thay thế teams cho session

## 5. SKILLS & TOPICS

### Skills API (`/skills`)
- `GET /skills/filter` - Lấy danh sách skills (có phân trang & filter)
- `GET /skills/{id}` - Lấy thông tin skill theo ID
- `POST /skills` - Tạo skill mới
- `PUT /skills/{id}` - Cập nhật skill
- `PUT /skills/{id}/activate` - Kích hoạt skill
- `PUT /skills/{id}/deactivate` - Vô hiệu hóa skill
- `DELETE /skills/{id}` - Xóa skill

### Topics API (`/topics`)
- `GET /topics/filter` - Lấy danh sách topics (có phân trang & filter)
- `GET /topics/{id}` - Lấy thông tin topic theo ID
- `POST /topics` - Tạo topic mới
- `PUT /topics/{id}` - Cập nhật topic
- `PUT /topics/{id}/activate` - Kích hoạt topic
- `PUT /topics/{id}/deactivate` - Vô hiệu hóa topic
- `DELETE /topics/{id}` - Xóa topic

## 6. COURSES & SUBJECTS

### Courses API (`/courses`)
- `GET /courses/filter` - Lấy danh sách courses (có phân trang & filter)
- `GET /courses/{id}` - Lấy thông tin course theo ID
- `POST /courses` - Tạo course mới
- `PUT /courses/{id}` - Cập nhật course
- `PUT /courses/{id}/activate` - Kích hoạt course
- `PUT /courses/{id}/deactivate` - Vô hiệu hóa course
- `DELETE /courses/{id}` - Xóa course

### Course Subjects API (`/course-subjects`)
- `POST /course-subjects/bulk` - Gán nhiều subjects cho course
- `DELETE /course-subjects/course/{courseId}/subjects` - Gỡ nhiều subjects khỏi course
- `PUT /course-subjects/course/{courseId}/subjects/activate` - Kích hoạt nhiều subjects
- `PUT /course-subjects/course/{courseId}/subjects/deactivate` - Vô hiệu hóa nhiều subjects

### Subjects API (`/subjects`)
- `GET /subjects/filter` - Lấy danh sách subjects (có phân trang & filter)
- `GET /subjects/{id}` - Lấy thông tin subject theo ID
- `POST /subjects` - Tạo subject mới
- `PUT /subjects/{id}` - Cập nhật subject
- `PUT /subjects/{id}/activate` - Kích hoạt subject
- `PUT /subjects/{id}/deactivate` - Vô hiệu hóa subject
- `DELETE /subjects/{id}` - Xóa subject
- `PUT /subjects/{id}/topic` - Gán topic cho subject

### Subject Skills API (`/subject-skills`)
- `GET /subject-skills/filter` - Lấy danh sách skills của subject
- `POST /subject-skills/bulk` - Gán nhiều skills cho subject
- `DELETE /subject-skills/subject/{subjectId}/skills` - Gỡ nhiều skills khỏi subject
- `PUT /subject-skills/subject/{subjectId}/skill/{skillId}/deactivate` - Vô hiệu hóa skill
- `PUT /subject-skills/subject/{subjectId}/skill/{skillId}/activate` - Kích hoạt skill
- `PUT /subject-skills/subject/{subjectId}/skills/deactivate` - Vô hiệu hóa nhiều skills
- `PUT /subject-skills/subject/{subjectId}/skills/activate` - Kích hoạt nhiều skills

### Subject Sessions API (`/subject-sessions`)
- `GET /api/subject-sessions/filter` - Lấy danh sách subject sessions (có phân trang & filter)

## 7. EVENTS

### Events API (`/events`)
- `GET /events/filter` - Lấy danh sách events (có phân trang & filter)
- `GET /events/{id}` - Lấy thông tin event theo ID
- `POST /events` - Tạo event mới
- `PUT /events/{id}` - Cập nhật event
- `PUT /events/{id}/activate` - Kích hoạt event
- `PUT /events/{id}/deactivate` - Vô hiệu hóa event
- `DELETE /events/{id}` - Xóa event

### Event Sessions API (`/event-sessions`)
- `POST /event-sessions` - Tạo event session mới
- `PUT /event-sessions/{id}` - Cập nhật event session
- `DELETE /event-sessions/{id}` - Xóa event session

### Event Session Skills API (`/event-session-skills`)
- `POST /event-session-skills` - Gán skill cho event session
- `DELETE /event-session-skills/{eventSessionId}` - Gỡ skill khỏi event session
- `POST /event-session-skills/event-session/{eventSessionId}/skills/bulk` - Gán nhiều skills
- `PUT /event-session-skills/event-session/{eventSessionId}/skills/activate` - Kích hoạt nhiều skills
- `PUT /event-session-skills/event-session/{eventSessionId}/skills/deactivate` - Vô hiệu hóa nhiều skills
- `PATCH /event-session-skills/event-session/{eventSessionId}/skill/{skillId}/reactivate` - Kích hoạt lại skill

### Event Session Topics API (`/event-session-topics`)
- `POST /event-session-topics` - Gán topic cho event session
- `DELETE /event-session-topics/{eventSessionId}` - Gỡ topic khỏi event session
- `POST /event-session-topics/event-session/{eventSessionId}/topics/bulk` - Gán nhiều topics
- `PUT /event-session-topics/event-session/{eventSessionId}/topics/activate` - Kích hoạt nhiều topics
- `PUT /event-session-topics/event-session/{eventSessionId}/topics/deactivate` - Vô hiệu hóa nhiều topics
- `PATCH /event-session-topics/event-session/{eventSessionId}/topic/{topicId}/reactivate` - Kích hoạt lại topic

## 8. REQUESTS & SESSIONS

### Requests API (`/requests`)
- `GET /requests/filter` - Lấy danh sách requests (có phân trang & filter)
- `GET /requests/{id}` - Lấy thông tin request theo ID
- `POST /requests` - Tạo request mới
- `PUT /requests/{id}` - Cập nhật request
- `PUT /requests/{id}/approve` - Duyệt request
- `PUT /requests/{id}/reject` - Từ chối request
- `PUT /requests/{id}/cancel` - Hủy request
- `DELETE /requests/{id}` - Xóa request

### Sessions API (`/sessions`)
- `GET /sessions/filter` - Lấy danh sách sessions (có phân trang & filter)
- `GET /sessions/{id}` - Lấy thông tin session theo ID
- `GET /sessions/{sessionId}/team-suggestions` - Gợi ý teams cho session
- `PUT /sessions/cancel` - Hủy sessions

### Assignments API (`/assignments`)
- `GET /assignments/{id}` - Lấy thông tin assignment theo ID
- `GET /assignments/{assignmentId}/suggest-staff` - Gợi ý nhân viên cho assignment
- `PUT /assignments/approve` - Duyệt assignments
- `PUT /assignments/assign-members` - Gán members cho assignments
- `PUT /assignments/reject` - Từ chối assignment
- `PUT /assignments/busy` - Giáo viên báo bận

### Attachments API (`/attachments`)
- `POST /attachments/requests/{requestId}` - Upload attachments cho request
- `POST /attachments` - Tạo attachment mới
- `GET /attachments/requests/{requestId}` - Lấy attachments của request

## 9. ATTENDANCE

### Attendances API (`/attendances`)
- `GET /attendances/filter` - Lấy danh sách attendances (có phân trang & filter)
- `POST /attendances/delegations` - Ủy quyền điểm danh
- `POST /attendances/checkin` - Check-in (batch hoặc với images)
- `POST /attendances/checkout` - Check-out (batch hoặc với images)
- `POST /attendances/{attendanceId}/reset` - Reset attendance

## 10. CONTRACTS

### Contracts API (`/contracts`)
- `GET /contracts/filter` - Lấy danh sách contracts (có phân trang & filter)
- `GET /contracts/{id}` - Lấy thông tin contract theo ID
- `POST /contracts` - Tạo contract mới
- `PUT /contracts/{id}` - Cập nhật contract
- `PUT /contracts/{id}/mark-paid` - Đánh dấu đã thanh toán

## 11. EQUIPMENT MANAGEMENT

### Equipment API (`/equipment`)
- `GET /equipment/filter` - Lấy danh sách equipment (có phân trang & filter)
- `GET /equipment/{id}` - Lấy thông tin equipment theo ID
- `POST /equipment` - Tạo equipment mới (multipart/form-data)
- `PUT /equipment/{id}/info` - Cập nhật thông tin equipment (multipart/form-data)
- `PUT /equipment/{id}/status` - Cập nhật trạng thái equipment

### Borrowings API (`/borrowings`)
- `GET /borrowings/filter` - Lấy danh sách borrowings (có phân trang & filter)
- `GET /borrowings/{id}` - Lấy thông tin borrowing theo ID
- `POST /borrowings` - Tạo borrowing mới

### Equipment Borrowings API (`/equipment-borrowings`)
- `PUT /equipment-borrowings/{borrowingId}/handover` - Cập nhật bàn giao thiết bị

### Reservations API (`/reservations`)
- `GET /reservations/availability` - Kiểm tra thiết bị khả dụng
- `GET /reservations/filter` - Lấy danh sách reservations (có phân trang & filter)
- `GET /reservations/{id}` - Lấy thông tin reservation theo ID
- `POST /reservations` - Tạo reservation mới
- `PUT /reservations/{id}` - Cập nhật reservation
- `DELETE /reservations/{id}` - Xóa reservation
- `PUT /reservations/{reservationId}/equipments/status` - Duyệt thiết bị trong reservation

### Categories API (`/categories`)
- `GET /categories/filter` - Lấy danh sách categories (có phân trang & filter)
- `GET /categories/{id}` - Lấy thông tin category theo ID
- `POST /categories` - Tạo category mới
- `PUT /categories/{id}` - Cập nhật category
- `DELETE /categories/{id}` - Xóa category

## 12. FINANCIAL MANAGEMENT

### Wallets API (`/wallets`)
- `GET /wallets/filter` - Lấy danh sách wallets (có phân trang & filter)
- `GET /wallets/{id}` - Lấy thông tin wallet theo ID
- `POST /wallets` - Tạo wallet mới

### Transactions API (`/transactions`)
- `GET /transactions/filter` - Lấy danh sách transactions (có phân trang & filter)
- `GET /transactions/{id}` - Lấy thông tin transaction theo ID
- `POST /transactions` - Tạo transaction mới
- `PUT /transactions/{id}` - Cập nhật transaction
- `DELETE /transactions/{id}` - Xóa transaction

### Contributions API (`/contributions`)
- `GET /contributions/filter` - Lấy danh sách contributions (có phân trang & filter)
- `GET /contributions/{id}` - Lấy thông tin contribution theo ID
- `POST /wallets/{walletId}/contributions` - Nộp tiền vào wallet (multipart/form-data)

### Expenses API (`/expenses`)
- `GET /expenses/filter` - Lấy danh sách expenses (có phân trang & filter)
- `GET /expenses/{id}` - Lấy thông tin expense theo ID
- `POST /expenses` - Tạo expense mới (multipart/form-data)
- `PUT /expenses/{expenseId}` - Cập nhật expense (multipart/form-data)
- `PUT /expenses/approve` - Duyệt expenses
- `PUT /expenses/reject` - Từ chối expense
- `DELETE /expenses/{id}` - Xóa expense

## 13. TASK REPORTS

### Task Reports API (`/task-reports`)
- `GET /task-reports/filter` - Lấy danh sách task reports (có phân trang & filter)
- `GET /task-reports/{id}` - Lấy thông tin task report theo ID
- `POST /task-reports` - Tạo task report mới (multipart/form-data)
- `PUT /task-reports/{id}` - Cập nhật task report
- `DELETE /task-reports/{id}` - Xóa task report

## 14. NOTIFICATIONS

### Notifications API (`/notifications`)
- `GET /notifications/filter` - Lấy danh sách notifications (có phân trang & filter)
- `PUT /notifications/{id}/read` - Đánh dấu notification đã đọc
- `PUT /notifications/read-all` - Đánh dấu tất cả notifications đã đọc
- `POST /notifications/session-cannot-be-assigned` - Team leader báo buổi không thể phân công

## 15. AUDIT LOGS

### Audit Logs API (`/audit-logs`)
- `GET /audit-logs/filter` - Lấy danh sách audit logs (có phân trang & filter)

## 16. DASHBOARD & STATISTICS

### Dashboard API (`/dashboard`)

#### Users Statistics
- `GET /dashboard/users/statistics` - Tổng quan users
- `GET /dashboard/users/{memberId}/workload` - Khối lượng công việc của user
- `GET /dashboard/users/{memberId}/teaching-history` - Lịch sử giảng dạy
- `GET /dashboard/users/{memberId}/attendance-history` - Lịch sử điểm danh

#### Events Statistics
- `GET /dashboard/events/summary` - Tổng quan events
- `GET /dashboard/events/status-distribution` - Phân bố trạng thái events
- `GET /dashboard/events/session-statistics` - Thống kê sessions của events
- `GET /dashboard/events/upcoming` - Events sắp diễn ra

#### Requests & Sessions Statistics
- `GET /dashboard/request/summary` - Tổng quan requests
- `GET /dashboard/sessions/summary` - Tổng quan sessions

#### Wallets Statistics
- `GET /dashboard/wallet/summary` - Tổng quan wallets
- `GET /dashboard/wallet/metrics` - Chỉ số wallets
- `GET /dashboard/wallet/top-contributors` - Top người đóng góp

#### Skills Statistics
- `GET /dashboard/skills/statistics` - Thống kê skills

#### Equipment Statistics
- `GET /dashboard/equipments/statistics` - Thống kê thiết bị
- `GET /dashboard/equipments/category-distribution` - Phân bố theo danh mục

#### Topics & Teams Statistics
- `GET /dashboard/team-topics/distribution` - Phân bố topics theo teams
- `GET /dashboard/teams/statistics` - Thống kê teams

#### Courses & Subjects Statistics
- `GET /dashboard/courses/summary` - Tổng quan courses
- `GET /dashboard/courses/popular` - Courses phổ biến
- `GET /dashboard/subjects/topic-distribution` - Phân bố topics theo subjects
- `GET /dashboard/subjects/session-statistics` - Thống kê sessions của subjects

#### Contracts Statistics
- `GET /dashboard/contracts/summary` - Tổng quan contracts
- `GET /dashboard/contracts/value-statistics` - Thống kê giá trị contracts
- `GET /dashboard/members/{memberId}/contracts-statistics` - Thống kê contracts của member

#### Export
- `POST /dashboard/export` - Export dashboard data (trả về file Excel)

---

## TỔNG KẾT

**Tổng số API endpoints: 200+**

### Phân loại theo HTTP Method:
- **GET**: ~100 endpoints (filter, getById, statistics)
- **POST**: ~40 endpoints (create, bulk operations)
- **PUT**: ~45 endpoints (update, activate, deactivate, approve, reject)
- **DELETE**: ~15 endpoints (remove, soft delete)
- **PATCH**: ~2 endpoints (reactivate)

### Đặc điểm chung:
1. Hầu hết các module đều có CRUD đầy đủ
2. Hỗ trợ phân trang và filter cho danh sách
3. Nhiều endpoint hỗ trợ bulk operations
4. Có hệ thống activate/deactivate thay vì hard delete
5. Upload file sử dụng multipart/form-data
6. Dashboard có nhiều endpoint thống kê chi tiết

### Base URL:
- Tất cả API đều sử dụng base URL từ `import.meta.env.VITE_API_BASE_URL`
- Prefix `/api` được thêm tự động bởi axios client (trừ một số trường hợp đặc biệt)
