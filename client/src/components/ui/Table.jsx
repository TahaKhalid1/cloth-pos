import PropTypes from "prop-types";

export default function Table({ className = "", children }) {
  return (
    <div className={`table-wrap ${className}`.trim()}>
      <table className="table">{children}</table>
    </div>
  );
}

Table.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};

Table.defaultProps = {
  className: "",
  children: null
};
