interface TvLoaderProps {
  /** What is being waited for, shown under the TV and read out by screen readers. */
  label?: string;
}

/**
 * The loading indicator, drawn from the site's own mark (the purple TV with
 * the white question mark — the question the site answers) instead of a
 * generic ring: the dot of the "?" bounces like a ball being dribbled, with a
 * little squash as it lands, while the set sways. The motion lives in
 * input.css and is switched off for anyone who asks their system for less
 * motion; the label alone then carries "loading".
 */
const TvLoader = ({ label = "Carregando jogos..." }: TvLoaderProps) => (
  <div role="status" className="flex flex-col items-center gap-3 py-12">
    <svg viewBox="0 0 100 100" className="tv-loader size-20" aria-hidden="true">
      <path fill="#59168B" d="M5.71744 81.8135C-1.90692 73.9034 -1.9047 27.095 5.71744 19.1849C16.0862 8.42302 86.561 8.12143 95.1742 19.1849C101.607 27.452 101.61 73.5442 95.1742 81.8135C86.5588 92.8769 16.0884 92.5798 5.71744 81.8135Z" />
      <path fill="#fff" d="M58.0898 38.1788C58.0898 37.0477 57.7922 36.1051 57.1969 35.351C56.6557 34.543 55.8169 33.9506 54.6805 33.5735C53.5982 33.1426 52.2453 32.9272 50.6218 32.9272C48.2948 32.9272 45.8866 33.5196 43.3972 34.7046C40.9079 35.8896 38.8244 37.694 37.1468 40.1179L27 31.1497C29.327 28.7258 31.7622 26.706 34.3057 25.0901C36.8492 23.4203 39.5279 22.1545 42.342 21.2927C45.2101 20.4309 48.2406 20 51.4335 20C54.1934 20 56.8993 20.377 59.551 21.1311C62.2027 21.8852 64.6108 23.0433 66.7755 24.6053C68.9942 26.1135 70.753 27.9987 72.0518 30.2609C73.3506 32.5232 74 35.1625 74 38.1788C74 41.5722 73.1341 44.4808 71.4024 46.9046C69.6707 49.2746 67.4519 51.1868 64.7461 52.6411C62.0944 54.0415 59.3345 55.0918 56.4663 55.7921L56.2228 60.8013H43.2349L41.6114 46.2583H44.5337C47.7807 46.2583 50.4053 45.8004 52.4076 44.8848C54.4099 43.9152 55.844 42.811 56.7098 41.5722C57.6298 40.2795 58.0898 39.1483 58.0898 38.1788Z" />
      <g className="tv-loader-dot">
        <path fill="#fff" d="M40.1503 72.9205C40.1503 70.766 41.0432 68.8808 42.829 67.2649C44.6149 65.649 46.9148 64.8411 49.7288 64.8411C52.597 64.8411 54.897 65.649 56.6287 67.2649C58.4145 68.8808 59.3074 70.766 59.3074 72.9205C59.3074 75.0751 58.4145 76.9603 56.6287 78.5762C54.897 80.1921 52.597 81 49.7288 81C46.9148 81 44.6149 80.1921 42.829 78.5762C41.0432 76.9603 40.1503 75.0751 40.1503 72.9205Z" />
      </g>
    </svg>
    <p className="text-lg font-bold uppercase text-[#59168B]">{label}</p>
  </div>
);

export default TvLoader;
