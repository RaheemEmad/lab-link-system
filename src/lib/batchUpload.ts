/**
 * Batch upload utilities for parallel file processing
 * Optimizes upload performance for large collections of files
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface UploadTask {
  id: string;
  file: File;
  orderId: string;
  userId: string;
  category: string;
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  id: string;
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Upload a single file with progress tracking
 */
async function uploadSingleFile(
  supabase: SupabaseClient,
  task: UploadTask
): Promise<UploadResult> {
  const { id, file, orderId, userId, category, onProgress } = task;
  
  try {
    const filePath = `${userId}/${orderId}/${id}-${file.name}`;

    // Simulate progress updates for better UX
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += 15;
        onProgress?.(currentProgress);
      }
    }, 150);

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      onProgress?.(95);

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('order_attachments')
        .insert({
          order_id: orderId,
          uploaded_by: userId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          attachment_category: category
        });

      if (dbError) {
        // Rollback - delete uploaded file
        await supabase.storage.from('order-attachments').remove([filePath]);
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      onProgress?.(100);

      return {
        id,
        success: true,
        filePath
      };
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  } catch (error) {
    return {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload multiple files in parallel with configurable concurrency
 * @param supabase - Supabase client instance
 * @param tasks - Array of upload tasks
 * @param concurrency - Maximum number of parallel uploads (default: 3)
 * @returns Promise resolving to array of upload results
 */
export async function batchUploadFiles(
  supabase: SupabaseClient,
  tasks: UploadTask[],
  concurrency: number = 3
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = uploadSingleFile(supabase, task).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex((p) => 
        // Remove completed promises
        Promise.race([p]).then(() => true, () => true)
      ), 1);
    }
  }

  // Wait for all remaining uploads
  await Promise.all(executing);

  return results;
}

/**
 * Process files in batches with optimal concurrency
 * Automatically adjusts batch size based on file sizes
 */
export async function optimizedBatchUpload(
  supabase: SupabaseClient,
  tasks: UploadTask[]
): Promise<UploadResult[]> {
  // Calculate optimal concurrency based on average file size
  const totalSize = tasks.reduce((sum, task) => sum + task.file.size, 0);
  const avgSize = totalSize / tasks.length;
  
  // Adjust concurrency based on file size
  // Small files (< 1MB): 5 concurrent
  // Medium files (1-5MB): 3 concurrent
  // Large files (> 5MB): 2 concurrent
  let concurrency = 3;
  if (avgSize < 1024 * 1024) {
    concurrency = 5;
  } else if (avgSize > 5 * 1024 * 1024) {
    concurrency = 2;
  }

  return batchUploadFiles(supabase, tasks, concurrency);
}

/**
 * Process image compression in parallel
 * @param files - Array of image files to compress
 * @param compressFunction - Compression function to apply
 * @param concurrency - Max parallel compressions (default: 4)
 */
export async function parallelCompression<T extends File>(
  files: T[],
  compressFunction: (file: T) => Promise<File>,
  concurrency: number = 4
): Promise<{ original: T; compressed: File }[]> {
  const results: { original: T; compressed: File }[] = [];
  const executing: Promise<void>[] = [];

  for (const file of files) {
    const promise = compressFunction(file).then((compressed) => {
      results.push({ original: file, compressed });
    }).catch((error) => {
      console.error(`Compression failed for ${file.name}:`, error);
      // Use original file if compression fails
      results.push({ original: file, compressed: file });
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex((p) => 
        Promise.race([p]).then(() => true, () => true)
      ), 1);
    }
  }

  await Promise.all(executing);

  return results;
}

/**
 * Chunk array into smaller batches
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Upload files in sequential batches with parallel processing within each batch
 * Useful for very large file collections to avoid overwhelming the server
 */
export async function sequentialBatchUpload(
  supabase: SupabaseClient,
  tasks: UploadTask[],
  batchSize: number = 10,
  concurrency: number = 3
): Promise<UploadResult[]> {
  const batches = chunkArray(tasks, batchSize);
  const allResults: UploadResult[] = [];

  for (const batch of batches) {
    const batchResults = await batchUploadFiles(supabase, batch, concurrency);
    allResults.push(...batchResults);
  }

  return allResults;
}
