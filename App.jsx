// App.jsx

import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Home from "./pages/Home";
import TimePage from "./pages/TimePage";
import Contato from "./pages/Contato";
import Sobre from "./pages/Sobre";

const App = () => {
	const [selectedTime, setSelectedTime] = useState(null);

	return (
		<div className="flex flex-col min-h-screen justify-between">
			<Header selectedTime={selectedTime} setSelectedTime={setSelectedTime} />
			<Routes>
				<Route path="/" element={<Home setSelectedTime={setSelectedTime} />} />
				<Route
					path="time/:nome"
					element={
						<TimePage
							selectedTime={selectedTime}
							setSelectedTime={setSelectedTime}
						/>
					}
				/>
				<Route
					path="contato"
					element={
						<Contato
							selectedTime={selectedTime}
							setSelectedTime={setSelectedTime}
						/>
					}
				></Route>
				<Route
					path="sobre"
					element={
						<Sobre
							selectedTime={selectedTime}
							setSelectedTime={setSelectedTime}
						/>
					}
				></Route>
			</Routes>
			<Footer selectedTime={selectedTime} />
		</div>
	);
};

export default App;
