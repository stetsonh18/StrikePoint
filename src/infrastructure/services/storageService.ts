import { supabase } from '../api/supabase';

const BUCKET_NAME = 'journal-attachments';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_CHART_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg'];

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Storage Service for Journal Attachments
 * Handles file uploads to Supabase Storage
 */
export class StorageService {
  /**
   * Ensure the storage bucket exists (should be created manually in Supabase dashboard)
   */
  private static async ensureBucketExists(): Promise<void> {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error checking buckets:', error);
      throw new Error(`Failed to check storage buckets: ${error.message}`);
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.warn(`Bucket ${BUCKET_NAME} does not exist. Please create it in Supabase dashboard.`);
    }
  }

  /**
   * Validate file before upload
   */
  private static validateFile(file: File, allowedTypes: string[]): void {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Upload an image file for a journal entry
   */
  static async uploadJournalImage(
    userId: string,
    entryId: string,
    file: File
  ): Promise<UploadResult> {
    this.validateFile(file, ALLOWED_IMAGE_TYPES);
    await this.ensureBucketExists();

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${entryId}/images/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading image:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
    };
  }

  /**
   * Upload a chart file for a journal entry
   */
  static async uploadJournalChart(
    userId: string,
    entryId: string,
    file: File
  ): Promise<UploadResult> {
    this.validateFile(file, ALLOWED_CHART_TYPES);
    await this.ensureBucketExists();

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${entryId}/charts/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading chart:', error);
      throw new Error(`Failed to upload chart: ${error.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
    };
  }

  /**
   * Delete a file from storage
   */
  static async deleteJournalFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Delete multiple files from storage
   */
  static async deleteJournalFiles(filePaths: string[]): Promise<void> {
    if (filePaths.length === 0) return;

    const { error } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

    if (error) {
      console.error('Error deleting files:', error);
      throw new Error(`Failed to delete files: ${error.message}`);
    }
  }

  /**
   * Extract file path from URL
   */
  static extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Extract path after bucket name
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
      return pathMatch ? pathMatch[1] : null;
    } catch {
      return null;
    }
  }
}

