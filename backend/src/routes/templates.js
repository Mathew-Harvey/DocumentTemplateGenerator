import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateTemplateData } from '../utils/validation.js';

const router = express.Router();

/**
 * Create a new template from upload session
 * POST /api/templates
 */
router.post('/', authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId, name, description, documentType, industry } = req.body;

    if (!sessionId || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Session ID and name are required',
        },
      });
    }

    // Get session data
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

    if (session.status !== 'review' && session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SESSION_STATUS',
          message: 'Session must be in review or completed state',
        },
      });
    }

    // Validate template data
    const validation = validateTemplateData({
      name,
      schemaJson: session.schema_json,
      contentJson: session.content_json,
      structureJson: session.structure_json,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_DATA',
          message: validation.errors.join(', '),
        },
      });
    }

    // Create template
    const { data: template, error: createError } = await supabaseAdmin
      .from('templates')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        document_type: documentType || session.document_type,
        industry: industry || session.industry,
        schema_json: session.schema_json,
        content_json: session.content_json,
        structure_json: session.structure_json,
        status: 'active',
        source_files_count: 3,
        analysis_confidence_score: session.confidence_score,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create template: ${createError.message}`);
    }

    // Update session status
    await supabaseAdmin
      .from('upload_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    res.status(201).json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        documentType: template.document_type,
        status: template.status,
        createdAt: template.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all templates for current user
 * GET /api/templates
 */
router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { documentType, industry, status = 'active' } = req.query;

    let query = supabaseAdmin
      .from('templates')
      .select('id, name, description, document_type, industry, status, created_at, analysis_confidence_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    if (industry) {
      query = query.eq('industry', industry);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: templates, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    // Get document counts for each template
    const templatesWithCounts = await Promise.all(
      templates.map(async (template) => {
        const { count } = await supabaseAdmin
          .from('generated_documents')
          .select('*', { count: 'exact', head: true })
          .eq('template_id', template.id);

        return {
          ...template,
          documentsGenerated: count || 0,
        };
      })
    );

    res.json({
      success: true,
      templates: templatesWithCounts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a single template by ID
 * GET /api/templates/:templateId
 */
router.get('/:templateId', authenticateUser, async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', userId)
      .single();

    if (error || !template) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found',
        },
      });
    }

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update a template
 * PUT /api/templates/:templateId
 */
router.put('/:templateId', authenticateUser, async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    const { name, description, schemaJson, contentJson, structureJson, status } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (schemaJson) updates.schema_json = schemaJson;
    if (contentJson) updates.content_json = contentJson;
    if (structureJson) updates.structure_json = structureJson;
    if (status) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No fields to update',
        },
      });
    }

    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .update(updates)
      .eq('id', templateId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a template
 * DELETE /api/templates/:templateId
 */
router.delete('/:templateId', authenticateUser, async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from('templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

