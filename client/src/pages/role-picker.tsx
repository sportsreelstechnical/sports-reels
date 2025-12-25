import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Search, Building2, FileCheck, Settings } from "lucide-react";

interface RolePickerProps {
  onSelectRole: (role: string) => void;
}

const roles = [
  {
    id: "sporting_director",
    title: "Team Staff",
    description: "Sporting Directors, Legal, Coaches - Manage squad, compliance, and visa eligibility",
    icon: Users,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    id: "scout",
    title: "Scout / Agent",
    description: "Discover players, initiate transfer inquiries, and view eligibility data",
    icon: Search,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    id: "embassy",
    title: "Embassy Official",
    description: "View-only access to verify player documentation for visa processing",
    icon: Building2,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    id: "federation_admin",
    title: "Federation Administrator",
    description: "Process letter requests, manage fees, and issue federation documents",
    icon: FileCheck,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    id: "admin",
    title: "Platform Administrator",
    description: "Manage users, messages, payments, audit logs, and GDPR compliance",
    icon: Settings,
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
];

export default function RolePicker({ onSelectRole }: RolePickerProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="page-role-picker">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto p-3 bg-primary rounded-md w-fit">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Sports Reels</h1>
            <p className="text-muted-foreground mt-2">
              Player Compliance & Visa Eligibility Platform
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Select Your Role</CardTitle>
            <CardDescription>
              Choose how you want to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roles.map((role) => (
              <Button
                key={role.id}
                variant="outline"
                className="w-full h-auto p-4 justify-start text-left"
                onClick={() => onSelectRole(role.id)}
                data-testid={`button-role-${role.id}`}
              >
                <div className={`p-2 rounded-md mr-4 ${role.color}`}>
                  <role.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{role.title}</p>
                  <p className="text-sm text-muted-foreground font-normal">
                    {role.description}
                  </p>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Demo mode - no authentication required
        </p>
      </div>
    </div>
  );
}
