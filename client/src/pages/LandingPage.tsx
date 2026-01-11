import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { LucideIcon } from "lucide-react";
import {
    Target,
    ShieldCheck,
    Sparkles,
    Heart,
    Workflow,
    TrendingUp,
    LineChart,
    UsersRound,
    BriefcaseBusiness,
    Shield,
    Activity,
    Share2,
    Lock,
    Menu,
} from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

const navItems = [
    { label: "Home", href: "#", isActive: true },
    { label: "Company", href: "#" },
    { label: "Why Us", href: "#" },
    { label: "Our Solution", href: "#" },
    { label: "Pricing", href: "#" },
    { label: "Contact Us", href: "#" },
];

const LandingPage = () => {
    const [activeTab, setActiveTab] = useState<"problem" | "solution">("problem");
    const [navSolid, setNavSolid] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            navigate("/dashboard", { replace: true });
        }
    }, [loading, user, navigate]);

    useEffect(() => {
        const handleScroll = () => {
            setNavSolid(window.scrollY > 50);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setMobileNavOpen(false);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const solutionHighlights: Array<{
        title: string;
        description: string;
        span: string;
        icon: LucideIcon;
    }> = [
            {
                title: "Predictive",
                description: "Set up your campaign with budget, goals, and target audience requirements.",
                span: "col-span-1 md:col-span-1 md:row-span-1",
                icon: Target,
            },
            {
                title: "Proven",
                description: "Set up your campaign with budget, goals, and target audience requirements.",
                span: "col-span-1 md:col-span-1 md:row-span-1",
                icon: ShieldCheck,
            },
            {
                title: "Precise",
                description: "Our platform leverages advanced AI to analyze thousands of data points, from in-game performance to biomechanics and biological maturity.",
                span: "col-span-1 md:col-span-2 md:row-span-1",
                icon: Sparkles,
            },
        ];

    const keyFeatures: Array<{
        title: string;
        description: string;
        icon: LucideIcon;
        span: string;
    }> = [
            {
                title: "Injury Risk & Resilience Modeling",
                description:
                    "Identify athletes with higher resilience and lower injury risk based on movement patterns and physical load.",
                icon: Heart,
                span: "md:col-span-2",
            },
            {
                title: "Role & Tactical Fit Assessment",
                description:
                    "Determine a player's best-fit role and tactical system to maximize their potential within your team structure.",
                icon: Workflow,
                span: "md:col-span-1",
            },
            {
                title: "Future Performance Projection",
                description:
                    "Our AI models forecast an athlete's development trajectory, identifying high-potential talent early.",
                icon: TrendingUp,
                span: "md:col-span-1",
            },
            {
                title: "Contextual Performance Analysis",
                description:
                    "Our system analyzes performance relative to the quality of opposition, teammates, and game situations.",
                icon: LineChart,
                span: "md:col-span-1",
            },
            {
                title: "Age-Adjusted Benchmarking",
                description:
                    "Compare players against peers of the same biological age, not just chronological, for fairer assessments.",
                icon: UsersRound,
                span: "md:col-span-1",
            },
        ];

    const fifaAdvantages: Array<{
        title: string;
        description: string;
        icon: LucideIcon;
    }> = [
            {
                title: "Career Tracking",
                description: "Complete history of a player's career, including clubs, positions, and performance metrics.",
                icon: BriefcaseBusiness,
            },
            {
                title: "Performance Evolution",
                description: "Track how a player develops over time with detailed performance analytics and growth metrics.",
                icon: Activity,
            },
            {
                title: "Transfer Insights",
                description: "Simplified transfer process with complete player history and verified performance data.",
                icon: Share2,
            },
            {
                title: "Data Security",
                description: "Secure, blockchain-verified player records that cannot be tampered with or falsified.",
                icon: Shield,
            },
        ];

    const platformHighlights: Array<{ title: string; description: string; icon: LucideIcon }> = [
        {
            title: "Career Tracking",
            description:
                "Complete history of a player's career, including clubs, positions, and performance metrics.",
            icon: Target,
        },
        {
            title: "Performance Evolution",
            description:
                "Track how a player develops over time with detailed performance analytics and growth metrics.",
            icon: Sparkles,
        },
        {
            title: "Transfer Insights",
            description:
                "Simplified transfer process with complete player history and verified performance data.",
            icon: Share2,
        },
        {
            title: "Data Security",
            description: "Secure, blockchain-verified player records that cannot be tampered with or falsified.",
            icon: Lock,
        },
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <header className={`fixed inset-x-0 top-0 z-50 border-b border-white/5 transition-colors duration-300 ${navSolid || mobileNavOpen ? "bg-[#111111]/95 backdrop-blur" : "bg-transparent"}`}>
                <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-5 md:px-10 lg:px-0">
                    <div className="flex items-center gap-4">
                        <img
                            src="/lovable-uploads/41a57d3e-b9e8-41da-b5d5-bd65db3af6ba.png"
                            alt="Sports Reels"
                            className="h-10 w-10 md:h-12 md:w-12"
                        />
                    </div>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:border-white/30 hover:bg-white/10 lg:hidden"
                        onClick={() => setMobileNavOpen((prev) => !prev)}
                        aria-label="Toggle navigation"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <nav className="hidden items-center gap-8 lg:flex">
                        {navItems.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className="group relative font-inter text-sm uppercase tracking-[0.22em] text-white transition-colors hover:text-[#f570a5]"
                            >
                                {item.label}
                                {item.isActive ? (
                                    <span className="absolute left-0 -bottom-3 h-[3px] w-full rounded-full bg-[#f15387]" />
                                ) : (
                                    <span className="absolute left-1/2 -bottom-3 h-[3px] w-2 -translate-x-1/2 rounded-full bg-transparent transition-colors group-hover:w-full group-hover:bg-[#f15387]" />
                                )}
                            </a>
                        ))}
                    </nav>
                    <Link
                        to="/auth"
                        className="hidden rounded-[14px] bg-[#d45e87] px-6 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-black transition-colors hover:bg-[#f572a7] lg:inline-flex lg:items-center lg:justify-center"
                    >
                        Login
                        <span className="ml-2 text-sm text-black">↗</span>
                    </Link>
                </div>
                <div
                    className={`overflow-hidden border-t border-white/10 bg-[#111111]/95 transition-all duration-300 ease-out lg:hidden ${mobileNavOpen ? "max-h-[360px] opacity-100" : "max-h-0 opacity-0"}`}
                >
                    <nav className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-6 py-5">
                        {navItems.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className="font-inter text-sm uppercase tracking-[0.28em] text-white/90 transition hover:text-white"
                                onClick={() => setMobileNavOpen(false)}
                            >
                                {item.label}
                            </a>
                        ))}
                        <Link
                            to="/auth"
                            className="inline-flex items-center justify-center rounded-[14px] bg-[#d45e87] px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-black transition hover:bg-[#f572a7]"
                            onClick={() => setMobileNavOpen(false)}
                        >
                            Login
                            <span className="ml-2 text-sm text-black">↗</span>
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-6 pb-24 pt-[100px] md:px-10 md:pt-[140px] lg:px-0 lg:pt-[115px] xl:pt-0">
                <section className="flex flex-1 flex-col items-center gap-12 text-center md:flex-row md:items-center md:gap-20 md:text-left">
                    <div className="w-full max-w-xl">
                        <p className="font-inter text-[11px] uppercase tracking-[0.36em] text-[#f27fae] md:text-xs md:tracking-[0.38em]">
                            Sports Reels
                        </p>
                        <h1 className="mt-5 font-readex-pro text-3xl leading-tight text-white sm:text-4xl md:mt-6 md:text-5xl md:leading-[1.15] lg:text-6xl">
                            De-Risking the Future of Sporting Investment
                        </h1>
                        <p className="mt-5 max-w-xl font-inter text-base leading-relaxed text-[#d7d0dc] sm:text-lg md:mt-6 md:max-w-lg">
                            The Data-Driven Revolution in Youth Talent Acquisition
                        </p>
                        <div className="mt-10 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-center md:mt-12 md:justify-start">
                            <Link
                                to="#"
                                className="inline-flex items-center justify-center rounded-[16px] bg-[#d45e87] px-8 py-[14px] text-xs font-semibold uppercase tracking-[0.28em] text-black transition-transform hover:scale-[1.02] hover:bg-[#f572a7]"
                            >
                                Onboard Your Club
                                <span className="ml-2 text-base text-black">↘</span>
                            </Link>
                            <a
                                href="#"
                                className="inline-flex items-center justify-center rounded-[16px] border border-[#d45e87] px-8 py-[14px] text-xs font-semibold uppercase tracking-[0.28em] text-white transition-transform hover:scale-[1.02] hover:border-[#f572a7] hover:text-[#f572a7]"
                            >
                                Contact Us
                                <span className="ml-2 text-base">↘</span>
                            </a>
                        </div>
                        <p className="mt-6 font-inter text-[11px] uppercase tracking-[0.3em] text-[#f27fae] sm:text-xs sm:tracking-[0.32em] md:mt-8">
                            All players receive a lifetime FIFA ID
                        </p>
                    </div>

                    <div className="relative w-full max-w-[380px] sm:max-w-[480px] md:max-w-[620px]">
                        <div className="absolute left-1/2 top-6 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-[#37123c] opacity-50 blur-[120px] sm:left-1/4 sm:top-8 sm:h-[320px] sm:w-[320px] sm:opacity-60 md:-left-16 md:top-8 md:h-[520px] md:w-[520px] md:translate-x-0 md:opacity-70" />
                        <div className="absolute right-1/2 bottom-0 h-[220px] w-[220px] translate-x-1/2 rounded-full bg-[#fd8dc8] opacity-60 blur-[120px] sm:right-4 sm:bottom-6 sm:h-[300px] sm:w-[300px] md:-right-20 md:h-[420px] md:w-[420px] md:translate-x-0 md:opacity-80" />
                        <img
                            src="/lovable-uploads/Untitled design (68).png"
                            alt="Football player kicking the ball"
                            className="relative z-10 w-full max-w-[420px] sm:max-w-[520px] md:max-w-[640px]"
                        />
                    </div>
                </section>
                <section className="mt-20 flex flex-col items-center text-center sm:mt-28 md:mt-32">
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#f27fae] sm:px-5 sm:text-xs sm:tracking-[0.32em]">
                        Our Story
                    </span>
                    <p className="mt-6 max-w-2xl font-inter text-base leading-relaxed text-[#d7d0dc] sm:mt-8 sm:text-lg md:max-w-3xl md:text-2xl md:leading-[1.6]">
                        Sports Reels is a revolutionary AI analytics platform that predicts youth athlete
                        performance trajectories, benchmarks development, and significantly reduces the
                        financial risks associated with talent investment.
                    </p>
                </section>
                <section className="mt-20 flex flex-col items-center text-center sm:mt-28 md:mt-32">
                    <h2 className="font-readex-pro text-2xl text-white sm:text-3xl md:text-4xl">
                        Why <span className="text-[#f15387]">Sport Reels?</span>
                    </h2>
                    <p className="mt-3 font-inter text-[11px] uppercase tracking-[0.22em] text-[#b8a8b4] sm:mt-4 sm:text-sm sm:tracking-[0.24em] md:text-base md:tracking-[0.32em]">
                        A simple, streamlined process to connect, create, and convert.
                    </p>

                    <div className="mt-10 w-full rounded-[24px] bg-[#111015] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.55)] sm:rounded-[28px] sm:p-6 md:mt-12 md:p-10">
                        <div className="flex flex-col gap-3 md:flex-row">
                            <button
                                onClick={() => setActiveTab("problem")}
                                className={`w-full rounded-[14px] px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] md:w-auto ${activeTab === "problem"
                                    ? "bg-[#d45e87] text-black"
                                    : "bg-[#2a242b] text-[#d7d0dc]"
                                    }`}
                            >
                                The Problem
                            </button>
                            <button
                                onClick={() => setActiveTab("solution")}
                                className={`w-full rounded-[14px] px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] md:w-auto ${activeTab === "solution"
                                    ? "bg-[#d45e87] text-black"
                                    : "bg-[#2a242b] text-[#d7d0dc]"
                                    }`}
                            >
                                Sports Reels Solution
                            </button>
                        </div>

                        <div className="mt-6 grid gap-6 md:mt-8 md:grid-cols-[1.15fr,1fr]">
                            {activeTab === "problem" ? (
                                <>
                                    <div className="relative overflow-hidden rounded-[22px] bg-[#18121d] ">
                                        <img
                                            src="/lovable-uploads/b0ea6d9745a477e854d67619ad1817978b2c6cd3.png"
                                            alt="Sports silhouettes illustration"
                                            className="h-[50px] min-h-[260px] w-full rounded-[18px] object-cover sm:min-h-[320px] md:min-h-[420px]"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-6">
                                        <div className="rounded-[22px] bg-[#18121d] p-8 text-left">
                                            <div className="flex items-center gap-3 text-[#f15387]">
                                                <span className="text-2xl">💰</span>
                                                <span className="font-inter text-sm uppercase tracking-[0.28em] text-[#f15387]">
                                                    Average Loss
                                                </span>
                                            </div>
                                            <p className="mt-4 font-readex-pro text-3xl text-white">$500k+</p>
                                            <p className="mt-3 max-w-sm font-inter text-sm text-[#b8a8b4]">
                                                Average loss per failed player investment in top-tier academies.
                                            </p>
                                        </div>
                                        <div className="rounded-[22px] bg-[#18121d] p-8 text-left">
                                            <div className="flex items-center gap-3 text-[#f15387]">
                                                <span className="text-2xl">📉</span>
                                                <span className="font-inter text-sm uppercase tracking-[0.28em] text-[#f15387]">
                                                    Failure Rate
                                                </span>
                                            </div>
                                            <p className="mt-4 font-readex-pro text-3xl text-white">90%</p>
                                            <p className="mt-3 max-w-sm font-inter text-sm text-[#b8a8b4]">
                                                Failure rate for youth players signed to professional contracts.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid min-h-[260px] gap-6 sm:min-h-[320px] md:grid-cols-2 md:grid-rows-[auto,1fr] md:min-h-[420px]">
                                        {solutionHighlights.map((item) => (
                                            <div
                                                key={item.title}
                                                className={`rounded-[22px] bg-[#18121d] px-8 py-6 text-left md:py-8 ${item.span}`}
                                            >
                                                <div className="flex items-center gap-3 text-[#f15387]">
                                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2e1c2a]">
                                                        <item.icon className="h-5 w-5" />
                                                    </span>
                                                    <h3 className="font-readex-pro text-2xl text-[#f15387]">
                                                        {item.title}
                                                    </h3>
                                                </div>
                                                <p className="mt-3 font-inter text-sm text-[#d0c4ce]">
                                                    {item.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="relative overflow-hidden rounded-[22px] bg-[#18121d]">
                                        <img
                                            src="/lovable-uploads/eaeb0f9d85977bcce84d5f3638fdc9ed93a4ce7d.png"
                                            alt="Sports Reels solution illustration"
                                            className="h-[50px] min-h-[260px] w-full rounded-[18px] object-cover sm:min-h-[320px] md:min-h-[420px]"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            </main>
            <section className="bg-black px-5 py-12 sm:py-14 md:py-16">
                <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center text-center">
                    <h2 className="font-readex-pro text-3xl text-white md:text-4xl">
                        Key Features That <span className="text-[#f15387]">De-Risk Your Investment</span>
                    </h2>
                    <p className="mt-4 max-w-3xl font-inter text-base leading-relaxed text-[#c8beca] md:text-lg">
                        Sports Reels provides cutting-edge tools to help clubs make data-driven decisions for player recruitment, development, and performance analysis.
                    </p>

                    <div className="mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
                        {keyFeatures.map((feature) => (
                            <div
                                key={feature.title}
                                className={`rounded-[24px] bg-[#111015] p-6 text-left shadow-[0_15px_30px_rgba(0,0,0,0.45)] ${feature.span}`}
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2b1a28] text-[#f15387]">
                                    <feature.icon className="h-5 w-5" />
                                </div>
                                <h3 className="mt-5 font-readex-pro text-lg text-white">{feature.title}</h3>
                                <p className="mt-3 font-inter text-sm leading-relaxed text-[#c8beca]">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <section className="bg-black px-5 py-12 sm:py-14 md:py-16">
                <div className="mx-auto flex w-full max-w-[1180px] flex-col-reverse gap-10 md:grid md:grid-cols-[1.1fr,1fr] md:items-stretch md:gap-16">
                    <div className="relative min-h-[320px] sm:min-h-[380px] md:min-h-[520px]">
                        <img
                            src="/lovable-uploads/e01f67fbf993aa0d6b1851f02190d2c9baf9e483.png"
                            alt="FIFA ID athlete illustration"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="space-y-8 sm:space-y-10">
                        <div>
                            <h2 className="font-readex-pro text-3xl text-white md:text-4xl">
                                The <span className="text-[#f15387]">FIFA ID</span> Advantage
                            </h2>

                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            {fifaAdvantages.map((item) => (
                                <div
                                    key={item.title}
                                    className="rounded-[24px] bg-[#111015] p-6 text-left shadow-[0_15px_30px_rgba(0,0,0,0.45)]"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2b1a28] text-[#f15387]">
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="mt-5 font-readex-pro text-lg text-white">{item.title}</h3>
                                    <p className="mt-3 font-inter text-sm leading-relaxed text-[#c8beca]">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-[28px] border border-[#f15387]/40 bg-[#111015] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.45)] md:p-8">
                            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-full border-4 border-[#f15387]" />
                                        <img
                                            src="/lovable-uploads/12c3362cfb53e3757f39a239a9e87682138dff43.png"
                                            alt="Sinclair Thompson"
                                            className="relative h-16 w-16 rounded-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-readex-pro text-xl text-white">Sinclair Thompson</h4>
                                        <p className="font-inter text-sm text-[#c8beca]">Midfielder • Age: 20</p>
                                    </div>
                                </div>
                                <span className="self-start rounded-full bg-[#d45e87] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-black md:self-center">
                                    FIFA-ID: #SR78945
                                </span>
                            </div>

                            <div className="mt-6 grid gap-4 text-center md:grid-cols-3 md:text-left">
                                {[{ label: "Pace", value: 92 }, { label: "Dribbling", value: 89 }, { label: "Crossing", value: 87 }].map(
                                    (stat) => (
                                        <div key={stat.label} className="rounded-[18px] bg-[#0d0c10] p-4">
                                            <p className="font-inter text-xs uppercase tracking-[0.22em] text-[#b8a8b4]">
                                                {stat.label}
                                            </p>
                                            <p className="mt-2 font-readex-pro text-2xl text-white">{stat.value}</p>
                                        </div>
                                    ),
                                )}
                            </div>

                            <div className="mt-6">
                                <div className="flex items-center justify-between font-inter text-sm text-[#c8beca]">
                                    <span>Performance Rating</span>
                                    <span className="font-semibold text-[#f15387]">85%</span>
                                </div>
                                <div className="mt-2 h-2 rounded-full bg-[#2f2632]">
                                    <div className="h-full w-[85%] rounded-full bg-[#f15387]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <section className="bg-black py-6 sm:py-10">
                <ContainerScroll
                    titleComponent={
                        <div className="space-y-4 px-6 sm:px-10 md:px-0">
                            <p className="font-inter text-xs uppercase tracking-[0.3em] text-[#f27fae] sm:text-sm sm:tracking-[0.32em]">
                                Platform Walkthrough
                            </p>
                            <h2 className="font-readex-pro text-3xl text-white sm:text-4xl md:text-5xl">
                                Experience the <span className="text-[#f15387]">Sports Reels</span> Platform
                            </h2>
                            <p className="mx-auto max-w-3xl font-inter text-sm leading-relaxed text-[#c8beca] sm:text-base sm:leading-[1.7] md:text-lg">
                                See how data-driven analytics can transform your scouting and performance tracking process.
                                Schedule a live demo with our team to explore the full capabilities of our platform.
                            </p>
                        </div>
                    }
                >
                    <div className="flex h-full items-center justify-center bg-[#101014] p-4 sm:p-6">
                        <div className="flex h-full w-full items-center justify-center">
                            <img
                                src="/lovable-uploads/Screenshot (526).png"
                                alt="Sports Reels dashboard preview"
                                className="max-h-[60vh] w-full max-w-[560px] rounded-xl object-contain sm:max-h-[70vh] md:max-h-full md:max-w-full"
                            />
                        </div>
                    </div>

                </ContainerScroll>
            </section><section
                className="relative overflow-hidden bg-black"
                style={{ backgroundImage: "url('/lovable-uploads/5c3bd60c6db59e7c9b5319215d3efeb56b22c8b2.png')", backgroundSize: "cover", backgroundPosition: "center" }}
            >
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative mx-auto flex w-full max-w-[1180px] flex-col items-center gap-10 px-6 py-24 text-center">
                    <div className="space-y-6">
                        <h2 className="font-readex-pro text-4xl text-white md:text-5xl">
                            Ready to <span className="text-[#f15387]">Revolutionize</span> Your Club?
                        </h2>
                        <p className="max-w-3xl font-inter text-lg leading-relaxed text-white/90">
                            Join the growing network of clubs using Sports Reels to discover talent, analyze performance, and make data-driven decisions.
                        </p>
                    </div>
                    <div className="flex flex-col gap-4 text-sm font-semibold uppercase tracking-[0.24em] sm:flex-row">
                        <Link
                            to="#"
                            className="inline-flex items-center justify-center rounded-[16px] bg-[#d45e87] px-10 py-4 text-black transition-transform hover:scale-[1.02] hover:bg-[#f572a7]"
                        >
                            Onboard your team
                        </Link>
                        <Link
                            to="#"
                            className="inline-flex items-center justify-center rounded-[16px] border border-white/70 px-10 py-4 text-white transition-transform hover:scale-[1.02] hover:border-white"
                        >
                            Schedule Demo
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="bg-black px-6 py-16">
                <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-12 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <img
                                src="/lovable-uploads/41a57d3e-b9e8-41da-b5d5-bd65db3af6ba.png"
                                alt="Sports Reels"
                                className="h-10 w-10"
                            />
                            <span className="font-readex-pro text-lg text-white">SPORTS REELS</span>
                        </div>
                        <nav className="flex flex-wrap gap-4 font-inter text-sm uppercase tracking-[0.24em] text-white/70">
                            {[
                                "Home",
                                "Company",
                                "Why Us",
                                "Our Solution",
                                "Pricing",
                                "Contact Us",
                                "Privacy Policy",
                            ].map((item) => (
                                <a key={item} href="#" className="transition-colors hover:text-white">
                                    {item}
                                </a>
                            ))}
                        </nav>
                        <p className="font-inter text-xs uppercase tracking-[0.28em] text-white/60">
                            © {new Date().getFullYear()} Sport Reels. All rights reserved.
                        </p>
                    </div>

                    <div className="flex w-full max-w-md flex-col gap-6">
                        <div className="space-y-3 text-left md:text-right">
                            <p className="font-inter text-sm uppercase tracking-[0.28em] text-white/80">
                                Subscribe to our newsletter to stay updated
                            </p>
                            <div className="flex flex-col gap-4 sm:flex-row">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full rounded-[12px] border border-white/20 bg-white/10 px-4 py-3 font-inter text-sm text-white placeholder:text-white/50 outline-none transition-colors focus:border-white focus:bg-white/15"
                                />
                                <button className="rounded-[12px] bg-[#d45e87] px-6 py-3 font-inter text-sm font-semibold uppercase tracking-[0.24em] text-black transition-transform hover:scale-[1.02] hover:bg-[#f572a7]">
                                    Subscribe
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-4 md:justify-end">
                            {[
                                "https://twitter.com",
                                "https://linkedin.com",
                                "https://facebook.com",
                            ].map((href) => (
                                <a
                                    key={href}
                                    href={href}
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <span className="font-inter text-sm">↗</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;

