export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  // Accepts formats: +254712345678, 254712345678, 0712345678, 712345678
  const re = /^(\+?254|0)?[17]\d{8}$/;
  return re.test(phone.replace(/\s/g, ''));
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim() !== '';
};

export const validateMinLength = (value, min) => {
  return value && value.toString().length >= min;
};

export const validateMaxLength = (value, max) => {
  return !value || value.toString().length <= max;
};

export const validateNumber = (value, min = null, max = null) => {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;
  return true;
};

export const validateDate = (date, minDate = null, maxDate = null) => {
  if (!date) return false;
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return false;
  if (minDate && dateObj < new Date(minDate)) return false;
  if (maxDate && dateObj > new Date(maxDate)) return false;
  return true;
};

export const getFieldError = (value, rules) => {
  if (!rules) return null;

  if (rules.required && !validateRequired(value)) {
    return rules.requiredMessage || 'This field is required';
  }

  if (value && rules.email && !validateEmail(value)) {
    return rules.emailMessage || 'Please enter a valid email address';
  }

  if (value && rules.phone && !validatePhone(value)) {
    return rules.phoneMessage || 'Please enter a valid phone number';
  }

  if (value && rules.minLength && !validateMinLength(value, rules.minLength)) {
    return rules.minLengthMessage || `Minimum length is ${rules.minLength} characters`;
  }

  if (value && rules.maxLength && !validateMaxLength(value, rules.maxLength)) {
    return rules.maxLengthMessage || `Maximum length is ${rules.maxLength} characters`;
  }

  if (value && rules.number) {
    if (!validateNumber(value, rules.min, rules.max)) {
      if (rules.min !== null && rules.max !== null) {
        return rules.numberMessage || `Must be between ${rules.min} and ${rules.max}`;
      } else if (rules.min !== null) {
        return rules.numberMessage || `Must be at least ${rules.min}`;
      } else if (rules.max !== null) {
        return rules.numberMessage || `Must be at most ${rules.max}`;
      }
      return rules.numberMessage || 'Please enter a valid number';
    }
  }

  if (value && rules.date) {
    if (!validateDate(value, rules.minDate, rules.maxDate)) {
      return rules.dateMessage || 'Please enter a valid date';
    }
  }

  return null;
};

export const validateForm = (formData, schema) => {
  const errors = {};
  let isValid = true;

  Object.keys(schema).forEach((field) => {
    const error = getFieldError(formData[field], schema[field]);
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  });

  return { isValid, errors };
};

