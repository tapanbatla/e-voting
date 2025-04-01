"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

export function ResultsPage() {
  const { toast } = useToast()
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalVotes, setTotalVotes] = useState(0)

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get all approved candidates
      const { data: candidates, error: candidatesError } = await supabase
        .from("candidates")
        .select("*")
        .eq("status", "approved")
        .eq("email_verified", true)

      if (candidatesError) throw candidatesError

      // Get all votes
      const { data: votes, error: votesError } = await supabase.from("votes").select("*")

      if (votesError) throw votesError

      // Calculate vote counts for each candidate
      const resultsData =
        candidates?.map((candidate) => {
          const voteCount = votes?.filter((vote) => vote.candidate_id === candidate.id).length || 0
          return {
            ...candidate,
            votes: voteCount,
          }
        }) || []

      // Sort by vote count (descending)
      resultsData.sort((a, b) => b.votes - a.votes)

      setResults(resultsData)
      setTotalVotes(votes?.length || 0)
    } catch (err: any) {
      console.error("Error loading results:", err)
      setError(err.message || "Failed to load election results")

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load election results",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0
    return (votes / totalVotes) * 100
  }

  const getBarColor = (index: number) => {
    const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-cyan-500", "bg-pink-500"]

    return colors[index % colors.length]
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Voting Results</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Total votes cast: {totalVotes}</p>
            </div>
            <Button variant="outline" onClick={loadResults}>
              Refresh Results
            </Button>
          </div>
        </CardHeader>
        {error && (
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <div className="space-y-6">
        <h2 className="text-xl font-bold">Current Standings</h2>

        {results.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {totalVotes === 0 ? "No votes have been cast yet." : "No approved candidates available."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="py-6">
                <div className="space-y-4">
                  {results.map((result, index) => {
                    const percentage = getPercentage(result.votes)

                    return (
                      <div key={result.id} className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="font-medium">{result.name}</span>
                          <div className="text-sm">
                            <span className="font-bold">{result.votes}</span> votes
                            <span className="text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full ${getBarColor(index)} transition-all duration-1000 flex items-center pl-2`}
                            style={{ width: `${percentage}%` }}
                          >
                            {percentage > 5 && (
                              <span className="text-white text-xs font-medium">{percentage.toFixed(1)}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">Detailed Results</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-left">Rank</th>
                      <th className="p-3 text-left">Candidate Name</th>
                      <th className="p-3 text-left">Candidate ID</th>
                      <th className="p-3 text-left">Votes Received</th>
                      <th className="p-3 text-left">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => {
                      const percentage = getPercentage(result.votes)

                      return (
                        <tr key={result.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3 font-medium">{result.name}</td>
                          <td className="p-3">{result.candidate_id}</td>
                          <td className="p-3 font-medium">{result.votes}</td>
                          <td className="p-3">{percentage.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

