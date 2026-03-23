import json
import google.generativeai as genai
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

model = genai.GenerativeModel("gemini-1.0-pro")


def buscar_canais_no_gemini(time_casa, time_visitante, campeonato, data_iso):
    data_obj = datetime.fromisoformat(data_iso.replace("Z", "+00:00"))
    data_formatada = data_obj.strftime("%d/%m/%Y às %H:%M")

    prompt = (
        f"Quais canais de TV e plataformas de streaming irão transmitir o jogo de futebol "
        f"entre '{time_casa}' e '{time_visitante}' pelo '{campeonato}' "
        f"no dia {data_formatada} (horário de Brasília)? "
        "Por favor, liste apenas os nomes dos canais e/ou plataformas, separados por vírgula. "
        "Se não souber, diga 'Não informado'."
    )

    print(f"Consultando Gemini para: {time_casa} vs {time_visitante} em {data_formatada}...")
    try:
        response = model.generate_content(prompt)

        if response and response.text:
            canais_str = response.text.strip()
            canais_lista = [c.strip() for c in canais_str.split(",") if c.strip()]

            if "não informado" in [c.lower() for c in canais_lista] or not canais_lista:
                return ["A confirmar"]

            return canais_lista

        else:
            return ["A confirmar"]
    except Exception as e:
        print(f"Erro ao consultar Gemini para '{time_casa} vs {time_visitante}': {e}")
        return ["A confirmar"]


def atualizar_jogos_com_canais():
    try:
        with open("jogos.json", "r", encoding="utf-8") as f:
            jogos = json.load(f)
    except FileNotFoundError:
        print("Arquivo 'jogos.json' não encontrado. Execute 'app.py' primeiro para gerar os dados dos jogos.")
        return

    # Definir o período dos próximos 7 dias
    # data_atual = datetime.now() # Linha antiga
    data_atual = datetime.now(timezone.utc)  # Pega a hora atual com fuso horário UTC

    data_limite = data_atual + timedelta(days=7)  # Jogos até 7 dias no futuro

    jogos_filtrados = []
    for jogo in jogos:
        try:
            # Converte a string de data ISO para objeto datetime
            data_jogo_str = jogo["data"].replace("Z", "+00:00")  # Adiciona offset para parser
            data_jogo = datetime.fromisoformat(data_jogo_str)

            # Filtra apenas os jogos que estão dentro dos próximos 7 dias (e não passaram)
            # Agora ambas data_atual e data_jogo são cientes do fuso horário (UTC), permitindo a comparação
            if data_atual <= data_jogo <= data_limite:
                jogos_filtrados.append(jogo)

        except ValueError as e:
            print(f"Erro ao parsear a data do jogo '{jogo.get('data')}': {e}. Pulando este jogo.")
            continue

    # Agora, itere sobre os jogos filtrados
    for jogo in jogos_filtrados:
        print(f"Consultando Gemini para: {jogo['time_casa']} vs {jogo['time_visitante']} em {jogo['data']}...")

        # ... (o restante do seu código para consultar o Gemini permanece aqui)
        canais_encontrados = buscar_canais_no_gemini(jogo["time_casa"], jogo["time_visitante"], jogo["campeonato"], jogo["data"])

        if canais_encontrados:
            jogo["canais"] = canais_encontrados
            print(f"Canais encontrados para {jogo['time_casa']} vs {jogo['time_visitante']}: {', '.join(canais_encontrados)}")
        else:
            print(f"Não foram encontrados canais para {jogo['time_casa']} vs {jogo['time_visitante']} (mantido '{'A confirmar'}').")

    print("\n--- Atualização de canais finalizada. ---")


if __name__ == "__main__":
    if os.environ.get("GOOGLE_API_KEY") is None:
        print("ATENÇÃO: A variável de ambiente 'GOOGLE_API_KEY' não está definida.")
        print("Por favor, defina-a com sua chave de API do Google AI Studio.")
        print("Ex: export GOOGLE_API_KEY='SUA_CHAVE_AQUI' (Linux/macOS) ou set GOOGLE_API_KEY=SUA_CHAVE_AQUI (Windows CMD)")
        print("Ou descomente a linha 'genai.configure(api_key=\"SUA_CHAVE_AQUI\")' no código e insira sua chave.")

    else:
        atualizar_jogos_com_canais()
