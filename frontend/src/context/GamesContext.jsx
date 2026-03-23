import { createContext, useState, useEffect } from "react";

export const GamesContext = createContext();

export const GamesProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const API_URL = "http://localhost:5000/api/games";

    fetch(API_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Falha ao buscar dados da API. O backend está rodando?");
        }
        return response.json();
      })
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const value = {
    games,
    loading,
    error,
  };

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
};
