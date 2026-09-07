"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { MoodleConnect } from "@/components/MoodleConnect";
import { Drawer } from "@/components/Drawer";
import { AssignmentDetails } from "@/components/AssignmentDetails";
import { createClient } from "@/utils/supabase/client";
import Folder from "@/components/Folder";
import {
  ArrowRight,
  Clock,
  Calendar,
  X,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react";
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
import {
  getRelativeTimeBadge,
  extractCourseCode,
  getCourseAccent,
} from "@/lib/dashboard-utils";

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
        setMoodleError("Connect to Moodle to see your courses.");
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

  const [activeFilter, setActiveFilter] = useState<
    "all" | "overdue" | "today" | "upcoming"
  >("all");

  const { overdue, today, upcoming } = useMemo(() => {
    const now = Date.now();
    const buckets = {
      overdue: [] as MoodleTimelineEvent[],
      today: [] as MoodleTimelineEvent[],
      upcoming: [] as MoodleTimelineEvent[],
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

  const greetingSubtitle = useMemo(() => {
    if (overdue.length > 0) {
      return `Action required: You have ${overdue.length} overdue ${overdue.length === 1 ? "item" : "items"}.`;
    }
    if (today.length > 0) {
      return `Focus mode: ${today.length} ${today.length === 1 ? "deadline" : "deadlines"} scheduled today.`;
    }
    return "Clear horizon: You're all caught up on submissions.";
  }, [overdue.length, today.length]);

  const displayedEvents = useMemo(() => {
    if (activeFilter === "overdue") return overdue;
    if (activeFilter === "today") return today;
    if (activeFilter === "upcoming") return upcoming;
    return events;
  }, [activeFilter, overdue, today, upcoming, events]);

  // Compute pending assignment/deadline count for each course
  const coursePendingCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    events.forEach((event) => {
      const cid = event.course?.id;
      if (cid) {
        counts[cid] = (counts[cid] || 0) + 1;
      }
    });
    return counts;
  }, [events]);

  return (
    <main className="flex min-h-[calc(100vh-80px)] w-full flex-col items-center bg-background text-foreground font-sans">
      {loading ? (
        <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-6" aria-live="polite" aria-busy="true">
          <img src="/notmoodlelogo.png" alt="Loading your workspace..." className="h-20 w-auto object-contain animate-pulse" />
          <span className="text-xs uppercase tracking-widest font-bold animate-pulse">Loading your workspace...</span>
        </div>
      ) : (
        <div className="w-full max-w-[1440px] px-4 md:px-12 pb-24">
          {/* Greeting Section */}
          <section className="w-full mt-12 mb-8">
            <h2 className="clash-title text-4xl md:text-6xl text-left">
              Hello{userName ? `, ` : ""}{" "}
              <span className="font-serif italic font-normal">
                {userName || "there"}
              </span>
            </h2>
            <p className="mt-3 text-base md:text-lg text-secondary font-medium">
              {greetingSubtitle}
            </p>
          </section>

          {/* Focus Overview */}
          <section className="pb-16 pt-2 w-full" aria-label="Assignment focus overview">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Overdue Card */}
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "overdue" ? "all" : "overdue")}
                aria-pressed={activeFilter === "overdue"}
                aria-label={`Overdue assignments: ${overdue.length}. Click to toggle filter.`}
                className={`group p-6 text-left rounded-xl transition-all duration-300 cursor-pointer border bg-[var(--urgency-overdue-bg)] border-[var(--urgency-overdue-border)] hover:opacity-95 ${
                  activeFilter === "overdue"
                    ? "ring-2 ring-[var(--urgency-overdue)] ring-offset-2 ring-offset-background shadow-md"
                    : "hover:shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="clash-title text-5xl md:text-6xl text-foreground leading-none">
                    {overdue.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-background/80 border border-[var(--urgency-overdue-border)] text-[var(--urgency-overdue)] shadow-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    NEEDS ATTENTION
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-bold uppercase tracking-widest text-[var(--urgency-overdue)]">
                  Overdue
                </h3>
                <p className="mt-2 text-sm font-medium text-secondary">
                  {overdue.length > 0
                    ? `${overdue.length} ${overdue.length === 1 ? "assignment" : "assignments"} need your attention.`
                    : "Nothing past its deadline."}
                </p>
              </button>

              {/* Due Today Card */}
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "today" ? "all" : "today")}
                aria-pressed={activeFilter === "today"}
                aria-label={`Due today assignments: ${today.length}. Click to toggle filter.`}
                className={`group p-6 text-left rounded-xl transition-all duration-300 cursor-pointer border bg-[var(--urgency-today-bg)] border-[var(--urgency-today-border)] hover:opacity-95 ${
                  activeFilter === "today"
                    ? "ring-2 ring-[var(--urgency-today)] ring-offset-2 ring-offset-background shadow-md"
                    : "hover:shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="clash-title text-5xl md:text-6xl text-foreground leading-none">
                    {today.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-background/80 border border-[var(--urgency-today-border)] text-[var(--urgency-today)] shadow-xs">
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    TACKLE TODAY
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-bold uppercase tracking-widest text-[var(--urgency-today)]">
                  Due Today
                </h3>
                <p className="mt-2 text-sm font-medium text-secondary">
                  {today.length > 0
                    ? "Tackle these before the day is over."
                    : "Nothing due today."}
                </p>
              </button>

              {/* Upcoming Card */}
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "upcoming" ? "all" : "upcoming")}
                aria-pressed={activeFilter === "upcoming"}
                aria-label={`Upcoming assignments: ${upcoming.length}. Click to toggle filter.`}
                className={`group p-6 text-left rounded-xl transition-all duration-300 cursor-pointer border bg-[var(--urgency-upcoming-bg)] border-[var(--urgency-upcoming-border)] hover:opacity-95 ${
                  activeFilter === "upcoming"
                    ? "ring-2 ring-[var(--urgency-upcoming)] ring-offset-2 ring-offset-background shadow-md"
                    : "hover:shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="clash-title text-5xl md:text-6xl text-foreground leading-none">
                    {upcoming.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-background/80 border border-[var(--urgency-upcoming-border)] text-[var(--urgency-upcoming)] shadow-xs">
                    <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    ON SCHEDULE
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-bold uppercase tracking-widest text-[var(--urgency-upcoming)]">
                  Upcoming
                </h3>
                <p className="mt-2 text-sm font-medium text-secondary">
                  {upcoming.length > 0
                    ? "Planned deadlines on the horizon."
                    : "Your calendar is clear."}
                </p>
              </button>
            </div>
          </section>

          {/* Timeline */}
          <section className="mb-16" aria-label="Deadline timeline">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="clash-title text-3xl uppercase">Timeline</h2>
                {activeFilter !== "all" && (
                  <div className="flex items-center gap-2" role="status" aria-live="polite">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-card border border-border text-foreground shadow-xs">
                      Filtered:{" "}
                      <span
                        className={
                          activeFilter === "overdue"
                            ? "text-[var(--urgency-overdue)]"
                            : activeFilter === "today"
                              ? "text-[var(--urgency-today)]"
                              : "text-[var(--urgency-upcoming)]"
                        }
                      >
                        {activeFilter === "today" ? "Due Today" : activeFilter}
                      </span>
                      <span className="text-secondary font-mono">({displayedEvents.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveFilter("all")}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-secondary hover:text-foreground hover:bg-muted/50 rounded-md border border-border/50 transition-colors cursor-pointer"
                      aria-label="Clear filter (Show all)"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                      Clear filter (Show all)
                    </button>
                  </div>
                )}
              </div>
              <div className="hidden md:block flex-1 hairline-divider h-px ml-4"></div>
            </div>

            <div className="flex flex-col border-t border-border/20">
              {displayedEvents.length === 0 ? (
                <div className="py-16 px-6 my-4 text-center rounded-2xl border border-dashed border-border/40 bg-card/40 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="clash-title text-xl md:text-2xl font-medium text-foreground mb-2">
                    {activeFilter !== "all"
                      ? `No ${activeFilter === "today" ? "due today" : activeFilter} items found.`
                      : "No deadlines here — you're all set!"}
                  </h3>
                  <p className="text-sm text-secondary max-w-md mb-6">
                    {activeFilter !== "all"
                      ? "Check your other urgency views or clear the filter to see all upcoming coursework."
                      : "You've tackled everything on your schedule. Take a breather or explore your enrolled modules."}
                  </p>
                  {activeFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter("all")}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground bg-card border border-border/60 rounded-lg hover:border-foreground transition-all cursor-pointer shadow-xs"
                    >
                      Show all deadlines
                    </button>
                  )}
                </div>
              ) : (
                displayedEvents.map((event) => {
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
                  const matchingAssignment = allAssignments.find(
                    (a) => a.id === event.instance || (event.id > 0 && a.id === event.id),
                  );

                  const badge = getRelativeTimeBadge(event.timestart);
                  const badgeVariantStyles =
                    badge.variant === "overdue"
                      ? "bg-[var(--urgency-overdue-bg)] border-[var(--urgency-overdue-border)] text-[var(--urgency-overdue)]"
                      : badge.variant === "today"
                        ? "bg-[var(--urgency-today-bg)] border-[var(--urgency-today-border)] text-[var(--urgency-today)]"
                        : "bg-[var(--urgency-upcoming-bg)] border-[var(--urgency-upcoming-border)] text-[var(--urgency-upcoming)]";

                  const handleItemClick = () => {
                    if (matchingAssignment) {
                      setSelectedAssignment(matchingAssignment);
                      return;
                    }
                    if (event.course?.id) {
                      window.location.href = `/course/${event.course.id}`;
                    }
                  };

                  return (
                    <div
                      key={event.id}
                      onClick={handleItemClick}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleItemClick();
                        }
                      }}
                      className="group grid grid-cols-1 md:grid-cols-12 gap-6 py-8 border-b border-border/20 hover:bg-card/40 transition-colors duration-300 text-left px-4 md:px-6 w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded-lg"
                    >
                      {/* Date Column */}
                      <div className="md:col-span-3 flex flex-col justify-start items-start">
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl clash-title font-medium leading-none text-foreground">
                            {day}
                          </span>
                          <span className="text-sm font-bold tracking-widest uppercase text-tertiary">
                            {month} {date.getFullYear()}
                          </span>
                        </div>
                        <div className="text-xs font-mono mt-2 text-tertiary uppercase">
                          {time}
                        </div>
                        {/* Countdown Badge */}
                        <div className="mt-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border shadow-2xs ${badgeVariantStyles}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      {/* Content Column */}
                      <div className="md:col-span-7 flex flex-col justify-center">
                        <div className="text-xs font-bold tracking-widest uppercase mb-2 text-tertiary flex items-center gap-2">
                          <span className="w-2 h-2 bg-foreground/60 rounded-full shrink-0"></span>
                          <span className="truncate">{event.course?.fullname || "System Event"}</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-medium clash-title text-foreground group-hover:translate-x-1.5 transition-transform duration-300">
                          {event.name}
                        </h3>
                        {event.description && (
                          <div
                            className="mt-2 text-secondary line-clamp-2 text-sm max-w-2xl font-medium"
                            dangerouslySetInnerHTML={{
                              __html: event.description,
                            }}
                          />
                        )}
                      </div>

                      {/* Action Column */}
                      <div className="md:col-span-2 flex items-center justify-end">
                        <span
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg border border-border/40 text-secondary bg-background/60 group-hover:border-foreground/30 group-hover:text-foreground group-hover:bg-card transition-all duration-300 shadow-2xs"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 -translate-x-0.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Enrolled Course Modules */}
          <section className="mb-16" aria-label="Enrolled courses">
            <div className="flex items-center gap-6 mb-8">
              <h2 className="clash-title text-3xl uppercase">
                Enrolled Modules
              </h2>
              <div className="flex-1 hairline-divider h-px w-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {courses.map((course, i) => {
                const accent = getCourseAccent(course.id, i);
                const courseCode = extractCourseCode(course.shortname, course.fullname);
                const pendingCount = coursePendingCounts[course.id] || 0;

                // Upcoming items for this course (up to 3 items)
                const courseEvents = events.filter((e) => e.course?.id === course.id);
                const courseAssignments = allAssignments.filter((a) => a.course === course.id);
                const combinedItems = [
                  ...courseEvents.map((e) => ({ id: `e-${e.id}`, name: e.name })),
                  ...courseAssignments.map((a) => ({ id: `a-${a.id}`, name: a.name })),
                ];
                // Deduplicate by name
                const uniqueItems = Array.from(
                  new Map(combinedItems.map((item) => [item.name, item])).values(),
                ).slice(0, 3);

                const coursePapers = (
                  uniqueItems.length > 0
                    ? uniqueItems
                    : [{ id: 'default-1', name: 'Syllabus & Course Notes' }]
                ).map((item, idx) => (
                  <div
                    key={item.id}
                    className="w-full h-full p-2 flex flex-col justify-start text-[9px] leading-tight text-neutral-800 font-medium overflow-hidden select-none relative"
                    title={item.name}
                  >
                    <div className="flex items-center gap-1 opacity-70 mb-1.5 border-b border-neutral-300/60 pb-0.5">
                      <FileText className="w-2.5 h-2.5 shrink-0 text-neutral-600" />
                      <span className="font-mono text-[8px] font-bold uppercase tracking-wider truncate">
                        {courseCode} · Doc #{idx + 1}
                      </span>
                    </div>
                    <div className="space-y-1 mt-0.5">
                      <div className="h-1.5 bg-neutral-700/60 rounded-xs w-4/5" />
                      <div className="h-1.5 bg-neutral-400/50 rounded-xs w-2/3" />
                      <div className="h-1.5 bg-neutral-300/60 rounded-xs w-1/2" />
                    </div>
                  </div>
                ));

                return (
                  <Link
                    href={`/course/${course.id}`}
                    key={course.id}
                    className="group relative flex flex-col justify-between min-h-[300px] p-7 rounded-xl border border-border/20 bg-card/60 hover:bg-card hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden"
                  >
                    {/* Top Accent Ribbon */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5 transition-opacity"
                      style={{ backgroundColor: accent.hex }}
                      aria-hidden="true"
                    />

                    <div>
                      {/* Card Header with Folder and Course Code Badge */}
                      <div className="flex items-center justify-between gap-3 mb-6">
                        <div className="w-14 h-14 rounded-lg border border-border/30 flex items-center justify-center bg-background shadow-2xs overflow-visible">
                          <Folder
                            size={0.65}
                            color={accent.hex}
                            items={coursePapers}
                            interactive={false}
                            className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                          />
                        </div>
                        <span
                          data-testid="course-code-badge"
                          className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-muted/60 text-secondary border border-border/30"
                        >
                          {courseCode}
                        </span>
                      </div>

                      {/* Course Title */}
                      <h3 className="clash-title text-xl md:text-2xl font-medium mb-3 line-clamp-2 text-foreground group-hover:text-foreground">
                        {course.fullname}
                      </h3>
                    </div>

                    {/* Footer: Pending Deadlines Badge & Enter action */}
                    <div className="pt-6 mt-4 border-t border-border/15 flex items-center justify-between gap-2">
                      {pendingCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[var(--urgency-today-bg)] text-[var(--urgency-today)] border border-[var(--urgency-today-border)]">
                          <Clock className="w-3 h-3 shrink-0" />
                          {pendingCount} {pendingCount === 1 ? "deadline pending" : "deadlines pending"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success)]/20">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          All clear
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-secondary group-hover:text-foreground transition-colors">
                        <span>Enter</span>
                        <ArrowRight className="w-3.5 h-3.5 -translate-x-0.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                      </span>
                    </div>
                  </Link>
                );
              })}
              {courses.length === 0 &&
                loading &&
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-8 border border-border/10 rounded-xl animate-pulse bg-card/50 min-h-[300px]"
                  ></div>
                ))}
            </div>
          </section>
        </div>
      )}

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
