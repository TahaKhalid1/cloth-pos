import PropTypes from "prop-types";

export default function Badge({ children, variant = "muted", className = "", ...props }) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.string,
  className: PropTypes.string
};

Badge.defaultProps = {
  children: null,
  variant: "muted",
  className: ""
};
