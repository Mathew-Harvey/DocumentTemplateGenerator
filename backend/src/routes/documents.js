import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateUserData } from '../utils/validation.js';
import { uploadFile, getSignedUrl } from '../services/storageService.js';
import { generateDocument } from '../services/documentGenerator.js';

const router = express.Router();

/**
 * Generate a new document from template
 * POST /api/documents/generate
 */
router.post('/generate', authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { templateId, name, userData } = req.body;

    if (!templateId || !name || !userData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Template ID, name, and user data are required',
        },
      });
    }

    // Get template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', userId)
      .single();

    if (templateError || !template) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found',
        },
      });
    }

    // Validate user data against schema
    const validation = validateUserData(userData, template.schema_json);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_DATA',
          message: 'User data validation failed',
          details: validation.errors,
        },
      });
    }

    // Generate document
    const documentBuffer = await generateDocument(template, userData, null);

    // Upload to storage
    const fileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    const uploadResult = await uploadFile(
      documentBuffer,
      fileName,
      userId,
      'generated'
    );

    // Save to database
    const { data: document, error: createError } = await supabaseAdmin
      .from('generated_documents')
      .insert({
        user_id: userId,
        template_id: templateId,
        name: name.trim(),
        user_data_json: userData,
        output_docx_url: uploadResult.url,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to save document: ${createError.message}`);
    }

    // Get signed URL for download
    const downloadUrl = await getSignedUrl(uploadResult.path, 3600); // 1 hour expiry

    res.status(201).json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        downloadUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        createdAt: document.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all documents for current user
 * GET /api/documents
 */
router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { templateId, limit = 20, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('generated_documents')
      .select('id, name, template_id, created_at, templates(name)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    const { data: documents, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    // Format response
    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      templateId: doc.template_id,
      templateName: doc.templates?.name || 'Unknown',
      createdAt: doc.created_at,
    }));

    res.json({
      success: true,
      documents: formattedDocuments,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a single document by ID
 * GET /api/documents/:documentId
 */
router.get('/:documentId', authenticateUser, async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const { data: document, error } = await supabaseAdmin
      .from('generated_documents')
      .select('*, templates(name)')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (error || !document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        },
      });
    }

    res.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        templateId: document.template_id,
        templateName: document.templates?.name || 'Unknown',
        userData: document.user_data_json,
        createdAt: document.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Download a document
 * GET /api/documents/:documentId/download
 */
router.get('/:documentId/download', authenticateUser, async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const { data: document, error } = await supabaseAdmin
      .from('generated_documents')
      .select('output_docx_url, name')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (error || !document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        },
      });
    }

    // Extract path from URL
    const url = document.output_docx_url;
    const path = url.split('/').slice(-3).join('/');

    // Get signed URL
    const downloadUrl = await getSignedUrl(path, 300); // 5 minutes expiry

    // Redirect to signed URL
    res.redirect(downloadUrl);
  } catch (error) {
    next(error);
  }
});

/**
 * Regenerate a document with new data
 * PUT /api/documents/:documentId/regenerate
 */
router.put('/:documentId/regenerate', authenticateUser, async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    const { userData } = req.body;

    if (!userData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_DATA',
          message: 'User data is required',
        },
      });
    }

    // Get existing document
    const { data: existingDoc, error: docError } = await supabaseAdmin
      .from('generated_documents')
      .select('*, templates(*)')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !existingDoc) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        },
      });
    }

    const template = existingDoc.templates;

    // Validate user data
    const validation = validateUserData(userData, template.schema_json);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_DATA',
          message: 'User data validation failed',
          details: validation.errors,
        },
      });
    }

    // Generate new document
    const documentBuffer = await generateDocument(template, userData, null);

    // Upload to storage
    const fileName = `${existingDoc.name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    const uploadResult = await uploadFile(
      documentBuffer,
      fileName,
      userId,
      'generated'
    );

    // Update database
    const { data: updatedDoc, error: updateError } = await supabaseAdmin
      .from('generated_documents')
      .update({
        user_data_json: userData,
        output_docx_url: uploadResult.url,
      })
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    // Get signed URL for download
    const downloadUrl = await getSignedUrl(uploadResult.path, 3600);

    res.json({
      success: true,
      document: {
        id: updatedDoc.id,
        name: updatedDoc.name,
        downloadUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        updatedAt: updatedDoc.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a document
 * DELETE /api/documents/:documentId
 */
router.delete('/:documentId', authenticateUser, async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from('generated_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

