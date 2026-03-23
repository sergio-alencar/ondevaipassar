import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Home from "./pages/Home";
import TimePage from "./pages/TimePage";
import Contato from "./pages/Contato";
import Sobre from "./pages/Sobre";

import { GamesProvider } from "./context/GamesContext";

const App = () => {
  const [selectedTime, setSelectedTime] = useState(null);

  return (
    <GamesProvider>
      <div className="flex flex-col min-h-screen justify-between bg-gray-100">
        <Header selectedTime={selectedTime} setSelectedTime={setSelectedTime} />

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home setSelectedTime={setSelectedTime} />} />
            <Route
              path="time/:nome"
              element={<TimePage selectedTime={selectedTime} setSelectedTime={setSelectedTime} />}
            />
            <Route path="contato" element={<Contato />} />
            <Route path="sobre" element={<Sobre />} />
          </Routes>
        </main>

        <Footer selectedTime={selectedTime} />
      </div>
    </GamesProvider>
  );
};

export default App;
