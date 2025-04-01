export function Header() {
  return (
    <header className="bg-[#2c3e50] text-white py-6 shadow-md">
      <div className="container mx-auto px-4 flex items-center">
        <div className="relative">
          <img src="/placeholder.svg?height=100&width=100" alt="Logo" className="w-16 h-16 absolute -top-2 -left-2" />
        </div>
        <h1 className="text-3xl font-bold text-center flex-1">Online Voting System</h1>
      </div>
    </header>
  )
}

