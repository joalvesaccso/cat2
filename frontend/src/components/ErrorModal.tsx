import { Component, Show } from 'solid-js'
import styles from './ErrorModal.module.css'

interface ErrorModalProps {
  isOpen: boolean
  title?: string
  message: string
  onClose: () => void
}

export const ErrorModal: Component<ErrorModalProps> = (props) => {
  return (
    <Show when={props.isOpen}>
      <div class={styles.overlay} onClick={props.onClose}>
        <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div class={styles.header}>
            <h2>{props.title || 'Error'}</h2>
            <button class={styles.closeButton} onClick={props.onClose}>
              ✕
            </button>
          </div>

          <div class={styles.content}>
            <p>{props.message}</p>
          </div>

          <div class={styles.footer}>
            <button class={styles.button} onClick={props.onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}
