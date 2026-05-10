import { forwardRef } from "react";
import PropTypes from "prop-types";

const Input = forwardRef(function Input({ className = "", ...props }, ref) {
  return <input ref={ref} className={`input ${className}`.trim()} {...props} />;
});

Input.propTypes = {
  className: PropTypes.string
};

Input.defaultProps = {
  className: ""
};

export default Input;
