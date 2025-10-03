function NumberField({ field, register, errors }) {
  return (
    <div className="form-field">
      <label htmlFor={field.id} className="form-label">
        {field.label}
        {field.required && <span className="required">*</span>}
      </label>
      
      <input
        id={field.id}
        type="number"
        className="form-input"
        placeholder={field.placeholder}
        {...register(field.id, {
          required: field.required ? `${field.label} is required` : false,
          valueAsNumber: true,
          min: field.validation?.min ? {
            value: field.validation.min,
            message: `Minimum value is ${field.validation.min}`,
          } : undefined,
          max: field.validation?.max ? {
            value: field.validation.max,
            message: `Maximum value is ${field.validation.max}`,
          } : undefined,
        })}
      />
      
      {field.helpText && <span className="form-help">{field.helpText}</span>}
      {errors[field.id] && (
        <span className="form-error">{errors[field.id].message}</span>
      )}
    </div>
  );
}

export default NumberField;

