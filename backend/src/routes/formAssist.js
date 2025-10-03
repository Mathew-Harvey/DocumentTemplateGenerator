import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { provideFormAssistance } from '../services/llmAnalyzer.js';

const router = express.Router();

/**
 * Get AI assistance for form filling
 * POST /api/form-assist
 */
router.post('/', authenticateUser, async (req, res, next) => {
  try {
    const { templateId, currentFieldId, userMessage, context } = req.body;

    if (!userMessage) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_MESSAGE',
          message: 'User message is required',
        },
      });
    }

    // Build context for LLM
    const assistanceContext = {
      templateId,
      currentFieldId,
      documentType: context?.documentType,
      industry: context?.industry,
      currentData: context?.currentData,
    };

    // Get AI response
    const result = await provideFormAssistance(userMessage, assistanceContext);

    res.json({
      success: true,
      message: result.message,
      suggestions: result.suggestions || [],
    });
  } catch (error) {
    next(error);
  }
});

export default router;

