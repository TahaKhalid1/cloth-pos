import { Component } from "react";
import PropTypes from "prop-types";
import Button from "./ui/Button";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ""
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unexpected runtime error."
    };
  }

  componentDidCatch(error) {
    console.error("Page rendering failed", error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({
        hasError: false,
        errorMessage: ""
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      errorMessage: ""
    });
  };

  render() {
    const { children, title } = this.props;
    const { hasError, errorMessage } = this.state;

    if (hasError) {
      return (
        <div className="alert-box" style={{ display: "grid", gap: "0.7rem" }}>
          <strong>{title || "Something went wrong"}</strong>
          <span>{errorMessage}</span>
          <div>
            <Button variant="secondary" onClick={this.handleRetry}>
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  resetKey: PropTypes.string
};

ErrorBoundary.defaultProps = {
  title: "Something went wrong",
  resetKey: ""
};
