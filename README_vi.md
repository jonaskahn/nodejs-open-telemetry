# Service and Cronjob Demo

[English](./README.md)

> Được tạo bởi Claude AI

Dự án này trình bày một ứng dụng JavaScript với 5 dịch vụ và 2 cronjob sử dụng module CommonJS. Các dịch vụ gọi lẫn nhau
và các cronjob sử dụng các dịch vụ này để thực hiện các tác vụ theo lịch trình. Dự án cũng bao gồm công cụ OpenTelemetry
để theo dõi các lời gọi hàm.

## Cấu trúc dự án

```
├── src/
│   ├── services/           # Module dịch vụ
│   │   ├── userService.js  # Quản lý người dùng
│   │   ├── dataService.js  # Thao tác dữ liệu
│   │   ├── notificationService.js  # Thông báo
│   │   ├── loggingService.js  # Ghi log
│   │   └── authService.js  # Xác thực
│   ├── jobs/               # Module cronjob
│   │   ├── dataBackupJob.js  # Tác vụ sao lưu (với OpenTelemetry)
│   │   └── reportGenerationJob.js  # Tác vụ tạo báo cáo
│   ├── middleware/
│   │   └── telemetry.js    # Cấu hình OpenTelemetry
│   └── index.js            # Điểm vào ứng dụng
├── docker-compose.yml      # Cấu hình Docker cho Jaeger
└── package.json
```

## Các dịch vụ

1. **Dịch vụ Người dùng** - Quản lý các thao tác liên quan đến người dùng
2. **Dịch vụ Dữ liệu** - Xử lý các thao tác dữ liệu và lưu trữ
3. **Dịch vụ Thông báo** - Gửi thông báo cho người dùng
4. **Dịch vụ Ghi log** - Cung cấp chức năng ghi log
5. **Dịch vụ Xác thực** - Xử lý xác thực và ủy quyền

## Cronjob

1. **Tác vụ Sao lưu Dữ liệu** - Chạy hàng ngày lúc 2:00 sáng để tạo bản sao lưu dữ liệu (Được đo lường bằng
   OpenTelemetry)
2. **Tác vụ Tạo Báo cáo** - Chạy vào mỗi thứ Hai lúc 8:00 sáng để tạo báo cáo hàng tuần

## Bắt đầu

### Khởi động Jaeger để Hiển thị Đo lường

Trước khi chạy ứng dụng, hãy khởi động container Jaeger:

```bash
docker-compose up -d
```

Điều này sẽ khởi động Jaeger tại http://localhost:16686

### Cài đặt

```bash
npm install
```

### Chạy ứng dụng

```bash
npm start
```

Sau khi chạy ứng dụng, bạn có thể xem các dấu vết OpenTelemetry trong giao diện Jaeger tại http://localhost:16686.

## Tích hợp OpenTelemetry vào dự án NodeJS của bạn

Phần này cung cấp hướng dẫn để triển khai tracing trong ứng dụng Node.js hiện có của bạn.

### Thiết lập OpenTelemetry

1. **Cài đặt các gói cần thiết**:

   ```bash
   npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions
   ```

2. **Cấu hình OpenTelemetry trong dự án của bạn**:
   - Sử dụng middleware `telemetry.js` làm tham chiếu
   - Khởi tạo SDK với tên dịch vụ và phiên bản của bạn
   - Cấu hình exporter để gửi dấu vết đến backend của bạn (Jaeger, Zipkin, v.v.)

### Chuyển đổi phương thức thông thường thành phương thức có tracing

Để thêm tracing vào các phương thức hiện có, hãy tuân theo các mẫu sau:

#### Tracing phương thức cơ bản

```javascript
// Trước: Phương thức thông thường
function myFunction(param1, param2) {
  // Triển khai hàm
  return result;
}

// Sau: Phương thức với tracing
function myFunction(param1, param2) {
  return telemetry.wrapWithSpan('myFunction', { param1, param2 }, async () => {
    // Triển khai hàm
    return result;
  });
}
```

#### Duy trì ngữ cảnh Trace với các hàm lồng nhau

Để duy trì mối quan hệ cha-con trong traces khi sử dụng các lời gọi hàm lồng nhau:

```javascript
// Hàm cha với tracing
function parentFunction(params) {
  return telemetry.wrapWithSpan('parentFunction', { params }, async () => {
    // Logic chuẩn bị gọi
    const result1 = await _childFunction1();
    const result2 = await _childFunction2(result1);
    return result2;
  });
}

// Hàm con 1 với tracing - duy trì cùng một trace
function _childFunction1() {
  return telemetry.wrapWithSpan('_childFunction1', {}, async () => {
    // Triển khai
    return result;
  });
}

// Hàm con 2 với tracing - duy trì cùng một trace
function _childFunction2(input) {
  return telemetry.wrapWithSpan('_childFunction2', { input }, async () => {
    // Triển khai
    return result;
  });
}
```

### Các Thực hành Tốt nhất cho Tracing phân cấp

1. **Sử dụng Quy ước Đặt tên Nhất quán**:

   - Sử dụng tên span mô tả phản ánh thao tác đang được thực hiện
   - Đặt tiền tố cho các hàm nội bộ/riêng tư bằng dấu gạch dưới (\_) để nhận dạng chúng trong traces

2. **Thêm các Thuộc tính Liên quan vào Spans**:

   - Bao gồm tham số hàm như thuộc tính span để hiểu rõ ngữ cảnh hơn
   - Loại trừ thông tin nhạy cảm như mật khẩu hoặc token
   - Thêm thuộc tính đặc thù cho thao tác (ví dụ: ID người dùng, ID nhiệm vụ)

3. **Xử lý Lỗi trong Spans**:

   ```javascript
   function myFunction(params) {
     return telemetry.wrapWithSpan('myFunction', { params }, async span => {
       try {
         // Triển khai
         return result;
       } catch (error) {
         // Ghi lại lỗi trong span
         span.setStatus({
           code: SpanStatusCode.ERROR,
           message: error.message,
         });
         // Bạn cũng có thể thêm chi tiết lỗi như thuộc tính
         span.setAttribute('error.type', error.name);
         span.setAttribute('error.stack', error.stack);
         throw error; // Ném lại lỗi
       }
     });
   }
   ```

4. **ID Thực thi để Tương quan**:
   - Tạo một ID duy nhất cho mỗi thao tác cấp cao nhất
   - Truyền ID này qua toàn bộ chuỗi gọi
   - Thêm nó như một thuộc tính cho tất cả span để dễ dàng tương quan

### Ví dụ Thực tế: Job với Trace lồng nhau

Xem triển khai trong `src/jobs/reportGenerationJob.js` và `src/jobs/dataBackupJob.js` để có ví dụ đầy đủ về tracing phân
cấp với nhiều cấp độ gọi hàm lồng nhau.

Tệp `notificationService.js` trình bày một dịch vụ phức tạp với 5 cấp độ gọi lồng nhau, tất cả đều được trace chính xác
với OpenTelemetry.

## Đo lường OpenTelemetry

Dự án này trình bày cách sử dụng OpenTelemetry cho các tính năng sau:

1. **Theo dõi lời gọi hàm** - Tác vụ Sao lưu Dữ liệu được đo lường để theo dõi tất cả lời gọi hàm
2. **Thuộc tính span** - Nhiều thuộc tính khác nhau được thêm vào span để cung cấp ngữ cảnh
3. **Theo dõi lỗi** - Lỗi được ghi lại chính xác trong spans

## Cách thức hoạt động

Các dịch vụ được thiết kế để làm việc cùng nhau:

- **Dịch vụ Người dùng** sử dụng Dịch vụ Xác thực để xác minh quyền truy cập của người dùng và Dịch vụ Ghi log để ghi
  lại các thao tác
- **Dịch vụ Dữ liệu** sử dụng Dịch vụ Thông báo để gửi cập nhật và Dịch vụ Ghi log để ghi lại các thao tác
- **Dịch vụ Thông báo** sử dụng Dịch vụ Ghi log để theo dõi thông báo
- **Dịch vụ Xác thực** sử dụng Dịch vụ Ghi log để ghi lại các sự kiện xác thực

Các cronjob trình bày các tác vụ theo lịch trình:

- **Tác vụ Sao lưu Dữ liệu** sử dụng Dịch vụ Dữ liệu để tạo bản sao lưu và Dịch vụ Thông báo để gửi cảnh báo
- **Tác vụ Tạo Báo cáo** sử dụng Dịch vụ Người dùng và Dịch vụ Dữ liệu để thu thập dữ liệu, sau đó Dịch vụ Thông báo để
  gửi báo cáo

## Kiểm thử

Để mục đích kiểm thử, bạn có thể sửa đổi lịch trình cronjob trong các đối tượng cấu hình tương ứng:

- Trong `src/jobs/dataBackupJob.js`, cập nhật giá trị `CONFIG.schedule` để chạy thường xuyên hơn
- Trong `src/jobs/reportGenerationJob.js`, cập nhật giá trị `CONFIG.schedule` để chạy thường xuyên hơn

## Nguyên tắc Thiết kế

Dự án này trình bày:

1. Thiết kế module với exports CommonJS
2. Triển khai dựa trên hàm (không có lớp)
3. Phụ thuộc dịch vụ và gọi giữa các dịch vụ
4. Tác vụ theo lịch trình thông qua cronjobs
5. Đo lường OpenTelemetry để quan sát

### Chuyển đổi Phương thức Lồng nhau hiện có trong khi Duy trì Ngữ cảnh Span

Khi tích hợp OpenTelemetry vào mã hiện có với các lời gọi phương thức lồng nhau sâu, hãy tuân theo các bước sau để duy
trì ngữ cảnh span thích hợp:

#### Trước: Phương thức Lồng nhau Ban đầu

```javascript
// Mã gốc với lời gọi phương thức lồng nhau
function processOrder(order) {
  validateOrder(order);
  const items = prepareItems(order.items);
  const payment = processPayment(order.payment);
  const shipment = arrangeShipping(items, order.address);
  sendConfirmation(order.customer, shipment);
  return { orderId: order.id, status: 'completed' };
}
```

#### Sau: Phương thức Lồng nhau Đã Trace

```javascript
// Hàm chính với tracing
function processOrder(order) {
  const executionId = uuid.v4(); // Tạo ID thực thi duy nhất

  return telemetry.startActiveSpan(
    'processOrder',
    {
      attributes: {
        'order.id': order.id,
        'execution.id': executionId,
      },
    },
    async span => {
      try {
        // Tất cả lời gọi hàm lồng nhau sẽ kế thừa ngữ cảnh span này
        await _validateOrder(order);
        const items = await _prepareItems(order.items);
        const payment = await _processPayment(order.payment);
        const shipment = await _arrangeShipping(items, order.address);
        await _sendConfirmation(order.customer, shipment);

        return { orderId: order.id, status: 'completed' };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      }
    }
  );
}

// Các hàm lồng nhau với span riêng, duy trì ngữ cảnh cha
function _validateOrder(order) {
  return telemetry.startActiveSpan(
    '_validateOrder',
    { attributes: { 'order.id': order.id } },
    async () => {
      // Triển khai
    }
  );
}

function _prepareItems(items) {
  return telemetry.startActiveSpan(
    '_prepareItems',
    { attributes: { 'items.count': items.length } },
    async () => {
      // Triển khai
      return processedItems;
    }
  );
}

// Và tiếp tục cho các phương thức khác...
```

#### Điểm Chính Khi Refactor Mã Hiện có:

1. **Bắt đầu với Hàm Ngoài cùng**:

   - Bắt đầu bằng cách bọc hàm cấp cao nhất với `startActiveSpan`
   - Điều này tạo ra span cha mà tất cả các lời gọi lồng nhau sẽ kế thừa

2. **Chuyển đổi Lời gọi Hàm Trực tiếp thành Phương thức Riêng tư**:

   - Refactor các lời gọi hàm nội tuyến thành các phương thức riêng tư riêng biệt (với tiền tố `_`)
   - Điều này giúp dễ dàng thêm tracing vào từng bước

3. **Sử dụng Truyền Ngữ cảnh Nhất quán**:

   - Đảm bảo mỗi hàm lồng nhau sử dụng `startActiveSpan` thay vì chỉ `wrapWithSpan`
   - Điều này duy trì chính xác mối quan hệ cha-con trong trace

4. **Bảo toàn API Gốc**:

   - Giữ chữ ký hàm gốc khi thêm tracing
   - Điều này đảm bảo tính tương thích ngược với mã hiện có

5. **Xử lý Thao tác Bất đồng bộ**:
   - Chuyển đổi các hàm đồng bộ thành bất đồng bộ (dựa trên Promise) khi thêm tracing
   - Sử dụng async/await để luồng mã rõ ràng hơn

Để xem ví dụ về mã đã chuyển đổi, hãy xem cách chúng tôi đã refactor `reportGenerationJob.js` và triển khai các span
lồng nhau trong `notificationService.js`.

## Ví dụ Từ Dự án Này

### Ví dụ 1: Tác vụ Sao lưu Dữ liệu

Tác vụ sao lưu dữ liệu trình bày cách triển khai tracing trong một tác vụ theo lịch trình với nhiều bước:

#### Chi tiết Triển khai Chính:

```javascript
// Phiên bản đơn giản hóa của triển khai trong src/jobs/dataBackupJob.js

// Hàm cấp cao nhất tạo span cha
function performBackup() {
  const executionId = uuid.v4();

  return telemetry.startActiveSpan(
    'performBackup',
    { attributes: { 'execution.id': executionId } },
    async span => {
      try {
        loggingService.info(`Starting scheduled data backup [execution: ${executionId}]...`);

        // Gọi các hàm lồng nhau tạo span con
        const backupId = await _createBackupData();
        const users = await _notifyAdmins(backupId);

        return { backupId, notifiedUsers: users };
      } catch (error) {
        // Ghi lại lỗi trong span
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        loggingService.error(`Backup failed: ${error.message}`);
        throw error;
      }
    }
  );
}

// Hàm con tạo span riêng như một phần của trace
function _createBackupData() {
  return telemetry.startActiveSpan('_createBackupData', {}, async () => {
    // Chi tiết triển khai
    return backupId;
  });
}

// Một hàm con khác với span riêng
function _notifyAdmins(backupId) {
  return telemetry.startActiveSpan(
    '_notifyAdmins',
    { attributes: { 'backup.id': backupId } },
    async () => {
      // Chi tiết triển khai
      return notifiedUsers;
    }
  );
}
```

### Ví dụ 2: Dịch vụ Thông báo

Dịch vụ thông báo trình bày cách triển khai span lồng nhau sâu (5 cấp độ):

```javascript
// Phiên bản đơn giản hóa từ src/services/notificationService.js

// Cấp 1 - Hàm điểm vào
function sendNotification(userId, message, options = {}) {
  return telemetry.startActiveSpan(
    'sendNotification',
    { attributes: { userId, messageType: options.type || 'standard' } },
    async () => {
      // Cấp 2 - Chuẩn bị nội dung
      const content = await _prepareNotificationContent(userId, message, options);

      // Cấp 3 - Lấy tùy chọn người dùng
      const prefs = await _getUserNotificationPreferences(userId);

      // Cấp 4 - Lấy thông tin thiết bị
      const deviceInfo = await _getUserDeviceInfo(userId, prefs.deviceId);

      // Cấp 5 - Gửi thông báo
      return _deliverNotification(
        userId,
        {
          id: uuid.v4(),
          message: content.formattedMessage,
          // Các thuộc tính khác
        },
        prefs.preferredChannel
      );
    }
  );
}

// Mỗi hàm lồng nhau cũng tạo span riêng
function _prepareNotificationContent(userId, message, options) {
  return telemetry.startActiveSpan(
    '_prepareNotificationContent',
    { attributes: { userId } },
    async () => {
      // Triển khai
      return { formattedMessage: formattedContent };
    }
  );
}

// Và tiếp tục cho các hàm lồng nhau khác...
```

Khi xem trong giao diện Jaeger UI, điều này tạo ra một trace phân cấp đẹp mắt hiển thị:

1. Thao tác gửi thông báo tổng thể
2. Bước chuẩn bị nội dung
3. Tra cứu tùy chọn người dùng
4. Truy xuất thông tin thiết bị
5. Việc gửi thông báo thực tế

Cấu trúc này giúp dễ dàng thấy thời gian được sử dụng ở đâu và xác định các điểm nghẽn.

## Hiển thị và Phân tích Trace trong Jaeger

Sau khi triển khai tracing OpenTelemetry trong ứng dụng Node.js của bạn, bạn có thể sử dụng Jaeger để hiển thị và phân
tích các trace thu thập được.

### Truy cập Giao diện Jaeger

1. Khởi động Jaeger sử dụng Docker:

   ```bash
   docker-compose up -d
   ```

2. Mở giao diện Jaeger trong trình duyệt của bạn:
   ```
   http://localhost:16686
   ```

### Tìm và Phân tích Trace

1. **Chọn Dịch vụ của Bạn**:

   - Trong danh sách thả xuống "Service", chọn tên dịch vụ của bạn (ví dụ: "service-cronjob-demo")

2. **Lọc theo Thao tác**:

   - Sử dụng danh sách thả xuống "Operation" để lọc các thao tác cụ thể (ví dụ: "performBackup", "sendNotification")
   - Bạn cũng có thể tìm kiếm các trace chứa thẻ hoặc thuộc tính cụ thể

3. **Phân tích Phân cấp Trace**:

   - Nhấp vào một trace để xem chế độ xem chi tiết
   - Chế độ xem phân cấp hiển thị mối quan hệ cha-con giữa các span
   - Các span được mã hóa màu dựa trên thời lượng của chúng

4. **Xác định Vấn đề Hiệu suất**:
   - Tìm kiếm các span có thời lượng dài (chúng xuất hiện rộng hơn trong dòng thời gian)
   - Kiểm tra khoảng trống không mong đợi giữa các span
   - Kiểm tra các span có trạng thái lỗi (thường được hiển thị màu đỏ)

### Ví dụ: Phân tích Chuỗi GenerateUsageReport

![Ví dụ Trace Chuỗi Thông báo](./img/img.png)

Hình ảnh này hiển thị:

- Tổng thời gian để gửi thông báo
- Nơi phần lớn thời gian được sử dụng (ví dụ: trong các thao tác cơ sở dữ liệu, gọi API bên ngoài)
- Bất kỳ lỗi nào xảy ra trong quá trình xử lý
- Mối quan hệ cha-con giữa tất cả các thao tác

### Khắc phục sự cố với Trace

1. **Phân tích Lỗi**:

   - Lọc các trace có lỗi để xác định mẫu thất bại
   - Kiểm tra thuộc tính lỗi để hiểu nguyên nhân gốc rễ

2. **Tối ưu hóa Hiệu suất**:

   - Xác định các span chậm nhất trong ứng dụng của bạn
   - Tập trung nỗ lực tối ưu hóa vào các thao tác tốn nhiều thời gian nhất

3. **Hiển thị Đầu-cuối**:
   - Theo dõi một yêu cầu qua nhiều dịch vụ
   - Hiểu luồng hoạt động hoàn chỉnh
