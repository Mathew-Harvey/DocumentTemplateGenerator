function SelectField({ field, register, errors }) {
  return (
    <div className="form-field">
      <label htmlFor={field.id} className="form-label">
        {field.label}
        {field.required && <span className="required">*</span>}
      </label>
      
      <select
        id={field.id}
        className="form-select"
        {...register(field.id, {
          required: field.required ? `${field.label} is required` : false,
        })}
      >
        <option value="">-- Select --</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {field.helpText && <span className="form-help">{field.helpText}</span>}
      {errors[field.id] && (
        <span className="form-error">{errors[field.id].message}</span>
      )}
    </div>
  );
}

export default SelectField;

