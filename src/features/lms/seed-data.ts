import type { Assignment, Course, RecentActivity } from "./types";

// Fixed demonstration content. Replace this module when real course data is ready.
export const student = {
  name: "Dafa Ghani Abdul Rabbani",
  initials: "DR",
  email: "dafa23002@mail.unpad.ac.id",
  program: "Teknik Informatika",
};

export const courses: Course[] = [
  {
    id: "matematika-diskrit",
    code: "IF201",
    title: "Matematika Diskrit",
    description:
      "Bangun cara berpikir logis melalui himpunan, relasi, dan teori graf.",
    lecturer: "Dr. Maya Putri",
    lecturerInitials: "MP",
    category: "Dasar Informatika",
    artwork: "mathematics",
    meetings: [
      {
        id: "logika",
        title: "Logika dan proposisi",
        date: "2026-10-05",
        description:
          "Pelajari operator logika, lalu kerjakan latihan tabel kebenaran.",
        activities: [
          { type: "material", materialId: "logika" },
          { type: "assignment", assignmentId: "latihan-logika" },
        ],
      },
      {
        id: "himpunan",
        title: "Himpunan dan operasinya",
        date: "2026-10-09",
        description:
          "Kenali operasi himpunan dan terapkan melalui latihan diagram Venn.",
        activities: [
          { type: "material", materialId: "himpunan" },
          { type: "assignment", assignmentId: "operasi-himpunan" },
        ],
      },
      {
        id: "graf",
        title: "Pengantar teori graf",
        date: "2026-10-16",
        description:
          "Pelajari simpul dan sisi, lalu analisis sebuah graf sederhana.",
        activities: [
          { type: "material", materialId: "graf" },
          { type: "assignment", assignmentId: "analisis-graf" },
        ],
      },
    ],
    materials: [
      {
        id: "logika",
        title: "Logika dan proposisi",
        durationMinutes: 15,
        completed: true,
        introduction:
          "Proposisi adalah pernyataan yang memiliki nilai benar atau salah. Dalam materi ini, kita mengenal operator logika dan menggunakan tabel kebenaran untuk memahami hubungan antarpernyataan.",
      },
      {
        id: "himpunan",
        title: "Himpunan dan operasinya",
        durationMinutes: 20,
        completed: false,
        introduction:
          "Himpunan adalah kumpulan objek yang terdefinisi dengan jelas. Pelajari cara menyatakan himpunan, mengenali anggotanya, serta menggunakan operasi gabungan, irisan, dan selisih melalui contoh sederhana.",
      },
      {
        id: "graf",
        title: "Pengantar teori graf",
        durationMinutes: 25,
        completed: false,
        introduction:
          "Graf terdiri dari simpul dan sisi yang menghubungkan simpul-simpul tersebut. Kita akan melihat bagaimana graf dapat merepresentasikan jaringan pertemanan, rute perjalanan, dan hubungan antarobjek.",
      },
    ],
  },
  {
    id: "semantik-web",
    code: "IF302",
    title: "Semantik Web",
    description:
      "Jelajahi bagaimana data saling terhubung dan memiliki makna di web.",
    lecturer: "Dr. Aditya Pratama",
    lecturerInitials: "AP",
    category: "Teknologi Web",
    artwork: "semantic",
    meetings: [
      {
        id: "pengantar",
        title: "Semantik web dan linked data",
        date: "2026-10-05",
        description:
          "Kenali semantik web dan prinsip dasar data yang saling terhubung.",
        activities: [
          { type: "material", materialId: "pengantar" },
          { type: "material", materialId: "linked-data" },
        ],
      },
      {
        id: "pemodelan",
        title: "Pemodelan RDF dan ontologi",
        date: "2026-10-09",
        description:
          "Pelajari RDF dan ontologi, lalu modelkan data sebuah katalog buku.",
        activities: [
          { type: "material", materialId: "rdf" },
          { type: "material", materialId: "ontologi" },
          { type: "assignment", assignmentId: "pemodelan-rdf" },
        ],
      },
      {
        id: "sparql",
        title: "SPARQL dan graf pengetahuan",
        date: "2026-10-26",
        description:
          "Jelajahi graf pengetahuan dan tulis kueri untuk mengambil informasi.",
        activities: [
          { type: "material", materialId: "sparql" },
          { type: "material", materialId: "studi-kasus" },
          { type: "assignment", assignmentId: "kueri-sparql" },
        ],
      },
    ],
    materials: [
      {
        id: "pengantar",
        title: "Mengenal semantik web",
        durationMinutes: 15,
        completed: true,
        introduction:
          "Semantik web membantu komputer memahami hubungan dan makna data. Materi ini memperkenalkan perbedaan antara halaman web yang ditujukan untuk manusia dan data terstruktur yang dapat diproses mesin.",
      },
      {
        id: "linked-data",
        title: "Prinsip linked data",
        durationMinutes: 20,
        completed: true,
        introduction:
          "Linked data menggunakan identitas yang konsisten dan tautan untuk menghubungkan berbagai sumber data. Pelajari peran URI dan bagaimana hubungan antardata membuat informasi lebih mudah ditemukan.",
      },
      {
        id: "rdf",
        title: "Representasi data dengan RDF",
        durationMinutes: 20,
        completed: false,
        introduction:
          "Resource Description Framework (RDF) merepresentasikan informasi sebagai triple: subjek, predikat, dan objek. Kita akan menyusun pernyataan sederhana dan melihat bagaimana kumpulan triple membentuk graf pengetahuan.",
      },
      {
        id: "ontologi",
        title: "Dasar ontologi",
        durationMinutes: 25,
        completed: false,
        introduction:
          "Ontologi mendefinisikan konsep dan hubungan dalam suatu domain. Kenali kelas, properti, dan instance untuk menyusun struktur pengetahuan yang dapat digunakan bersama.",
      },
      {
        id: "sparql",
        title: "Pengenalan SPARQL",
        durationMinutes: 25,
        completed: false,
        introduction:
          "SPARQL adalah bahasa kueri untuk data RDF. Pelajari pola triple dan cara memilih informasi dari graf menggunakan kueri sederhana.",
      },
      {
        id: "studi-kasus",
        title: "Studi kasus graf pengetahuan",
        durationMinutes: 30,
        completed: false,
        introduction:
          "Gabungkan konsep RDF, linked data, dan ontologi untuk memodelkan sebuah katalog buku. Identifikasi entitas dan hubungan yang membuat informasi dalam katalog saling terhubung.",
      },
    ],
  },
];

export const assignments: Assignment[] = [
  {
    id: "latihan-logika",
    courseId: "matematika-diskrit",
    title: "Latihan logika proposisi",
    description:
      "Susun tabel kebenaran dan tentukan nilai dari beberapa proposisi.",
    instructions: [
      "Buat tabel kebenaran untuk (p ∧ q) → p dan (p ∨ q) ∧ ¬p.",
      "Tentukan apakah masing-masing pernyataan merupakan tautologi, kontradiksi, atau kontingensi.",
      "Jelaskan alasan Anda dan sertakan langkah pengerjaan.",
    ],
    dueAt: "2026-10-06T23:59:00+07:00",
    submittedAt: "2026-10-05T14:30:00+07:00",
  },
  {
    id: "operasi-himpunan",
    courseId: "matematika-diskrit",
    title: "Operasi himpunan",
    description:
      "Gunakan operasi himpunan untuk menyelesaikan persoalan sederhana.",
    instructions: [
      "Diberikan A = {1, 2, 3, 4}, B = {3, 4, 5, 6}, dan U = {1, 2, 3, 4, 5, 6, 7, 8}.",
      "Tentukan A ∪ B, A ∩ B, A − B, dan komplemen A terhadap U.",
      "Gambarkan diagram Venn dan jelaskan hasil setiap operasi.",
    ],
    dueAt: "2026-10-12T23:59:00+07:00",
  },
  {
    id: "pemodelan-rdf",
    courseId: "semantik-web",
    title: "Pemodelan data dengan RDF",
    description: "Representasikan sebuah katalog buku menggunakan triple RDF.",
    instructions: [
      "Pilih tiga buku dan catat judul, penulis, serta tahun terbitnya.",
      "Susun minimal sembilan triple RDF dengan URI yang konsisten.",
      "Gambarkan hubungan antardata dan jelaskan pemilihan subjek, predikat, dan objek.",
    ],
    dueAt: "2026-10-12T17:00:00+07:00",
  },
  {
    id: "analisis-graf",
    courseId: "matematika-diskrit",
    title: "Analisis graf sederhana",
    description:
      "Modelkan sebuah jaringan sebagai graf dan analisis hubungan simpulnya.",
    instructions: [
      "Buat graf tak berarah dengan minimal lima simpul dan enam sisi.",
      "Tentukan derajat setiap simpul dan tuliskan matriks ketetanggaannya.",
      "Jelaskan satu contoh penggunaan graf tersebut dalam kehidupan sehari-hari.",
    ],
    dueAt: "2026-10-20T23:59:00+07:00",
  },
  {
    id: "kueri-sparql",
    courseId: "semantik-web",
    title: "Latihan kueri SPARQL",
    description:
      "Gunakan SPARQL untuk mengambil informasi dari graf pengetahuan.",
    instructions: [
      "Gunakan katalog RDF dari tugas sebelumnya sebagai sumber data.",
      "Tulis kueri untuk menampilkan semua buku, buku berdasarkan penulis, dan buku terbit setelah tahun 2020.",
      "Sertakan contoh hasil dan penjelasan singkat untuk setiap kueri.",
    ],
    dueAt: "2026-11-02T23:59:00+07:00",
  },
];

export const recentActivities: RecentActivity[] = [
  {
    id: "a1",
    courseId: "semantik-web",
    materialId: "linked-data",
    title: "Prinsip linked data",
    detail: "Materi selesai dipelajari",
    time: "Baru saja",
    completed: true,
  },
  {
    id: "a2",
    courseId: "matematika-diskrit",
    materialId: "himpunan",
    title: "Himpunan dan operasinya",
    detail: "Terakhir kamu buka",
    time: "Sebelumnya",
    completed: false,
  },
  {
    id: "a3",
    courseId: "matematika-diskrit",
    materialId: "logika",
    title: "Logika dan proposisi",
    detail: "Materi selesai dipelajari",
    time: "Sebelumnya",
    completed: true,
  },
];
