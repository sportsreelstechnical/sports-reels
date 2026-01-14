import { useState } from "react";
import RoleAccessControl from "@/components/RoleAccessControl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, Users, Clock, Plus } from "lucide-react";
import type { UserRole } from "@/lib/types";

export default function Access() {
  // todo: remove mock functionality
  const [permissions, setPermissions] = useState([
    { role: "sporting_director" as UserRole, label: "Sporting Director", hasAccess: true, icon: null as any },
    { role: "legal" as UserRole, label: "Legal Team", hasAccess: true, icon: null as any },
    { role: "scout" as UserRole, label: "Scouts", hasAccess: true, icon: null as any },
    { role: "coach" as UserRole, label: "Coaches", hasAccess: false, icon: null as any },
  ]);

  const teamMembers = [
    { id: "1", name: "John Smith", email: "john@club.com", role: "sporting_director", lastActive: "2024-12-16T10:30:00Z" },
    { id: "2", name: "Maria Garcia", email: "maria@club.com", role: "legal", lastActive: "2024-12-16T09:15:00Z" },
    { id: "3", name: "David Wilson", email: "david@club.com", role: "scout", lastActive: "2024-12-15T14:45:00Z" },
    { id: "4", name: "Sarah Johnson", email: "sarah@club.com", role: "coach", lastActive: "2024-12-14T16:20:00Z" },
  ];

  const handlePermissionToggle = (role: UserRole, enabled: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => (p.role === role ? { ...p, hasAccess: enabled } : p))
    );
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { className: string; label: string }> = {
      sporting_director: { className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", label: "Sporting Director" },
      legal: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", label: "Legal" },
      scout: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Scout" },
      coach: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", label: "Coach" },
    };
    return config[role] || { className: "bg-gray-100 text-gray-800", label: role };
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-access">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Access Control</h1>
          <p className="text-muted-foreground">Manage team roles and permissions</p>
        </div>
        <Button data-testid="button-invite-member">
          <Plus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RoleAccessControl permissions={permissions} onToggle={handlePermissionToggle} />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase">Member</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Role</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Last Active</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => {
                      const roleBadge = getRoleBadge(member.role);
                      const rolePermission = permissions.find((p) => p.role === member.role);
                      const hasAccess = rolePermission?.hasAccess ?? false;
                      return (
                        <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {member.name.split(" ").map((n) => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={roleBadge.className}>
                              {roleBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(member.lastActive).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                hasAccess
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              }
                            >
                              {hasAccess ? "Active" : "Restricted"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
