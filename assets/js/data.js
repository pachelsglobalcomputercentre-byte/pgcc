/* =========================================================
   PGCC INSTITUTE — MOCK DATA LAYER
   Front-end structure only: this file stands in for a real
   database/API. Every dashboard reads from this object so the
   UI is fully wired and ready for a backend to replace it.
   ========================================================= */

const FALLBACK_IMG = 'https://placehold.co/400x400/0f2e1d/ffffff?text=PGCC';
const ONERR = `this.onerror=null;this.src='${FALLBACK_IMG}';`;

const PGCC_DATA = {

  school: {
    name: "Pachels Global Computer Centre",
    short: "PGCC Institute",
    address: "First Floor, 30 Okhunmwun Junction, Iguosa, Benin–Lagos Expressway, Benin City, Edo State",
    phone: ["0807 073 8025", "0805 511 2416"],
    email: "pachelsglobalcomputercentre@gmail.com",
    logo: "../assets/img/logo.png"
  },

  currentUser: {
    student: { id: "PGCC/STD/2024/118", name: "John Okafor", dept: "Web & Software Development", avatar: "https://i.pravatar.cc/150?img=12", progress: 72, streak: 14 },
    instructor: { id: "PGCC/INS/2021/07", name: "Grace Imarhiagbe", dept: "Software Engineering Faculty", avatar: "https://i.pravatar.cc/150?img=47", students: 86 },
    admin: { id: "PGCC/ADM/2019/01", name: "Efe Osaretin", dept: "System Administrator", avatar: "https://i.pravatar.cc/150?img=33" }
  },

  courses: [
    { id: "c1", title: "Web Development Bootcamp", cat: "Web & Software Development", level: "Beginner", price: "₦85,000", duration: "12 weeks", students: 214, rating: 4.9, img: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80", desc: "HTML, CSS, JavaScript, and React — go from zero to a deployed portfolio site." },
    { id: "c2", title: "Data Analysis with Python", cat: "Data & Analytics", level: "Intermediate", price: "₦95,000", duration: "10 weeks", students: 168, rating: 4.8, img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80", desc: "Pandas, visualization, and real datasets to turn numbers into decisions." },
    { id: "c3", title: "Graphic Design Mastery", cat: "Design", level: "Beginner", price: "₦70,000", duration: "8 weeks", students: 142, rating: 4.7, img: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80", desc: "Photoshop, CorelDRAW, and brand design fundamentals for working designers." },
    { id: "c4", title: "Networking & Hardware", cat: "IT Infrastructure", level: "Intermediate", price: "₦90,000", duration: "10 weeks", students: 97, rating: 4.6, img: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80", desc: "Cabling, routers, subnets, and hands-on troubleshooting on real rigs." },
    { id: "c5", title: "Cybersecurity Fundamentals", cat: "Security", level: "Advanced", price: "₦120,000", duration: "12 weeks", students: 76, rating: 4.9, img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80", desc: "Threat modelling, ethical hacking basics, and defensive best practice." },
    { id: "c6", title: "Digital Marketing", cat: "Business", level: "Beginner", price: "₦65,000", duration: "6 weeks", students: 189, rating: 4.7, img: "https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&w=800&q=80", desc: "SEO, social media, and paid ads — build campaigns that convert." },
    { id: "c7", title: "Mobile App Development", cat: "Web & Software Development", level: "Advanced", price: "₦110,000", duration: "14 weeks", students: 88, rating: 4.8, img: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80", desc: "Build and ship Android & iOS apps with React Native." },
    { id: "c8", title: "Office Productivity Suite", cat: "Business", level: "Beginner", price: "₦45,000", duration: "4 weeks", students: 261, rating: 4.6, img: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?auto=format&fit=crop&w=800&q=80", desc: "Word, Excel, PowerPoint — the everyday toolkit every office needs." }
  ],

  myCourses: [
    { id: "c1", title: "Web Development Bootcamp", progress: 82, next: "Flexbox & Grid Layouts", instructor: "Grace Imarhiagbe", img: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=400&q=80" },
    { id: "c2", title: "Data Analysis with Python", progress: 54, next: "Pandas DataFrames", instructor: "Michael Uyi", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80" },
    { id: "c6", title: "Digital Marketing", progress: 91, next: "Final Capstone Campaign", instructor: "Faith Aigbogun", img: "https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&w=400&q=80" }
  ],

  lessons: [
    { id: "l1", course: "Web Development Bootcamp", title: "CSS Flexbox & Grid Layouts", type: "video", duration: "34 min", uploaded: "2 days ago", instructor: "Grace Imarhiagbe", thumb: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=500&q=80", watched: false },
    { id: "l2", course: "Web Development Bootcamp", title: "JavaScript DOM Manipulation", type: "video", duration: "41 min", uploaded: "5 days ago", instructor: "Grace Imarhiagbe", thumb: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=500&q=80", watched: true },
    { id: "l3", course: "Data Analysis with Python", title: "Intro to Pandas DataFrames", type: "video", duration: "38 min", uploaded: "1 day ago", instructor: "Michael Uyi", thumb: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=500&q=80", watched: false },
    { id: "l4", course: "Web Development Bootcamp", title: "HTML Semantic Elements — Notes", type: "pdf", duration: "12 pages", uploaded: "1 week ago", instructor: "Grace Imarhiagbe", thumb: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=500&q=80", watched: true },
    { id: "l5", course: "Digital Marketing", title: "SEO Keyword Research Toolkit", type: "zip", duration: "4 files", uploaded: "3 days ago", instructor: "Faith Aigbogun", thumb: "https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&w=500&q=80", watched: false },
    { id: "l6", course: "Data Analysis with Python", title: "Data Cleaning Starter Code", type: "code", duration: "3 files", uploaded: "4 days ago", instructor: "Michael Uyi", thumb: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=500&q=80", watched: false }
  ],

  assignments: [
    { id: "a1", title: "Build a Responsive Landing Page", course: "Web Development Bootcamp", due: "Aug 12, 2026", status: "pending", score: null, instructor: "Grace Imarhiagbe" },
    { id: "a2", title: "Clean & Visualize Sales Dataset", course: "Data Analysis with Python", due: "Aug 09, 2026", status: "submitted", score: null, instructor: "Michael Uyi" },
    { id: "a3", title: "Design a 3-Post Ad Campaign", course: "Digital Marketing", due: "Jul 28, 2026", status: "graded", score: 88, instructor: "Faith Aigbogun" },
    { id: "a4", title: "JavaScript To-Do App", course: "Web Development Bootcamp", due: "Jul 20, 2026", status: "graded", score: 95, instructor: "Grace Imarhiagbe" },
    { id: "a5", title: "Subnet Design Worksheet", course: "Networking & Hardware", due: "Jul 15, 2026", status: "graded", score: 79, instructor: "David Ehis" }
  ],

  exams: [
    { id: "e1", title: "HTML & CSS Foundations", course: "Web Development Bootcamp", date: "Aug 14, 2026", duration: "45 min", questions: 25, status: "upcoming" },
    { id: "e2", title: "Python Basics CBT", course: "Data Analysis with Python", date: "Aug 20, 2026", duration: "60 min", questions: 30, status: "upcoming" },
    { id: "e3", title: "JavaScript Fundamentals", course: "Web Development Bootcamp", date: "Jul 18, 2026", duration: "40 min", questions: 20, status: "completed", score: 86 },
    { id: "e4", title: "Digital Marketing Basics", course: "Digital Marketing", date: "Jul 05, 2026", duration: "30 min", questions: 20, status: "completed", score: 92 }
  ],

  examQuestions: [
    { q: "Which HTML tag is used to define an internal style sheet?", options: ["<css>", "<script>", "<style>", "<link>"], answer: 2 },
    { q: "Which CSS property controls the space between flex items?", options: ["margin", "gap", "spacing", "padding"], answer: 1 },
    { q: "What does the 'grid-template-columns' property define?", options: ["Row height", "Column structure of a grid", "Font size", "Border style"], answer: 1 },
    { q: "Which value of 'position' takes an element out of normal flow?", options: ["static", "relative", "absolute", "inherit"], answer: 2 },
    { q: "What is the correct file extension for JavaScript files?", options: [".java", ".js", ".jsx", ".script"], answer: 1 }
  ],

  results: [
    { course: "JavaScript Fundamentals", type: "Exam", score: 86, grade: "A", date: "Jul 18, 2026" },
    { course: "Digital Marketing Basics", type: "Exam", score: 92, grade: "A", date: "Jul 05, 2026" },
    { course: "3-Post Ad Campaign", type: "Assignment", score: 88, grade: "A", date: "Jul 28, 2026" },
    { course: "JavaScript To-Do App", type: "Assignment", score: 95, grade: "A+", date: "Jul 20, 2026" },
    { course: "Subnet Design Worksheet", type: "Assignment", score: 79, grade: "B+", date: "Jul 15, 2026" }
  ],

  certificates: [
    { id: "cert1", title: "Office Productivity Suite", date: "Mar 2026", status: "issued" },
    { id: "cert2", title: "HTML & CSS Foundations", date: "—", status: "in-progress" }
  ],

  attendance: {
    percent: 94,
    recent: [
      { date: "Aug 05, 2026", status: "present" },
      { date: "Aug 04, 2026", status: "present" },
      { date: "Aug 03, 2026", status: "present" },
      { date: "Jul 31, 2026", status: "absent" },
      { date: "Jul 30, 2026", status: "present" }
    ]
  },

  announcements: [
    { title: "New AI Learning Assistant now live", body: "Ask the AI Tutor for instant help on any lesson, any time.", date: "Aug 06, 2026", tag: "Platform" },
    { title: "Mid-term exams begin August 14", body: "Check the Online Exams tab for your schedule and CBT rules.", date: "Aug 05, 2026", tag: "Academic" },
    { title: "Campus closed for public holiday", body: "No physical classes on August 15. Online lessons continue as usual.", date: "Aug 02, 2026", tag: "Notice" },
    { title: "New cohort: Cybersecurity Fundamentals", body: "Enrollment opens for the September cybersecurity cohort.", date: "Jul 30, 2026", tag: "Admission" }
  ],

  news: [
    { title: "PGCC Institute graduates 240 students in July cohort", excerpt: "Our largest graduating class yet, across six departments, received certificates at the Benin City campus.", date: "Jul 30, 2026", img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=700&q=80", cat: "Graduation" },
    { title: "New partnership brings paid internships for top graduates", excerpt: "Selected graduates will now be placed directly with partner tech companies in Benin City and Lagos.", date: "Jul 18, 2026", img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80", cat: "Partnership" },
    { title: "AI Learning Assistant launches for all students", excerpt: "Every student now has 24/7 access to an AI tutor for extra practice and instant explanations.", date: "Jul 10, 2026", img: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=700&q=80", cat: "Platform" },
    { title: "Cybersecurity Fundamentals added to the curriculum", excerpt: "A new advanced track responds to growing demand from Edo State employers.", date: "Jun 28, 2026", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=700&q=80", cat: "Academic" },
    { title: "Open Day 2026: over 500 visitors toured the campus", excerpt: "Prospective students explored labs, met instructors, and watched live coding demos.", date: "Jun 12, 2026", img: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=700&q=80", cat: "Event" },
    { title: "PGCC Institute now offering weekend classes", excerpt: "A flexible weekend track has been added for working professionals.", date: "May 29, 2026", img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=700&q=80", cat: "Admission" }
  ],

  testimonials: [
    { name: "Blessing Osagie", role: "Web Development Graduate", avatar: "https://i.pravatar.cc/100?img=32", quote: "PGCC took me from knowing nothing about computers to building my own websites. My instructor never gave up on me." },
    { name: "Kelvin Aiyedun", role: "Cybersecurity Student", avatar: "https://i.pravatar.cc/100?img=51", quote: "The hands-on labs are the best part. I was doing real network troubleshooting in my second week." },
    { name: "Precious Uwagboe", role: "Digital Marketing Graduate", avatar: "https://i.pravatar.cc/100?img=45", quote: "I run ads for three local businesses now, all because of what I learned here. Worth every naira." },
    { name: "Samuel Ehizele", role: "Data Analysis Student", avatar: "https://i.pravatar.cc/100?img=14", quote: "Small class sizes meant I could actually ask questions. The AI Tutor helps me practice at night too." },
    { name: "Faith Okoro", role: "Graphic Design Graduate", avatar: "https://i.pravatar.cc/100?img=29", quote: "My portfolio from PGCC got me freelance clients before I even graduated." }
  ],

  gallery: [
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=500&q=80"
  ],

  faqs: [
    { q: "Do I need prior computer knowledge to enroll?", a: "No. Most of our courses, including Web Development and Office Productivity, start from the absolute basics. Advanced tracks like Cybersecurity recommend some prior experience." },
    { q: "Are classes physical, online, or both?", a: "Both. You can attend at our Benin City campus or follow live and recorded lessons through the Student Portal from anywhere." },
    { q: "How do I get my certificate?", a: "Certificates are issued automatically once you complete all lessons, assignments, and pass the final CBT exam for a course. You can download it from the Certificates tab." },
    { q: "Can I pay in installments?", a: "Yes, most courses support a two-installment payment plan. Speak with admissions during your application for details." },
    { q: "What is the AI Learning Assistant?", a: "It's a built-in study helper available to every student, answering questions about your lessons and giving extra practice, any time of day." }
  ],

  instructorStudents: [
    { name: "John Okafor", id: "PGCC/STD/2024/118", course: "Web Development Bootcamp", progress: 82, avg: 91, attendance: 96, avatar: "https://i.pravatar.cc/100?img=12", status: "active" },
    { name: "Chiamaka Nwosu", id: "PGCC/STD/2024/119", course: "Web Development Bootcamp", progress: 65, avg: 78, attendance: 88, avatar: "https://i.pravatar.cc/100?img=25", status: "active" },
    { name: "Tunde Bakare", id: "PGCC/STD/2024/120", course: "Web Development Bootcamp", progress: 44, avg: 63, attendance: 71, avatar: "https://i.pravatar.cc/100?img=15", status: "at-risk" },
    { name: "Ifeoma Chukwu", id: "PGCC/STD/2024/121", course: "Web Development Bootcamp", progress: 90, avg: 94, attendance: 99, avatar: "https://i.pravatar.cc/100?img=48", status: "active" },
    { name: "Musa Abdullahi", id: "PGCC/STD/2024/122", course: "Web Development Bootcamp", progress: 30, avg: 55, attendance: 60, avatar: "https://i.pravatar.cc/100?img=53", status: "at-risk" },
    { name: "Esther Bello", id: "PGCC/STD/2024/123", course: "Web Development Bootcamp", progress: 77, avg: 85, attendance: 92, avatar: "https://i.pravatar.cc/100?img=44", status: "active" }
  ],

  instructorAssignments: [
    { title: "Build a Responsive Landing Page", course: "Web Development Bootcamp", submitted: 18, total: 24, due: "Aug 12, 2026" },
    { title: "JavaScript To-Do App", course: "Web Development Bootcamp", submitted: 24, total: 24, due: "Jul 20, 2026" },
    { title: "Portfolio Wireframe", course: "Web Development Bootcamp", submitted: 9, total: 24, due: "Aug 22, 2026" }
  ],

  gradingQueue: [
    { student: "Chiamaka Nwosu", avatar: "https://i.pravatar.cc/100?img=25", title: "Build a Responsive Landing Page", submitted: "Aug 05, 2026" },
    { student: "Tunde Bakare", avatar: "https://i.pravatar.cc/100?img=15", title: "Build a Responsive Landing Page", submitted: "Aug 06, 2026" },
    { student: "Esther Bello", avatar: "https://i.pravatar.cc/100?img=44", title: "Build a Responsive Landing Page", submitted: "Aug 06, 2026" },
    { student: "Musa Abdullahi", avatar: "https://i.pravatar.cc/100?img=53", title: "Portfolio Wireframe", submitted: "Aug 04, 2026" }
  ],

  instructorExams: [
    { title: "HTML & CSS Foundations", course: "Web Development Bootcamp", date: "Aug 14, 2026", questions: 25, status: "scheduled" },
    { title: "JavaScript Fundamentals", course: "Web Development Bootcamp", date: "Jul 18, 2026", questions: 20, status: "graded", avg: 84 }
  ],

  adminStudents: [
    { name: "John Okafor", id: "PGCC/STD/2024/118", course: "Web Development Bootcamp", status: "active", joined: "Jan 2026", avatar: "https://i.pravatar.cc/100?img=12" },
    { name: "Chiamaka Nwosu", id: "PGCC/STD/2024/119", course: "Web Development Bootcamp", status: "active", joined: "Jan 2026", avatar: "https://i.pravatar.cc/100?img=25" },
    { name: "Kelvin Aiyedun", id: "PGCC/STD/2024/205", course: "Cybersecurity Fundamentals", status: "active", joined: "Mar 2026", avatar: "https://i.pravatar.cc/100?img=51" },
    { name: "Precious Uwagboe", id: "PGCC/STD/2024/098", course: "Digital Marketing", status: "graduated", joined: "Sep 2025", avatar: "https://i.pravatar.cc/100?img=45" },
    { name: "Samuel Ehizele", id: "PGCC/STD/2024/210", course: "Data Analysis with Python", status: "active", joined: "Apr 2026", avatar: "https://i.pravatar.cc/100?img=14" },
    { name: "Faith Okoro", id: "PGCC/STD/2024/077", course: "Graphic Design Mastery", status: "graduated", joined: "Aug 2025", avatar: "https://i.pravatar.cc/100?img=29" },
    { name: "Musa Abdullahi", id: "PGCC/STD/2024/122", course: "Web Development Bootcamp", status: "suspended", joined: "Jan 2026", avatar: "https://i.pravatar.cc/100?img=53" }
  ],

  adminInstructors: [
    { name: "Grace Imarhiagbe", id: "PGCC/INS/2021/07", dept: "Software Engineering", students: 86, rating: 4.9, avatar: "https://i.pravatar.cc/100?img=47" },
    { name: "Michael Uyi", id: "PGCC/INS/2022/11", dept: "Data & Analytics", students: 64, rating: 4.8, avatar: "https://i.pravatar.cc/100?img=52" },
    { name: "Faith Aigbogun", id: "PGCC/INS/2020/03", dept: "Business & Marketing", students: 91, rating: 4.7, avatar: "https://i.pravatar.cc/100?img=36" },
    { name: "David Ehis", id: "PGCC/INS/2023/14", dept: "IT Infrastructure", students: 47, rating: 4.6, avatar: "https://i.pravatar.cc/100?img=60" },
    { name: "Rita Osaigbovo", id: "PGCC/INS/2019/02", dept: "Design", students: 58, rating: 4.9, avatar: "https://i.pravatar.cc/100?img=41" }
  ],

  payments: [
    { student: "John Okafor", course: "Web Development Bootcamp", amount: "₦85,000", status: "paid", date: "Jan 14, 2026" },
    { student: "Chiamaka Nwosu", course: "Web Development Bootcamp", amount: "₦42,500", status: "partial", date: "Jan 15, 2026" },
    { student: "Kelvin Aiyedun", course: "Cybersecurity Fundamentals", amount: "₦120,000", status: "paid", date: "Mar 02, 2026" },
    { student: "Musa Abdullahi", course: "Web Development Bootcamp", amount: "₦0", status: "overdue", date: "—" },
    { student: "Samuel Ehizele", course: "Data Analysis with Python", amount: "₦95,000", status: "paid", date: "Apr 10, 2026" }
  ],

  admissions: [
    { name: "Osaze Igbinedion", course: "Web Development Bootcamp", date: "Aug 05, 2026", status: "pending" },
    { name: "Mercy Idahosa", course: "Cybersecurity Fundamentals", date: "Aug 04, 2026", status: "pending" },
    { name: "Godwin Eromosele", course: "Mobile App Development", date: "Aug 03, 2026", status: "pending" },
    { name: "Blessing Uwaila", course: "Graphic Design Mastery", date: "Aug 01, 2026", status: "approved" },
    { name: "Chukwuemeka Obi", course: "Networking & Hardware", date: "Jul 30, 2026", status: "approved" }
  ],

  conversations: [
    { name: "Grace Imarhiagbe", role: "Instructor · Web Development", avatar: "https://i.pravatar.cc/100?img=47", last: "Great work on the landing page — check my notes!", time: "10:24 AM", unread: 2,
      messages: [
        { from: "them", text: "Hi John, I reviewed your landing page submission." },
        { from: "them", text: "Great work overall — check my notes on the responsive breakpoints." },
        { from: "me", text: "Thank you ma! I'll fix the tablet view today." },
        { from: "them", text: "Great work on the landing page — check my notes!" }
      ]
    },
    { name: "Michael Uyi", role: "Instructor · Data Analysis", avatar: "https://i.pravatar.cc/100?img=52", last: "Don't forget the dataset is due Sunday.", time: "Yesterday", unread: 0,
      messages: [
        { from: "them", text: "Don't forget the dataset is due Sunday." },
        { from: "me", text: "Noted, working on it now." }
      ]
    },
    { name: "Admissions Office", role: "PGCC Institute", avatar: "https://i.pravatar.cc/100?img=5", last: "Your certificate request has been received.", time: "Mon", unread: 0,
      messages: [ { from: "them", text: "Your certificate request has been received. We'll notify you once it's ready for pickup or download." } ]
    }
  ],

  aiTutorSeed: [
    { from: "ai", text: "Hi John! I'm your AI Tutor. Ask me anything about your lessons — HTML, CSS, JavaScript, or your other courses." }
  ],

  analyticsStudent: { lessonsWatched: 47, hoursStudied: 63, quizAvg: 84, assignmentAvg: 89, overall: 86 },
  analyticsInstructor: { students: 86, completionRate: 78, assignmentRate: 91, classAvg: 83 },
  analyticsAdmin: { totalStudents: 1284, totalInstructors: 34, totalCourses: 8, revenue: "₦18.4M", completionRate: 74, satisfaction: 4.8 }
};
