import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AuthServiceError,
  login,
} from '../services/auth'
import type { LoginRequest, LoginResponse } from '../services/auth'

type FieldErrors = Partial<Record<keyof LoginRequest, string>>

interface LoginPageProps {
  onLoginSuccess: (identity: LoginResponse) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (globalError && !errors.email && !errors.password) {
      errorRef.current?.focus()
    }
  }, [errors.email, errors.password, globalError])

  function updateEmail(value: string) {
    setEmail(value)
    setErrors((current) => ({ ...current, email: undefined }))
    setGlobalError('')
  }

  function updatePassword(value: string) {
    setPassword(value)
    setErrors((current) => ({ ...current, password: undefined }))
    setGlobalError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    const nextErrors: FieldErrors = {}
    if (!email) {
      nextErrors.email = 'El correo electrónico es obligatorio.'
    } else if (email.length > 255) {
      nextErrors.email = 'El correo electrónico no puede superar 255 caracteres.'
    }
    if (!password) {
      nextErrors.password = 'La contraseña es obligatoria.'
    }
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) {
      setGlobalError('Revisa los datos ingresados.')
      if (nextErrors.email) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setGlobalError('')
    let identity: LoginResponse | null = null
    try {
      identity = await login({ email, password })
    } catch (error) {
      if (error instanceof AuthServiceError) {
        const fieldErrors: FieldErrors = {}
        for (const issue of error.issues) {
          fieldErrors[issue.field] = issue.message
        }
        setErrors(fieldErrors)
        setGlobalError(error.message)
        if (fieldErrors.email) emailRef.current?.focus()
        else if (fieldErrors.password) passwordRef.current?.focus()
      } else {
        setErrors({})
        setGlobalError('No se pudo iniciar sesión.')
      }
    } finally {
      setPassword('')
      submittingRef.current = false
      setSubmitting(false)
    }
    if (identity) onLoginSuccess(identity)
  }

  return (
    <section className="login-page" aria-labelledby="login-title">
      <p className="eyebrow">Acceso</p>
      <h1 id="login-title">Iniciar sesión</h1>
      <p className="form-intro">Ingresa tus credenciales para acceder a la aplicación.</p>

      {globalError ? (
        <div className="form-alert error-alert" role="alert" tabIndex={-1} ref={errorRef}>
          {globalError}
        </div>
      ) : null}

      <form
        className="order-form login-form"
        noValidate
        aria-busy={submitting}
        onSubmit={(event) => { void handleSubmit(event) }}
      >
        <div className="form-field">
          <label htmlFor="login-email">Correo electrónico</label>
          <input
            id="login-email"
            name="email"
            type="text"
            inputMode="email"
            autoComplete="username"
            maxLength={255}
            required
            ref={emailRef}
            value={email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            onChange={(event) => updateEmail(event.target.value)}
          />
          {errors.email ? <p className="field-error" id="login-email-error">{errors.email}</p> : null}
        </div>

        <div className="form-field">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            ref={passwordRef}
            value={password}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            onChange={(event) => updatePassword(event.target.value)}
          />
          {errors.password ? <p className="field-error" id="login-password-error">{errors.password}</p> : null}
        </div>

        {submitting ? <p className="login-loading" role="status">Iniciando sesión…</p> : null}
        <button className="submit-button" type="submit" disabled={submitting}>
          {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>
    </section>
  )
}
