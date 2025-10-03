import { Document, Packer, Paragraph, Table, TableCell, TableRow, HeadingLevel, AlignmentType, WidthType, BorderStyle } from 'docx';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { renderTemplate, evaluateCondition, getNestedValue, formatDate, getToday } from '../utils/templateHelpers.js';

/**
 * Document generation service
 */

/**
 * Generate a Word document from template and user data
 * @param {Object} template - Template object with schema, content, and structure
 * @param {Object} userData - User's form data
 * @param {Buffer} templateDocxBuffer - Optional: existing .docx template file
 * @returns {Promise<Buffer>} Generated Word document buffer
 */
export async function generateDocument(template, userData, templateDocxBuffer = null) {
  try {
    // Option A: Use existing .docx template with docxtemplater
    if (templateDocxBuffer) {
      return await generateFromTemplate(templateDocxBuffer, userData, template.content_json);
    }

    // Option B: Build document from structure.json
    return await generateFromStructure(template.structure_json, userData, template.content_json);
  } catch (error) {
    console.error('Document generation error:', error);
    throw new Error(`Failed to generate document: ${error.message}`);
  }
}

/**
 * Generate document using docxtemplater with existing template
 */
async function generateFromTemplate(templateBuffer, userData, contentJson) {
  try {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Merge user data with boilerplate content
    const data = {
      ...userData,
      boilerplate: contentJson.blocks || {},
      // Helper functions available in templates
      formatDate: (date) => formatDate(date),
      today: getToday(),
    };

    doc.render(data);

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    return buffer;
  } catch (error) {
    console.error('Docxtemplater error:', error);
    throw new Error(`Template rendering failed: ${error.message}`);
  }
}

/**
 * Generate document from structure JSON using docx library
 */
async function generateFromStructure(structureJson, userData, contentJson) {
  if (!structureJson || !structureJson.sections) {
    throw new Error('Invalid structure JSON');
  }

  // Merge helper values into userData
  const enhancedUserData = {
    ...userData,
    today: getToday(),
    formatDate: (date) => formatDate(date),
  };

  // Build document sections
  const docSections = [];

  for (const section of structureJson.sections) {
    // Skip header and footer sections (handle separately)
    if (section.type === 'header' || section.type === 'footer') {
      continue;
    }

    const children = [];

    // Add section heading
    if (section.heading) {
      const headingText = renderTemplate(section.heading.text, enhancedUserData, contentJson.blocks);
      children.push(
        new Paragraph({
          text: headingText,
          heading: HeadingLevel[`HEADING_${section.heading.level || 1}`],
          spacing: {
            before: 400,
            after: 200,
          },
        })
      );
    }

    // Process section content
    if (section.content) {
      for (const item of section.content) {
        // Check conditional rendering
        if (item.condition && !evaluateCondition(item.condition, enhancedUserData)) {
          continue;
        }

        const contentElements = await processContentItem(item, enhancedUserData, contentJson);
        children.push(...contentElements);
      }
    }

    docSections.push({ children });
  }

  // Create document
  const doc = new Document({
    sections: docSections.length > 0 ? docSections : [{ children: [new Paragraph('Empty document')] }],
  });

  // Generate buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Process a single content item and return docx elements
 */
async function processContentItem(item, userData, contentJson) {
  const elements = [];

  switch (item.type) {
    case 'paragraph': {
      const text = renderTemplate(item.template || item.text || '', userData, contentJson.blocks);
      elements.push(
        new Paragraph({
          text,
          alignment: getAlignment(item.alignment),
          spacing: {
            before: 120,
            after: 120,
          },
        })
      );
      break;
    }

    case 'table': {
      const table = await createTable(item, userData, contentJson);
      if (table) {
        elements.push(table);
      }
      break;
    }

    case 'conditional': {
      if (evaluateCondition(item.condition, userData)) {
        for (const subItem of item.content || []) {
          const subElements = await processContentItem(subItem, userData, contentJson);
          elements.push(...subElements);
        }
      }
      break;
    }

    default:
      console.warn(`Unknown content type: ${item.type}`);
  }

  return elements;
}

/**
 * Create a table from table definition
 */
async function createTable(item, userData, contentJson) {
  const rows = [];

  // Add header row if defined
  if (item.headers) {
    const headerCells = item.headers.map(
      (header) =>
        new TableCell({
          children: [new Paragraph({ text: String(header), bold: true })],
          shading: {
            fill: 'CCCCCC',
          },
        })
    );
    rows.push(new TableRow({ children: headerCells, tableHeader: true }));
  }

  // Process table rows
  if (item.loop) {
    // Dynamic table from user data
    const loopPath = item.loop.replace(/[{}#/]/g, '').trim();
    const dataArray = getNestedValue(userData, loopPath);

    if (Array.isArray(dataArray) && dataArray.length > 0) {
      for (const rowData of dataArray) {
        const cells = (item.rows || []).map((template) => {
          const text = renderTemplate(template, rowData, contentJson.blocks);
          return new TableCell({
            children: [new Paragraph(String(text))],
          });
        });
        rows.push(new TableRow({ children: cells }));
      }
    }
  } else if (item.source) {
    // Static table from boilerplate
    const sourcePath = item.source.replace(/[{}]/g, '').trim();
    const tableData = getNestedValue(contentJson, sourcePath);

    if (tableData && tableData.defaultRows) {
      for (const rowData of tableData.defaultRows) {
        const cells = rowData.map(
          (cellValue) =>
            new TableCell({
              children: [new Paragraph(String(cellValue))],
            })
        );
        rows.push(new TableRow({ children: cells }));
      }
    }
  } else if (item.rows) {
    // Static table from structure definition
    for (const rowDef of item.rows) {
      const cells = rowDef.map((cellDef) => {
        const text = renderTemplate(
          cellDef.template || cellDef.text || '',
          userData,
          contentJson.blocks
        );
        return new TableCell({
          children: [
            new Paragraph({
              text: String(text),
              bold: cellDef.bold || false,
            }),
          ],
        });
      });
      rows.push(new TableRow({ children: cells }));
    }
  } else if (item.emptyRows) {
    // Create empty rows for signatures, etc.
    const columnCount = item.headers?.length || 3;
    for (let i = 0; i < item.emptyRows; i++) {
      const cells = Array(columnCount)
        .fill(null)
        .map(
          () =>
            new TableCell({
              children: [new Paragraph('')],
            })
        );
      rows.push(new TableRow({ children: cells }));
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: item.borders !== false ? {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    } : undefined,
  });
}

/**
 * Get alignment type from string
 */
function getAlignment(alignment) {
  const alignmentMap = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justified: AlignmentType.JUSTIFIED,
  };

  return alignmentMap[alignment?.toLowerCase()] || AlignmentType.LEFT;
}

/**
 * Preview document structure as HTML (for review step)
 */
export function generateHtmlPreview(structureJson, userData, contentJson) {
  try {
    let html = '<div class="document-preview">';

    for (const section of structureJson.sections || []) {
      if (section.type === 'header' || section.type === 'footer') {
        continue;
      }

      html += '<section>';

      if (section.heading) {
        const headingText = renderTemplate(section.heading.text, userData, contentJson.blocks);
        html += `<h${section.heading.level || 1}>${escapeHtml(headingText)}</h${section.heading.level || 1}>`;
      }

      if (section.content) {
        for (const item of section.content) {
          if (item.condition && !evaluateCondition(item.condition, userData)) {
            continue;
          }

          html += renderHtmlContentItem(item, userData, contentJson);
        }
      }

      html += '</section>';
    }

    html += '</div>';
    return html;
  } catch (error) {
    console.error('HTML preview error:', error);
    return '<p>Preview generation failed</p>';
  }
}

/**
 * Render content item as HTML
 */
function renderHtmlContentItem(item, userData, contentJson) {
  switch (item.type) {
    case 'paragraph': {
      const text = renderTemplate(item.template || item.text || '', userData, contentJson.blocks);
      return `<p>${escapeHtml(text)}</p>`;
    }

    case 'table': {
      let tableHtml = '<table border="1" style="border-collapse: collapse; width: 100%;">';

      if (item.headers) {
        tableHtml += '<thead><tr>';
        item.headers.forEach((header) => {
          tableHtml += `<th style="background-color: #ccc; padding: 8px;">${escapeHtml(header)}</th>`;
        });
        tableHtml += '</tr></thead>';
      }

      tableHtml += '<tbody>';

      if (item.loop) {
        const loopPath = item.loop.replace(/[{}#/]/g, '').trim();
        const dataArray = getNestedValue(userData, loopPath);

        if (Array.isArray(dataArray)) {
          dataArray.forEach((rowData) => {
            tableHtml += '<tr>';
            (item.rows || []).forEach((template) => {
              const text = renderTemplate(template, rowData, contentJson.blocks);
              tableHtml += `<td style="padding: 8px;">${escapeHtml(text)}</td>`;
            });
            tableHtml += '</tr>';
          });
        }
      } else if (item.emptyRows) {
        const columnCount = item.headers?.length || 3;
        for (let i = 0; i < item.emptyRows; i++) {
          tableHtml += '<tr>';
          for (let j = 0; j < columnCount; j++) {
            tableHtml += '<td style="padding: 8px;">&nbsp;</td>';
          }
          tableHtml += '</tr>';
        }
      }

      tableHtml += '</tbody></table>';
      return tableHtml;
    }

    case 'conditional': {
      if (evaluateCondition(item.condition, userData)) {
        let html = '';
        (item.content || []).forEach((subItem) => {
          html += renderHtmlContentItem(subItem, userData, contentJson);
        });
        return html;
      }
      return '';
    }

    default:
      return '';
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

