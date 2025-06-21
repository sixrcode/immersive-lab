"use client"

// Inspired by react-hot-toast library
import * as React from "react"

// import type {
//   ToastActionElement,
//   ToastProps,
// } from "@/components/ui/toast"

import type { ToastActionElement, ToastProps as UiToastProps } from "@/components/ui/toast"; // Rename to avoid conflict

export type ShowToastProps = UiToastProps & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  // 'variant' is already part of UiToastProps via VariantProps<typeof toastVariants>
};


const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0
function genId() {
  count++
  return count.toString()
}

// Internal Toast type, merging ShowToastProps with required internal fields
type Toast = ShowToastProps & {
  id: string;
  open: boolean; // Ensure open is part of the internal Toast type
  onOpenChange: (open: boolean) => void; // Ensure onOpenChange is part of the internal Toast type
};


type ToastAction =
  | {
      type: typeof actionTypes.ADD_TOAST
      toast: Toast
    }
  | {
      type: typeof actionTypes.UPDATE_TOAST
      toast: Partial<Toast>
    }
  | {
      type: typeof actionTypes.DISMISS_TOAST
      toastId?: Toast["id"]
    }
  | {
      type: typeof actionTypes.REMOVE_TOAST
      toastId?: Toast["id"]
    }

interface State {
  toasts: Toast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

const reducer = (state: State, action: ToastAction): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [
          action.toast,
          ...state.toasts.filter((t) => t.id !== action.toast.id),
        ].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((t) => addToRemoveQueue(t.id))
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t
        ),
      }
    }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function toast({ ...props }: ShowToastProps) {
  const id = genId(); // Generate ID for the new toast

  // The update function for this specific toast instance
  const updateToast = (updateProps: Partial<ShowToastProps>) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...updateProps, id },
    });

  // The dismiss function for this specific toast instance
  const dismissToast = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props, // Spread all properties from ShowToastProps (title, description, variant, etc.)
      id,       // Assign the generated ID
      open: true,
      onOpenChange: (open) => {
        if (!open) dismissToast(); // Use the specific dismiss for this toast
      },
    },
  });

  return {
    id: id,
    dismiss: dismissToast,
    update: updateToast,
  };
}


function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  }
}

export { useToast, toast }
