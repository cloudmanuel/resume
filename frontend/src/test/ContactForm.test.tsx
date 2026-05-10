import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContactForm from '../components/contact/ContactForm'

describe('ContactForm', () => {
  it('renders all required form fields', () => {
    render(<ContactForm />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<ContactForm />)
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('shows validation error when name is empty on submit', async () => {
    render(<ContactForm />)
    const submitButton = screen.getByRole('button', { name: /send message/i })
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when email is empty on submit', async () => {
    render(<ContactForm />)
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { name: 'name', value: 'Test User' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when email is invalid', async () => {
    render(<ContactForm />)
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { name: 'name', value: 'Test User' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { name: 'email', value: 'not-an-email' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when message is empty', async () => {
    render(<ContactForm />)
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { name: 'name', value: 'Test User' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { name: 'email', value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => {
      expect(screen.getByText(/message must be at least/i)).toBeInTheDocument()
    })
  })

  it('clears name error when user starts typing', async () => {
    render(<ContactForm />)
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { name: 'name', value: 'J' },
    })
    await waitFor(() => {
      expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument()
    })
  })
})
