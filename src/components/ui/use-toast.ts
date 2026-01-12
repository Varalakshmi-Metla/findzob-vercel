
// Inspired by react-hot-toast library
import * as React from "react"

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToastProps = {
  className?: string
  variant?: "default" | "destructive"
  // other toast properties
}

type ToastActionElement = React.ReactElement

const reducer = (state, action) => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }
    case "DISMISS_TOAST":
      const { toastId } = action;
      // Side effect in the reducer: schedule removal of the toast
      if (toastId) {
        // Find the toast and call onDismiss
        const toast = state.toasts.find(t => t.id === toastId);
        if (toast && toast.onDismiss) {
          toast.onDismiss();
        }
      } else {
        state.toasts.forEach(toast => {
          if (toast.onDismiss) toast.onDismiss();
        });
      }
      return {
        ...state,
        toasts: toastId ? state.toasts.filter((t) => t.id !== toastId) : [],
      }
    case "REMOVE_TOAST":
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
    default:
      return state
  }
}

const listeners = new Set()

let memoryState = { toasts: [] }

function dispatch(action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach(listener => {
    listener(memoryState)
  })
}

const toast = (props) => {
  const id = Math.random().toString(36).slice(2);
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  const update = (props) => dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } });
  
  const toast = {
    ...props,
    id,
    onDismiss: props.onDismiss,
  };

  dispatch({ type: "ADD_TOAST", toast });

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState(memoryState)

  React.useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }