import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Eye, BarChart3 } from "lucide-react";
import type { UserRole } from "@/lib/types";

interface RolePermission {
  role: UserRole;
  label: string;
  icon: typeof Users;
  hasAccess: boolean;
}

interface RoleAccessControlProps {
  permissions: RolePermission[];
  onToggle?: (role: UserRole, enabled: boolean) => void;
}

export default function RoleAccessControl({ permissions, onToggle }: RoleAccessControlProps) {
  const roleIcons: Record<UserRole, typeof Users> = {
    sporting_director: Shield,
    legal: Eye,
    scout: BarChart3,
    coach: Users,
  };

  return (
    <Card data-testid="card-role-access">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Access Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissions.map((permission) => {
          const Icon = roleIcons[permission.role];
          return (
            <div 
              key={permission.role} 
              className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-md">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Label className="font-medium">{permission.label}</Label>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs mt-1 ${permission.hasAccess 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {permission.hasAccess ? "Has Access" : "No Access"}
                  </Badge>
                </div>
              </div>
              <Switch
                checked={permission.hasAccess}
                onCheckedChange={(checked) => onToggle?.(permission.role, checked)}
                data-testid={`switch-access-${permission.role}`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
