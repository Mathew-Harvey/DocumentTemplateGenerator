function TextField({ field, register, errors }) {
  return (
    <div className="form-field">
      <label htmlFor={field.id} className="form-label">
        {field.label}
        {field.required && <span className="required">*</span>}
      </label>
      
      <input
        id={field.id}
        type="text"
        className="form-input"
        placeholder={field.placeholder}
        {...register(field.id, {
          required: field.required ? `${field.label} is required` : false,
          minLength: field.validation?.minLength ? {
            value: field.validation.minLength,
            message: `Minimum length is ${field.validation.minLength}`,
          } : undefined,
          maxLength: field.validation?.maxLength ? {
            value: field.validation.maxLength,
            message: `Maximum length is ${field.validation.maxLength}`,
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

export default TextField;

