import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, PlusCircle, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const appData = {
    organization: {
        name: 'Innovate Inc.',
        adminUsers: ['Admin User'],
        teams: [
            {
                id: 'team1',
                name: 'Team 1: Marketing',
                editors: [
                    { id: 'editorA', name: 'Editor A', avatar: 'https://placehold.co/40x40.png' },
                    { id: 'editorB', name: 'Editor B', avatar: 'https://placehold.co/40x40.png' },
                ],
                plans: [
                    { id: 'plan1', name: 'Q3 Launch Campaign', isPublic: true, editorId: 'editorA', viewers: [] },
                    { id: 'plan2', name: 'Stealth Project X', isPublic: false, editorId: 'editorA', viewers: [{id: 'viewer1', name: 'Viewer 1'}] },
                    { id: 'plan2b', name: 'Website Redesign', isPublic: true, editorId: 'editorB', viewers: [] },
                ]
            },
            {
                id: 'team2',
                name: 'Team 2: Engineering',
                editors: [
                     { id: 'editorC', name: 'Editor C', avatar: 'https://placehold.co/40x40.png' },
                ],
                plans: [
                    { id: 'plan3', name: 'Backend Refactor', isPublic: false, editorId: 'editorC', viewers: [{id: 'viewer2', name: 'Viewer 2'}] },
                    { id: 'plan4', name: 'Feature A Rollout', isPublic: true, editorId: 'editorC', viewers: [] },
                    { id: 'plan5', name: 'API Documentation', isPublic: true, editorId: 'editorC', viewers: [] },
                ]
            },
            {
                id: 'team3',
                name: 'Team 3: Design',
                editors: [
                    { id: 'editorD', name: 'Editor D', avatar: 'https://placehold.co/40x40.png' },
                ],
                plans: [
                    { id: 'plan6', name: 'New UI Kit', isPublic: false, editorId: 'editorD', viewers: [{id: 'viewer3', name: 'Viewer 3'}] },
                ]
            }
        ]
    }
}

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-headline">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back to {appData.organization.name}!</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Create Plan
                </Button>
            </div>

            <div className="space-y-12">
            {appData.organization.teams.map(team => (
                <div key={team.id}>
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="h-6 w-6 text-primary"/>
                        <h2 className="text-xl font-semibold font-headline">{team.name}</h2>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {team.plans.map(plan => (
                        <Card key={plan.id} className="flex flex-col transition-all hover:shadow-lg">
                             <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                                    </div>
                                    <Badge variant={plan.isPublic ? "secondary" : "outline"}>
                                        {plan.isPublic ? "Public" : "Private"}
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Owned by {team.editors.find(e => e.id === plan.editorId)?.name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground">
                                    A brief summary or recent activity for this plan would appear here.
                                </p>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center">
                                <div className="flex items-center -space-x-2">
                                    <TooltipProvider>
                                    {team.editors.map(editor => (
                                        <Tooltip key={editor.id}>
                                            <TooltipTrigger>
                                                <Avatar className="border-2 border-card">
                                                    <AvatarImage src={editor.avatar} data-ai-hint="person portrait" />
                                                    <AvatarFallback>{editor.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent>Editor: {editor.name}</TooltipContent>
                                        </Tooltip>
                                    ))}
                                    {plan.viewers.map(viewer => (
                                         <Tooltip key={viewer.id}>
                                            <TooltipTrigger>
                                                <Avatar className="border-2 border-card opacity-70">
                                                     <AvatarFallback className="bg-accent text-accent-foreground">{viewer.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent>Viewer: {viewer.name}</TooltipContent>
                                        </Tooltip>
                                    ))}
                                     </TooltipProvider>
                                </div>
                                <Button variant="ghost" size="sm">View</Button>
                            </CardFooter>
                        </Card>
                    ))}
                     <Card className="flex flex-col items-center justify-center border-dashed hover:border-primary hover:text-primary transition-colors text-muted-foreground">
                        <CardContent className="p-6 text-center">
                            <PlusCircle className="h-8 w-8 mx-auto mb-2"/>
                            <p className="text-sm font-medium">New Plan</p>
                        </CardContent>
                     </Card>
                    </div>
                </div>
            ))}
            </div>
        </div>
    )
}
