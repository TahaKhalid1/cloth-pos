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
