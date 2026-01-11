import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from "react-simple-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Globe, MapPin, ArrowRight, Users } from "lucide-react";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface PlayerOrigin {
  country: string;
  count: number;
  players: Array<{ id: string; name: string }>;
}

interface TransferDestination {
  fromCountry: string;
  toCountry: string;
  playerName: string;
  playerId: string;
}

interface WorldMapProps {
  playerOrigins: PlayerOrigin[];
  transferDestinations: TransferDestination[];
}

const countryCoordinates: Record<string, [number, number]> = {
  "nigeria": [8.6753, 9.0820],
  "norway": [8.4689, 60.4720],
  "benin": [2.3158, 9.3077],
  "ghana": [-1.0232, 7.9465],
  "senegal": [-14.4524, 14.4974],
  "cameroon": [12.3547, 7.3697],
  "ivory coast": [-5.5471, 7.5400],
  "cote d'ivoire": [-5.5471, 7.5400],
  "mali": [-3.9962, 17.5707],
  "burkina faso": [-1.5616, 12.2383],
  "togo": [0.8248, 8.6195],
  "guinea": [-9.6966, 9.9456],
  "morocco": [-7.0926, 31.7917],
  "egypt": [30.8025, 26.8206],
  "south africa": [22.9375, -30.5595],
  "algeria": [1.6596, 28.0339],
  "tunisia": [9.5375, 33.8869],
  "dr congo": [21.7587, -4.0383],
  "zambia": [27.8493, -13.1339],
  "zimbabwe": [29.1549, -19.0154],
  "united kingdom": [-3.4360, 55.3781],
  "england": [-1.1743, 52.3555],
  "scotland": [-4.2026, 56.4907],
  "wales": [-3.7837, 52.1307],
  "germany": [10.4515, 51.1657],
  "france": [2.2137, 46.2276],
  "spain": [-3.7492, 40.4637],
  "italy": [12.5674, 41.8719],
  "portugal": [-8.2245, 39.3999],
  "netherlands": [5.2913, 52.1326],
  "belgium": [4.4699, 50.5039],
  "denmark": [9.5018, 56.2639],
  "sweden": [18.6435, 60.1282],
  "poland": [19.1451, 51.9194],
  "turkey": [35.2433, 38.9637],
  "greece": [21.8243, 39.0742],
  "austria": [14.5501, 47.5162],
  "switzerland": [8.2275, 46.8182],
  "czech republic": [15.4730, 49.8175],
  "ukraine": [31.1656, 48.3794],
  "russia": [105.3188, 61.5240],
  "united states": [-95.7129, 37.0902],
  "usa": [-95.7129, 37.0902],
  "brazil": [-51.9253, -14.2350],
  "argentina": [-63.6167, -38.4161],
  "mexico": [-102.5528, 23.6345],
  "colombia": [-74.2973, 4.5709],
  "chile": [-71.5430, -35.6751],
  "uruguay": [-55.7658, -32.5228],
  "japan": [138.2529, 36.2048],
  "south korea": [127.7669, 35.9078],
  "china": [104.1954, 35.8617],
  "australia": [133.7751, -25.2744],
  "qatar": [51.1839, 25.3548],
  "saudi arabia": [45.0792, 23.8859],
  "uae": [53.8478, 23.4241],
  "united arab emirates": [53.8478, 23.4241],
};

function getCountryCoordinates(country: string): [number, number] | null {
  const normalizedCountry = country.toLowerCase().trim();
  return countryCoordinates[normalizedCountry] || null;
}

function getMarkerColor(count: number): string {
  if (count >= 5) return "hsl(var(--chart-1))";
  if (count >= 3) return "hsl(var(--chart-2))";
  return "hsl(var(--chart-3))";
}

export default function WorldMap({ playerOrigins, transferDestinations }: WorldMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<PlayerOrigin | null>(null);
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

  const validOrigins = useMemo(() => {
    return playerOrigins.filter(origin => getCountryCoordinates(origin.country));
  }, [playerOrigins]);

  const validTransfers = useMemo(() => {
    return transferDestinations.filter(
      transfer => 
        getCountryCoordinates(transfer.fromCountry) && 
        getCountryCoordinates(transfer.toCountry)
    );
  }, [transferDestinations]);

  const totalPlayers = validOrigins.reduce((sum, o) => sum + o.count, 0);
  const uniqueCountries = validOrigins.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            Player Origins & Transfers
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {totalPlayers} Players
            </Badge>
            <Badge variant="outline">
              <MapPin className="h-3 w-3 mr-1" />
              {uniqueCountries} Countries
            </Badge>
            {validTransfers.length > 0 && (
              <Badge variant="outline">
                <ArrowRight className="h-3 w-3 mr-1" />
                {validTransfers.length} Transfers
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[400px] bg-muted/30 rounded-md overflow-hidden">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 130,
              center: [0, 20],
            }}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              onMoveEnd={({ coordinates, zoom }) => setPosition({ coordinates, zoom })}
              minZoom={1}
              maxZoom={5}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="hsl(var(--muted))"
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "hsl(var(--accent))", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

              {validTransfers.map((transfer, index) => {
                const fromCoords = getCountryCoordinates(transfer.fromCountry);
                const toCoords = getCountryCoordinates(transfer.toCountry);
                if (!fromCoords || !toCoords) return null;

                return (
                  <Line
                    key={`transfer-${index}`}
                    from={fromCoords}
                    to={toCoords}
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeDasharray="4 2"
                    style={{
                      opacity: 0.6,
                    }}
                  />
                );
              })}

              {validOrigins.map((origin) => {
                const coords = getCountryCoordinates(origin.country);
                if (!coords) return null;

                return (
                  <Tooltip key={origin.country}>
                    <TooltipTrigger asChild>
                      <Marker
                        coordinates={coords}
                        onMouseEnter={() => setHoveredCountry(origin)}
                        onMouseLeave={() => setHoveredCountry(null)}
                      >
                        <circle
                          r={Math.min(4 + origin.count * 2, 12)}
                          fill={getMarkerColor(origin.count)}
                          stroke="hsl(var(--background))"
                          strokeWidth={1.5}
                          style={{ cursor: "pointer" }}
                        />
                        <text
                          textAnchor="middle"
                          y={-10}
                          style={{
                            fontFamily: "inherit",
                            fontSize: "8px",
                            fill: "hsl(var(--foreground))",
                            fontWeight: 600,
                          }}
                        >
                          {origin.count}
                        </text>
                      </Marker>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <div className="space-y-1">
                        <p className="font-semibold capitalize">{origin.country}</p>
                        <p className="text-xs text-muted-foreground">
                          {origin.count} player{origin.count !== 1 ? 's' : ''}
                        </p>
                        <div className="text-xs">
                          {origin.players.slice(0, 3).map(p => (
                            <p key={p.id}>{p.name}</p>
                          ))}
                          {origin.players.length > 3 && (
                            <p className="text-muted-foreground">+{origin.players.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {validTransfers.map((transfer, index) => {
                const toCoords = getCountryCoordinates(transfer.toCountry);
                if (!toCoords) return null;

                return (
                  <Marker key={`dest-${index}`} coordinates={toCoords}>
                    <circle
                      r={6}
                      fill="hsl(var(--destructive))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      style={{ cursor: "pointer" }}
                    />
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          {hoveredCountry && (
            <div className="absolute bottom-4 left-4 bg-card border rounded-md p-3 shadow-lg">
              <p className="font-semibold capitalize">{hoveredCountry.country}</p>
              <p className="text-sm text-muted-foreground">
                {hoveredCountry.count} player{hoveredCountry.count !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <div className="absolute bottom-4 right-4 bg-card/90 border rounded-md p-2 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
              <span>5+ Players</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
              <span>3-4 Players</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-3))" }} />
              <span>1-2 Players</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--destructive))" }} />
              <span>Destination</span>
            </div>
          </div>
        </div>

        {validOrigins.length === 0 && validTransfers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No player data available for visualization</p>
            <p className="text-sm">Add players with nationalities to see them on the map</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
