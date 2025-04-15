export default function Welcome({ onNext }) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to ClientArc!
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Let's get your workspace set up. We'll guide you through creating your first content flow and inviting your first client.
      </p>
      <button
        onClick={() => onNext({})}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
      >
        Get Started
      </button>
    </div>
  );
} 