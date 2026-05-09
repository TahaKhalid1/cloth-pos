export default function Badge({ children, variant = "muted", className = "", ...props }) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}
