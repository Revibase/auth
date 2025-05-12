import { DataPayload, MessagePayload, TransactionPayload } from "@/types";
import { parsedTransaction } from "@/utils";
import { PublicKeyCredentialHint } from "@simplewebauthn/browser";

// Define state type
export type State = {
  error: string | null;
  response: string | null;
  publicKey: string;
  data: DataPayload | null;
  isRegister: boolean;
  hints?: PublicKeyCredentialHint[];
  countdown: number;
  isLoading: boolean;
  additionalInfo: any;
};

// Define action types
export type Action =
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "ADD_RESPONSE"; payload: string }
  | { type: "RESET_RESPONSE" }
  | { type: "SET_PUBLIC_KEY"; payload: string }
  | { type: "SET_DATA"; payload: DataPayload }
  | { type: "SET_IS_REGISTER"; payload: boolean }
  | { type: "SET_HINTS"; payload: PublicKeyCredentialHint[] | undefined }
  | { type: "DECREMENT_COUNTDOWN" }
  | { type: "RESET_COUNTDOWN" }
  | { type: "SET_LOADING"; payload: boolean }
  | {
      redirectUrl: string;
      type: "INITIALIZE_FROM_POPUP";
      payload: {
        data?: { type: "transaction" | "message"; payload: string };
        publicKey: string;
        isRegister: boolean;
        hints?: PublicKeyCredentialHint[];
        additionalInfo: any;
      };
    };

// Initial state
export const initialState: State = {
  error: null,
  response: null,
  publicKey: "",
  data: null,
  isRegister: false,
  hints: undefined,
  countdown: 2,
  isLoading: true,
  additionalInfo: undefined,
};

// Reducer function
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "ADD_RESPONSE":
      return { ...state, response: action.payload };
    case "RESET_RESPONSE":
      return { ...state, response: null };
    case "SET_PUBLIC_KEY":
      return { ...state, publicKey: action.payload };
    case "SET_DATA":
      return { ...state, data: action.payload };
    case "SET_IS_REGISTER":
      return { ...state, isRegister: action.payload };
    case "SET_HINTS":
      return { ...state, hints: action.payload };
    case "DECREMENT_COUNTDOWN":
      return { ...state, countdown: Math.max(state.countdown - 1, 0) };
    case "RESET_COUNTDOWN":
      return { ...state, countdown: 2 };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "INITIALIZE_FROM_POPUP":
      const parsedData = !action.payload.data
        ? null
        : action.payload.data?.type === "message"
        ? ({
            type: "message",
            payload: action.payload.data?.payload,
          } as MessagePayload)
        : ({
            type: "transaction",
            payload: action.payload.data.payload,
            ...parsedTransaction(
              action.payload.data.payload,
              action.redirectUrl
            ),
          } as TransactionPayload);

      return {
        ...state,
        additionalInfo: action.payload.additionalInfo,
        data: parsedData,
        publicKey: action.payload.publicKey || "",
        isRegister: action.payload.isRegister || false,
        hints: action.payload.hints,
        response: null,
        countdown: 2,
        error: null,
        isLoading: false,
      };
    default:
      return state;
  }
}
