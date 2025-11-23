# Upload Queue Implementation Summary

## Features Implemented

### 1. Upload Queue Manager (`src/lib/uploadQueue.ts`)

Advanced upload queue system with:

- **Retry Logic with Exponential Backoff**
  - Configurable retry attempts (default: 3)
  - Initial retry delay: 1 second
  - Max retry delay: 16 seconds
  - Exponential backoff algorithm: `delay = min(initialDelay * 2^retryCount, maxDelay)`

- **Bandwidth Throttling & Auto-Detection**
  - Automatic network speed detection
  - Quality categories: excellent (>5 MB/s), good (>1 MB/s), fair (>512 KB/s), poor
  - Dynamic concurrency adjustment based on network quality
  - Manual concurrency control (1-10 concurrent uploads)

- **Upload Status Tracking**
  - Real-time status: pending, uploading, completed, failed, retrying
  - Progress tracking for each file
  - Duration tracking (start to completion)
  - Detailed error messages

- **Queue Management**
  - Add files to queue
  - Cancel individual uploads
  - Cancel all uploads
  - Retry failed uploads
  - Remove uploads from queue
  - Clear completed uploads
  - Subscribe to queue updates

### 2. Upload Queue Visualization (`src/components/order/UploadQueueVisualization.tsx`)

Visual component displaying:

- **Status Summary**
  - Grid showing: Pending, Uploading, Retrying, Completed, Failed counts
  - Color-coded status badges

- **Network Status**
  - Real-time network quality indicator
  - WiFi icon with quality label
  - Estimated speed display

- **File List**
  - Individual file status with icons
  - Progress bars for active uploads
  - Error messages for failed uploads
  - Retry countdown for retrying uploads
  - File size and duration display

- **Settings Panel**
  - Concurrency slider (1-10)
  - Network statistics
  - Clear completed button
  - Manual retry controls

### 3. Enhanced File Upload Section

Updated `src/components/order/FileUploadSection.tsx` to:

- Integrate with UploadQueue for all uploads
- Display UploadQueueVisualization component
- Automatic network speed detection on mount
- Maintain existing file validation and compression features

## Usage Example

```typescript
import { UploadQueue } from '@/lib/uploadQueue';

// Create queue instance
const queue = new UploadQueue({
  maxRetries: 3,
  initialRetryDelay: 1000,
  autoThrottle: true
});

// Detect network speed
const networkStats = await queue.detectNetworkSpeed();

// Add files to queue
queue.addToQueue([
  {
    id: crypto.randomUUID(),
    file: myFile,
    orderId: 'order-123',
    userId: 'user-456',
    category: 'radiograph'
  }
]);

// Process queue
await queue.processQueue(supabase);

// Subscribe to updates
const unsubscribe = queue.subscribe((queue) => {
  console.log('Queue updated:', queue);
});

// Manual controls
queue.setConcurrency(5);
queue.retryUpload('file-id');
queue.cancelUpload('file-id');
queue.clearCompleted();
```

## Network Quality Thresholds

| Quality | Speed | Recommended Concurrency |
|---------|-------|------------------------|
| Excellent | > 5 MB/s | 5 |
| Good | > 1 MB/s | 3 |
| Fair | > 512 KB/s | 2 |
| Poor | < 512 KB/s | 1 |

## Retry Strategy

Failed uploads are automatically retried with exponential backoff:

- **Retry 1**: 1 second delay
- **Retry 2**: 2 seconds delay
- **Retry 3**: 4 seconds delay (if maxRetries = 3)

After max retries, the upload is marked as failed with option to manually retry.

## Lab Access to Accepted Orders

When a doctor accepts a lab's work request:

1. **Atomic Transaction** (`notify_lab_on_request_status` trigger):
   - Order's `assigned_lab_id` is set
   - `auto_assign_pending` flag cleared
   - All lab staff automatically assigned via `order_assignments` table
   - Other pending lab requests rejected
   - Notifications sent to accepted and rejected labs

2. **RLS Policies**:
   - **View**: Labs can view orders where they are assigned AND user is in `order_assignments`
   - **Update**: Labs can update orders where they are assigned AND user is in `order_assignments`
   - **Delete**: Assigned lab staff can delete orders (admin permission)

3. **Full Access**:
   - Lab staff see complete order details
   - Can update order status
   - Can upload files/attachments
   - Can add notes
   - Can update QC checklist
   - Can modify delivery dates
   - Can access chat

## Benefits

✅ **Reliability**: Automatic retries recover from temporary network issues
✅ **Performance**: Bandwidth throttling optimizes for connection quality  
✅ **Visibility**: Real-time status tracking for all uploads
✅ **Control**: Manual retry, cancel, and concurrency controls
✅ **UX**: Clear visual feedback with progress bars and status indicators

## Future Enhancements

- Pause/resume functionality
- Upload priority queue
- Bandwidth usage monitoring
- Upload scheduling (off-peak hours)
- Multi-chunk uploads for large files
- Resume interrupted uploads
