export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="skeleton h-16 w-72" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((x) => (
          <div key={x} className="skeleton h-28" />
        ))}
      </div>
      <div className="skeleton h-96" />
    </div>
  );
}
