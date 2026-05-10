import PropTypes from "prop-types";

export default function Select({ className = "", children, ...props }) {
  return (
    <select className={`select ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}

Select.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};

Select.defaultProps = {
  className: "",
  children: null
};
