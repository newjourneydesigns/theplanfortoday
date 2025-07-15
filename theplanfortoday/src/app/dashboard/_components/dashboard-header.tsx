"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
// import { UserNav } from "./UserNav";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-[57px] items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search plans..."
          className="w-full rounded-lg bg-secondary pl-8 md:w-[200px] lg:w-[320px]"
        />
      </div>
      <div className="ml-auto flex items-center gap-4">
        {/* <UserNav /> */}
      </div>
    </header>
  );
}
