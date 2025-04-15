export default function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-md rounded-xl p-6 ${className}`}>
      {title && (
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h2>
      )}
      {children}
    </div>
  );
} 