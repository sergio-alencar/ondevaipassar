import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Home from "./pages/Home";
import TeamPage from "./pages/TeamPage";
import Sobre from "./pages/Sobre";
import Digest from "./pages/Digest";
import NotFound from "./pages/NotFound";
import { MatchesProvider } from "./context/MatchesContext";
import type { SelectedTeam } from "./types";

const App = () => {
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeam>(null);

  return (
    <MatchesProvider>
      <div className="flex flex-col min-h-screen justify-between bg-gray-100">
        <Header selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} />

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home setSelectedTeam={setSelectedTeam} />} />
            <Route path="time/:teamId" element={<TeamPage setSelectedTeam={setSelectedTeam} />} />
            <Route path="sobre" element={<Sobre setSelectedTeam={setSelectedTeam} />} />
            {/* Not linked from the menu or footer — operator tool, see Digest.tsx. */}
            <Route path="digest" element={<Digest setSelectedTeam={setSelectedTeam} />} />
            <Route path="*" element={<NotFound setSelectedTeam={setSelectedTeam} />} />
          </Routes>
        </main>

        <Footer selectedTeam={selectedTeam} />
      </div>
    </MatchesProvider>
  );
};

export default App;
