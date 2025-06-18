import { Badge } from "@/components/ui/badge";
import type { TransactionPayload } from "@/types";
import { memo } from "react";
import { ConfigActionsDisplay } from "../config-action";
import { AddressDisplay } from "./address-display";
import { useDeserializeMessage, useGetConfigActions } from "./hooks";
import { InstructionDisplay } from "./instruction-display";
import { LoadingDisplay } from "./loading-display";

export const ObjectDisplay = memo(({ data }: { data: TransactionPayload }) => {
  const { deserializedMessage, loading } = useDeserializeMessage(data);
  const { configActions } = useGetConfigActions(deserializedMessage);

  if (loading) {
    return <LoadingDisplay />;
  }

  if (!deserializedMessage) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="text-sm">Unable to deserialize transaction message</div>
        <div className="text-xs mt-1 opacity-70">
          The transaction data may be corrupted or in an unsupported format
        </div>
      </div>
    );
  }

  if (configActions) {
    return <ConfigActionsDisplay actions={configActions} />;
  }

  return (
    <div className="space-y-4">
      <Badge variant={data.label.variant} className="text-xs font-medium">
        {data.label.value}
      </Badge>

      <AddressDisplay
        address={deserializedMessage.feePayer.address}
        label="Fee Payer"
      />

      {deserializedMessage.instructions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Instructions ({deserializedMessage.instructions.length})
          </h3>
          {deserializedMessage.instructions.map((instruction, index) => (
            <InstructionDisplay
              key={index}
              instruction={instruction}
              index={index}
            />
          ))}
        </div>
      )}

      {deserializedMessage.instructions.length === 0 && (
        <div className="border border-dashed border-border rounded-lg py-6 text-center text-muted-foreground">
          <div className="text-sm">No instructions found</div>
          <div className="text-xs mt-1 opacity-70">
            This transaction contains no executable instructions
          </div>
        </div>
      )}
    </div>
  );
});

ObjectDisplay.displayName = "ObjectDisplay";
