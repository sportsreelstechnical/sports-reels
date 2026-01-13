// Competition data organized by country and type
const INTERNATIONAL_COMPETITIONS = [
  { name: "FIFA World Cup", type: "international" },
  { name: "FIFA World Cup Qualifiers", type: "international" },
  { name: "UEFA European Championship", type: "international" },
  { name: "UEFA Nations League", type: "international" },
  { name: "Copa America", type: "international" },
  { name: "Africa Cup of Nations", type: "international" },
  { name: "AFC Asian Cup", type: "international" },
  { name: "CONCACAF Gold Cup", type: "international" },
  { name: "International Friendly", type: "friendly" },
];

const CONTINENTAL_COMPETITIONS = [
  { name: "UEFA Champions League", type: "continental" },
  { name: "UEFA Europa League", type: "continental" },
  { name: "UEFA Conference League", type: "continental" },
  { name: "CAF Champions League", type: "continental" },
  { name: "CAF Confederation Cup", type: "continental" },
  { name: "Copa Libertadores", type: "continental" },
  { name: "Copa Sudamericana", type: "continental" },
  { name: "AFC Champions League", type: "continental" },
  { name: "CONCACAF Champions Cup", type: "continental" },
];

const LEAGUES_BY_COUNTRY: Record<string, { name: string; type: string }[]> = {
  england: [
    { name: "Premier League", type: "league" },
    { name: "EFL Championship", type: "league" },
    { name: "EFL League One", type: "league" },
    { name: "EFL League Two", type: "league" },
    { name: "FA Cup", type: "cup" },
    { name: "EFL Cup", type: "cup" },
    { name: "Community Shield", type: "cup" },
  ],
  spain: [
    { name: "La Liga", type: "league" },
    { name: "La Liga 2", type: "league" },
    { name: "Copa del Rey", type: "cup" },
    { name: "Supercopa de Espana", type: "cup" },
  ],
  germany: [
    { name: "Bundesliga", type: "league" },
    { name: "2. Bundesliga", type: "league" },
    { name: "DFB-Pokal", type: "cup" },
    { name: "DFL-Supercup", type: "cup" },
  ],
  italy: [
    { name: "Serie A", type: "league" },
    { name: "Serie B", type: "league" },
    { name: "Coppa Italia", type: "cup" },
    { name: "Supercoppa Italiana", type: "cup" },
  ],
  france: [
    { name: "Ligue 1", type: "league" },
    { name: "Ligue 2", type: "league" },
    { name: "Coupe de France", type: "cup" },
    { name: "Coupe de la Ligue", type: "cup" },
    { name: "Trophee des Champions", type: "cup" },
  ],
  netherlands: [
    { name: "Eredivisie", type: "league" },
    { name: "Eerste Divisie", type: "league" },
    { name: "KNVB Cup", type: "cup" },
    { name: "Johan Cruyff Shield", type: "cup" },
  ],
  portugal: [
    { name: "Primeira Liga", type: "league" },
    { name: "Liga Portugal 2", type: "league" },
    { name: "Taca de Portugal", type: "cup" },
    { name: "Supertaca Candido de Oliveira", type: "cup" },
  ],
  norway: [
    { name: "Eliteserien", type: "league" },
    { name: "OBOS-ligaen", type: "league" },
    { name: "Norwegian Cup", type: "cup" },
  ],
  nigeria: [
    { name: "Nigeria Professional Football League", type: "league" },
    { name: "Nigeria National League", type: "league" },
    { name: "Federation Cup", type: "cup" },
    { name: "FA Cup", type: "cup" },
  ],
  usa: [
    { name: "Major League Soccer", type: "league" },
    { name: "USL Championship", type: "league" },
    { name: "US Open Cup", type: "cup" },
    { name: "MLS Cup", type: "cup" },
  ],
};

export function getCompetitionsByCountry(
  country?: string
): { name: string; type: string }[] {
  const countryCompetitions =
    LEAGUES_BY_COUNTRY[country?.toLowerCase() || ""] || [];
  return [
    ...countryCompetitions,
    ...CONTINENTAL_COMPETITIONS,
    ...INTERNATIONAL_COMPETITIONS,
  ];
}
