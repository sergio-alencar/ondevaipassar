import { useCallback, useEffect, useState } from "react";
import { fetchDigest, type DigestDay, type DigestFormat, type DigestResponse } from "../api/client";
import type { SetSelectedTeam } from "../types";

interface DigestProps {
  setSelectedTeam: SetSelectedTeam;
}

const FORMATS: { value: DigestFormat; label: string }[] = [
  { value: "whatsapp", label: "Canal do WhatsApp" },
  { value: "x", label: "X/Twitter" },
];

const DAYS: { value: DigestDay; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "amanha", label: "Amanhã" },
];

/**
 * Operator page: the daily text to paste into the Canal do WhatsApp and
 * into X. Deliberately not linked from the menu or the footer — it shows
 * the same public data as the rest of the site, but it's a tool for
 * posting, not something a visitor came here for.
 *
 * The whole reason this exists instead of just opening /api/digest in a
 * browser: the X version is a dozen separate posts, and selecting each one
 * by hand without catching the separator (or clipping a character) is both
 * tedious and a real way to publish something wrong.
 */
const Digest = ({ setSelectedTeam }: DigestProps) => {
  const [formato, setFormato] = useState<DigestFormat>("whatsapp");
  const [dia, setDia] = useState<DigestDay>("hoje");
  const [digest, setDigest] = useState<DigestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setCopiedIndex(null);

    fetchDigest(formato, dia)
      .then((result) => {
        if (!cancelled) setDigest(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Falha ao gerar o digest");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formato, dia]);

  const copy = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 2000);
    } catch {
      // Clipboard access can be refused (an insecure origin, a browser
      // permission prompt denied) — say so instead of showing a silent
      // no-op that looks like it worked.
      setError("O navegador bloqueou a cópia. Selecione o texto e copie manualmente.");
    }
  }, []);

  return (
    <main className="flex flex-col grow max-w-7xl mx-auto px-24 max-sm:px-6 py-12 w-full">
      <h1 className="text-4xl font-bold uppercase mb-2 max-sm:text-3xl">Digest diário</h1>
      <p className="text-lg text-gray-600 mb-8">
        Texto pronto para publicar. Clique em copiar e cole na plataforma.
      </p>

      <div className="flex flex-wrap gap-6 mb-8">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold uppercase text-gray-500">Onde</span>
          <div className="flex gap-2">
            {FORMATS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormato(option.value)}
                className={`px-4 py-2 rounded-lg font-bold transition-colors max-sm:text-sm max-sm:px-3 ${
                  formato === option.value ? "bg-purple-900 text-white" : "bg-white text-purple-900 hover:bg-purple-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold uppercase text-gray-500">Quando</span>
          <div className="flex gap-2">
            {DAYS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDia(option.value)}
                className={`px-4 py-2 rounded-lg font-bold transition-colors max-sm:text-sm max-sm:px-3 ${
                  dia === option.value ? "bg-purple-900 text-white" : "bg-white text-purple-900 hover:bg-purple-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <p className="text-xl">Gerando…</p>}
      {error && <p className="text-xl text-red-700 mb-6">{error}</p>}

      {digest && !isLoading && (
        <>
          <p className="text-gray-600 mb-4">
            {digest.matchCount} {digest.matchCount === 1 ? "jogo" : "jogos"}
            {digest.posts.length > 1 && ` · ${digest.posts.length} posts, publique na ordem`}
          </p>

          <ol className="flex flex-col gap-4">
            {digest.posts.map((post, index) => (
              <li key={index} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center gap-4 mb-3">
                  <span className="text-sm font-bold uppercase text-gray-500">
                    {digest.posts.length > 1 ? `Post ${index + 1} de ${digest.posts.length}` : "Mensagem"}
                    {formato === "x" && ` · ${[...post].length}/280`}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copy(post, index)}
                    className="px-4 py-2 rounded-lg font-bold bg-purple-900 text-white hover:bg-purple-700 transition-colors shrink-0"
                  >
                    {copiedIndex === index ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                {/* Preserves the newlines exactly as they'll be published — this is the text itself, not a rendering of it. */}
                <pre className="whitespace-pre-wrap break-words font-sans text-base">{post}</pre>
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
};

export default Digest;
