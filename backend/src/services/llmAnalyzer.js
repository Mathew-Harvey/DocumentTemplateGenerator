import { anthropic, MODELS } from '../config/anthropic.js';

/**
 * LLM-powered document analysis service
 */

/**
 * Analyze 3 documents and extract template structure
 * @param {Array<string>} documentContents - Array of 3 parsed document contents (markdown)
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis results with schema, content, and structure JSONs
 */
export async function analyzeDocuments(documentContents, options = {}) {
  const { documentType, industry } = options;

  if (!documentContents || documentContents.length !== 3) {
    throw new Error('Exactly 3 documents are required for analysis');
  }

  const prompt = buildAnalysisPrompt(documentContents, documentType, industry);

  try {
    const startTime = Date.now();
    
    const message = await anthropic.messages.create({
      model: MODELS.SONNET,
      max_tokens: 16000,
      temperature: 0.3, // Lower temperature for more consistent structured output
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const duration = Date.now() - startTime;
    const response = message.content[0].text;

    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/{[\s\S]*}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from LLM response');
    }

    const analysisResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Calculate token usage and cost
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const estimatedCost = calculateCost(inputTokens, outputTokens, MODELS.SONNET);

    return {
      success: true,
      analysis_log: analysisResult.analysis_log || '',
      confidence_score: analysisResult.confidence_score || 0.5,
      document_type: analysisResult.document_type || documentType || 'Unknown',
      industry: analysisResult.industry || industry || 'Unknown',
      schema_json: analysisResult.schema_json || {},
      content_json: analysisResult.content_json || {},
      structure_json: analysisResult.structure_json || {},
      metadata: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost: estimatedCost,
        duration_ms: duration,
        model: MODELS.SONNET,
      },
    };
  } catch (error) {
    console.error('LLM analysis error:', error);
    throw new Error(`Document analysis failed: ${error.message}`);
  }
}

/**
 * Build the analysis prompt for the LLM
 */
function buildAnalysisPrompt(documentContents, documentType, industry) {
  return `You are an expert document analyst specializing in compliance documents for marine and industrial sectors.

You will be provided with 3 example documents of the same type. Your task is to analyze these documents and extract:
1. Common structure (sections, headings, layout)
2. Variable content (data that changes between documents)
3. Boilerplate content (text that stays the same or similar)

DOCUMENTS:
---
Document 1:
${documentContents[0]}
---
Document 2:
${documentContents[1]}
---
Document 3:
${documentContents[2]}
---

${documentType ? `HINT: The document type is likely "${documentType}"\n` : ''}
${industry ? `HINT: The industry is likely "${industry}"\n` : ''}

ANALYSIS PROCESS:

Step 1: Research Phase
- Identify the document type (SWMS, OEMP, JSA, etc.)
- Consider industry standards and regulatory requirements
- Note similar patterns across the 3 documents

Step 2: Structure Analysis
- Identify all major sections across the 3 documents
- Note which sections appear in all 3 vs. only some
- Identify heading hierarchy (H1, H2, H3)
- Map document flow and organization

Step 3: Content Classification
For each section, classify content as:
- VARIABLE: Changes between documents (names, dates, locations, project-specific data)
- BOILERPLATE: Standard text that's the same or very similar
- CONDITIONAL: Appears only when certain conditions are met

Step 4: Field Extraction
For each variable piece of content:
- Determine appropriate field type (text, date, number, select, table, etc.)
- Suggest field label and help text
- Identify validation rules
- Note if required or optional
- Identify conditional dependencies

Step 5: Boilerplate Extraction
For standard text:
- Extract clean boilerplate paragraphs
- Identify variations (if text differs slightly between docs)
- Note conditional boilerplate (appears only in certain scenarios)

Step 6: Table Analysis
For tables found in documents:
- Identify table structure (columns, typical row count)
- Determine if table data is variable or boilerplate
- Suggest default rows if applicable

OUTPUT FORMAT:

Return a JSON object with the following structure:

\`\`\`json
{
  "analysis_log": "Your research findings and reasoning process...",
  "confidence_score": 0.85,
  "document_type": "SWMS",
  "industry": "Marine Industrial",
  "schema_json": {
    "version": "1.0",
    "sections": [
      {
        "id": "section_id",
        "title": "Section Title",
        "description": "Section description",
        "fields": [
          {
            "id": "field_id",
            "type": "text|textarea|number|date|select|table",
            "label": "Field Label",
            "placeholder": "Example value",
            "required": true,
            "validation": {},
            "helpText": "Help text for user",
            "conditional": {
              "show_when": {
                "field": "other_field_id",
                "operator": "equals",
                "value": "some_value"
              }
            }
          }
        ]
      }
    ],
    "metadata": {
      "generatedBy": "claude-sonnet-4.5",
      "generatedAt": "${new Date().toISOString()}",
      "confidenceScore": 0.85
    }
  },
  "content_json": {
    "version": "1.0",
    "blocks": {
      "block_id": {
        "default": "Default boilerplate text...",
        "variants": {
          "variant_name": "Variant text..."
        }
      }
    },
    "tables": {
      "table_id": {
        "headers": ["Column 1", "Column 2"],
        "defaultRows": [
          ["Value 1", "Value 2"]
        ]
      }
    },
    "conditional_sections": {
      "section_id": {
        "trigger": {"field": "field_id", "value": true},
        "content": "Conditional content..."
      }
    },
    "metadata": {
      "industry": "industry_name",
      "documentType": "document_type",
      "lastResearched": "${new Date().toISOString()}"
    }
  },
  "structure_json": {
    "version": "1.0",
    "metadata": {
      "title": "{{document_title}}",
      "documentType": "Document Type Name",
      "pageSetup": {
        "margins": {"top": 2.5, "bottom": 2.5, "left": 2.5, "right": 2.5},
        "orientation": "portrait",
        "size": "A4"
      }
    },
    "sections": [
      {
        "id": "section_id",
        "type": "section",
        "heading": {
          "text": "Heading Text",
          "level": 1
        },
        "content": [
          {
            "type": "paragraph",
            "template": "Text with {{variable}} placeholders"
          }
        ]
      }
    ]
  }
}
\`\`\`

CRITICAL REQUIREMENTS:
- Be thorough in your analysis
- Document your reasoning in analysis_log
- Provide realistic default values where appropriate
- Include help text for complex fields
- Ensure generated forms will be user-friendly
- Confidence score should reflect how well the 3 documents align
- If documents are too different, note this in analysis_log and suggest the user provide more similar examples
- Use template variables like {{project_name}} consistently across all JSONs`;
}

/**
 * Form assistance using Haiku (cost-optimized)
 * @param {string} userMessage - User's question or request
 * @param {Object} context - Context about the form and template
 * @returns {Promise<Object>} AI response with suggestions
 */
export async function provideFormAssistance(userMessage, context = {}) {
  const { templateId, documentType, industry, currentFieldId, currentData } = context;

  const prompt = `You are a helpful assistant for filling out ${documentType || 'compliance'} documents in the ${industry || 'industrial'} sector.

The user is currently filling out a form and needs help with${currentFieldId ? ` the "${currentFieldId}" field` : ' their form'}.

User's question: "${userMessage}"

${currentData ? `Current form data: ${JSON.stringify(currentData, null, 2)}` : ''}

Provide helpful, specific suggestions. If appropriate, suggest concrete values or rows for tables.

Format your response as JSON:
{
  "message": "Your helpful response to the user",
  "suggestions": [
    {
      "field": "field_id",
      "value": "suggested value or array of row objects for tables"
    }
  ]
}`;

  try {
    const message = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const response = message.content[0].text;
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/{[\s\S]*}/);
    
    if (!jsonMatch) {
      return {
        success: true,
        message: response,
        suggestions: [],
      };
    }

    const result = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    return {
      success: true,
      message: result.message || response,
      suggestions: result.suggestions || [],
    };
  } catch (error) {
    console.error('Form assistance error:', error);
    throw new Error(`Form assistance failed: ${error.message}`);
  }
}

/**
 * Calculate estimated cost based on token usage
 */
function calculateCost(inputTokens, outputTokens, model) {
  const costs = {
    [MODELS.SONNET]: {
      input: 0.000003,
      output: 0.000015,
    },
    [MODELS.HAIKU]: {
      input: 0.0000008,
      output: 0.000004,
    },
  };

  const modelCosts = costs[model] || costs[MODELS.SONNET];
  return (inputTokens * modelCosts.input) + (outputTokens * modelCosts.output);
}

