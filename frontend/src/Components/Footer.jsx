const colorMap = {
  "purple-900": "bg-purple-900",
  black: "bg-black",
  "blue-900": "bg-blue-900",
  "red-800": "bg-red-800",
  "blue-800": "bg-blue-800",
  "green-900": "bg-green-900",
};

const Footer = ({ selectedTime }) => {
  const colorKey = selectedTime ? selectedTime.cor : "purple-900";
  const footerBgClass = colorMap[colorKey] || "bg-purple-900";

  return (
    <footer className={`${footerBgClass} px-12 max-sm:px-4 transition-colors duration-300`}>
      <div className="grid py-6 mx-12 max-sm:mx-4 max-sm:py-4">
        <p className="font-bold uppercase text-xs justify-self-center text-white">
          Onde Vai Passar &copy; 2025
        </p>
      </div>
    </footer>
  );
};

export default Footer;
