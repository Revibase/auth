import {
  ConfigAction,
  getChangeConfigInstructionDataDecoder,
  identifyMultiWalletInstruction,
  MULTI_WALLET_PROGRAM_ADDRESS,
  MultiWalletInstruction,
} from "@revibase/wallet-sdk";
import { CompilableTransactionMessage } from "@solana/kit";
import { useEffect, useState } from "react";

export function useGetConfigActions(
  data: CompilableTransactionMessage | undefined
) {
  const [configActions, setConfigActions] = useState<ConfigAction[]>();

  useEffect(() => {
    const process = () => {
      if (!data) {
        return;
      }
      const actions: ConfigAction[] = [];
      for (const ix of data.instructions) {
        if (
          !ix.data ||
          ix.programAddress.toString() !==
            MULTI_WALLET_PROGRAM_ADDRESS.toString()
        ) {
          continue;
        }

        const ixType = identifyMultiWalletInstruction({
          data: new Uint8Array(ix.data),
        });

        if (ixType === MultiWalletInstruction.ChangeConfig) {
          const decoded = getChangeConfigInstructionDataDecoder().decode(
            new Uint8Array(ix.data)
          );
          actions.push(...decoded.configActions);
        }
      }

      setConfigActions(actions.length > 0 ? actions : undefined);
    };

    process();
  }, [data]);

  return { configActions };
}
