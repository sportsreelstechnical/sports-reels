import { useState } from "react";
import RoleAccessControl from "../RoleAccessControl";
import type { UserRole } from "@/lib/types";

export default function RoleAccessControlExample() {
  const [permissions, setPermissions] = useState([
    { role: "sporting_director" as UserRole, label: "Sporting Director", hasAccess: true, icon: null as any },
    { role: "legal" as UserRole, label: "Legal Team", hasAccess: true, icon: null as any },
    { role: "scout" as UserRole, label: "Scouts", hasAccess: false, icon: null as any },
    { role: "coach" as UserRole, label: "Coaches", hasAccess: false, icon: null as any },
  ]);

  const handleToggle = (role: UserRole, enabled: boolean) => {
    setPermissions(prev => prev.map(p => 
      p.role === role ? { ...p, hasAccess: enabled } : p
    ));
  };

  return (
    <div className="max-w-sm">
      <RoleAccessControl permissions={permissions} onToggle={handleToggle} />
    </div>
  );
}
