"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function AdminPortal() {
  const { toast } = useToast()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [loadingVoters, setLoadingVoters] = useState(false)
  const [loginData, setLoginData] = useState({ username: "", password: "" })
  const [candidates, setCandidates] = useState<any[]>([])
  const [voters, setVoters] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  // Admin credentials (in a real app, this would be server-side)
  const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "admin123",
  }

  useEffect(() => {
    if (isLoggedIn) {
      loadCandidates()
      loadVoters()
    }
  }, [isLoggedIn, refreshTrigger])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Simple admin authentication
    if (loginData.username === ADMIN_CREDENTIALS.username && loginData.password === ADMIN_CREDENTIALS.password) {
      setIsLoggedIn(true)
      toast({
        title: "Login successful",
        description: "Welcome to the admin panel",
      })
    } else {
      setError("Invalid credentials")
    }

    setIsLoading(false)
  }

  const loadCandidates = async () => {
    setLoadingCandidates(true)
    try {
      const { data, error } = await supabase.from("candidates").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setCandidates(data || [])
    } catch (err: any) {
      console.error("Error loading candidates:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load candidates",
      })
    } finally {
      setLoadingCandidates(false)
    }
  }

  const loadVoters = async () => {
    setLoadingVoters(true)
    try {
      const { data: votersData, error: votersError } = await supabase
        .from("voters")
        .select("*")
        .order("has_voted", { ascending: false })

      if (votersError) throw votersError

      // Get votes to see who voted for whom
      const { data: votesData, error: votesError } = await supabase.from("votes").select("*")

      if (votesError) throw votesError

      // Join voters with their votes
      const votersWithVotes = votersData?.map((voter) => {
        const vote = votesData?.find((v) => v.voter_id === voter.voter_id)
        return {
          ...voter,
          voted_for: vote ? vote.candidate_id : null,
        }
      })

      setVoters(votersWithVotes || [])
    } catch (err: any) {
      console.error("Error loading voters:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load voters",
      })
    } finally {
      setLoadingVoters(false)
    }
  }

  const handleCandidateAction = async (candidateId: string, action: "approve" | "reject") => {
    setProcessingAction(candidateId)
    try {
      const { error } = await supabase.from("candidates").update({ status: action }).eq("id", candidateId)

      if (error) throw error

      // Refresh candidates list
      setRefreshTrigger((prev) => prev + 1)

      toast({
        title: "Success",
        description: `Candidate ${action === "approve" ? "approved" : "rejected"} successfully`,
      })
    } catch (err: any) {
      console.error(`Error ${action}ing candidate:`, err)
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${action} candidate`,
      })
    } finally {
      setProcessingAction(null)
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setLoginData({ username: "", password: "" })
  }

  const getCandidateById = (id: string) => {
    return candidates.find((c) => c.id === id)
  }

  if (!isLoggedIn) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Please enter your credentials to access the admin panel</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Admin Panel</CardTitle>
              <CardDescription>Manage candidates and view voting details</CardDescription>
            </div>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="candidates">
        <TabsList className="mb-6">
          <TabsTrigger value="candidates">Candidate Applications</TabsTrigger>
          <TabsTrigger value="voters">Voter List</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Candidate Applications</h2>
            <Button
              variant="outline"
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              disabled={loadingCandidates}
              className="gap-2"
            >
              {loadingCandidates ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>

          {loadingCandidates ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : candidates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No candidate applications available.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((candidate) => (
                <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{candidate.name}</CardTitle>
                      <div className="flex gap-1 flex-col items-end">
                        <Badge
                          variant={
                            candidate.status === "pending"
                              ? "outline"
                              : candidate.status === "approved"
                                ? "success"
                                : "destructive"
                          }
                        >
                          {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                        </Badge>
                        {candidate.email_verified ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 mt-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 mt-1"
                          >
                            <XCircle className="h-3 w-3" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>ID: {candidate.candidate_id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2">
                      <strong>Email:</strong> {candidate.email}
                    </p>
                    {candidate.description && (
                      <p className="mb-2">
                        <strong>Description:</strong> {candidate.description}
                      </p>
                    )}
                    <p>
                      <strong>Applied:</strong> {new Date(candidate.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                  {candidate.status === "pending" && candidate.email_verified && (
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="destructive"
                        onClick={() => handleCandidateAction(candidate.id, "reject")}
                        disabled={processingAction === candidate.id}
                      >
                        {processingAction === candidate.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Reject"
                        )}
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleCandidateAction(candidate.id, "approve")}
                        disabled={processingAction === candidate.id}
                      >
                        {processingAction === candidate.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Approve"
                        )}
                      </Button>
                    </CardFooter>
                  )}
                  {candidate.status === "pending" && !candidate.email_verified && (
                    <CardFooter>
                      <Alert className="w-full">
                        <AlertDescription>Cannot approve until email is verified</AlertDescription>
                      </Alert>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="voters">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Voter List</h2>
            <Button
              variant="outline"
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              disabled={loadingVoters}
              className="gap-2"
            >
              {loadingVoters ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>

          {loadingVoters ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-3 text-left">Voter Name</th>
                    <th className="p-3 text-left">Voter ID</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Voted</th>
                    <th className="p-3 text-left">Voted For</th>
                  </tr>
                </thead>
                <tbody>
                  {voters.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center">
                        No voters registered yet.
                      </td>
                    </tr>
                  ) : (
                    voters.map((voter) => {
                      const votedFor = voter.voted_for ? getCandidateById(voter.voted_for) : null

                      return (
                        <tr key={voter.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">{voter.name}</td>
                          <td className="p-3">{voter.voter_id}</td>
                          <td className="p-3">{voter.email}</td>
                          <td className="p-3">
                            <Badge variant={voter.has_voted ? "default" : "outline"}>
                              {voter.has_voted ? "Yes" : "No"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {voter.has_voted ? (votedFor ? votedFor.name : "Unknown candidate") : "Not voted"}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

