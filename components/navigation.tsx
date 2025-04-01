"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: "/about", label: "About" },
    { href: "/", label: "Home" },
    { href: "/voter", label: "Voter Portal" },
    { href: "/candidate", label: "Candidate Portal" },
    { href: "/admin", label: "Admin Portal" },
    { href: "/results", label: "View Results" },
  ]

  return (
    <nav className="bg-[#34495e] py-3 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-center space-x-2 md:space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm md:text-base text-white hover:bg-[#2c3e50] transition-colors",
                pathname === item.href && "bg-[#2c3e50]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

