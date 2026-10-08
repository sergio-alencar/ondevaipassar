import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Home from "./pages/Home";
import TeamPage from "./pages/TeamPage";
import Sobre from "./pages/Sobre";
import Digest from "./pages/Digest";
import CampeonatoPage from "./pages/CampeonatoPage";
import CanalPage from "./pages/CanalPage";
import GratisPage from "./pages/GratisPage";
import MeusCanaisPage from "./pages/MeusCanaisPage";
import ContaPage from "./pages/ContaPage";
import PrivacidadePage from "./pages/PrivacidadePage";
import LoginNotice from "./Components/LoginNotice";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthProvider";
import { MatchesProvider } from "./context/MatchesContext";
import { PreferencesProvider } from "./context/PreferencesProvider";
import type { SelectedTeam } from "./types";

const App = () => {
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeam>(null);

  return (
    <AuthProvider>
      <PreferencesProvider>
        <MatchesProvider>
          <div className="flex flex-col min-h-screen justify-between bg-gray-100">
            <Header selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} />
            <LoginNotice />

            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home setSelectedTeam={setSelectedTeam} />} />
                <Route path="time/:teamId" element={<TeamPage setSelectedTeam={setSelectedTeam} />} />
                <Route path="campeonato/:id" element={<CampeonatoPage setSelectedTeam={setSelectedTeam} />} />
                <Route path="canal/:id" element={<CanalPage setSelectedTeam={setSelectedTeam} />} />
                <Route path="gratis" element={<GratisPage setSelectedTeam={setSelectedTeam} />} />
                <Route path="meus-canais" element={<MeusCanaisPage setSelectedTeam={setSelectedTeam} />} />
                <Route path="conta" element={<ContaPage setSelectedTeam={setSelectedTeam} />} />
              <Route path="privacidade" element={<PrivacidadePage setSelectedTeam={setSelectedTeam} />} />
              <Route path="sobre" element={<Sobre setSelectedTeam={setSelectedTeam} />} />
                {/* Not linked from the menu or footer — operator tool, see Digest.tsx. */}
                <Route path="digest" element={<Digest setSelectedTeam={setSelectedTeam} />} />
                <Route path="*" element={<NotFound setSelectedTeam={setSelectedTeam} />} />
              </Routes>
            </main>

            <Footer selectedTeam={selectedTeam} />
          </div>
        </MatchesProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
};

export default App;
