// DropdownMenuTime.jsx

import React from "react";
import { Link } from "react-router-dom";

const DropdownMenuTime = ({ time, setSelectedTime }) => {
  const handleClick = () => {
    setSelectedTime(time);
  };

  const baseUrl =
    "https://raw.githubusercontent.com/sergio-alencar/ondevaipassar-teste/main/public/images/times/";
  const urlFinal = `${baseUrl}${time.nome}.svg`;

  return (
    <li>
      <Link to={`/time/${time.nome}`} onClick={handleClick}>
        <img
          className="size-10 opacity-70 hover:opacity-100 transition max-sm:opacity-100 max-sm:size-14 max-sm:my-2 max-sm:"
          src={urlFinal}
          alt={`${time.maiusculo}`}
          title={`${time.maiusculo}`}
        />
      </Link>
    </li>
  );
};

export default DropdownMenuTime;
