export default function Table({ className = "", children }) {
  return (
    <div className={`table-wrap ${className}`.trim()}>
      <table className="table">{children}</table>
    </div>
  );
}
