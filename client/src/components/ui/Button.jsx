import PropTypes from "prop-types";

export default function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
  isLoading = false,
  loadingText = "",
  ...props
}) {
  const buttonContent = isLoading && loadingText ? loadingText : children;

  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="btn-spinner" aria-hidden="true" /> : null}
      {buttonContent}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.string,
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  className: PropTypes.string,
  disabled: PropTypes.bool,
  isLoading: PropTypes.bool,
  loadingText: PropTypes.string
};

Button.defaultProps = {
  children: null,
  variant: "primary",
  type: "button",
  className: "",
  disabled: false,
  isLoading: false,
  loadingText: ""
};
