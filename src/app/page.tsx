import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dumbbell, Calendar, Activity, Trophy } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#262626] px-6 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="BodyByBucu"
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="text-lg font-bold text-white">BodyByBucu</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center px-6 py-24 text-center">
        <Image
          src="/logo.png"
          alt="BodyByBucu"
          width={120}
          height={120}
          className="mb-8 rounded-full"
        />
        <h1 className="max-w-2xl text-4xl font-black leading-tight text-white md:text-6xl">
          Train Smarter.
          <br />
          <span className="text-[#dc2626]">Track Everything.</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg text-[#a3a3a3]">
          Your all-in-one training companion from BodyByBucu. Log workouts,
          track PRs, monitor body composition, and book sessions — all in one
          place.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/login">
            <Button variant="outline" size="lg" className="px-8 text-lg">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#262626] px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Dumbbell,
              title: "Workout Logging",
              desc: "Log every set, rep, and weight. Track your exercises with ease.",
            },
            {
              icon: Trophy,
              title: "PR Tracking",
              desc: "Automatic personal record detection with estimated 1RM calculations.",
            },
            {
              icon: Activity,
              title: "Body Tracking",
              desc: "Monitor weight and body measurements with visual trend charts.",
            },
            {
              icon: Calendar,
              title: "Session Booking",
              desc: "View trainer availability and book personal training sessions.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-[#262626] bg-[#141414] p-6"
            >
              <feature.icon className="h-8 w-8 text-[#dc2626]" />
              <h3 className="mt-4 text-lg font-bold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-[#a3a3a3]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#262626] px-6 py-8 text-center text-sm text-[#a3a3a3]">
        <p>
          &copy; {new Date().getFullYear()} BodyByBucu LLC — Union, NJ. All
          rights reserved.
        </p>
      </footer>
    </div>
  );
}
