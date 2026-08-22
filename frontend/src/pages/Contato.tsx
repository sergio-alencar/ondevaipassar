import { useEffect } from "react";
import type { SetSelectedTeam } from "../types";

interface ContatoProps {
  setSelectedTeam: SetSelectedTeam;
}

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};

const Contato = ({ setSelectedTeam }: ContatoProps) => {
  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  return (
    <div className="flex flex-col container max-w-5xl justify-self-center items-center mx-auto max-sm:px-4 grow py-12">
      <div>
        <h1 className="font-bold text-4xl mb-4 uppercase max-sm:text-3xl">Contato</h1>
        <p className="text-xl mb-10">
          Tem alguma sugestão de melhoria para o site? Gostaria muito de saber a sua opinião.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 self-center max-sm:w-full max-sm:px-4"
      >
        <div>
          <label htmlFor="nome" className="block mb-2">
            Nome
          </label>
          <input
            type="text"
            name="nome"
            id="nome"
            className="w-[600px] ring-1 ring-purple-200 rounded-md p-2 focus:outline-none focus:ring-purple-500 focus:ring-2 max-sm:w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            className="w-[600px] ring-1 ring-purple-200 rounded-md p-2 focus:outline-none focus:ring-purple-500 focus:ring-2 max-sm:w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="comentario" className="block mb-2">
            Comentário
          </label>
          <textarea
            name="comentario"
            id="comentario"
            rows={5}
            className="w-[600px] ring-1 ring-purple-200 rounded-md p-2 resize-none focus:outline-none focus:ring-purple-500 focus:ring-2 max-sm:w-full"
            required
          ></textarea>
        </div>
        <button className="block bg-purple-900 text-white uppercase font-bold w-fit px-4 py-2 rounded-md cursor-pointer justify-self-end">
          Enviar
        </button>
      </form>
    </div>
  );
};

export default Contato;
