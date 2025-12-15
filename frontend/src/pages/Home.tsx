import { useQuery } from '@tanstack/react-query';
import { healthApi } from '@/api/client';

export function Home() {
  // Example query using React Query
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Welcome to Your Databricks App
          </h1>
          <p className="text-lg text-gray-600">
            A modern FastAPI + React template for building data applications on Databricks
          </p>
        </div>

        {/* Health Check Card */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            API Health Check
          </h2>

          {isLoading && (
            <div className="text-gray-600">Checking API status...</div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-red-800">
              <p className="font-medium">Error connecting to API</p>
              <p className="mt-1 text-sm">{(error as Error).message}</p>
            </div>
          )}

          {health && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    API is healthy
                  </p>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Version: {health.version}</p>
                    <p>Environment: {health.environment}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Getting Started */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Getting Started
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">1. Configure Unity Catalog</h3>
              <p className="mt-1 text-sm text-gray-600">
                Update <code className="rounded bg-gray-100 px-1 py-0.5">backend/app/core/config.py</code> with your catalog and schema names.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">2. Define Your Models</h3>
              <p className="mt-1 text-sm text-gray-600">
                Create Pydantic models in <code className="rounded bg-gray-100 px-1 py-0.5">backend/app/models/schemas.py</code> matching your UC tables.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">3. Build API Endpoints</h3>
              <p className="mt-1 text-sm text-gray-600">
                Add routes in <code className="rounded bg-gray-100 px-1 py-0.5">backend/app/api/routes/</code> for your business logic.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">4. Create React Components</h3>
              <p className="mt-1 text-sm text-gray-600">
                Build UI components in <code className="rounded bg-gray-100 px-1 py-0.5">frontend/src/components/</code> and pages in <code className="rounded bg-gray-100 px-1 py-0.5">frontend/src/pages/</code>.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">5. Deploy to Databricks</h3>
              <p className="mt-1 text-sm text-gray-600">
                Build frontend and deploy using <code className="rounded bg-gray-100 px-1 py-0.5">databricks apps create</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Documentation Links */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            <a
              href="/api/docs"
              className="text-primary-600 hover:text-primary-700 font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              View API Documentation →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
