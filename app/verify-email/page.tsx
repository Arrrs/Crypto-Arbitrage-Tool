"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, Result, Button, Spin, theme, Flex } from "antd"
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from "@ant-design/icons"
import Link from "next/link"

export default function VerifyEmailPage() {
  const { token: themeToken } = theme.useToken()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, update } = useSession()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [countdown, setCountdown] = useState(3)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token provided")
      return
    }

    let isMounted = true

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`)
        const data = await response.json()

        if (!isMounted) return

        if (response.ok) {
          setStatus("success")
          setMessage(data.message || "Your email has been verified successfully!")

          // Store email if provided in response
          if (data.email) {
            setUserEmail(data.email)
          }

          // If user is logged in, update their session to reflect the verification
          if (session) {
            await update()
            setMessage("Your email has been verified successfully! Redirecting to profile...")
            setTimeout(() => {
              if (isMounted) {
                router.push("/profile")
              }
            }, 2000)
          } else {
            // Start countdown timer
            let timeLeft = 3
            const timer = setInterval(() => {
              timeLeft--
              if (isMounted) {
                setCountdown(timeLeft)
              }
              if (timeLeft <= 0) {
                clearInterval(timer)
                if (isMounted) {
                  // Redirect with email pre-filled
                  const loginUrl = data.email
                    ? `/login?email=${encodeURIComponent(data.email)}&message=${encodeURIComponent('Email verified! Please login.')}`
                    : '/login?message=Email verified! Please login.'
                  router.push(loginUrl)
                }
              }
            }, 1000)

            return () => clearInterval(timer)
          }
        } else {
          setStatus("error")
          setMessage(data.error || "Verification failed. The link may be invalid or expired.")
        }
      } catch (error) {
        if (!isMounted) return
        setStatus("error")
        setMessage("An error occurred during verification")
      }
    }

    verifyEmail()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh', padding: '16px', background: themeToken.colorBgLayout }}>
      <Card style={{ maxWidth: '500px', width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        {status === "loading" && (
          <Result
            icon={<Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />}
            title="Verifying your email..."
            subTitle="Please wait while we verify your email address."
          />
        )}

        {status === "success" && (
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: themeToken.colorSuccess }} />}
            title="Email Verified!"
            subTitle={
              session
                ? message
                : `${message} Redirecting to login in ${countdown} second${countdown !== 1 ? 's' : ''}...`
            }
            extra={!session ? [
              <Link
                href={userEmail ? `/login?email=${encodeURIComponent(userEmail)}` : '/login'}
                key="login"
              >
                <Button type="primary" size="large">
                  Go to Login Now
                </Button>
              </Link>,
            ] : undefined}
          />
        )}

        {status === "error" && (
          <Result
            status="error"
            icon={<CloseCircleOutlined style={{ color: themeToken.colorError }} />}
            title="Verification Failed"
            subTitle={message}
            extra={[
              <Link href="/signup" key="signup">
                <Button type="primary" size="large">
                  Sign Up Again
                </Button>
              </Link>,
              <Link href="/login" key="login">
                <Button size="large">
                  Back to Login
                </Button>
              </Link>,
            ]}
          />
        )}
      </Card>
    </Flex>
  )
}
