"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  CheckCircle2,
  FileText,
  AlertCircle,
  ChevronDown,
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
  extractCourseDisplayName,
  getCourseAccent,
} from "@/lib/dashboard-utils";
import { AppleActivityCard, type ActivityData } from "@/components/kokonutui/apple-activity-card";
import { Loader } from "@/components/kokonutui/loader";
import { TypewriterTitle } from "@/components/kokonutui/type-writer";

function CourseCard({
  course,
  index = 0,
  isPast = false,
  pendingCount = 0,
  events = [],
  assignments = [],
}: {
  course: MoodleCourse;
  index?: number;
  isPast?: boolean;
  pendingCount?: number;
  events?: MoodleTimelineEvent[];
  assignments?: MoodleAssignment[];
}) {
  const accent = getCourseAccent(course.id, index);
  const courseCode = extractCourseCode(course.shortname, course.fullname);

  // Upcoming items for this course (up to 3 items)
  const courseEvents = events.filter((e) => e.course?.id === course.id);
  const courseAssignments = assignments.filter((a) => a.course === course.id);
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
      : [{ id: "default-1", name: "Syllabus & Course Notes" }]
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
      className={`group relative flex flex-col justify-between min-h-[280px] p-6 md:p-7 rounded-2xl border border-border/25 bg-card/75 hover:bg-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 overflow-hidden ${
        isPast ? "opacity-85 hover:opacity-100" : ""
      }`}
    >
      {/* Top Accent Ribbon */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 transition-opacity"
        style={{ backgroundColor: accent.hex }}
        aria-hidden="true"
      />

      <div>
        {/* Card Header with Folder and Course Code Badge */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="w-13 h-13 rounded-xl border border-border/30 flex items-center justify-center bg-background/80 shadow-2xs overflow-visible">
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
            className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-muted/70 text-secondary border border-border/30"
          >
            {courseCode}
          </span>
        </div>

        {/* Course Title */}
        <h3 className="text-xl md:text-2xl font-semibold mb-2 line-clamp-2 text-foreground group-hover:text-foreground tracking-tight">
          {extractCourseDisplayName(course.fullname)}
        </h3>
      </div>

      {/* Footer: Pending Deadlines Badge & Enter action */}
      <div className="pt-5 mt-4 border-t border-border/15 flex items-center justify-between gap-2">
        {isPast ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-normal bg-muted/60 text-secondary border border-border/30">
            Past Course
          </span>
        ) : pendingCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-normal bg-[var(--urgency-today-bg)] text-[var(--urgency-today)] border border-[var(--urgency-today-border)]">
            <Clock className="w-3 h-3 shrink-0" />
            {pendingCount} {pendingCount === 1 ? "deadline pending" : "deadlines pending"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-normal bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success)]/20">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            All clear
          </span>
        )}

        <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary group-hover:text-foreground transition-colors">
          <span>Enter</span>
          <ArrowRight className="w-3.5 h-3.5 -translate-x-0.5 group-hover:translate-x-0.5 transition-transform duration-300" />
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<MoodleTimelineEvent[]>([]);
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [allAssignments, setAllAssignments] = useState<MoodleAssignment[]>([]);
  const [hiddenCourseIds, setHiddenCourseIds] = useState<Set<number>>(new Set());
  const [showPastCourses, setShowPastCourses] = useState(false);
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
          const cachedHidden = new Set<number>(
            (parsed.hiddenCourseIds || []).map(Number),
          );
          setHiddenCourseIds(cachedHidden);
          setCourses(parsed.courses || []);
          const visibleCachedEvents = (parsed.events || []).filter(
            (e: any) => !cachedHidden.has(Number(e.course?.id)),
          );
          setEvents(visibleCachedEvents);
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

      // Fetch catalog visibility
      let hiddenCourseIds = new Set<number>();
      try {
        const catRes = await fetch("/api/courses/catalog");
        if (catRes.ok) {
          const catData = await catRes.json();
          const hiddenList = (catData.courses || [])
            .filter((c: any) => c.is_hidden)
            .map((c: any) => Number(c.course_id));
          hiddenCourseIds = new Set(hiddenList);
        }
      } catch (e) {
        console.warn("Could not fetch course visibility rules", e);
      }

      // Background auto-discovery push
      fetch("/api/courses/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses: currentCourses }),
      }).catch(() => {});

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

      // Exclude hidden course events from the active timeline
      const visibleEvents = filteredEvents.filter(
        (e) => !hiddenCourseIds.has(Number(e.course?.id)),
      );

      setCourses(currentCourses);
      setHiddenCourseIds(hiddenCourseIds);
      setEvents(visibleEvents);
      setAllAssignments(assignments);

      // Silently push the freshest assignments to our backend cache for the Calendar Feed
      fetch("/api/moodle/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      })
        .then(() => {
          localStorage.setItem("moodle_last_sync_timestamp", Date.now().toString());
        })
        .catch((err) =>
          console.error("Failed to sync assignments to backend cache", err),
        );

      localStorage.setItem(
        "moodle_dashboard_cache",
        JSON.stringify({
          courses: currentCourses,
          events: visibleEvents,
          assignments: assignments,
          hiddenCourseIds: Array.from(hiddenCourseIds),
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

  const activeCourses = useMemo(() => {
    return courses.filter((c) => !hiddenCourseIds.has(Number(c.id)));
  }, [courses, hiddenCourseIds]);

  const inactiveCourses = useMemo(() => {
    return courses.filter((c) => hiddenCourseIds.has(Number(c.id)));
  }, [courses, hiddenCourseIds]);

  const { overdue, today, upcoming } = useMemo(() => {
    const now = Date.now();
    const buckets = {
      overdue: [] as MoodleTimelineEvent[],
      today: [] as MoodleTimelineEvent[],
      upcoming: [] as MoodleTimelineEvent[],
    };

    events.forEach((e) => {
      if (hiddenCourseIds.has(Number(e.course?.id))) return;
      const diff = Math.ceil(
        (e.timestart * 1000 - now) / (1000 * 60 * 60 * 24),
      );
      if (diff < 0) buckets.overdue.push(e);
      else if (diff === 0) buckets.today.push(e);
      else buckets.upcoming.push(e);
    });

    return buckets;
  }, [events, hiddenCourseIds]);

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
    return events.filter((e) => !hiddenCourseIds.has(Number(e.course?.id)));
  }, [events, hiddenCourseIds]);

  // Compute pending assignment/deadline count for each course
  const coursePendingCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    events.forEach((event) => {
      const cid = Number(event.course?.id);
      if (cid && !hiddenCourseIds.has(cid)) {
        counts[cid] = (counts[cid] || 0) + 1;
      }
    });
    return counts;
  }, [events, hiddenCourseIds]);

  const activityData: ActivityData[] = useMemo(() => {
    const pendingTotal = today.length + overdue.length;
    const totalAssignments = Math.max(allAssignments.length, pendingTotal, 1);
    const completedCount = Math.max(0, allAssignments.length - pendingTotal);
    const totalCourses = Math.max(courses.length, 1);
    const activeCount = courses.filter((c) => !hiddenCourseIds.has(c.id)).length;

    return [
      {
        label: "pending deadlines",
        color: "#f59e0b",
        colorEnd: "#ef4444",
        size: 170,
        current: pendingTotal,
        target: totalAssignments,
        unit: "tasks",
      },
      {
        label: "completed submissions",
        color: "#10b981",
        colorEnd: "#34d399",
        size: 135,
        current: completedCount,
        target: totalAssignments,
        unit: "done",
      },
      {
        label: "active modules",
        color: "#6366f1",
        colorEnd: "#818cf8",
        size: 100,
        current: activeCount,
        target: totalCourses,
        unit: "courses",
      },
    ];
  }, [today.length, overdue.length, allAssignments.length, courses, hiddenCourseIds]);

  return (
    <main className="flex min-h-[calc(100vh-80px)] w-full flex-col items-center bg-background text-foreground font-sans">
      {loading ? (
        <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-6" aria-live="polite" aria-busy="true">
          <Loader size="lg" title="loading your workspace..." subtitle="syncing your courses and deadlines" />
          <span className="sr-only">Loading your workspace...</span>
        </div>
      ) : (
        <div className="w-full max-w-[1440px] px-4 md:px-12 pb-24">
          {/* Greeting & Vitality Section */}
          <section className="w-full mt-8 md:mt-12 mb-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="flex-1">
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight lowercase text-foreground">
                hello{userName ? `, ` : " "}
                <span className="text-secondary font-medium">
                  {userName || "there"}
                </span>
              </h2>
              <p className="mt-2 text-sm md:text-base font-medium text-secondary">
                {greetingSubtitle}
              </p>
              <div className="mt-1 text-xs md:text-sm font-normal text-muted-foreground lowercase">
                <TypewriterTitle
                  sequences={[
                    { text: "ready to tackle your coursework?", deleteAfter: true, pauseAfter: 2000 },
                    { text: "you're making great progress", deleteAfter: true, pauseAfter: 2000 },
                    { text: "focus on today's priorities", deleteAfter: false },
                  ]}
                  textClassName="text-xs md:text-sm text-muted-foreground lowercase"
                />
              </div>
            </div>

            {/* Apple Activity Card Vitality Rings */}
            <div className="w-full lg:w-auto shrink-0 bg-card/40 border border-border/25 rounded-2xl backdrop-blur-xs p-2 md:p-3 shadow-2xs">
              <AppleActivityCard
                title="daily activity"
                activities={activityData}
                className="p-3 md:p-4 max-w-xl"
              />
            </div>
          </section>

          {/* Focus Overview (Urgency Metric Cards) */}
          <section className="pb-10 pt-2 w-full" aria-label="Assignment focus overview">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Overdue Card */}
              <button
                type="button"
                onClick={() => router.push("/assignments?filter=overdue")}
                aria-label={`Overdue assignments: ${overdue.length}. Click to view overdue assignments.`}
                className="group p-6 text-left rounded-2xl transition-all duration-300 cursor-pointer border bg-[var(--urgency-overdue-bg)] border-[var(--urgency-overdue-border)] hover:opacity-95 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--urgency-overdue)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-4xl md:text-5xl font-semibold text-foreground leading-none">
                    {overdue.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-background/80 border border-[var(--urgency-overdue-border)] text-[var(--urgency-overdue)] shadow-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    NEEDS ATTENTION
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-wider text-[var(--urgency-overdue)]">
                  Overdue
                </h3>
                <p className="mt-2 text-sm font-medium text-secondary">
                  {overdue.length > 0
                    ? `${overdue.length} ${overdue.length === 1 ? "assignment" : "assignments"} need your attention.`
                    : "Nothing past its deadline."}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[var(--urgency-overdue)] opacity-85 group-hover:opacity-100 transition-opacity">
                  <span>Click to view overdue assignments</span>
                  <ArrowRight className="w-3.5 h-3.5 -translate-x-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Due Today Card */}
              <button
                type="button"
                onClick={() => router.push("/assignments?filter=today")}
                aria-label={`Due today assignments: ${today.length}. Click to view today's assignments.`}
                className="group p-6 text-left rounded-2xl transition-all duration-300 cursor-pointer border bg-[var(--urgency-today-bg)] border-[var(--urgency-today-border)] hover:opacity-95 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--urgency-today)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-4xl md:text-5xl font-semibold text-foreground leading-none">
                    {today.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-background/80 border border-[var(--urgency-today-border)] text-[var(--urgency-today)] shadow-xs">
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    TACKLE TODAY
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-wider text-[var(--urgency-today)]">
                  Due Today
                </h3>
                <p className="mt-2 text-sm font-medium text-secondary">
                  {today.length > 0
                    ? "Tackle these before the day is over."
                    : "Nothing due today."}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[var(--urgency-today)] opacity-85 group-hover:opacity-100 transition-opacity">
                  <span>Click to view today&apos;s assignments</span>
                  <ArrowRight className="w-3.5 h-3.5 -translate-x-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Upcoming Card */}
              <button
                type="button"
                onClick={() => router.push("/assignments?filter=upcoming")}
                aria-label={`Upcoming assignments: ${upcoming.length}. Click to view upcoming assignments.`}
                className="group p-6 text-left rounded-2xl transition-all duration-300 cursor-pointer border bg-[var(--urgency-upcoming-bg)] border-[var(--urgency-upcoming-border)] hover:opacity-95 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--urgency-upcoming)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-4xl md:text-5xl font-semibold text-foreground leading-none">
                    {upcoming.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-background/80 border border-[var(--urgency-upcoming-border)] text-[var(--urgency-upcoming)] shadow-xs">
                    <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    ON SCHEDULE
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-wider text-[var(--urgency-upcoming)]">
                  Upcoming
                </h3>
                <p className="mt-2 text-sm font-medium text-secondary">
                  {upcoming.length > 0
                    ? "Planned deadlines on the horizon."
                    : "Your calendar is clear."}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[var(--urgency-upcoming)] opacity-85 group-hover:opacity-100 transition-opacity">
                  <span>Click to view upcoming assignments</span>
                  <ArrowRight className="w-3.5 h-3.5 -translate-x-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </section>

          {/* Enrolled Course Modules (Directly Above Fold - Zero Scrolling) */}
          <section className="mb-14" aria-label="Enrolled courses">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl md:text-3xl font-semibold lowercase tracking-tight text-foreground">
                enrolled modules
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-muted/80 text-secondary border border-border/30">
                {activeCourses.length} active
              </span>
              <div className="flex-1 hairline-divider h-px w-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeCourses.map((course, i) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  index={i}
                  pendingCount={coursePendingCounts[course.id] || 0}
                  events={events}
                  assignments={allAssignments}
                />
              ))}
              {activeCourses.length === 0 &&
                loading &&
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-8 border border-border/10 rounded-2xl animate-pulse bg-card/50 min-h-[280px]"
                  ></div>
                ))}
            </div>

            {inactiveCourses.length > 0 && (
              <div className="mt-8 rounded-2xl border border-border/30 bg-card/60 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowPastCourses(!showPastCourses)}
                  aria-expanded={showPastCourses}
                  className="w-full flex items-center justify-between p-4 px-6 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm tracking-tight text-foreground lowercase">
                      Past / Inactive Courses
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-muted text-secondary">
                      {inactiveCourses.length}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-secondary transition-transform duration-200 ${
                      showPastCourses ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showPastCourses && (
                  <div className="p-6 pt-2 border-t border-border/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
                    {inactiveCourses.map((course, idx) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        index={idx}
                        isPast
                        events={events}
                        assignments={allAssignments}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Timeline / Agenda (Collapsible & Filterable below Courses) */}
          <section className="mb-16" aria-label="Deadline timeline">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-semibold lowercase tracking-tight text-foreground">
                  timeline
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-muted/80 text-secondary border border-border/30">
                  {displayedEvents.length} {displayedEvents.length === 1 ? "deadline" : "deadlines"}
                </span>
              </div>
              <div className="hidden md:block flex-1 hairline-divider h-px ml-4"></div>
              <Link
                href="/assignments"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-foreground transition-colors"
              >
                <span>view all assignments</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex flex-col">
              {displayedEvents.length === 0 ? (
                <div className="py-14 px-6 my-4 text-center rounded-2xl border border-dashed border-border/40 bg-card/30 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-2 tracking-tight">
                    No deadlines here — you&apos;re all set!
                  </h3>
                  <p className="text-sm text-secondary max-w-md mb-6 lowercase">
                    You&apos;ve tackled everything on your schedule. Take a breather or explore your enrolled modules.
                  </p>
                  <Link
                    href="/assignments"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium lowercase tracking-wide text-foreground bg-card border border-border/60 rounded-lg hover:border-foreground transition-all cursor-pointer shadow-xs"
                  >
                    <span>view all assignments</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="relative pl-6 md:pl-8 before:absolute before:top-4 before:bottom-4 before:left-[11px] md:before:left-[15px] before:w-0.5 before:bg-border/30 space-y-6">
                  {displayedEvents.map((event, index) => {
                    const date = new Date(event.timestart * 1000);
                    const day = date.getDate().toString().padStart(2, "0");
                    const month = date
                      .toLocaleString("default", { month: "short" })
                      .toLowerCase();
                    const time = date.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

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

                    const courseCode = event.course
                      ? extractCourseCode(event.course.shortname, event.course.fullname)
                      : "COURSE";
                    const courseName = event.course
                      ? extractCourseDisplayName(event.course.fullname)
                      : "Course";
                    const courseAccent = getCourseAccent(event.course?.id || 0, index);

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
                        className="group relative flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 p-5 md:p-6 rounded-2xl border border-border/25 bg-card/40 hover:bg-card hover:border-border/60 transition-all duration-200 cursor-pointer shadow-2xs text-left"
                      >
                        {/* Timeline Node Dot */}
                        <div
                          className={`absolute -left-[18px] md:-left-[22px] top-6 w-3 h-3 rounded-full ring-4 ring-background transition-transform duration-200 group-hover:scale-125 ${
                            badge.variant === "overdue"
                              ? "bg-red-500 ring-red-500/20"
                              : badge.variant === "today"
                                ? "bg-amber-500 ring-amber-500/20"
                                : "bg-slate-400 dark:bg-slate-500 ring-slate-400/20"
                          }`}
                          aria-hidden="true"
                        />

                        {/* Left Column: Day number, month, year, time, and relative countdown pill */}
                        <div className="md:col-span-3 flex flex-col justify-start items-start">
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl md:text-5xl font-semibold leading-none text-foreground tracking-tight">
                              {day}
                            </span>
                            <span className="text-xs font-semibold lowercase text-secondary">
                              {month} {date.getFullYear()}
                            </span>
                          </div>
                          <div className="text-xs font-mono mt-1 text-secondary">
                            {time}
                          </div>
                          <div className="mt-2.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border shadow-2xs ${badgeVariantStyles}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {/* Content Column: Course tag with course accent color, title, and sanitized description snippet */}
                        <div className="md:col-span-7 flex flex-col justify-center">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border shadow-2xs"
                              style={{
                                backgroundColor: `${courseAccent.hex}15`,
                                borderColor: `${courseAccent.hex}40`,
                                color: courseAccent.hex,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: courseAccent.hex }}
                              />
                              {courseCode}
                            </span>
                            <span className="text-xs font-medium text-secondary truncate max-w-[200px] md:max-w-[280px]">
                              {courseName}
                            </span>
                          </div>
                          <h3 className="text-lg md:text-xl font-semibold text-foreground group-hover:translate-x-0.5 transition-transform duration-200 tracking-tight">
                            {event.name}
                          </h3>
                          {event.description && (
                            <div
                              className="mt-1 text-secondary line-clamp-2 text-xs md:text-sm font-normal"
                              dangerouslySetInnerHTML={{
                                __html: event.description,
                              }}
                            />
                          )}
                        </div>

                        {/* Action Column: "View Details" button opening the AssignmentDetails drawer */}
                        <div className="md:col-span-2 flex items-center md:justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/40 text-secondary bg-background/60 group-hover:border-foreground/30 group-hover:text-foreground group-hover:bg-card hover:bg-card transition-all duration-200 shadow-2xs cursor-pointer"
                          >
                            <span>View Details</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0 -translate-x-0.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
