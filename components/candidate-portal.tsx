"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export function CandidatePortal() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    candidateId: "",
    email: "",
    description: "",
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Validate form
      if (!formData.name || !formData.candidateId || !formData.email) {
        throw new Error("Please fill in all required fields")
      }

      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error("Please enter a valid email address")
      }

      // Simple candidate ID validation (alphanumeric only)
      if (!/^[a-zA-Z0-9]+$/.test(formData.candidateId)) {
        throw new Error("Candidate ID should only contain letters and numbers, no spaces or special characters")
      }

      // Check if candidate ID already exists
      const { data: existingCandidate, error: checkError } = await supabase
        .from("candidates")
        .select("id")
        .eq("candidate_id", formData.candidateId)

      if (checkError) throw checkError

      if (existingCandidate && existingCandidate.length > 0) {
        throw new Error("Candidate ID already exists. Please use a different ID.")
      }

      // Insert new candidate application
      const { data, error: insertError } = await supabase
        .from("candidates")
        .insert([
          {
            name: formData.name,
            candidate_id: formData.candidateId,
            email: formData.email,
            description: formData.description,
            status: "pending",
            email_verified: false,
          },
        ])
        .select("id")
        .single()

      if (insertError) throw insertError

      toast({
        title: "Application Submitted",
        description: "Your candidate application has been submitted for review",
      })

      // Send OTP for email verification
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: formData.email,
      })

      if (otpError) throw otpError

      // Redirect to status page
      router.push(
        `/candidate/status?email=${encodeURIComponent(formData.email)}&id=${encodeURIComponent(formData.candidateId)}`,
      )
    } catch (err: any) {
      console.error("Error submitting application:", err)
      setError(err.message || "Failed to submit application")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Candidate Application</CardTitle>
        <CardDescription>Submit your application to become a candidate in the election</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidateId">Candidate ID *</Label>
              <Input
                id="candidateId"
                value={formData.candidateId}
                onChange={(e) => setFormData({ ...formData, candidateId: e.target.value })}
                required
                placeholder="Enter a unique candidate ID"
              />
              <p className="text-xs text-muted-foreground">
                Create a unique ID using only letters and numbers (no spaces or special characters). This ID will be
                used to identify you in the election.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="Enter your email address"
              />
              <p className="text-xs text-muted-foreground">
                We'll send a verification code to this email. You'll need to verify your email to complete your
                application.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell voters about yourself and why they should vote for you"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">This will be displayed to voters. Make it compelling!</p>
            </div>
          </div>
          <div className="flex justify-between items-center mt-6">
            <Button variant="outline" asChild>
              <Link href="/">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-6">
        <p className="text-sm text-muted-foreground">
          Already applied?{" "}
          <Link href="/candidate/status" className="text-primary hover:underline">
            Check your application status
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

