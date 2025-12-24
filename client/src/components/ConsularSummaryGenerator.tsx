import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, Download, Send } from "lucide-react";

interface ConsularSummaryGeneratorProps {
  playerName: string;
  onGenerate?: (config: GeneratorConfig) => void;
  onSubmitToEmbassy?: (config: GeneratorConfig) => void;
}

interface GeneratorConfig {
  startDate: string;
  endDate: string;
  visaType: string;
  includePerformance: boolean;
  includeMedical: boolean;
  includeVideos: boolean;
  targetCountry: string;
}

export default function ConsularSummaryGenerator({ 
  playerName, 
  onGenerate, 
  onSubmitToEmbassy 
}: ConsularSummaryGeneratorProps) {
  const [config, setConfig] = useState<GeneratorConfig>({
    startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    visaType: "schengen",
    includePerformance: true,
    includeMedical: true,
    includeVideos: false,
    targetCountry: "",
  });

  const visaTypes = [
    { value: "schengen", label: "Schengen Sports Visa" },
    { value: "uk_gbe", label: "UK GBE" },
    { value: "us_p1", label: "US P-1 Visa" },
    { value: "us_o1", label: "US O-1 Visa" },
  ];

  const countries = [
    "Germany", "France", "Spain", "Italy", "Netherlands",
    "United Kingdom", "United States",
  ];

  return (
    <Card data-testid="card-consular-generator">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Consular Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Creating compliance report for <span className="font-medium text-foreground">{playerName}</span>
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Data Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
              data-testid="input-start-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">Data End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={config.endDate}
              onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
              data-testid="input-end-date"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="visa-type">Visa Type</Label>
            <Select 
              value={config.visaType} 
              onValueChange={(value) => setConfig({ ...config, visaType: value })}
            >
              <SelectTrigger data-testid="select-visa-type">
                <SelectValue placeholder="Select visa type" />
              </SelectTrigger>
              <SelectContent>
                {visaTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-country">Target Country</Label>
            <Select 
              value={config.targetCountry} 
              onValueChange={(value) => setConfig({ ...config, targetCountry: value })}
            >
              <SelectTrigger data-testid="select-target-country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Include in Report</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-performance"
                checked={config.includePerformance}
                onCheckedChange={(checked) => 
                  setConfig({ ...config, includePerformance: checked as boolean })
                }
                data-testid="checkbox-performance"
              />
              <Label htmlFor="include-performance" className="font-normal">
                Performance Data (minutes, caps, competitions)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-medical"
                checked={config.includeMedical}
                onCheckedChange={(checked) => 
                  setConfig({ ...config, includeMedical: checked as boolean })
                }
                data-testid="checkbox-medical"
              />
              <Label htmlFor="include-medical" className="font-normal">
                Medical & GPS Data (biometric proof)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-videos"
                checked={config.includeVideos}
                onCheckedChange={(checked) => 
                  setConfig({ ...config, includeVideos: checked as boolean })
                }
                data-testid="checkbox-videos"
              />
              <Label htmlFor="include-videos" className="font-normal">
                Video References (match footage links)
              </Label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onGenerate?.(config)}
            data-testid="button-generate-pdf"
          >
            <Download className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
          <Button 
            className="flex-1"
            onClick={() => onSubmitToEmbassy?.(config)}
            data-testid="button-submit-embassy"
          >
            <Send className="h-4 w-4 mr-2" />
            Submit to Embassy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
