import PropTypes from "prop-types";

export default function LoadingState({ message = "Loading data..." }) {
  return (
    <div className="loading-state">
      <div>
        <div className="loader" />
        <div>{message}</div>
      </div>
    </div>
  );
}

LoadingState.propTypes = {
  message: PropTypes.string
};

LoadingState.defaultProps = {
  message: "Loading data..."
};
