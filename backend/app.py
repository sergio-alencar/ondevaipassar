import json
import requests
from flask import Flask, jsonify
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import locale

try:
    locale.setlocale(locale.LC_TIME, "pt_BR.UTF-8")
except locale.Error:
    print("Locale pt_BR.UTF-8 não encontrado. Usando o locale padrão.")

app = Flask(__name__)
CORS(app)


def fetch_jogos_from_api():
    print("--- Iniciando a busca de jogos via football-data.org (v49 - Solução Definitiva) ---")

    URL = "https://api.football-data.org/v4/competitions/BSA/matches"

    API_KEY = "c48cbc8a9fa343d9bbef61fc9b0afe7e"

    headers = {"X-Auth-Token": API_KEY}
    params = {"status": "SCHEDULED"}

    dados_dos_jogos = []

    try:
        response = requests.get(URL, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()

        if not data or "matches" not in data:
            print("API não retornou a chave 'matches'.")
            return

        for partida in data["matches"]:
            try:
                data_iso = partida.get("utcDate")

                jogo_info = {
                    "time_casa": partida.get("homeTeam", {}).get("name"),
                    "time_visitante": partida.get("awayTeam", {}).get("name"),
                    "campeonato": partida.get("competition", {}).get("name"),
                    "data": data_iso,
                    "canais": ["A confirmar"],
                }
                dados_dos_jogos.append(jogo_info)

            except (KeyError, TypeError, ValueError) as e:
                print(f"Erro ao processar uma partida: {e}")
                continue

    except requests.exceptions.RequestException as e:
        print(f"Erro ao chamar a API: {e}")
        return
    except json.JSONDecodeError:
        print("Erro ao descodificar a resposta JSON da API.")
        return

    with open("jogos.json", "w", encoding="utf-8") as f:
        json.dump(dados_dos_jogos, f, ensure_ascii=False, indent=4)

    print(f"--- Busca na API finalizada. {len(dados_dos_jogos)} jogos encontrados e salvos. ---")


@app.route("/api/games")
def get_games():
    try:
        with open("jogos.json", "r", encoding="utf-8") as f:
            dados = json.load(f)
        return jsonify(dados)
    except FileNotFoundError:
        return (
            jsonify({"error": "Dados dos jogos ainda não foram gerados. Aguarde a busca na API."}),
            404,
        )


if __name__ == "__main__":
    fetch_jogos_from_api()
    scheduler = BackgroundScheduler()
    scheduler.add_job(func=fetch_jogos_from_api, trigger="interval", hours=1)
    scheduler.start()
    app.run(debug=True, use_reloader=False, port=5000)
