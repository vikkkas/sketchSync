"use client";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Pencil, Cloud, Users, Github, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      {/* Navbar */}
      <nav className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="h-6 w-6 text-primary" />
            <span className="text-2xl font-bold font-sketch text-foreground">Sketch Sync</span>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium font-mono">v2.0 Now Live</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold font-sketch mb-6 tracking-tight text-foreground">
            Sketch <span className="text-primary">Sync</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 font-sketch">
            The software engineer's whiteboard. <br/>
            <span className="text-foreground font-mono text-lg mt-2 block">
              {"<CloudSave />"} • {"<CollabEdit />"} • {"<RealTime />"}
            </span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signin">
              <Button size="lg" className="h-14 px-8 text-xl font-sketch rounded-2xl border-2 border-primary hover:scale-105 transition-transform">
                Start Drawing Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
      </section>

      {/* Features */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold font-sketch mb-4 text-foreground">Why Sketch Sync?</h2>
            <p className="text-muted-foreground font-mono">Built for speed, reliability, and collaboration.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Cloud className="h-8 w-8 text-primary" />}
              title="Cloud Save"
              description="Your sketches are automatically saved to the cloud. Never lose a diagram again."
              code="await sketch.save();"
            />
            <FeatureCard 
              icon={<Users className="h-8 w-8 text-primary" />}
              title="Collab Edit"
              description="Real-time multiplayer editing. See cursors and changes instantly."
              code="socket.emit('draw', data);"
            />
            <FeatureCard 
              icon={<Zap className="h-8 w-8 text-primary" />}
              title="Lightning Fast"
              description="Optimized for performance. Handles complex diagrams with ease."
              code="performance.now() < 16ms"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-muted-foreground" />
            <span className="font-sketch font-bold text-lg text-muted-foreground">Sketch Sync</span>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            © {new Date().getFullYear()} Sketch Sync. Open Source.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, code }: { icon: React.ReactNode, title: string, description: string, code: string }) {
  return (
    <Card className="p-6 border-2 border-border/50 hover:border-primary/50 transition-all hover:shadow-lg bg-card/50 backdrop-blur-sm group">
      <div className="mb-4 p-3 bg-primary/10 w-fit rounded-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-2xl font-bold font-sketch mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      <div className="bg-muted p-3 rounded-lg font-mono text-xs text-muted-foreground overflow-hidden">
        <code>{code}</code>
      </div>
    </Card>
  );
}