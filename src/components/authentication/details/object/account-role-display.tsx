import { Badge } from "@/components/ui/badge";
import { AccountRole } from "@solana/kit";
import { memo } from "react";

interface AccountRoleDisplayProps {
  role: AccountRole;
}

const getRoleConfig = (role: AccountRole) => {
  switch (role) {
    case AccountRole.WRITABLE_SIGNER:
      return {
        label: "Writable Signer",
        shortLabel: "WS",
        description: "Can sign and modify account",
      };
    case AccountRole.READONLY_SIGNER:
      return {
        label: "Readonly Signer",
        shortLabel: "RS",
        description: "Can sign but not modify account",
      };
    case AccountRole.WRITABLE:
      return {
        label: "Writable",
        shortLabel: "W",
        description: "Can modify account",
      };
    case AccountRole.READONLY:
      return {
        label: "Readonly",
        shortLabel: "R",
        description: "Read-only access",
      };
    default:
      return {
        label: "Unknown",
        description: "Unknown role",
      };
  }
};

export const AccountRoleDisplay = memo(({ role }: AccountRoleDisplayProps) => {
  const config = getRoleConfig(role);

  return (
    <Badge variant="secondary" className="text-xs" title={config.description}>
      <span className="block xs:hidden">{config.shortLabel}</span>
      <span className="hidden xs:block">{config.label}</span>
    </Badge>
  );
});

AccountRoleDisplay.displayName = "AccountRoleDisplay";
