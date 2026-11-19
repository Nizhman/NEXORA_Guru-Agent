export interface Task {
  id: string;
  courseId?: string;      // ID Kelas dari Google Classroom
  courseworkId?: string;  // ID Tugas (Coursework) dari Google Classroom
  title: string;
  subject: string;
  className: string;
  deadline: string;
  submittedCount: number;
  totalStudents: number;
  gradedCount: number;
  status: string;
  sheetUrl?: string;
}