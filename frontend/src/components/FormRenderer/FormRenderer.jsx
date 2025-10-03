import { useForm } from 'react-hook-form';
import TextField from './FieldTypes/TextField';
import TextareaField from './FieldTypes/TextareaField';
import NumberField from './FieldTypes/NumberField';
import DateField from './FieldTypes/DateField';
import SelectField from './FieldTypes/SelectField';
import TableField from './FieldTypes/TableField';
import './FormRenderer.css';

function FormRenderer({ schema, onSubmit, loading = false }) {
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm();
  
  const formData = watch();

  const evaluateConditional = (conditional) => {
    if (!conditional || !conditional.show_when) {
      return true;
    }

    const { field, operator, value } = conditional.show_when;
    const fieldValue = formData[field];

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return Array.isArray(fieldValue) 
          ? fieldValue.includes(value) 
          : String(fieldValue || '').includes(value);
      default:
        return true;
    }
  };

  const renderField = (field) => {
    const commonProps = {
      field,
      register,
      errors,
      setValue,
    };

    switch (field.type) {
      case 'text':
        return <TextField key={field.id} {...commonProps} />;
      
      case 'textarea':
        return <TextareaField key={field.id} {...commonProps} />;
      
      case 'number':
        return <NumberField key={field.id} {...commonProps} />;
      
      case 'date':
        return <DateField key={field.id} {...commonProps} />;
      
      case 'select':
        return <SelectField key={field.id} {...commonProps} />;
      
      case 'table':
        return <TableField key={field.id} {...commonProps} />;
      
      default:
        return (
          <div key={field.id} className="form-field">
            <div className="alert alert-warning">
              Unsupported field type: {field.type}
            </div>
          </div>
        );
    }
  };

  if (!schema || !schema.sections) {
    return <div className="alert alert-error">Invalid form schema</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-renderer">
      {schema.sections.map((section) => (
        <div key={section.id} className="form-section card">
          <div className="form-section-header">
            <h2 className="form-section-title">{section.title}</h2>
            {section.description && (
              <p className="form-section-description">{section.description}</p>
            )}
          </div>

          <div className="form-section-fields">
            {section.fields?.map((field) => {
              const isVisible = evaluateConditional(field.conditional);
              return isVisible ? renderField(field) : null;
            })}
          </div>
        </div>
      ))}

      <div className="form-actions card">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Generating Document...' : 'Generate Document'}
        </button>
      </div>
    </form>
  );
}

export default FormRenderer;

