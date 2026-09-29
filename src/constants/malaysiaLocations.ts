export const MALAYSIA_STATES_LIST = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'WP Kuala Lumpur',
  'WP Putrajaya',
  'WP Labuan',
  'Nationwide / All States',
] as const;

export const MALAYSIA_DISTRICTS_MAP: Record<string, string[]> = {
  'Johor': [
    'Johor Bahru', 'Kluang', 'Kota Tinggi', 'Kulai', 'Mersing', 'Muar',
    'Pontian', 'Segamat', 'Batu Pahat', 'Tangkak',
  ],
  'Kedah': [
    'Kota Setar', 'Kuala Muda', 'Kubang Pasu', 'Kulim', 'Langkawi',
    'Padang Terap', 'Baling', 'Sik', 'Yan', 'Pendang', 'Bandar Baharu', 'Pokok Sena',
  ],
  'Kelantan': [
    'Kota Bharu', 'Pasir Mas', 'Tumpat', 'Bachok', 'Tanah Merah',
    'Pasir Puteh', 'Machang', 'Kuala Krai', 'Jeli', 'Gua Musang', 'Lojing',
  ],
  'Melaka': [
    'Melaka Tengah', 'Alor Gajah', 'Jasin',
  ],
  'Negeri Sembilan': [
    'Seremban', 'Port Dickson', 'Rembau', 'Tampin', 'Kuala Pilah', 'Jelebu', 'Jempol',
  ],
  'Pahang': [
    'Kuantan', 'Temerloh', 'Bentong', 'Bera', 'Jerantut', 'Lipis',
    'Maran', 'Pekan', 'Raub', 'Rompin', 'Cameron Highlands',
  ],
  'Perak': [
    'Kinta', 'Larut, Matang & Selama', 'Manjung', 'Batang Padang',
    'Hilir Perak', 'Hulu Perak', 'Kampar', 'Kerian', 'Kuala Kangsar',
    'Muallim', 'Perak Tengah', 'Bagan Datuk',
  ],
  'Perlis': [
    'Kangar', 'Arau', 'Padang Besar',
  ],
  'Pulau Pinang': [
    'Timur Laut', 'Barat Daya', 'Seberang Perai Tengah',
    'Seberang Perai Utara', 'Seberang Perai Selatan',
  ],
  'Sabah': [
    'Kota Kinabalu', 'Sandakan', 'Tawau', 'Lahad Datu', 'Keningau',
    'Kinabatangan', 'Penampang', 'Beaufort', 'Tuaran', 'Kudat', 'Ranau',
    'Semporna', 'Beluran', 'Kota Belud', 'Kota Marudu', 'Nabawan',
    'Papar', 'Putatan', 'Sipitang', 'Tambunan', 'Tongod',
  ],
  'Sarawak': [
    'Kuching', 'Miri', 'Sibu', 'Bintulu', 'Samarahan', 'Sri Aman',
    'Betong', 'Sarikei', 'Mukah', 'Limbang', 'Kapit', 'Lawas', 'Serian',
    'Subis', 'Tatau', 'Beluru', 'Daro', 'Julau', 'Kanowit', 'Lubok Antu',
    'Maradong', 'Meradong', 'Pakan', 'Saratok', 'Selangau',
  ],
  'Selangor': [
    'Gombak', 'Hulu Langat', 'Hulu Selangor', 'Klang', 'Kuala Langat',
    'Kuala Selangor', 'Petaling', 'Sabak Bernam', 'Sepang',
  ],
  'Terengganu': [
    'Kuala Terengganu', 'Kemaman', 'Dungun', 'Besut', 'Marang',
    'Hulu Terengganu', 'Setiu', 'Kuala Nerus',
  ],
  'WP Kuala Lumpur': [
    'Batu', 'Bukit Bintang', 'Cheras', 'Kepong', 'Lembah Pantai',
    'Seputeh', 'Segambut', 'Setiawangsa', 'Titiwangsa', 'Wangsa Maju',
    'Bandar Tun Razak', 'Bandar Puchong Jaya',
  ],
  'WP Putrajaya': [
    'Putrajaya',
  ],
  'WP Labuan': [
    'Labuan',
  ],
  'Nationwide / All States': [
    'All Districts Nationwide',
  ],
};
