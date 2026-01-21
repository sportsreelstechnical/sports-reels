import {
  Shield,
  Users,
  Search,
  Building2,
  FileCheck,
  Settings,
} from "lucide-react";

export const roles = [
  {
    id: "sporting_director",
    title: "Team Staff",
    description:
      "Sporting Directors, Legal, Coaches - Manage squad, compliance, and visa eligibility",
    icon: Users,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    id: "scout",
    title: "Scout / Agent",
    description:
      "Discover players, initiate transfer inquiries, and view eligibility data",
    icon: Search,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    id: "embassy",
    title: "Embassy Official",
    description:
      "View-only access to verify player documentation for visa processing",
    icon: Building2,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    id: "federation_admin",
    title: "Federation Administrator",
    description:
      "Process letter requests, manage fees, and issue federation documents",
    icon: FileCheck,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  /*
  {
    id: "admin",
    title: "Platform Administrator",
    description:
      "Manage users, messages, payments, audit logs, and GDPR compliance",
    icon: Settings,
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  */
];
