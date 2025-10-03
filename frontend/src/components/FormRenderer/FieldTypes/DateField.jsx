function DateField({ field, register, errors }) {
  const getDefaultValue = () => {
    if (field.defaultValue === 'today') {
      return new Date().toISOString().split('T')[0];
    }
    return field.defaultValue || '';
  };

  return (
    <div className="form-field">
      <label htmlFor={field.id} className="form-label">
        {field.label}
        {field.required && <span className="required">*</span>}
      </label>
      
      <input
        id={field.id}
        type="date"
        className="form-input"
        defaultValue={getDefaultValue()}
        {...register(field.id, {
          required: field.required ? `${field.label} is required` : false,
        })}
      />
      
      {field.helpText && <span className="form-help">{field.helpText}</span>}
      {errors[field.id] && (
        <span className="form-error">{errors[field.id].message}</span>
      )}
    </div>
  );
}

export default DateField;

