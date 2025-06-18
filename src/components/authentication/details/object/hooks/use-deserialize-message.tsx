import { TransactionPayload } from "@/types";
import { rpc } from "@/utils";
import { MULTI_WALLET_PROGRAM_ADDRESS } from "@revibase/wallet-sdk";
import {
  CompilableTransactionMessage,
  CompiledTransactionMessage,
  decompileTransactionMessageFetchingLookupTables,
} from "@solana/kit";
import { useEffect, useState } from "react";

export function useDeserializeMessage(data: TransactionPayload) {
  const [loading, setLoading] = useState(false);
  const [deserializedMessage, setDeserializedMessage] =
    useState<CompilableTransactionMessage>();

  useEffect(() => {
    const process = async () => {
      if (
        data.deserializedTxMessage === null ||
        typeof data.deserializedTxMessage === "string" ||
        !("instructions" in data.deserializedTxMessage)
      ) {
        return;
      }
      setLoading(true);
      const {
        accountKeys,
        instructions,
        addressTableLookups,
        numSigners,
        numWritableNonSigners,
        numWritableSigners,
      } = data.deserializedTxMessage;

      const compiledTransactionMessage: CompiledTransactionMessage = {
        header: {
          numSignerAccounts: numSigners,
          numReadonlySignerAccounts: numSigners - numWritableSigners,
          numReadonlyNonSignerAccounts:
            accountKeys.length - numSigners - numWritableNonSigners,
        },
        instructions: instructions.map((x) => ({
          accountIndices: x.accountIndexes,
          programAddressIndex: x.programIdIndex,
          data: new Uint8Array(x.data),
        })),
        lifetimeToken: MULTI_WALLET_PROGRAM_ADDRESS.toString(),
        staticAccounts: accountKeys,
        version: 0,
        addressTableLookups: addressTableLookups.map((x) => ({
          ...x,
          lookupTableAddress: x.accountKey,
          writableIndices: x.writableIndexes,
          readableIndices: x.readonlyIndexes,
        })),
      };

      const decompiledTransactionMessage =
        await decompileTransactionMessageFetchingLookupTables(
          compiledTransactionMessage,
          rpc
        );

      setDeserializedMessage(decompiledTransactionMessage);
      setLoading(false);
    };

    process();
  }, [data]);

  return { deserializedMessage, loading };
}
