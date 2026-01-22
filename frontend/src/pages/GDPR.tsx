import { Component, createSignal, Show } from 'solid-js'
import { createQuery, createMutation } from '@tanstack/solid-query'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import { ErrorModal } from '../components/ErrorModal'
import styles from './GDPR.module.css'

interface UserData {
  user: any
  projects: any[]
  tasks: any[]
  timeLogs: any[]
  statistics: any
}

interface ConsentPreferences {
  userId: string
  consents: {
    analytics: boolean
    marketing: boolean
    dataProcessing: boolean
  }
  lastUpdated?: string
}

export const GDPR: Component = () => {
  const { auth, logout } = useAuth()
  const api = useApiClient()

  const [error, setError] = createSignal<string | null>(null)
  const [showErrorModal, setShowErrorModal] = createSignal(false)
  const [showSuccess, setShowSuccess] = createSignal(false)
  const [successMessage, setSuccessMessage] = createSignal('')
  const [deleteConfirm, setDeleteConfirm] = createSignal(false)
  const [deleteInput, setDeleteInput] = createSignal('')

  // Fetch consent preferences
  const consentQuery = createQuery(() => ({
    queryKey: ['gdpr', 'consent'],
    queryFn: async () => {
      try {
        const data = await api.get<{ success: boolean; data: ConsentPreferences }>(
          '/api/gdpr/consent'
        )
        return data.data
      } catch (error) {
        console.error('Error fetching consent:', error)
        return null
      }
    },
    enabled: auth.isAuthenticated,
  }))

  // Mutation for exporting data
  const exportMutation = createMutation(() => ({
    mutationFn: async () => {
      const data = await api.get<{ success: boolean; data: UserData }>('/api/gdpr/export')
      return data.data
    },
    onSuccess: (data) => {
      // Download as JSON file
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccessMessage('Your data has been exported successfully!')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    },
    onError: (error: any) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to export data'
      setError(errorMsg)
      setShowErrorModal(true)
    },
  }))

  // Mutation for updating consent
  const consentMutation = createMutation(() => ({
    mutationFn: async (consents: Record<string, boolean>) => {
      const data = await api.patch<{ success: boolean; data: ConsentPreferences }>(
        '/api/gdpr/consent',
        { consents }
      )
      return data.data
    },
    onSuccess: () => {
      consentQuery.refetch()
      setSuccessMessage('Your consent preferences have been updated!')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    },
    onError: (error: any) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update consent'
      setError(errorMsg)
      setShowErrorModal(true)
    },
  }))

  // Mutation for deleting account
  const deleteMutation = createMutation(() => ({
    mutationFn: async () => {
      const data = await api.delete<{ success: boolean }>('/api/gdpr/delete')
      return data
    },
    onSuccess: async () => {
      setSuccessMessage('Your account has been permanently deleted. Logging out...')
      setShowSuccess(true)
      setTimeout(async () => {
        await logout()
      }, 2000)
    },
    onError: (error: any) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete account'
      setError(errorMsg)
      setShowErrorModal(true)
      setDeleteConfirm(false)
      setDeleteInput('')
    },
  }))

  const handleConsentChange = (key: string, value: boolean) => {
    const currentConsents = consentQuery.data?.consents || {
      analytics: false,
      marketing: false,
      dataProcessing: false,
    }
    const newConsents = { ...currentConsents, [key]: value }
    consentMutation.mutate(newConsents)
  }

  const handleDeleteAccount = () => {
    if (deleteInput() === 'DELETE ACCOUNT') {
      deleteMutation.mutate()
    } else {
      setError('Please type "DELETE ACCOUNT" to confirm')
      setShowErrorModal(true)
    }
  }

  return (
    <div class={styles.gdpr}>
      <div class={styles.header}>
        <h2>🔒 Privacy & GDPR Settings</h2>
        <p>Manage your data, privacy preferences, and account settings</p>
      </div>

      {/* Success Message */}
      <Show when={showSuccess()}>
        <div class={styles.successAlert}>
          <span>✅ {successMessage()}</span>
        </div>
      </Show>

      <div class={styles.grid}>
        {/* Data Export Section */}
        <div class={styles.card}>
          <div class={styles.cardHeader}>
            <h3>📥 Export Your Data</h3>
            <p class={styles.subtitle}>Download a complete copy of your data in JSON format</p>
          </div>

          <div class={styles.cardContent}>
            <p class={styles.description}>
              Get a machine-readable copy of all your personal data including:
            </p>
            <ul class={styles.list}>
              <li>User profile information</li>
              <li>Projects and tasks</li>
              <li>Time logs and activities</li>
              <li>Usage statistics</li>
            </ul>

            <button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              class={styles.primaryBtn}
            >
              {exportMutation.isPending ? '⏳ Exporting...' : '📥 Export Data as JSON'}
            </button>
          </div>
        </div>

        {/* Consent Preferences Section */}
        <div class={styles.card}>
          <div class={styles.cardHeader}>
            <h3>🔐 Consent Preferences</h3>
            <p class={styles.subtitle}>Control how your data is used</p>
          </div>

          <Show when={consentQuery.data}>
            {(data) => (
              <div class={styles.cardContent}>
                <div class={styles.consentItem}>
                  <div class={styles.consentLabel}>
                    <label>
                      <input
                        type="checkbox"
                        checked={data().consents.analytics}
                        onChange={(e) =>
                          handleConsentChange('analytics', e.currentTarget.checked)
                        }
                        disabled={consentMutation.isPending}
                      />
                      <span>Analytics</span>
                    </label>
                    <p class={styles.consentDesc}>
                      Allow us to collect usage analytics to improve your experience
                    </p>
                  </div>
                </div>

                <div class={styles.consentItem}>
                  <div class={styles.consentLabel}>
                    <label>
                      <input
                        type="checkbox"
                        checked={data().consents.marketing}
                        onChange={(e) =>
                          handleConsentChange('marketing', e.currentTarget.checked)
                        }
                        disabled={consentMutation.isPending}
                      />
                      <span>Marketing</span>
                    </label>
                    <p class={styles.consentDesc}>
                      Allow us to send you updates about new features and products
                    </p>
                  </div>
                </div>

                <div class={styles.consentItem}>
                  <div class={styles.consentLabel}>
                    <label>
                      <input
                        type="checkbox"
                        checked={data().consents.dataProcessing}
                        onChange={(e) =>
                          handleConsentChange('dataProcessing', e.currentTarget.checked)
                        }
                        disabled={consentMutation.isPending}
                      />
                      <span>Data Processing</span>
                    </label>
                    <p class={styles.consentDesc}>
                      Allow us to process your data for service improvement and security
                    </p>
                  </div>
                </div>

                <p class={styles.lastUpdated}>
                  Last updated: {new Date(data().lastUpdated || '').toLocaleDateString()}
                </p>
              </div>
            )}
          </Show>
        </div>
      </div>

      {/* Danger Zone */}
      <div class={styles.dangerZone}>
        <div class={styles.dangerCard}>
          <div class={styles.cardHeader}>
            <h3>⚠️ Delete Account</h3>
            <p class={styles.subtitle}>Permanently delete your account and all associated data</p>
          </div>

          <Show when={!deleteConfirm()}>
            <div class={styles.cardContent}>
              <p class={styles.dangerText}>
                <strong>Warning:</strong> This action is permanent and cannot be undone. All your
                data will be permanently deleted, including:
              </p>
              <ul class={styles.list}>
                <li>Your user account and profile</li>
                <li>All projects and tasks</li>
                <li>All time logs and activity records</li>
                <li>All personal data</li>
              </ul>

              <button
                onClick={() => setDeleteConfirm(true)}
                class={styles.dangerBtn}
              >
                Delete My Account
              </button>
            </div>
          </Show>

          <Show when={deleteConfirm()}>
            <div class={styles.cardContent}>
              <p class={styles.confirmText}>
                To permanently delete your account, type <strong>"DELETE ACCOUNT"</strong> below:
              </p>

              <input
                type="text"
                placeholder="Type DELETE ACCOUNT to confirm"
                value={deleteInput()}
                onChange={(e) => setDeleteInput(e.currentTarget.value)}
                class={styles.confirmInput}
              />

              <div class={styles.buttonGroup}>
                <button
                  onClick={() => {
                    setDeleteConfirm(false)
                    setDeleteInput('')
                  }}
                  class={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={
                    deleteMutation.isPending ||
                    deleteInput() !== 'DELETE ACCOUNT'
                  }
                  class={`${styles.dangerBtn} ${
                    deleteInput() === 'DELETE ACCOUNT' ? '' : styles.disabled
                  }`}
                >
                  {deleteMutation.isPending ? '⏳ Deleting...' : 'Yes, Delete Account'}
                </button>
              </div>
            </div>
          </Show>
        </div>
      </div>

      <ErrorModal
        isOpen={showErrorModal()}
        title="GDPR Error"
        message={error() || 'An error occurred'}
        onClose={() => setShowErrorModal(false)}
      />
    </div>
  )
}
