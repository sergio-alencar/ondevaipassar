import type { ReactNode } from "react";
import TvLoader from "./TvLoader";

interface DataStateProps {
  loading: boolean;
  error: string | null;
  children: ReactNode;
}

/** The loading indicator and error message every page that reads the matches shares, so each one doesn't carry its own copy. Renders the children only once the data is there. */
const DataState = ({ loading, error, children }: DataStateProps) => {
  if (loading) {
    return <TvLoader />;
  }
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2 text-lg">Erro ao carregar os jogos:</p>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }
  return <>{children}</>;
};

export default DataState;
