import express from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { uploadLimiter, analysisLimiter } from '../middleware/rateLimiter.js';
import { validateDocxFile } from '../utils/validation.js';
import { uploadFile, downloadFile } from '../services/storageService.js';
import { parseMultipleDocuments } from '../services/documentParser.js';
import { analyzeDocuments } from '../services/llmAnalyzer.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * Create a new upload session
 * POST /api/upload-session/create
 */
router.post('/create', authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Create upload session in database
    const { data, error } = await supabaseAdmin
      .from('upload_sessions')
      .insert({
        user_id: userId,
        status: 'uploading',
        file_urls: [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create upload session: ${error.message}`);
    }

    res.json({
      success: true,
      sessionId: data.id,
      status: data.status,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload a file to an existing session
 * POST /api/upload-session/:sessionId/upload
 */
router.post(
  '/:sessionId/upload',
  authenticateUser,
  uploadLimiter,
  upload.single('file'),
  async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const fileIndex = parseInt(req.body.fileIndex, 10);

      if (isNaN(fileIndex) || fileIndex < 0 || fileIndex > 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_INDEX',
            message: 'File index must be 0, 1, or 2',
          },
        });
      }

      // Validate file
      const validation = validateDocxFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: validation.errors.join(', '),
          },
        });
      }

      // Get upload session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('upload_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Upload session not found',
          },
        });
      }

      if (session.status !== 'uploading') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SESSION_STATUS',
            message: 'Session is not in uploading state',
          },
        });
      }

      // Upload file to storage
      const uploadResult = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        userId,
        'uploads'
      );

      // Update session with file URL
      const currentUrls = session.file_urls || ['', '', ''];
      currentUrls[fileIndex] = uploadResult.url;

      const { error: updateError } = await supabaseAdmin
        .from('upload_sessions')
        .update({
          file_urls: currentUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        throw new Error(`Failed to update session: ${updateError.message}`);
      }

      const filesUploaded = currentUrls.filter((url) => url).length;

      res.json({
        success: true,
        fileUrl: uploadResult.url,
        filesUploaded,
        filesRequired: 3,
        canAnalyze: filesUploaded === 3,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Start analysis of uploaded documents
 * POST /api/upload-session/:sessionId/analyze
 */
router.post(
  '/:sessionId/analyze',
  authenticateUser,
  analysisLimiter,
  async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const { documentType, industry } = req.body;

      // Get upload session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('upload_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Upload session not found',
          },
        });
      }

      const fileUrls = session.file_urls || [];
      if (fileUrls.length !== 3 || fileUrls.some((url) => !url)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INCOMPLETE_UPLOAD',
            message: 'All 3 files must be uploaded before analysis',
          },
        });
      }

      // Update status to analyzing
      await supabaseAdmin
        .from('upload_sessions')
        .update({ status: 'analyzing' })
        .eq('id', sessionId);

      // Start analysis asynchronously
      analyzeSessionDocuments(sessionId, fileUrls, { documentType, industry })
        .catch((error) => {
          console.error('Analysis error:', error);
          supabaseAdmin
            .from('upload_sessions')
            .update({
              status: 'failed',
              analysis_log: `Analysis failed: ${error.message}`,
            })
            .eq('id', sessionId);
        });

      res.json({
        success: true,
        status: 'analyzing',
        estimatedTime: 90, // seconds
        message: 'Analysis started. Poll /status endpoint for results.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get status of upload session and analysis results
 * GET /api/upload-session/:sessionId/status
 */
router.get('/:sessionId/status', authenticateUser, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const { data: session, error } = await supabaseAdmin
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Upload session not found',
        },
      });
    }

    res.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      filesUploaded: session.file_urls?.filter((url) => url).length || 0,
      schemaJson: session.schema_json,
      contentJson: session.content_json,
      structureJson: session.structure_json,
      analysisLog: session.analysis_log,
      confidenceScore: session.confidence_score,
      documentType: session.document_type,
      industry: session.industry,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update session with edited analysis results (review step)
 * PATCH /api/upload-session/:sessionId/review
 */
router.patch('/:sessionId/review', authenticateUser, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { schemaJson, contentJson, structureJson } = req.body;

    const { error } = await supabaseAdmin
      .from('upload_sessions')
      .update({
        schema_json: schemaJson,
        content_json: contentJson,
        structure_json: structureJson,
        status: 'review',
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Session updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Background function to analyze documents
 */
async function analyzeSessionDocuments(sessionId, fileUrls, options) {
  try {
    // Download files from storage
    const fileBuffers = [];
    for (const url of fileUrls) {
      const path = url.split('/').slice(-3).join('/'); // Extract path from URL
      const buffer = await downloadFile(path);
      fileBuffers.push(buffer);
    }

    // Parse documents
    const parsedDocs = await parseMultipleDocuments(fileBuffers, 'markdown');
    const documentContents = parsedDocs.map((doc) => doc.markdown || doc.html || doc.text || '');

    // Analyze with LLM
    const analysisResult = await analyzeDocuments(documentContents, options);

    // Update session with results
    await supabaseAdmin
      .from('upload_sessions')
      .update({
        status: 'review',
        schema_json: analysisResult.schema_json,
        content_json: analysisResult.content_json,
        structure_json: analysisResult.structure_json,
        analysis_log: analysisResult.analysis_log,
        confidence_score: analysisResult.confidence_score,
        document_type: analysisResult.document_type,
        industry: analysisResult.industry,
      })
      .eq('id', sessionId);
  } catch (error) {
    console.error('Analysis background task error:', error);
    throw error;
  }
}

export default router;

