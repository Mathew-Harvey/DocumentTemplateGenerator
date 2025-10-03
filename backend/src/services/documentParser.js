import mammoth from 'mammoth';

/**
 * Document parsing service using mammoth.js
 */

/**
 * Parse a Word document to HTML
 * @param {Buffer} fileBuffer - Word document buffer
 * @returns {Promise<Object>} Parsed content and metadata
 */
export async function parseDocxToHtml(fileBuffer) {
  try {
    const result = await mammoth.convertToHtml(
      { buffer: fileBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
        ],
      }
    );

    return {
      success: true,
      html: result.value,
      messages: result.messages, // Warnings/errors from conversion
    };
  } catch (error) {
    console.error('Document parsing error:', error);
    throw new Error(`Failed to parse document: ${error.message}`);
  }
}

/**
 * Parse a Word document to Markdown
 * @param {Buffer} fileBuffer - Word document buffer
 * @returns {Promise<Object>} Parsed content and metadata
 */
export async function parseDocxToMarkdown(fileBuffer) {
  try {
    const result = await mammoth.convertToMarkdown(
      { buffer: fileBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => # ",
          "p[style-name='Heading 2'] => ## ",
          "p[style-name='Heading 3'] => ### ",
        ],
      }
    );

    return {
      success: true,
      markdown: result.value,
      messages: result.messages,
    };
  } catch (error) {
    console.error('Document parsing error:', error);
    throw new Error(`Failed to parse document: ${error.message}`);
  }
}

/**
 * Extract raw text from Word document
 * @param {Buffer} fileBuffer - Word document buffer
 * @returns {Promise<Object>} Extracted text
 */
export async function parseDocxToText(fileBuffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });

    return {
      success: true,
      text: result.value,
      messages: result.messages,
    };
  } catch (error) {
    console.error('Document parsing error:', error);
    throw new Error(`Failed to parse document: ${error.message}`);
  }
}

/**
 * Parse multiple documents
 * @param {Buffer[]} fileBuffers - Array of Word document buffers
 * @param {string} format - Output format ('html', 'markdown', or 'text')
 * @returns {Promise<Array>} Array of parsed documents
 */
export async function parseMultipleDocuments(fileBuffers, format = 'markdown') {
  const parseFunction = {
    html: parseDocxToHtml,
    markdown: parseDocxToMarkdown,
    text: parseDocxToText,
  }[format];

  if (!parseFunction) {
    throw new Error(`Invalid format: ${format}`);
  }

  const results = await Promise.all(
    fileBuffers.map(async (buffer, index) => {
      try {
        const result = await parseFunction(buffer);
        return {
          index,
          ...result,
        };
      } catch (error) {
        return {
          index,
          success: false,
          error: error.message,
        };
      }
    })
  );

  return results;
}

