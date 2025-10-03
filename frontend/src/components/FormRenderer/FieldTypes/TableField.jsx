import { useState, useEffect } from 'react';
import './TableField.css';

function TableField({ field, register, errors, setValue }) {
  const getInitialRows = () => {
    const count = field.defaultRows || 5;
    const emptyRow = {};
    field.columns?.forEach((col) => {
      emptyRow[col.key] = '';
    });
    return Array(count).fill(null).map(() => ({ ...emptyRow }));
  };

  const [rows, setRows] = useState(getInitialRows());

  // Update form value whenever rows change
  useEffect(() => {
    setValue(field.id, rows);
  }, [rows, field.id, setValue]);

  const handleCellChange = (rowIndex, columnKey, value) => {
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      [columnKey]: value,
    };
    setRows(newRows);
  };

  const handleAddRow = () => {
    const maxRows = field.maxRows || 100;
    if (rows.length >= maxRows) {
      alert(`Maximum ${maxRows} rows allowed`);
      return;
    }

    const emptyRow = {};
    field.columns?.forEach((col) => {
      emptyRow[col.key] = '';
    });
    setRows([...rows, emptyRow]);
  };

  const handleRemoveRow = (rowIndex) => {
    const minRows = field.minRows || 1;
    if (rows.length <= minRows) {
      alert(`Minimum ${minRows} row(s) required`);
      return;
    }

    const newRows = rows.filter((_, index) => index !== rowIndex);
    setRows(newRows);
  };

  return (
    <div className="form-field table-field">
      <label className="form-label">
        {field.label}
        {field.required && <span className="required">*</span>}
      </label>

      <div className="table-container">
        <table className="dynamic-table">
          <thead>
            <tr>
              {field.columns?.map((col) => (
                <th key={col.key}>
                  {col.label}
                  {col.required && <span className="required">*</span>}
                </th>
              ))}
              <th style={{ width: '60px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {field.columns?.map((col) => (
                  <td key={col.key}>
                    {col.type === 'select' ? (
                      <select
                        className="table-select"
                        value={row[col.key] || ''}
                        onChange={(e) =>
                          handleCellChange(rowIndex, col.key, e.target.value)
                        }
                        required={col.required}
                      >
                        <option value="">--</option>
                        {col.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : col.type === 'textarea' ? (
                      <textarea
                        className="table-textarea"
                        value={row[col.key] || ''}
                        onChange={(e) =>
                          handleCellChange(rowIndex, col.key, e.target.value)
                        }
                        required={col.required}
                        rows={2}
                      />
                    ) : (
                      <input
                        type={col.type || 'text'}
                        className="table-input"
                        value={row[col.key] || ''}
                        onChange={(e) =>
                          handleCellChange(rowIndex, col.key, e.target.value)
                        }
                        required={col.required}
                      />
                    )}
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(rowIndex)}
                    className="btn-icon btn-danger-icon"
                    title="Remove row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleAddRow}
        className="btn btn-outline btn-sm"
        style={{ marginTop: '0.5rem' }}
      >
        + Add Row
      </button>

      {field.helpText && <span className="form-help">{field.helpText}</span>}
      {errors[field.id] && (
        <span className="form-error">{errors[field.id].message}</span>
      )}
    </div>
  );
}

export default TableField;

