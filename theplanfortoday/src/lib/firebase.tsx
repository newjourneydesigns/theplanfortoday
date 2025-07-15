// Rename this file to firebase.tsx if it is currently firebase.ts
// import React from "react"; // Not needed in React 17+ with Next.js
// import { Icons } from "../components/icons"; // Removed because module not found
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
// import { UserNav } from "../components/user-nav";
// FIX: Update the path below if 'user-nav' exists elsewhere, or remove if not needed
// import { UserNav } from "@/components/user-nav";

export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between space-y-2">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to your dashboard. Here you can manage your projects and tasks.
        </p>
      </div>
      <nav className="flex items-center space-x-4">
        <Link href="/dashboard/projects" className={buttonVariants({ variant: "ghost" })}>
          Projects
        </Link>
        <Link href="/dashboard/settings" className={buttonVariants({ variant: "ghost" })}>
        {/* <UserNav /> */}
        </Link>
        {/* <UserNav /> */}
      </nav>
    </header>
  );
}