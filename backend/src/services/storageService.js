import { supabaseAdmin, STORAGE_BUCKET } from '../config/supabase.js';
import { randomUUID } from 'crypto';

/**
 * Storage service for managing file uploads and downloads
 */

/**
 * Upload a file to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} userId - User ID for organizing files
 * @param {string} folder - Folder within bucket (e.g., 'uploads', 'templates', 'generated')
 * @returns {Promise<Object>} Upload result with file URL
 */
export async function uploadFile(fileBuffer, fileName, userId, folder = 'uploads') {
  try {
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    const filePath = `${folder}/${userId}/${uniqueFileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      path: filePath,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * Download a file from Supabase Storage
 * @param {string} filePath - Path to file in storage
 * @returns {Promise<Buffer>} File buffer
 */
export async function downloadFile(filePath) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(filePath);

    if (error) {
      throw new Error(`Storage download failed: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Get a signed URL for temporary file access
 * @param {string} filePath - Path to file in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedUrl(filePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Signed URL error:', error);
    throw error;
  }
}

/**
 * Delete a file from Supabase Storage
 * @param {string} filePath - Path to file in storage
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFile(filePath) {
  try {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

/**
 * Delete multiple files from Supabase Storage
 * @param {string[]} filePaths - Array of file paths
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFiles(filePaths) {
  try {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(filePaths);

    if (error) {
      throw new Error(`Batch delete failed: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Batch delete error:', error);
    throw error;
  }
}

