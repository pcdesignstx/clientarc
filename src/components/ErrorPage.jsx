import { useRouteError, Link } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {error.status === 404 ? "Page Not Found" : "Oops!"}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {error.status === 404
              ? "The page you're looking for doesn't exist."
              : "Sorry, an unexpected error has occurred."}
          </p>
          <p className="text-gray-500 mb-8">
            {error.statusText || error.message}
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
} 