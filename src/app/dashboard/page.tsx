"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { MoodleConnect } from "@/components/MoodleConnect";
import { Drawer } from "@/components/Drawer";
import { AssignmentDetails } from "@/components/AssignmentDetails";
import { createClient } from "@/utils/supabase/client";
import { ArrowRight, Hexagon, Circle, Square, Triangle } from "lucide-react";
import {
  getSiteInfo,
  getCurrentCourses,
  getTimelineEvents,
  getAssignments,
  getSubmissionStatus,
  type MoodleCourse,
  type MoodleAssignment,
  type MoodleTimelineEvent,
} from "@/lib/moodle-client";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<MoodleTimelineEvent[]>([]);
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [allAssignments, setAllAssignments] = useState<MoodleAssignment[]>([]);
  const [moodleError, setMoodleError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [selectedAssignment, setSelectedAssignment] =
    useState<MoodleAssignment | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_approved, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_approved) {
      window.location.href = "/onboarding";
      return;
    }

    if (profile.full_name) {
      setUserName(profile.full_name.split(" ")[0]);
    } else if (user.user_metadata?.full_name) {
      setUserName(user.user_metadata.full_name.split(" ")[0]);
    }

    const { data } = await supabase
      .from("moodle_connections")
      .select("created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setIsConnected(true);

      const cached = localStorage.getItem("moodle_dashboard_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setCourses(parsed.courses || []);
          setEvents(parsed.events || []);
          setAllAssignments(parsed.assignments || []);
          setLoading(false);
        } catch (e) {}
      }

      await loadMoodleData(!cached);
    } else {
      window.location.href = "/onboarding";
    }
  };

  const loadMoodleData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    setMoodleError(null);
    try {
      const tokenRes = await fetch("/api/moodle/token");
      if (tokenRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!tokenRes.ok) {
        setMoodleError("Not connected to Moodle.");
        setLoading(false);
        return;
      }
      const { token } = await tokenRes.json();

      const info = await getSiteInfo(token);
      const currentCourses = await getCurrentCourses(token, info.userid);
      const upcomingEvents = await getTimelineEvents(token);

      const assignments = await getAssignments(
        token,
        currentCourses.map((c) => c.id),
      );
      const existingAssignInstances = new Set(
        upcomingEvents
          .filter((e) => e.eventtype === "assign")
          .map((e) => e.instance),
      );
      const newAssignmentEvents = assignments
        .filter((a) => !existingAssignInstances.has(a.id))
        .map((a) => ({
          id: -a.id, // Negative to avoid collision with calendar events
          name: a.name,
          description: a.intro,
          eventtype: "assign",
          course: { id: a.course, fullname: a.coursename, shortname: "" },
          timestart: a.duedate,
          timeduration: 0,
          instance: a.id,
          url: "",
        }));

      const allEvents = [...upcomingEvents, ...newAssignmentEvents].sort(
        (a, b) => a.timestart - b.timestart,
      );

      const assignEvents = allEvents.filter((e) => e.eventtype === "assign");
      const statuses = await Promise.all(
        assignEvents.map((e) =>
          getSubmissionStatus(token, e.instance).catch(() => null),
        ),
      );
      const submittedInstances = new Set(
        assignEvents
          .filter((_, i) => statuses[i]?.submitted)
          .map((e) => e.instance),
      );

      const filteredEvents = allEvents.filter((e) => {
        if (e.eventtype === "assign" && submittedInstances.has(e.instance))
          return false;
        return true;
      });

      setCourses(currentCourses);
      setEvents(filteredEvents);
      setAllAssignments(assignments);

      // Silently push the freshest assignments to our backend cache for the Calendar Feed
      fetch("/api/moodle/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      }).catch((err) =>
        console.error("Failed to sync assignments to backend cache", err),
      );

      localStorage.setItem(
        "moodle_dashboard_cache",
        JSON.stringify({
          courses: currentCourses,
          events: filteredEvents,
          assignments: assignments,
          timestamp: Date.now(),
        }),
      );
    } catch (err: any) {
      console.error("Moodle load failed:", err);
      setMoodleError(err.message || "Failed to load Moodle data.");
    }
    setLoading(false);
  };

  const formatDate = (ts: number) =>
    ts ? new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

  const { overdue, today, upcoming } = useMemo(() => {
    const now = Date.now();
    const buckets = {
      overdue: [] as any[],
      today: [] as any[],
      upcoming: [] as any[],
    };

    events.forEach((e) => {
      const diff = Math.ceil(
        (e.timestart * 1000 - now) / (1000 * 60 * 60 * 24),
      );
      if (diff < 0) buckets.overdue.push(e);
      else if (diff === 0) buckets.today.push(e);
      else buckets.upcoming.push(e);
    });

    return buckets;
  }, [events]);

  return (
    <main className="flex min-h-[calc(100vh-80px)] w-full flex-col items-center bg-background text-foreground font-sans">
      {loading ? (
        <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-6">
          <img src="/notmoodlelogo.png" alt="Loading..." className="h-20 w-auto object-contain animate-pulse" />
          <span className="text-xs uppercase tracking-widest font-bold text-foreground/50 animate-pulse">Synthesizing...</span>
        </div>
      ) : (
        <div className="w-full max-w-[1440px] px-4 md:px-12 pb-24">
          {/* Hero Section */}
          <section className="py-16 md:py-24 w-full flex items-center justify-center relative overflow-hidden border-b border-border/10 mb-16">
            <h1
              className="clash-title uppercase leading-[0.8] text-center"
              style={{ fontSize: "clamp(40px, 13vw, 180px)" }}
            >
              <span className="echo-stack" data-text="WORKSPACE">
                WORKSPACE
              </span>
            </h1>
          </section>

          {/* Greeting Section */}
          {userName && (
            <section className="w-full mb-12">
              <h2 className="clash-title text-4xl md:text-6xl text-left">
                Hello,{" "}
                <span className="font-serif italic font-normal">
                  {userName}
                </span>
              </h2>
            </section>
          )}

          {/* Philosophy / Narrative Section */}
          <section className="flex flex-col items-center mb-32 relative">
            <div className="hairline-divider h-24 mb-12"></div>
            <h2 className="clash-title text-3xl md:text-6xl text-center max-w-4xl mb-16 md:mb-24">
              Your academic life,{" "}
              <span className="font-serif italic font-normal">
                synthesized.
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
              <div className="flex flex-col gap-4 border-t border-border/20 pt-6">
                <h3 className="clash-title text-2xl uppercase">Overdue</h3>
                <p className="text-foreground/70 font-medium flex items-baseline">
                  <span className="clash-title text-5xl text-foreground mr-3">
                    {overdue.length}
                  </span>
                  <span className="flex-1">
                    critical items require immediate attention. Focus here to
                    eliminate backlog.
                  </span>
                </p>
              </div>
              <div className="flex flex-col gap-4 border-t border-border/20 pt-6">
                <h3 className="clash-title text-2xl uppercase">Due Today</h3>
                <p className="text-foreground/70 font-medium flex items-baseline">
                  <span className="clash-title text-5xl text-foreground mr-3">
                    {today.length}
                  </span>
                  <span className="flex-1">
                    tasks scheduled for completion today. Prioritize these
                    executions.
                  </span>
                </p>
              </div>
              <div className="flex flex-col gap-4 border-t border-border/20 pt-6">
                <h3 className="clash-title text-2xl uppercase">Upcoming</h3>
                <p className="text-foreground/70 font-medium flex items-baseline">
                  <span className="clash-title text-5xl text-foreground mr-3">
                    {upcoming.length}
                  </span>
                  <span className="flex-1">
                    planned assignments on the horizon. Preparation is key to
                    systemic success.
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* Swiss UI Style Timeline */}
          <section className="mb-32">
            <div className="flex items-center gap-6 mb-12">
              <h2 className="clash-title text-3xl uppercase">Timeline</h2>
              <div className="flex-1 hairline-divider h-px w-full"></div>
            </div>

            <div className="flex flex-col border-t border-border/20">
              {events.length === 0 ? (
                <div className="py-16 text-center text-foreground/50 font-medium">
                  No upcoming events.
                </div>
              ) : (
                events.map((event) => {
                  const date = new Date(event.timestart * 1000);
                  const day = date.getDate().toString().padStart(2, "0");
                  const month = date
                    .toLocaleString("default", { month: "short" })
                    .toUpperCase();
                  const time = date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const isAssignment = event.eventtype === "assign";

                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        if (isAssignment) {
                          const assignmentData = allAssignments.find(
                            (a) => a.id === event.instance,
                          );
                          if (assignmentData) {
                            setSelectedAssignment(assignmentData);
                            return;
                          }
                        }
                        window.location.href = `/course/${event.course?.id || ""}`;
                      }}
                      className="group grid grid-cols-1 md:grid-cols-12 gap-6 py-8 border-b border-border/20 hover:bg-background transition-colors duration-500 text-left px-4 md:px-6 w-full cursor-pointer"
                    >
                      {/* Date Column */}
                      <div className="md:col-span-3 flex flex-col justify-start">
                        <div className="text-5xl clash-title font-medium leading-none text-foreground">
                          {day}
                        </div>
                        <div className="text-sm font-bold tracking-widest uppercase mt-2 text-foreground/50">
                          {month} {date.getFullYear()}
                        </div>
                        <div className="text-xs font-mono mt-4 text-foreground/40 uppercase">
                          {time}
                        </div>
                      </div>

                      {/* Content Column */}
                      <div className="md:col-span-8 flex flex-col justify-center">
                        <div className="text-xs font-bold tracking-widest uppercase mb-3 text-foreground/50 flex items-center gap-3">
                          <span className="w-1.5 h-1.5 bg-foreground rounded-full"></span>
                          {event.course?.fullname || "System Event"}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-medium clash-title text-foreground group-hover:translate-x-4 transition-transform duration-500">
                          {event.name}
                        </h3>
                        {event.description && (
                          <div
                            className="mt-4 text-foreground/70 line-clamp-2 text-sm max-w-2xl font-medium"
                            dangerouslySetInnerHTML={{
                              __html: event.description,
                            }}
                          />
                        )}
                      </div>

                      {/* Action Column */}
                      <div className="md:col-span-1 flex items-center justify-end md:justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <ArrowRight className="w-8 h-8 -translate-x-8 group-hover:translate-x-0 transition-transform duration-500 text-foreground" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Bespoke Service Cards */}
          <section className="mb-16">
            <div className="flex items-center gap-6 mb-12">
              <h2 className="clash-title text-3xl uppercase">
                Enrolled Modules
              </h2>
              <div className="flex-1 hairline-divider h-px w-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {courses.map((course, i) => {
                const Icon =
                  i % 3 === 0 ? Hexagon : i % 3 === 1 ? Circle : Triangle;
                return (
                  <Link
                    href={`/course/${course.id}`}
                    key={course.id}
                    className="group p-8 border border-border/10 bg-transparent hover:bg-card transition-colors duration-500 flex flex-col justify-between min-h-[320px]"
                  >
                    <div className="w-16 h-16 border border-border/20 flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 bg-background">
                      <Icon
                        className="w-6 h-6 text-foreground"
                        strokeWidth={1}
                      />
                    </div>
                    <div>
                      <h3 className="clash-title text-2xl mb-4 line-clamp-2">
                        {course.fullname}
                      </h3>
                      <div className="flex items-center gap-2 uppercase tracking-widest font-bold text-xs">
                        Enter Module <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
              {courses.length === 0 &&
                loading &&
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-8 border border-border/10 animate-pulse bg-card/50 min-h-[320px]"
                  ></div>
                ))}
            </div>
          </section>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-border text-[#f6f6f6]/60 py-16 px-4 md:px-12 border-t border-white/5">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <h2 className="clash-title text-2xl text-background mb-6 uppercase">
              The NotMoodle
            </h2>
            <p className="text-sm font-medium leading-relaxed max-w-xs">
              A sophisticated synthesis of academic workflows, emphasizing
              typographic clarity and minimal resistance.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="text-background text-xs uppercase tracking-widest font-bold mb-2">
              Platform
            </h4>
            <Link
              href="#"
              className="hover:text-background transition-colors text-sm"
            >
              Action Hub
            </Link>
            <Link
              href="#"
              className="hover:text-background transition-colors text-sm"
            >
              Timeline
            </Link>
            <Link
              href="#"
              className="hover:text-background transition-colors text-sm"
            >
              Modules
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="text-background text-xs uppercase tracking-widest font-bold mb-2">
              Company
            </h4>
            <Link
              href="#"
              className="hover:text-background transition-colors text-sm"
            >
              About
            </Link>
            <Link
              href="#"
              className="hover:text-background transition-colors text-sm"
            >
              Manifesto
            </Link>
            <Link
              href="#"
              className="hover:text-background transition-colors text-sm"
            >
              Privacy Policy
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="text-background text-xs uppercase tracking-widest font-bold mb-2">
              Contact
            </h4>
            <Link
              href="#"
              className="hover:text-background transition-colors text-sm"
            >
              support@notmoodle.dev
            </Link>
            <Link
              href="#"
              className="hover:text-background transition-colors text-sm"
            >
              @notmoodle
            </Link>
          </div>
        </div>
      </footer>

      <Drawer
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        title="Assignment Details"
      >
        {selectedAssignment && (
          <AssignmentDetails assignment={selectedAssignment} />
        )}
      </Drawer>
    </main>
  );
}
